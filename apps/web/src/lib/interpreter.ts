import {
  DecodedTx,
  Interpreter,
  findInterpreter,
  runInterpreter,
} from "@3loop/transaction-decoder";

export const emptyinterpreter: Interpreter = {
  id: "default",
  contractAddress: "",
  schema: "",
  filter: "txHash ? true : false",
  chainID: 1,
};

export const defaultinterpreters: Interpreter[] = [
  {
    id: "aave-repay",
    contractAddress: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    schema: `
        {
            "action": "User repaid " & assetsSent[1].amount & " " & assetsSent[1].symbol,
            "txHash": txHash,
            "user": fromAddress,
            "method": methodCall.name,
            "assetsSent": assetsSent
        }
              `,
    filter: `methodCall.name = "repay"`,
    chainID: 1,
  },
  {
    id: "aave-deposit",
    contractAddress: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    schema: `
        {
            "action": "User deposited " & assetsSent[0].amount & " " & assetsSent[0].symbol,
            "txHash": txHash,
            "user": fromAddress,
            "method": methodCall.name,
            "assetsSent": assetsSent
        }
              `,
    filter: `methodCall.name = "deposit"`,
    chainID: 1,
  },
  {
    id: "aave-borrow",
    contractAddress: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    schema: `
        {
            "action": "User borrowed " & assetsReceived[1].amount & " " & assetsReceived[1].symbol,
            "txHash": txHash,
            "user": fromAddress,
            "method": methodCall.name,
            "assetsReceived": assetsReceived
        }
              `,
    filter: `methodCall.name = "borrow"`,
    chainID: 1,
  },
  {
    id: "aave-withdraw",
    contractAddress: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
    schema: `
        {
            "action": "User withdrew " & assetsReceived[0].amount & " " & assetsReceived[0].symbol,
            "txHash": txHash,
            "user": fromAddress,
            "method": methodCall.name,
            "assetsReceived": assetsReceived
        }
              `,
    filter: `methodCall.name = "withdraw"`,
    chainID: 1,
  },
];

export async function interpretTx(
  decodedTx: DecodedTx,
  interpreter: Interpreter,
) {
  try {
    const res = await runInterpreter({ decodedTx, interpreter });
    return res;
  } catch (error) {
    console.error("Interpret error", error);
    return undefined;
  }
}

export async function findAndRunInterpreter(
  decodedTx: DecodedTx,
  interpreters: Interpreter[],
) {
  const interpreter = await findInterpreter({ decodedTx, interpreters });

  if (!interpreter) {
    return {
      tx: decodedTx,
      interpretation: {
        action: "Unknown",
        txHash: decodedTx.txHash,
        user: decodedTx.fromAddress,
        method: decodedTx.methodCall.name,
      },
    };
  }

  const res = await runInterpreter({ decodedTx, interpreter });

  return {
    tx: decodedTx,
    interpretation: res,
  };
}
