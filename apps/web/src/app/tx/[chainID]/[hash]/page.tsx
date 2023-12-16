import * as React from "react";
import DecodingForm from "./form";
import { decodeTransaction } from "@/lib/decode";
import { defaultinterpreters, emptyinterpreter } from "@/lib/interpreter";
import { findInterpreter } from "@3loop/transaction-decoder";

export default async function TransactionPage({
  params,
}: {
  params: { hash: string; chainID: number };
}) {
  const decoded = await decodeTransaction({
    hash: params.hash,
    chainID: params.chainID,
  });

  if (!decoded) {
    return (
      <DecodingForm currentHash={params.hash} currentChainID={params.chainID} />
    );
  }

  const intepretor = await findInterpreter({
    decodedTx: decoded,
    interpreters: defaultinterpreters,
  });

  return (
    <DecodingForm
      decoded={decoded}
      defaultInterpreter={intepretor || emptyinterpreter}
      currentHash={params.hash}
      currentChainID={params.chainID}
    />
  );
}
