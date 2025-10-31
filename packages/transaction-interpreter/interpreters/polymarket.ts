import type { InterpretedTransaction, InterpreterOptions } from '../src/types.js'
import type { DecodedTransaction, Transfer } from '@3loop/transaction-decoder'
import { defaultEvent, assetsSent, assetsReceived, formatNumber } from './std.js'

const POLYMARKET_API = 'https://gamma-api.polymarket.com'

/**
 * Polymarket is a decentralized prediction market on the Polygon network where users can
 * trade outcome tokens (YES/NO) representing predictions on future events.
 *
 * ## Key Contracts
 * - CTF Exchange (0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E): For binary YES/NO markets
 * - NegRisk_CTFExchange (0xC5d563A36AE78145C45a50134d48A1215220f80a): For multi-outcome markets
 *
 * ## How Outcome Tokens Work
 * Each prediction market creates a pair of outcome tokens (YES/NO) backed by 1 USDC of collateral.
 * These tokens are ERC-1155 tokens with unique position IDs tied to specific market outcomes.
 *
 * ## Understanding OrderFilled Events
 * The exchange emits OrderFilled events with these key parameters:
 * - `maker/taker`: The two parties in the trade
 * - `makerAssetId/takerAssetId`: The asset IDs being exchanged (0 = USDC, non-zero = outcome token ID)
 * - `makerAmountFilled/takerAmountFilled`: Amounts exchanged (in wei for USDC, token units for outcomes)
 *
 * ### Trade Scenarios
 *
 * 1. **Direct Trade (Swapping Tokens)**
 *    - Maker sells outcome token (makerAssetId = tokenId, takerAssetId = 0)
 *    - Taker buys with USDC (receives outcome token, sends USDC)
 *    - No minting/burning occurs
 *
 * 2. **Minting Tokens (Opposite Buy Orders)**
 *    - Both users want to buy opposite outcomes (both makerAssetId = 0, different takerAssetIds)
 *    - Combined USDC is locked as collateral
 *    - New outcome token pairs are minted for both users
 *
 * 3. **Burning Tokens (Opposite Sell Orders)**
 *    - Both users sell opposite outcome tokens (both takerAssetId = 0, different makerAssetIds)
 *    - Token pairs are burned
 *    - Collateral USDC is released to both users
 *
 * 4. **Mixed Scenarios**
 *    - Complex transactions can combine multiple trades, minting, and burning in one transaction
 *    - Multiple OrderFilled events show the complete picture
 *
 * ## Proxy Wallets
 * Polymarket users often trade through proxy wallets:
 * - The `signer` is the user's EOA (Externally Owned Account)
 * - The `maker` field in order params is the proxy wallet address
 *
 * @see https://docs.polymarket.com/developers/CLOB/orders/onchain-order-info
 * @see https://yzc.me/x01Crypto/decoding-polymarket
 */

interface OrderFilledEvent {
  event: {
    logIndex: number
    eventName: string
    params?: {
      maker?: string
      taker?: string
      makerAssetId: string
      takerAssetId: string
      makerAmountFilled: number
      takerAmountFilled: number
    }
  }
}

interface OrderParam {
  name: string
  value?: string
  components?: Array<{
    name: string
    value?: string
    components?: Array<{ name: string; value?: string }>
  }>
}

