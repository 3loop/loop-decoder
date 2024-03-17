import { ContractData } from '@/types.js'
import * as RequestModel from './request-model.js'
import { Effect, RequestResolver } from 'effect'

function fetchERC20({ address, chainID }: RequestModel.GetContractMetaStrategy): Promise<ContractData> {
    console.log('fetchERC20', address, chainID)
    throw new Error('Not implemented')
}

export const ERC20RPCStrategyResolver = () =>
    RequestResolver.fromEffect((req: RequestModel.GetContractMetaStrategy) =>
        Effect.tryPromise({
            try: () => fetchERC20(req),
            catch: () => new RequestModel.ResolveStrategyMetaError('erc20-rpc-resolver', req.address, req.chainID),
        }),
    )
