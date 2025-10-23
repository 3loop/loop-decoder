import type { InterpretedTransaction } from '../src/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { genericSwapInterpreter } from './std.js'
import { InterpreterOptions } from '../src/types.js'

export function transformEvent(event: DecodedTransaction, options?: InterpreterOptions): InterpretedTransaction {
  if (options?.interpretAsUserAddress) {
    return genericSwapInterpreter({
      ...event,
      fromAddress: options.interpretAsUserAddress,
    })
  }

  return genericSwapInterpreter(event)
}

export const contracts = [
  // 1inch
  '0x111111125421cA6dc452d289314280a0f8842A65',
  '0x1111111254EEB25477B68fb85Ed929f73A960582',
  '0x1111111254fb6c44bAC0beD2854e76F90643097d',

  //Uniswap
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b',
  '0xeC8B0F7Ffe3ae75d7FfAb09429e3675bb63503e4',
  '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
  '0x2626664c2603336e57b271c5c0b26f421741e481',
  '0x5302086a3a25d473aabbd0356eff8dd811a4d89b',
  '0xe592427a0aece92de3edee1f18e0157c05861564',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',

  //Aerodrom
  '8453:0x6cb442acf35158d5eda88fe602221b67b400be3e',

  //Banana Gun
  '0x3328f7f4a1d1c57c35df56bbf0c9dcafca309c49',
  '0x1fba6b0bbae2b74586fba407fb45bd4788b7b130',

  // KyberSwap v2
  '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',

  //Metamask Router
  '0x881D40237659C251811CEC9c364ef91dC08D300C',

  //OKX
  '0xF3dE3C0d654FDa23daD170f0f320a92172509127',

  //Pendle Router v4
  '0x888888888889758F76e7103c6CbF23ABbF58F946',

  //Rainbow Router
  '0x00000000009726632680FB29d3F7A9734E3010E2',
]
