import type { TraceLogTree, TraceLog, CallType } from '../schema/trace.js'

export function nodeToTraceLog(node: TraceLogTree, path: number[]): TraceLog | undefined {
    let traceLog: TraceLog | undefined

    const traceLogBase = {
        subtraces: node.calls?.length ?? 0,
        traceAddress: path,
        result: {
            output: node.output,
            gasUsed: node.gasUsed,
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
                    gas: node.gas,
                    input: node.input,
                    value: node.value ?? BigInt('0x0'),
                },
            }
            break
        case 'CREATE':
            traceLog = {
                ...traceLogBase,
                type: 'create',
                action: {
                    from: node.from,
                    gas: node.gas,
                    value: node.value ?? BigInt('0x0'),
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
                    balance: node.value ?? BigInt('0x0'),
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
