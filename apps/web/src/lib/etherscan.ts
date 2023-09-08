const endpoints: { [k: number]: string } = {
  1: "https://api.etherscan.io/api",
  3: "https://api-ropsten.etherscan.io/api",
  4: "https://api-rinkeby.etherscan.io/api",
  5: "https://api-goerli.etherscan.io/api",
};

export async function fetchContractABI(
  address: string,
  chainID: number,
): Promise<string | null> {
  const apikey = process.env.ETHERSCAN_API_KEY;
  if (!apikey) {
    console.warn("Missing ETHERSCAN_API_KEY");
  }

  const endpoint = endpoints[chainID];

  const params = new URLSearchParams({
    module: "contract",
    action: "getabi",
    address: address,
    apikey: apikey || "",
  });

  const response = await fetch(`${endpoint}?${params.toString()}`);
  const json = (await response.json()) as { status: string; result: string };

  if (json.status === "1") {
    return json.result;
  }
  return null;
}

export interface Transfer {
  timeStamp: string;
  uniqueId: string;
  hash: string;
  from: string;
  to: string;
  interpretation?: any;
}

export async function getTransactions(chainId: number, address: string) {
  const url = endpoints[chainId];

  const data = new URLSearchParams({
    module: "account",
    action: "txlist",
    address,
    sort: "desc",
    offset: "5",
    page: "1",
    apikey: process.env.ETHERSCAN_API_KEY || "",
  });

  const resp = await fetch(`${url}?${data.toString()}`, {
    next: { revalidate: 60 * 5 },
  });

  if (!resp.ok) {
    throw new Error(resp.statusText);
  }

  const json = (await resp.json()).result as Transfer[];
  return json;
}
