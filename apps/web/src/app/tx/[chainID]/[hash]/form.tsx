"use client";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CHAIN_ID, transactions } from "../../../data";
import { useLocalStorage } from "usehooks-ts";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { DecodedTx, Interpreter } from "@3loop/transaction-decoder";
import { interpretTx } from "@/lib/interpreter";

export const sidebarNavItems = transactions.map((tx) => {
  return {
    href: `/tx/${tx.chainID}/${tx.hash}`,
    title: `${tx.name} tx ${tx.hash.slice(0, 6)}...`,
  };
});

interface FormProps {
  currentChainID: number;
  decoded?: DecodedTx;
  defaultInterpreter?: Interpreter;
  currentHash?: string;
}

export default function DecodingForm({
  decoded,
  defaultInterpreter,
  currentHash,
  currentChainID,
}: FormProps) {
  const [result, setResult] = React.useState<string>();
  const [schema, setSchema] = useLocalStorage(
    defaultInterpreter?.id ?? "unknown",
    defaultInterpreter?.schema,
  );

  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const hash = (e.target as any).hash.value;
    router.push(`/tx/${currentChainID}/${hash}`);
  };

  React.useEffect(() => {
    if (schema && defaultInterpreter != null && decoded != null) {
      const newInterpreter = {
        ...defaultInterpreter,
        schema: schema,
      };

      interpretTx(decoded, newInterpreter).then((res) => {
        setResult(res);
      });
    }
  }, [schema, decoded, defaultInterpreter]);

  return (
    <div className="grid h-full items-stretch gap-6 md:grid-cols-[1fr_200px]">
      <div className="md:order-1">
        <div className="flex-col space-y-4 flex">
          <div className="flex flex-col space-y-4">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="transactionHash">Transaction</Label>
                  <form onSubmit={onSubmit}>
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        className="flex-1 flex"
                        id="hash"
                        name="hash"
                        placeholder={`Paste Ethereum transaction hash or click on examples`}
                        defaultValue={currentHash}
                      />
                      <Button type="submit">Decode</Button>
                    </div>
                  </form>
                </div>

                <div className="flex flex-1 flex-col space-y-2 min-h-[250px]">
                  <Label htmlFor="input">Decoded transaction</Label>
                  <Textarea
                    id="decoding"
                    placeholder="The decoded transaction will appear here"
                    className="flex-1"
                    disabled
                    value={
                      decoded ? JSON.stringify(decoded, null, 2) : undefined
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col space-y-2 min-h-[250px]">
                  <div className="flex flex-row">
                    <Label htmlFor="intepretation">
                      Intepretation (
                      <a
                        href="https://docs.jsonata.org/overview.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        JSONata
                      </a>{" "}
                      syntax)
                    </Label>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <QuestionMarkCircledIcon />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                          <p className="text-base">
                            <a
                              href="https://docs.jsonata.org/overview.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              JSONata
                            </a>
                            {` is a lightweight query and transformation language
                            for JSON data.`}
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <Textarea
                    id="intepretation"
                    className="flex-1"
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    placeholder="Write a custom intepretation here or select one from the list on the right."
                  />
                </div>
              </div>
              <div className="mt-[21px] min-h-[400px] rounded-md border bg-muted lg:min-h-[700px] overflow-scroll">
                <pre className="p-4">{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className=" md:order-2">
        <div className="space-y-4">
          <div className="pl-4">
            <h2 className="text-lg font-semibold tracking-tight">AAVE V2</h2>
            <p className="text-sm text-muted-foreground">
              Example Transactions
            </p>
          </div>
          <SidebarNav items={sidebarNavItems} />
        </div>
      </div>
    </div>
  );
}
