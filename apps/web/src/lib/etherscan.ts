const endpoints: { [k: number]: string } = {
  1: "https://api.etherscan.io/api",
  3: "https://api-ropsten.etherscan.io/api",
  4: "https://api-rinkeby.etherscan.io/api",
  5: "https://api-goerli.etherscan.io/api",
};

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
