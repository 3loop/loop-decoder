import { Effect } from 'effect'
import type { DecodeTraceResult, Interaction, InteractionEvent } from '../types.js'
import type { CallTraceLog, TraceLog } from '../schema/trace.js'
import { DecodeError, decodeMethod } from './abi-decode.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { type Hex, type GetTransactionReturnType, Abi, getAddress } from 'viem'
import { stringify } from '../helpers/stringify.js'
import { errorFunctionSignatures, panicReasons, solidityError, solidityPanic } from '../helpers/error.js'

//because some transactions are multicalls, we need to get the second level calls
//to decode the actual method calls
function getSecondLevelCalls(trace: TraceLog[]) {
  const secondLevelCalls: TraceLog[] = []

  for (let i = 0; i < trace.length; i++) {
    if (trace[i].traceAddress.length === 1) {
      secondLevelCalls.push(trace[i])
    }
  }

  return secondLevelCalls
}

const decodeTraceLog = (call: TraceLog, transaction: GetTransactionReturnType) =>
  Effect.gen(function* () {
    if ('to' in call.action && 'input' in call.action) {
      const { to, input, from } = call.action
      const chainID = Number(transaction.chainId)
      const signature = call.action.input.slice(0, 10)
      const contractAddress = to

      const abi = yield* getAndCacheAbi({
        address: contractAddress,
        signature,
        chainID,
      })

      const method = yield* decodeMethod(input as Hex, abi)

      return {
        ...method,
        from,
        to,
      } as DecodeTraceResult
    }

    return yield* new DecodeError(`Could not decode trace log ${stringify(call)}`)
  })

const decodeTraceLogOutput = (call: TraceLog, chainID: number) =>
  Effect.gen(function* () {
    if (call.result && 'output' in call.result && call.result.output !== '0x') {
      const data = call.result.output as Hex
      const signature = data.slice(0, 10)

      //standart error functions
      let abi: Abi = [...solidityPanic, ...solidityError]

      //custom error function
      if (!errorFunctionSignatures.includes(signature)) {
        const abi_ = yield* getAndCacheAbi({
          address: '',
          signature,
          chainID,
        })

        abi = [...abi, ...abi_]
      }

      return yield* decodeMethod(data as Hex, abi)
    }
  })

export const decodeTransactionTrace = ({
  trace,
  transaction,
}: {
  trace: TraceLog[]
  transaction: GetTransactionReturnType
}) =>
  Effect.gen(function* () {
    if (trace.length === 0) {
      return []
    }

    const secondLevelCalls = getSecondLevelCalls(trace)

    if (secondLevelCalls.length === 0) {
      return []
    }

    const effects = secondLevelCalls.map((call) => decodeTraceLog(call, transaction))
    const eithers = effects.map((e) => Effect.either(e))

    const result = yield* Effect.all(eithers, {
      concurrency: 'inherit',
      batching: 'inherit',
    })

    return result
  })

function traceLogToEvent(nativeTransfer: TraceLog): InteractionEvent {
  const { action, type } = nativeTransfer

  const generalNativeEvent: { nativeTransfer: true; logIndex: null } = {
    nativeTransfer: true,
    logIndex: null,
  }

  switch (type) {
    case 'call':
      return {
        eventName: 'NativeTransfer',
        params: {
          from: getAddress(action.from),
          to: getAddress(action.to),
          value: action.value.toString(),
        },
        ...generalNativeEvent,
      }
    case 'create':
      return {
        eventName: 'NativeCreate',
        params: {
          from: getAddress(action.from),
          value: action.value.toString(),
        },
        ...generalNativeEvent,
      }
    case 'suicide':
      return {
        eventName: 'NativeSuicide',
        params: {
          from: getAddress(action.address),
          refundAddress: getAddress(action.refundAddress),
          balance: action.balance.toString(),
        },
        ...generalNativeEvent,
      }
    case 'reward':
      return {
        eventName: 'NativeReward',
        params: {
          author: action.author,
          rewardType: action.rewardType,
          value: action.value.toString(),
        },
        ...generalNativeEvent,
      }
    default:
      return {
        eventName: 'NativeUnknown',
        params: {},
        ...generalNativeEvent,
      }
  }
}

const isCallTrace = (log: TraceLog): log is CallTraceLog =>
  log.type === 'call' && log.action.callType === 'call' && !(log.action.value === BigInt(0)) && log.error == null

function filterToNativeTransfers(traceLogs: TraceLog[]): CallTraceLog[] {
  return traceLogs.filter(isCallTrace)
}

export function augmentTraceLogs(
  transaction: GetTransactionReturnType,
  interactionsWithoutNativeTransfers: Interaction[],
  traceLogs: TraceLog[],
): Interaction[] {
  const nativeTransfers = filterToNativeTransfers(traceLogs).map(
    (log): Interaction => ({
      contractAddress: getAddress(log.action.from),
      contractName: null,
      contractSymbol: null,
      contractType: 'OTHER',
      event: traceLogToEvent(log),
      decimals: null,
      chainID: Number(transaction.chainId),
      signature: null,
    }),
  )
  return [...interactionsWithoutNativeTransfers, ...nativeTransfers]
}

export const decodeErrorTrace = ({
  trace,
  transaction,
}: {
  trace: TraceLog[]
  transaction: GetTransactionReturnType
}) =>
  Effect.gen(function* () {
    const errorCalls = trace?.filter((call) => call.error != null)
    if (errorCalls.length === 0) {
      return []
    }

    //filter error trace calls with dublicate `error` and `output` field
    const uniqueErrorCalls = errorCalls.filter(
      (call, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.error === call.error &&
            (t.type !== 'create' && call.type !== 'create' && t.result?.output
              ? t.result?.output === call.result?.output
              : true),
        ),
    )

    const getErrorObject = (call: TraceLog) =>
      Effect.gen(function* () {
        if (call.result && 'output' in call.result && call.result.output == null) {
          return {
            error: call.error as string,
            message: null,
          }
        }
        const decodedOutput = yield* decodeTraceLogOutput(call, Number(transaction.chainId))
        const value = decodedOutput?.params?.[0]?.value?.toString()
        let message: string | null = null

        if (decodedOutput?.name === 'Error') {
          //if it is standart error function, use function params as error reason
          message = value ?? null
        } else if (decodedOutput?.name === 'Panic') {
          //if it is panic error, use panicReasons as error message
          message = value ? panicReasons[Number(value) as keyof typeof panicReasons] : null
        } else if (decodedOutput?.signature) {
          //if it is custom error function, use signature as error message
          message = decodedOutput.signature
        }

        return {
          error: call.error as string,
          message,
        }
      })

    const effects = uniqueErrorCalls.map((call) => Effect.either(getErrorObject(call)))

    const result = yield* Effect.all(effects, {
      concurrency: 'inherit',
      batching: 'inherit',
    })

    return result
  }).pipe(
    Effect.withSpan('decodeErrorTrace', {
      attributes: {
        traceCount: trace.length,
      },
    }),
  )
