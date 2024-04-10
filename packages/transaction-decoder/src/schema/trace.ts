import * as Schema from '@effect/schema/Schema'

const CallType = Schema.literal('call', 'delegatecall', 'callcode', 'staticcall')

const Address = Schema.string // NOTE: Probably we can use a branded type

export const bigintFromString = Schema.transform(
    Schema.string,
    Schema.bigintFromSelf,
    (s) => BigInt(s),
    (b) => String(b),
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
    gasUsed: bigintFromString,
    output: Schema.string,
})

const EthTraceBase = Schema.struct({
    result: Schema.optional(EthTraceResult),
    subtraces: Schema.number,
    traceAddress: Schema.array(Schema.number),
    error: Schema.optional(Schema.string),
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

const DebugCallType = Schema.literal(
    'CALL',
    'DELEGATECALL',
    'CALLCODE',
    'STATICCALL',
    'CREATE',
    'SELFDESTRUCT',
    'REWARD',
)

export const EthDebugTraceBase = Schema.struct({
    gas: Schema.string,
    to: Address,
    from: Address,
    gasUsed: Schema.string,
    input: Schema.string,
    type: DebugCallType,
    value: Schema.optional(Schema.string),
    output: Schema.string,
})

type DebugTraceLog = Schema.Schema.Type<typeof EthDebugTraceBase>

export type TraceLogTree = {
    calls?: Array<TraceLogTree>
} & DebugTraceLog

export const EthTrace = Schema.union(CallTrace, CreateTrace, RewardTrace, SuicideTrace)

export type TraceLog = Schema.Schema.Type<typeof EthTrace>
export type CallTraceLog = Schema.Schema.Type<typeof CallTrace>
export type CallType = Schema.Schema.Type<typeof CallType>
