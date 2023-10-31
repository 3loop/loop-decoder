"use client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import { DecodedTx, Interpreter } from "@3loop/transaction-decoder";
import {
  findAndRunInterpreter,
  defaultInterpretors,
} from "@/lib/interpreter";

function getAvaliableInterpretors() {
  if (typeof window === "undefined") return undefined;

  let res: Interpreter[] = [];

  for (const interpretor of defaultInterpretors) {
    const stored = window.localStorage.getItem(interpretor.id);
    if (stored) {
      const updatedSchema = JSON.parse(stored);

      res.push({
        ...interpretor,
        schema: updatedSchema,
      });
    } else {
      res.push(interpretor);
    }
  }

  return res;
}

export default function TxTable({ txs }: { txs: DecodedTx[] }) {
  const [result, setResult] = React.useState<
    {
      tx: DecodedTx;
      interpretation: any;
    }[]
  >([]);
  const [intepretors] = React.useState(getAvaliableInterpretors);

  React.useEffect(() => {
    async function run() {
      if (intepretors == null) return;

      const withIntepretations = await Promise.all(
        txs.map((tx) => {
          return findAndRunInterpreter(tx, intepretors);
        })
      );

      setResult(withIntepretations);
    }
    run();
  }, [intepretors, txs]);

  return (
    <Table>
      <TableCaption>A list of recent transactions.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="">Age</TableHead>
          <TableHead>Link</TableHead>
          <TableHead>Interpretation</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {result.map(({ tx, interpretation }) => (
          <TableRow key={tx?.txHash}>
            <TableCell>
              {new Date(Number(tx?.timestamp + "000")).toUTCString()}
            </TableCell>
            <TableCell>
              <a
                href={`https://etherscan.io/tx/${tx?.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {tx?.txHash.slice(0, 6) + "..." + tx?.txHash.slice(-4)}
              </a>
            </TableCell>
            <TableCell>
              <pre>
                {typeof interpretation === "string"
                  ? interpretation
                  : JSON.stringify(interpretation, null, 2)}
              </pre>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
