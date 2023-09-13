import * as React from "react";
import DecodingForm from "./form";
import { findInterpreter } from "../../utils";
import { Interpreter, data } from "../../data";
import { decodeTransaction } from "@/lib/decode";

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

  const defaultIntepretors = Object.values(data).map((d) => d.interpreter);
  const intepretor = await findInterpreter(decoded, defaultIntepretors);

  if (!intepretor) {
    const newInterpreter: Interpreter = {
      id: "default",
      canInterpret: "txHash ? true : false",
      schema: "",
    };

    return (
      <DecodingForm
        decoded={decoded}
        defaultInterpreter={newInterpreter}
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
