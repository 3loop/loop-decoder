import { NextRequest, NextResponse } from 'next/server'
import { applyInterpreterServer } from '@/lib/interpreter-server'
import type { DecodedTransaction } from '@3loop/transaction-decoder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface InterpretRequest {
  decodedTx: DecodedTransaction
  interpreter: {
    id: string
    schema: string
  }
  interpretAsUserAddress?: string
}

export const POST = async (request: NextRequest) => {
  try {
    const body: InterpretRequest = await request.json()

    const { decodedTx, interpreter, interpretAsUserAddress } = body

    if (!decodedTx || !interpreter) {
      return NextResponse.json(
        { error: 'Missing required fields: decodedTx and interpreter are required' },
        { status: 400 },
      )
    }

    const result = await applyInterpreterServer(decodedTx, interpreter, interpretAsUserAddress)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Interpreter API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to interpret transaction',
      },
      { status: 500 },
    )
  }
}
