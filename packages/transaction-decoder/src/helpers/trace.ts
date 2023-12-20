import type { TraceLogTree, TraceLog, CallType } from '../schema/trace.js'

export function nodeToTraceLog(node: TraceLogTree, path: number[]): TraceLog | undefined {
    let type: TraceLog['type'], callType: CallType
    let traceLog: TraceLog | undefined
    let action: TraceLog['action']

    const traceLogBase = {
        subtraces: node.calls?.length ?? 0,
        traceAddress: path,
        result: {
            output: node.output,
            gasUsed: node.gasUsed,
        },
    }

    if (
        node.type === 'CALL' ||
        node.type === 'DELEGATECALL' ||
        node.type === 'CALLCODE' ||
        node.type === 'STATICCALL'
    ) {
        type = 'call'
        callType = node.type.toLowerCase() as CallType
        action = {
            callType: callType,
            from: node.from,
            to: node.to,
            gas: node.gas,
            input: node.input,
            value: node.value ?? BigInt('0x0'),
        }
        traceLog = {
            ...traceLogBase,
            type,
            action,
        }
    }

    if (node.type === 'CREATE') {
        type = 'create'
        action = {
            from: node.from,
            gas: node.gas,
            value: node.value ?? BigInt('0x0'),
        }
        traceLog = {
            ...traceLogBase,
            type,
            action,
        }
    }

    if (node.type === 'SELFDESTRUCT') {
        type = 'suicide'
        action = {
            refundAddress: node.to,
            address: node.from,
            balance: node.value ?? BigInt('0x0'),
        }
        traceLog = {
            ...traceLogBase,
            type,
            action,
        }
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
