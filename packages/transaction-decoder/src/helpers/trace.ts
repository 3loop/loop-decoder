import type { TraceLogTree, TraceLog, CallType } from '../schema/trace.js'

/*
  Transform Geth trace to Parity trace
  https://github.com/blockchain-etl/ethereum-etl/blob/develop/docs/schema.md#differences-between-geth-and-parity-tracescsv
*/
export function nodeToTraceLog(node: TraceLogTree, path: number[]): TraceLog | undefined {
  let traceLog: TraceLog | undefined

  const traceLogBase = {
    subtraces: node.calls?.length ?? 0,
    traceAddress: path,
    result: {
      output: node.output ?? '0x0',
      gasUsed: BigInt(node.gasUsed),
    },
  }

  switch (node.type) {
    case 'CALL':
    case 'DELEGATECALL':
    case 'CALLCODE':
    case 'STATICCALL':
      traceLog = {
        ...traceLogBase,
        type: 'call',
        action: {
          callType: node.type.toLowerCase() as CallType,
          from: node.from,
          to: node.to,
          gas: BigInt(node.gas),
          input: node.input,
          value: BigInt(node.value ?? '0x0'),
        },
        ...(node.error != null && { error: node.error }),
      }
      break
    case 'CREATE':
      traceLog = {
        ...traceLogBase,
        result: {
          code: node.output ?? '0x0',
          gasUsed: BigInt(node.gasUsed),
        },
        type: 'create',
        action: {
          from: node.from,
          gas: BigInt(node.gas),
          value: BigInt(node.value ?? '0x0'),
        },
      }
      break
    case 'SELFDESTRUCT':
      traceLog = {
        ...traceLogBase,
        type: 'suicide',
        action: {
          refundAddress: node.to,
          address: node.from,
          balance: BigInt(node.value ?? '0x0'),
        },
      }
      break
    default:
      traceLog = undefined
  }

  return traceLog
}

function visit(node: TraceLogTree, path: number[]) {
  const children = node.calls
  const transformedNode = nodeToTraceLog(node, path)
  let result: TraceLog[] = []

  if (children) {
    for (let i = 0; i < children?.length; i++) {
      const transformedChildNode = visit(children[i], [...path, i])

      if (transformedChildNode) {
        result = result.concat(transformedChildNode)
      }
    }
  }

  if (transformedNode) {
    return result.concat(transformedNode)
  } else {
    return result
  }
}

export function transformTraceTree(trace: TraceLogTree) {
  return visit(trace, [])
}
