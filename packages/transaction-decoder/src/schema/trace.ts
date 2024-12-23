import { Schema } from 'effect'
const CallType = Schema.Literal('call', 'delegatecall', 'callcode', 'staticcall')

const Address = Schema.String // NOTE: Probably we can use a branded type

export const bigintFromString = Schema.transform(Schema.String, Schema.BigIntFromSelf, {
  decode: (value) => BigInt(value),
  encode: (value) => value.toString(),
})

const EthTraceActionCall = Schema.Struct({
  callType: CallType,
  from: Address,
  to: Address,
  gas: bigintFromString,
  input: Schema.String,
  value: bigintFromString,
})

const EthTraceActionCreate = Schema.Struct({
  from: Address,
  gas: bigintFromString,
  value: bigintFromString,
})

const EthTraceActionSuicide = Schema.Struct({
  address: Address,
  refundAddress: Address,
  balance: bigintFromString,
})

const EthTraceActionReward = Schema.Struct({
  author: Address,
  rewardType: Schema.Literal('block', 'uncle', 'emptyStep', 'external'),
  value: bigintFromString,
})

const EthCreateTraceResult = Schema.Struct({
  address: Schema.optional(Address),
  code: Schema.String,
  gasUsed: bigintFromString,
})

const EthTraceResult = Schema.Struct({
  gasUsed: bigintFromString,
  output: Schema.String,
})

const EthTraceBase = Schema.Struct({
  result: Schema.NullOr(EthTraceResult),
  subtraces: Schema.Number,
  traceAddress: Schema.Array(Schema.Number),
  error: Schema.optional(Schema.String),
})

const CallTrace = Schema.extend(
  EthTraceBase,
  Schema.Struct({
    action: EthTraceActionCall,
    type: Schema.Literal('call'),
  }),
)

const CreateTrace = Schema.Struct({
  result: Schema.NullOr(EthCreateTraceResult),
  subtraces: Schema.Number,
  traceAddress: Schema.Array(Schema.Number),
  error: Schema.optional(Schema.String),
  action: EthTraceActionCreate,
  type: Schema.Literal('create'),
})

const RewardTrace = Schema.extend(
  EthTraceBase,
  Schema.Struct({
    action: EthTraceActionReward,
    type: Schema.Literal('reward'),
  }),
)

const SuicideTrace = Schema.extend(
  EthTraceBase,
  Schema.Struct({
    action: EthTraceActionSuicide,
    type: Schema.Literal('suicide'),
  }),
)

const DebugCallType = Schema.Literal(
  'CALL',
  'DELEGATECALL',
  'CALLCODE',
  'STATICCALL',
  'CREATE',
  'SELFDESTRUCT',
  'REWARD',
)

export const EthDebugTraceBase = Schema.Struct({
  gas: Schema.String,
  to: Address,
  from: Address,
  gasUsed: Schema.String,
  input: Schema.String,
  type: DebugCallType,
  value: Schema.optional(Schema.String),
  output: Schema.String,
  error: Schema.optional(Schema.String),
  revertReason: Schema.optional(Schema.String),
})

type DebugTraceLog = Schema.Schema.Type<typeof EthDebugTraceBase>

//TraceLogTree represents the type returned by geth tracer (debug_traceTransaction method)
export type TraceLogTree = {
  calls?: Array<TraceLogTree>
} & DebugTraceLog

export const EthTrace = Schema.Union(CallTrace, CreateTrace, RewardTrace, SuicideTrace)

//TraceLog represents the type returned by parity tracer (trace_transaction method)
export type TraceLog = Schema.Schema.Type<typeof EthTrace>
export type CallTraceLog = Schema.Schema.Type<typeof CallTrace>
export type CallType = Schema.Schema.Type<typeof CallType>
