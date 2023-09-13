import * as React from "react";
import TxTable from "./table";
import { aaveV2 } from "../../data";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getTransactions } from "@/lib/etherscan";
import { decodeTransaction } from "@/lib/decode";
import { DecodedTx } from "@3loop/transaction-decoder";

async function getListOfDecodedTxs(
  contract?: string,
): Promise<(DecodedTx | undefined)[]> {
  if (!contract || contract !== aaveV2) return [];

  try {
    const txs = await getTransactions(1, contract);
    const decodedTxs = await Promise.all(
      txs.map(({ hash }) => decodeTransaction({ hash, chainID: 1 })),
    );

    return decodedTxs;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function Home({
  params,
}: {
  params: { contract?: string };
}) {
  let contract = params.contract?.toLowerCase();
  const decodedTxs = (await getListOfDecodedTxs(contract)).filter(
    (tx): tx is DecodedTx => !!tx,
  );

  return (
    <div>
      <div className="py-4 grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="contractAddress">Contract address</Label>
        <Input
          disabled
          type="contractAddress"
          id="contractAddress"
          placeholder={`${aaveV2}`}
        />
      </div>
      <Separator />
      <TxTable txs={decodedTxs} />
    </div>
  );
}
