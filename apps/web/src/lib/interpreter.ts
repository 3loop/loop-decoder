import {
  Interpreter,
  findInterpreter,
  applyInterpreter,
  DecodedTx,
} from "@3loop/transaction-decoder";

export const emptyInterpreter: Interpreter = {
  id: "default",
  code: `
  function transformEvent(event){
    return event;
};
  `,
};

export const defaultInterpreters: Interpreter[] = [
  {
    id: "contract:0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9,chain:1",
    schema: `
function transformEvent(event) {
    const methodName = event.methodCall.name
    let action = ''

    const newEvent = {
        action: action,
        txHash: event.txHash,
        user: event.fromAddress,
        method: methodName,
        assetsSent: event.assetsSent,
    }

    switch (methodName) {
        case 'repay':
            action = \`User repaid \${event.assetsSent[1].amount} \${event.assetsSent[1].symbol}\`
            break

        case 'deposit':
            action = \`User deposited \${event.assetsSent[0].amount} \${event.assetsSent[0].symbol}\`
            break

        case 'borrow':
            action = \`User borrowed \${event.assetsReceived[1].amount} \${event.assetsReceived[1].symbol}\`
            break

        case 'withdraw':
            action = \`User withdrew \${event.assetsReceived[0].amount} \${event.assetsReceived[0].symbol}\`
            break
    }

    newEvent.action = action

    return newEvent
}
    `,
  },
];

export async function interpretTx(
  decodedTx: DecodedTx,
  interpreter: Interpreter
) {
  const res = await applyInterpreter({ decodedTx, interpreter });
  return res;
}

export async function findAndRunInterpreter(
  decodedTx: DecodedTx,
  interpreters: Interpreter[]
) {
  const interpreter = findInterpreter({ decodedTx, interpreters });

  if (!interpreter) {
    return {
      tx: decodedTx,
      interpretation: decodedTx,
    };
  }

  const res = await applyInterpreter({ decodedTx, interpreter });

  return {
    tx: decodedTx,
    interpretation: res,
  };
}
