import * as React from "react";
import DecodingForm from "./form";
import { decodeTransaction } from "@/lib/decode";
import { defaultInterpretors, emptyInterpretor } from "@/lib/interpreter";
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
    interpretors: defaultInterpretors,
  });

  if (!intepretor) {
    return (
      <DecodingForm
        decoded={decoded}
        defaultInterpreter={emptyInterpretor}
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
