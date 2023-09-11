export interface Interpreter {
  schema: string;
  canInterpret: string;
  id: string;
}

export interface Data {
  [key: string]: {
    name: string;
    interpreter: Interpreter;
  };
}

export const data: Data = {
  "0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7": {
    name: "Repay",
    interpreter: {
      id: "aave-repay",
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
  },
  "0xe61092c0ce50d7cf7c43a060c3ca023f16f99729ccae7a6d011e408d93d6f93f": {
    name: "Deposit",
    interpreter: {
      id: "aave-deposit",
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
  },
  "0x1fc39eea9247cd9aa9d311bf83666afa6c9b30d66515d313e4d04dcb07a73a8f": {
    name: "Borrow",
    interpreter: {
      id: "aave-borrow",
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
  },
  "0xf42e5d28e2fea319cf3675c57c57849ad5d178f17f8a17c94c7607321cf1b959": {
    name: "Withdraw",
    interpreter: {
      id: "aave-withdraw",
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
  },
};

export const aaveV2 = "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9";
export const defaultTrasaction = Object.keys(data)[0];
export const defaultContract = aaveV2;
