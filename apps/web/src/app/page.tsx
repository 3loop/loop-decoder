"use client";
import * as React from "react";
import DecodingForm from "./tx/[chainID]/[hash]/form";
import { DEFAULT_CHAIN_ID } from "./data";

export default function Home() {
  return <DecodingForm currentChainID={DEFAULT_CHAIN_ID} />;
}
