"use client";
import * as React from "react";
import { SelectProps } from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useRouter } from "next/navigation";
import { supportedChains } from "@/app/data";

export function NetworkSelect(props: SelectProps) {
  const router = useRouter();
  const params = useParams();

  const onValueChange = (newChainID) => {
    router.push(`/tx/${newChainID}`);
  };

  return (
    <Select
      defaultValue={props.defaultValue}
      onValueChange={onValueChange}
      value={params.chainID as string}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a network" />
      </SelectTrigger>
      <SelectContent>
        {supportedChains.map((chain) => (
          <SelectItem key={chain.chainID} value={chain.chainID.toString()}>
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
