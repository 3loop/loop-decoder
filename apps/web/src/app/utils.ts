import jsonata from "jsonata";
import { Interpreter } from "./data";
import { DecodedTx } from "@3loop/transaction-decoder";

export async function runInterpreter(
  decoded: DecodedTx,
  interpreter: Interpreter,
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

export async function findInterpreter(
  decoded: DecodedTx,
  interpretors: Interpreter[],
): Promise<Interpreter | undefined> {
  for (const interpreter of interpretors) {
    const canInterpret = jsonata(interpreter.canInterpret);
    const canInterpretResult = await canInterpret.evaluate(decoded);

    if (!canInterpretResult) {
      continue;
    }
    return interpreter;
  }
  return undefined;
}

export async function findAndRunInterpreter(
  decoded: DecodedTx,
  interpretors: Interpreter[],
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
