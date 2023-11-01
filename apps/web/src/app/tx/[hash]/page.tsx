import * as React from "react";
import DecodingForm from "./form";
import { decodeTransaction } from "@/lib/decode";
import { defaultinterpreters, emptyinterpreter } from "@/lib/interpreter";
import { findInterpreter } from "@3loop/transaction-decoder";

export default async function TransactionPage({
  params,
}: {
  params: { hash: string };
}) {
  if (!params.hash) {
    return <DecodingForm />;
  }
  const decoded = await decodeTransaction({ hash: params.hash, chainID: 1 });

  if (!decoded) {
    return <DecodingForm currentHash={params.hash} />;
  }

  const intepretor = await findInterpreter({
    decodedTx: decoded,
    interpreters: defaultinterpreters,
  });

  if (!intepretor) {
    return (
      <DecodingForm
        decoded={decoded}
        defaultInterpreter={emptyinterpreter}
        currentHash={params.hash}
      />
    );
  }

  return (
    <DecodingForm
      decoded={decoded}
      defaultInterpreter={intepretor}
      currentHash={params.hash}
    />
  );
}
