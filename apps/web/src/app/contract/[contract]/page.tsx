"use client";
import * as React from "react";
import TxTable from "./table";
import { aaveV2, DEFAULT_CONTRACT } from "../../data";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DecodedTx } from "@3loop/transaction-decoder";
import LoadingPage from "../[contract]/loading";

export default function Home({ params }: { params: { contract?: string } }) {
  let contract = params.contract?.toLowerCase() || DEFAULT_CONTRACT;

  const [txs, setTxs] = React.useState<DecodedTx[]>([]);
  const [loading, setLoading] = React.useState(true);

  const getDecodedTxs = async (contractAddress: string) => {
    const res = await fetch(`/api/contract/${contractAddress}`).then((res) =>
      res.json(),
    );

    if (res.error) {
      setTxs([]);
    } else {
      setTxs(res);
    }

    setLoading(false);
  };

  React.useEffect(() => {
    getDecodedTxs(contract);
  }, [contract]);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div>
      <div className="py-4 grid w-full max-w-sm items-center gap-1.5 overflow-y-auto">
        <Label htmlFor="contractAddress">Contract address</Label>
        <Input
          disabled
          type="contractAddress"
          id="contractAddress"
          placeholder={`${aaveV2}`}
        />
      </div>
      <Separator />
      <TxTable txs={txs} />
    </div>
  );
}
