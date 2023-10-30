import * as React from "react";
import DecodingForm from "./form";
import { decodeTransaction } from "@/lib/decode";
import {
  Interpreter,
  defaultInterpretors,
  findInterpreter,
} from "@/lib/interpreter";
import { defaultContract } from "../../data";

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

  const intepretor = await findInterpreter(decoded, defaultInterpretors);

  if (!intepretor) {
    const newInterpreter: Interpreter = {
      id: "default",
      canInterpret: "txHash ? true : false",
      schema: "",
      contractAddress: defaultContract,
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
