import jsonata from "jsonata";
import { DecodedTx } from "@3loop/transaction-decoder";

export interface Interpreter {
  schema: string;
  canInterpret: string;
  id: string;
  contractAddress: string;
}

export const defaultInterpretors: Interpreter[] = [
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
    canInterpret: `methodCall.name = "repay" and  toAddress = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" ? true : false`,
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
    canInterpret: `methodCall.name = "deposit" and  toAddress = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" ? true : false`,
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
    canInterpret: `methodCall.name = "borrow" and  toAddress = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" ? true : false`,
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
    canInterpret: `methodCall.name = "withdraw" and  toAddress = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9" ? true : false`,
  },
];

function findInterpretorsForContract(
  contractAddress: string,
  interpretors: Interpreter[]
): Interpreter[] {
  return interpretors.filter(
    (interpretor) =>
      interpretor.contractAddress.toLowerCase() ===
      contractAddress.toLowerCase()
  );
}

export async function findInterpreter(
  decoded: DecodedTx,
  interpretors: Interpreter[]
): Promise<Interpreter | undefined> {
  const contractAddress = decoded.toAddress
    ? decoded.toAddress.toLowerCase()
    : null;

  if (!contractAddress) {
    return undefined;
  }

  const contractInterpreters = findInterpretorsForContract(
    contractAddress,
    interpretors
  );

  if (!contractInterpreters) {
    return undefined;
  }

  for (const interpreter of contractInterpreters) {
    const canInterpret = jsonata(interpreter.canInterpret);
    const canInterpretResult = await canInterpret.evaluate(decoded);

    console.log("canInterpretResult", canInterpretResult);
    console.log("interpreter", decoded);

    if (!canInterpretResult) {
      continue;
    }
    return interpreter;
  }
  return undefined;
}

export async function runInterpreter(
  decoded: DecodedTx,
  interpreter: Interpreter
): Promise<any> {
  try {
    const expression = jsonata(interpreter.schema);
    const result = await expression.evaluate(decoded);
    return result;
  } catch (e) {
    console.error("Run interpreter", e);
    return;
  }
}

export async function findAndRunInterpreter(
  decoded: DecodedTx,
  interpretors: Interpreter[]
) {
  const interpreter = await findInterpreter(decoded, interpretors);

  if (!interpreter) {
    return {
      tx: decoded,
      interpretation: {
        action: "Unknown",
        txHash: decoded.txHash,
        user: decoded.fromAddress,
        method: decoded.methodCall.name,
      },
    };
  }

  const res = await runInterpreter(decoded, interpreter);

  return {
    tx: decoded,
    interpretation: res,
  };
}
