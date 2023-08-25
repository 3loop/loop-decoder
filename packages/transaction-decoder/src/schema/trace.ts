import * as Schema from '@effect/schema/Schema'

const CallType = Schema.literal('call', 'delegatecall', 'callcode', 'staticcall')

const Address = Schema.string // NOTE: Probably we can use a branded type
const bigintFromString = Schema.transform(
    Schema.string,
    Schema.bigint,
    (val) => BigInt(val),
    (s) => String(s),
)

const EthTraceActionCall = Schema.struct({
    callType: CallType,
    from: Address,
    to: Address,
    gas: bigintFromString,
    input: Schema.string,
    value: bigintFromString,
})

const EthTraceActionCreate = Schema.struct({
    from: Address,
    gas: bigintFromString,
    init: Schema.string,
    value: bigintFromString,
})

const EthTraceActionSuicide = Schema.struct({
    address: Address,
    refundAddress: Address,
    balance: bigintFromString,
})

const EthTraceActionReward = Schema.struct({
    author: Address,
    rewardType: Schema.literal('block', 'uncle', 'emptyStep', 'external'),
    value: bigintFromString,
})

const EthTraceResult = Schema.struct({
    address: Schema.optional(Schema.string),
    gasUsed: bigintFromString,
    output: Schema.string,
    code: Schema.optional(Schema.string),
})

const EthTraceBase = Schema.struct({
    result: Schema.optional(EthTraceResult),
    blockHash: Schema.string,
    blockNumber: Schema.number,
    error: Schema.optional(Schema.string),
    subtraces: Schema.number,
    traceAddress: Schema.array(Schema.number),
    transactionHash: Schema.string,
    transactionPosition: Schema.number,
})

const CallTrace = Schema.extend(
    EthTraceBase,
    Schema.struct({
        action: EthTraceActionCall,
        type: Schema.literal('call'),
    }),
)

const CreateTrace = Schema.extend(
    EthTraceBase,
    Schema.struct({
        action: EthTraceActionCreate,
        type: Schema.literal('create'),
    }),
)

const RewardTrace = Schema.extend(
    EthTraceBase,
    Schema.struct({
        action: EthTraceActionReward,
        type: Schema.literal('reward'),
    }),
)

const SuicideTrace = Schema.extend(
    EthTraceBase,
    Schema.struct({
        action: EthTraceActionSuicide,
        type: Schema.literal('suicide'),
    }),
)

export const EthTrace = Schema.union(CallTrace, CreateTrace, RewardTrace, SuicideTrace)

export type TraceLog = Schema.To<typeof EthTrace>
export type CallTraceLog = Schema.To<typeof CallTrace>
