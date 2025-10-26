import type { InterpretedTransaction, InterpreterOptions } from '../src/types.js'
import type { DecodedTransaction } from '@3loop/transaction-decoder'
import { defaultEvent, assetsSent, assetsReceived } from './std.js'
import { AssetTransfer } from '../src/types.js'

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
  const orderFilledEvents = event.interactions
    .sort((a: OrderFilledEvent, b: OrderFilledEvent) => a.event.logIndex - b.event.logIndex)
    .filter((i: OrderFilledEvent) => i.event.eventName === 'OrderFilled')

  if (orderFilledEvents.length === 0) {
    return newEvent
  }

  // Usually users are trading from the proxy wallets created by the polymarket
  // Signer is EOA owned by the user
  const signersAndProxies = event.methodCall?.params
    ?.filter((p: OrderParam) => p?.name === 'takerOrder' || p?.name === 'makerOrders')
    .map((p: OrderParam) => ({
      signer:
        p?.name === 'takerOrder'
          ? p?.components?.find((c) => c?.name === 'signer')?.value
          : p?.components?.[0]?.components?.find((c) => c?.name === 'signer')?.value,
      proxy:
        p?.name === 'takerOrder'
          ? p?.components?.find((c) => c?.name === 'maker')?.value
          : p?.components?.[0]?.components?.find((c) => c?.name === 'maker')?.value,
    }))

  // As a user we look at the input address first, otherwise just use the 1st maker address
  const userAddress = options?.interpretAsUserAddress || orderFilledEvents[0]?.event?.params?.maker?.toLowerCase()

  if (!userAddress) {
    return newEvent
  }

  // Find the primary event for the user to determine the trade direction
  const primaryEvent = orderFilledEvents.find(
    (e: OrderFilledEvent) =>
      e.event?.params?.maker?.toLowerCase() === userAddress.toLowerCase() ||
      e.event?.params?.taker?.toLowerCase() === userAddress.toLowerCase(),
  )

  if (!primaryEvent?.event?.params) {
    return newEvent
  }

  const { maker, taker, makerAssetId, takerAssetId, makerAmountFilled, takerAmountFilled } = primaryEvent.event
    .params as {
    maker: string
    taker: string
    makerAssetId: string
    takerAssetId: string
    makerAmountFilled: number
    takerAmountFilled: number
  }

  // Determine transaction type based on asset IDs
  const isMakerBuying = makerAssetId === '0'
  const isTakerBuying = takerAssetId === '0'
  const userIsMaker = maker.toLowerCase() === userAddress.toLowerCase()
  const userIsTaker = taker.toLowerCase() === userAddress.toLowerCase()

  if (!userIsMaker && !userIsTaker) {
    return newEvent
  }

  const userIsBuying = (userIsMaker && isMakerBuying) || (userIsTaker && isTakerBuying)
  const userIsSelling = (userIsMaker && !isMakerBuying) || (userIsTaker && !isTakerBuying)

  const sent = assetsSent(event.transfers, userAddress)
  const received = assetsReceived(event.transfers, userAddress)

  const context: Record<string, unknown> = {}
  const tokenId = [...sent, ...received].find(
    (t: AssetTransfer) => t.asset.type === 'ERC1155' && t.asset.tokenId != null,
  )?.asset.tokenId

  if (tokenId) {
    const response = await fetch(`${POLYMARKET_API}/markets?clob_token_ids=${tokenId}`)

    if (response.ok) {
      const data = await response.json()

      if (data.length > 0) {
        const marketData = data[0]
        const outcomes = typeof marketData.outcomes === 'string' ? JSON.parse(marketData.outcomes) : marketData.outcomes
        const clobTokenIds =
          typeof marketData.clobTokenIds === 'string' ? JSON.parse(marketData.clobTokenIds) : marketData.clobTokenIds

        context.marketData = {
          conditionId: marketData?.conditionId,
          question: marketData?.question,
          slug: marketData?.slug,
          negRisk: marketData?.negRisk,
          tokens: outcomes.map((outcome: any, index: number) => ({
            outcome,
            tokenId: clobTokenIds[index],
          })),
        }
      }
    }
  }

  const user = { address: userAddress, name: null }
  const baseContext = { proxyWallets: signersAndProxies, ...context }

  // Buying outcome tokens
  if (userIsBuying) {
    const [cost, amount] = [takerAmountFilled / 10 ** 6, makerAmountFilled / 10 ** 6]
    const outcome = (context.marketData as any)?.tokens.find((t: any) => t.tokenId === tokenId)?.outcome
    const question = (context.marketData as any)?.question

    const outcomeText = outcome ? `'${outcome}'` : 'outcome tokens'
    const marketText = question ? ` in the market '${question}'` : ''

    return {
      ...newEvent,
      user,
      type: 'buy-outcome',
      action: `Bought ${amount} shares of ${outcomeText}${marketText} for ${cost} of USDC`,
      assetsSent: sent,
      assetsReceived: received,
      context: baseContext,
    }
  }

  // Selling outcome tokens
  if (userIsSelling) {
    const [cost, amount] = [takerAmountFilled / 10 ** 6, makerAmountFilled / 10 ** 6]
    const outcome = (context.marketData as any)?.tokens.find((t: any) => t.tokenId === tokenId)?.outcome
    const question = (context.marketData as any)?.question

    const outcomeText = outcome ? `'${outcome}'` : 'outcome tokens'
    const marketText = question ? ` in the market '${question}'` : ''

    return {
      ...newEvent,
      user,
      type: 'sell-outcome',
      action: `Sold ${amount} shares of ${outcomeText}${marketText} for ${cost} of USDC`,
      assetsSent: sent,
      assetsReceived: received,
      context: baseContext,
    }
  }

  // TODO: Handle complex scenarios (minting/burning)
  // When both users are buying opposite outcomes, tokens are minted

  // Fallback to default interpretation with assets
  return {
    ...newEvent,
    action: 'Traded on Polymarket',
  }
}

export const events = [
  'OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)',
  'OrdersMatched(bytes32,address,uint256,uint256,uint256,uint256)',
]
