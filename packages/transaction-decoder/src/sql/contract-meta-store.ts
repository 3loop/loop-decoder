import { SqlClient } from '@effect/sql'
import { Effect, Layer } from 'effect'
import {
  ContractData,
  ContractMetaStore,
  ERC20RPCStrategyResolver,
  NFTRPCStrategyResolver,
  ProxyRPCStrategyResolver,
  PublicClient,
} from '../effect.js'

export const make = () =>
  Layer.effect(
    ContractMetaStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const publicClient = yield* PublicClient

      yield* sql`
      CREATE TABLE IF NOT EXISTS contractMeta (
        address TEXT NOT NULL,
        chain INTEGER NOT NULL,
        contractName TEXT,
        tokenSymbol TEXT,
        decimals INTEGER,
        type TEXT,
        status TEXT NOT NULL
      )
    `

      return ContractMetaStore.of({
        strategies: {
          default: [
            ERC20RPCStrategyResolver(publicClient),
            NFTRPCStrategyResolver(publicClient),
            ProxyRPCStrategyResolver(publicClient),
          ],
        },
        set: (key, value) =>
          Effect.gen(function* () {
            if (value.status === 'success') {
              const name = value.result.contractName ?? null
              const symbol = value.result.tokenSymbol ?? null
              const decimals = value.result.decimals ?? null

              yield* sql`
              INSERT INTO contractMeta (address, chain, contractName, tokenSymbol, decimals, type, status)
              VALUES (${key.address.toLowerCase()}, ${key.chainID}, ${name}, ${symbol}, ${decimals},
               ${value.result.type}, "success")
            `
            } else {
              yield* sql`
              INSERT INTO contractMeta (address, chain, contractName, tokenSymbol, decimals, type, status)
              VALUES (${key.address.toLowerCase()}, ${key.chainID}, null, null, null, null, "not-found")
            `
            }
          }).pipe(Effect.catchAll(() => Effect.succeed(null))),
        get: ({ address, chainID }) =>
          Effect.gen(function* () {
            const items = yield* sql`
            SELECT * FROM contractMeta
            WHERE address = ${address.toLowerCase()} AND chain = ${chainID}
          `.pipe(Effect.catchAll(() => Effect.succeed([])))

            const item = items[0]

            if (item != null && item.status === 'success') {
              return {
                status: 'success',
                result: {
                  contractAddress: address,
                  contractName: item.contractName,
                  tokenSymbol: item.tokenSymbol,
                  decimals: item.decimals,
                  type: item.type,
                  address,
                  chainID,
                } as ContractData,
              }
            } else if (item != null && item.status === 'not-found') {
              return {
                status: 'not-found',
                result: null,
              }
            }

            return {
              status: 'empty',
              result: null,
            }
          }),
      })
    }),
  )
