import { DEFAULT_CHAIN_ID } from "@/app/data";
import { decodeTransaction } from "@/lib/decode";
import { getTransactions } from "@/lib/etherscan";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { contract: string } },
) {
  try {
    const contract = params.contract?.toLowerCase();
    const txs = await getTransactions(1, contract);

    const decodedTxs = await decodeTransaction({
      chainID: DEFAULT_CHAIN_ID,
      hashes: txs.map((tx) => tx.hash),
    });

    return NextResponse.json(decodedTxs || []);
  } catch (e) {
    console.error(e);
    return new NextResponse(
      JSON.stringify({
        message: "An error occurred",
      }),
      { status: 500 },
    );
  }
}
