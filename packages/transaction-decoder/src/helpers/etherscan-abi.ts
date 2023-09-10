const endpoints: { [k: number]: string } = {
    1: 'https://api.etherscan.io/api',
    3: 'https://api-ropsten.etherscan.io/api',
    4: 'https://api-rinkeby.etherscan.io/api',
    5: 'https://api-goerli.etherscan.io/api',
}

export async function fetchContractABI(
    address: string,
    chainID: number,
    config?: { apikey?: string; endpoint?: string },
): Promise<string | null> {
    const endpoint = config?.endpoint ?? endpoints[chainID]

    const params: Record<string, string> = {
        module: 'contract',
        action: 'getabi',
        address,
    }

    if (config?.apikey) {
        params['apikey'] = config.apikey
    }

    const searchParams = new URLSearchParams(params)

    const response = await fetch(`${endpoint}?${searchParams.toString()}`)
    const json = (await response.json()) as { status: string; result: string }

    if (json.status === '1') {
        return json.result
    }

    return null
}