export async function transformEvent(
  event: DecodedTransaction,
  options?: InterpreterOptions,
): Promise<InterpretedTransaction> {
  const newEvent = defaultEvent(event)

  // Find OrderFilled events to determine transaction type
  const orderFilledEvents = event.interactions.filter((i: OrderFilledEvent) => i.event.eventName === 'OrderFilled')
  const orderMatchedEvent = event.interactions.find((i: any) => i.event.eventName === 'OrdersMatched')

  if (orderFilledEvents.length === 0 || !orderMatchedEvent) {
    return newEvent
  }

  // As a user we look at the input address first, otherwise just use the 1st maker address
  const userAddress =
    options?.interpretAsUserAddress?.toLowerCase() || orderFilledEvents[0]?.event?.params?.maker?.toLowerCase()

  if (!userAddress) {
    return newEvent
  }

  // Usually users are trading from the proxy wallets created by the polymarket
  // Signer is EOA owned by the user
  const signersAndProxies = event.methodCall?.params
    ?.filter((p: OrderParam) => p.name === 'takerOrder' || p.name === 'makerOrders')
    .map((p: OrderParam) => {
      const components = p.name === 'takerOrder' ? p.components : p.components?.[0]?.components
      return {
        signer: components?.find((c) => c.name === 'signer')?.value,
        proxy: components?.find((c) => c.name === 'maker')?.value,
      }
    })

  // To interpret the case like with minting/burning new CT tokens,
  // we need to look at the final token transfers instead of the event params
  const conditionalTokenTransfers = event.transfers.filter(
    (t: Transfer) =>
      t.type === 'ERC1155' &&
      t.tokenId != null &&
      (t.to.toLowerCase() === userAddress.toLowerCase() || t.from.toLowerCase() === userAddress.toLowerCase()),
  )

  const tokenId = conditionalTokenTransfers.length === 1 ? conditionalTokenTransfers[0].tokenId : undefined

  // Find the primary event for the user to determine the trade direction
  const primaryEvent = orderFilledEvents.find((e: OrderFilledEvent) => {
    const params = e.event?.params
    const isUserInvolved = params?.maker?.toLowerCase() === userAddress || params?.taker?.toLowerCase() === userAddress
    const isTokenInvolved = params?.makerAssetId === tokenId || params?.takerAssetId === tokenId
    return isUserInvolved && isTokenInvolved
  })

  if (!primaryEvent?.event?.params) {
    return newEvent
  }

  const { maker, makerAssetId, makerAmountFilled, takerAmountFilled, takerAssetId } = primaryEvent.event.params as {
    maker: string
    makerAssetId: string
    takerAssetId: string
    makerAmountFilled: number
    takerAmountFilled: number
  }

  // Determine transaction type based on asset IDs
  const userIsMaker = maker?.toLowerCase() === userAddress
  const userIsBuying = userIsMaker ? makerAssetId === '0' : makerAssetId !== '0'
  const tokenAmount = (userIsMaker ? takerAmountFilled : makerAmountFilled) / 1e6
  const costAmount = (userIsMaker ? makerAmountFilled : takerAmountFilled) / 1e6

  const sent = assetsSent(event.transfers, userAddress)
  const received = assetsReceived(event.transfers, userAddress)
  const context: Record<string, unknown> = {}

  if (tokenId) {
    const response = await fetch(`${POLYMARKET_API}/markets?clob_token_ids=${tokenId}`)
    if (response.ok) {
      const data = await response.json()
      if (data.length > 0) {
        const { outcomes, clobTokenIds, conditionId, question, slug, negRisk } = data[0]
        const parsedOutcomes = typeof outcomes === 'string' ? JSON.parse(outcomes) : outcomes
        const parsedTokenIds = typeof clobTokenIds === 'string' ? JSON.parse(clobTokenIds) : clobTokenIds

        context.marketData = {
          conditionId,
          question,
          slug,
          negRisk,
          tokens: parsedOutcomes.map((outcome: any, index: number) => ({
            outcome,
            tokenId: parsedTokenIds[index],
          })),
        }
      }
    }
  }

  const marketData = context.marketData as any
  const user = { address: userAddress, name: null }
  const baseContext = { proxyWallets: signersAndProxies, ...context }
  const lookupTokenId = userIsBuying ? takerAssetId : tokenId
  const outcome = marketData?.tokens.find((t: any) => t.tokenId === lookupTokenId)?.outcome
  const outcomeText = outcome ? `'${outcome}'` : 'outcome tokens'
  const marketText = marketData?.question ? ` in the market '${marketData.question}'` : ''
  const action = userIsBuying ? 'Bought' : 'Sold'
  const type = userIsBuying ? 'buy-outcome' : 'sell-outcome'

  return {
    ...newEvent,
    user,
    type,
    action: `${action} ${formatNumber(tokenAmount.toString())} shares of ${outcomeText}${marketText} for ${formatNumber(
      costAmount.toString(),
    )} of USDC`,
    assetsSent: sent,
    assetsReceived: received,
    context: baseContext,
  }
}

export const events = [
  'OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)',
  'OrdersMatched(bytes32,address,uint256,uint256,uint256,uint256)',
]
