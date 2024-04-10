import { Effect } from 'effect'
import type { DecodeTraceResult, Interaction, InteractionEvent } from '../types.js'
import type { CallTraceLog, TraceLog } from '../schema/trace.js'
import { DecodeError, MissingABIError, decodeMethod } from './abi-decode.js'
import { getAndCacheAbi } from '../abi-loader.js'
import { Hex, type GetTransactionReturnType, Abi } from 'viem'

function getSecondLevelCalls(trace: TraceLog[]) {
    const secondLevelCalls: TraceLog[] = []

    for (let i = 0; i < trace.length; i++) {
        if (trace[i].traceAddress.length === 1) {
            secondLevelCalls.push(trace[i])
        }
    }

    return secondLevelCalls
}

function replacer(key: unknown, value: unknown) {
    if (typeof value === 'bigint') {
        return {
            type: 'bigint',
            value: value.toString(),
        }
    } else {
        return value
    }
}

const decodeTraceLog = (call: TraceLog, transaction: GetTransactionReturnType) =>
    Effect.gen(function* (_) {
        if ('to' in call.action && 'input' in call.action) {
            const { to, input, from } = call.action
            const chainID = Number(transaction.chainId)
            const signature = call.action.input.slice(0, 10)
            const contractAddress = to

            const abi_ = yield* _(
                getAndCacheAbi({
                    address: contractAddress,
                    signature,
                    chainID,
                }),
            )

            if (abi_ == null) {
                return yield* _(Effect.fail(new MissingABIError(contractAddress, signature, chainID)))
            }

            const abi = JSON.parse(abi_) as Abi

            return yield* _(
                Effect.try({
                    try: () => {
                        const method = decodeMethod(input as Hex, abi)
                        return {
                            ...method,
                            from,
                            to,
                        } as DecodeTraceResult
                    },
                    catch: (e) => {
                        return new DecodeError(e)
                    },
                }),
            )
        }

        return yield* _(Effect.fail(new DecodeError(`Could not decode trace log ${JSON.stringify(call, replacer)}`)))
    })

export const decodeTransactionTrace = ({
    trace,
    transaction,
}: {
    trace: TraceLog[]
    transaction: GetTransactionReturnType
}) =>
    Effect.gen(function* (_) {
        if (trace.length === 0) {
            return []
        }

        const secondLevelCalls = getSecondLevelCalls(trace)

        if (secondLevelCalls.length === 0) {
            return []
        }

        const effects = secondLevelCalls.map((call) => decodeTraceLog(call, transaction))

        const eithers = effects.map((e) => Effect.either(e))

        const result = yield* _(
            Effect.all(eithers, {
                concurrency: 'inherit',
                batching: 'inherit',
            }),
        )

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
                    from: action.from,
                    to: action.to,
                    value: action.value.toString(),
                },
                ...generalNativeEvent,
            }
        case 'create':
            return {
                eventName: 'NativeCreate',
                params: {
                    from: action.from,
                    value: action.value.toString(),
                },
                ...generalNativeEvent,
            }
        case 'suicide':
            return {
                eventName: 'NativeSuicide',
                params: {
                    from: action.address,
                    refundAddress: action.refundAddress,
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
            contractAddress: log.action.from,
            contractName: null,
            contractSymbol: null,
            contractType: 'OTHER',
            event: traceLogToEvent(log),
            decimals: null,
            chainID: Number(transaction.chainId),
        }),
    )
    return [...interactionsWithoutNativeTransfers, ...nativeTransfers]
}
