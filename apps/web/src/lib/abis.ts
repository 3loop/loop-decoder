export const ERC20 =
  '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]'

export const ERC20_FRAGMENTS = {
  '0xdd62ed3e': {
    fragment:
      '{"type":"function","inputs":[{"name":"_owner","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null},{"name":"_spender","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null}],"name":"allowance","constant":true,"outputs":[{"name":"","type":"uint256","baseType":"uint256","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"view","payable":false,"gas":null}',
    formatted: 'allowance(address,address)',
  },
  '0x095ea7b3': {
    fragment:
      '{"type":"function","inputs":[{"name":"_spender","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null},{"name":"_value","type":"uint256","baseType":"uint256","components":null,"arrayLength":null,"arrayChildren":null}],"name":"approve","constant":false,"outputs":[{"name":"","type":"bool","baseType":"bool","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"nonpayable","payable":false,"gas":null}',
    formatted: 'approve(address,uint256)',
  },
  '0x70a08231': {
    fragment:
      '{"type":"function","inputs":[{"name":"_owner","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null}],"name":"balanceOf","constant":true,"outputs":[{"name":"balance","type":"uint256","baseType":"uint256","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"view","payable":false,"gas":null}',
    formatted: 'balanceOf(address)',
  },
  '0x313ce567': {
    fragment:
      '{"type":"function","inputs":[],"name":"decimals","constant":true,"outputs":[{"name":"","type":"uint8","baseType":"uint8","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"view","payable":false,"gas":null}',
    formatted: 'decimals()',
  },
  '0x06fdde03': {
    fragment:
      '{"type":"function","inputs":[],"name":"name","constant":true,"outputs":[{"name":"","type":"string","baseType":"string","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"view","payable":false,"gas":null}',
    formatted: 'name()',
  },
  '0x95d89b41': {
    fragment:
      '{"type":"function","inputs":[],"name":"symbol","constant":true,"outputs":[{"name":"","type":"string","baseType":"string","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"view","payable":false,"gas":null}',
    formatted: 'symbol()',
  },
  '0x18160ddd': {
    fragment:
      '{"type":"function","inputs":[],"name":"totalSupply","constant":true,"outputs":[{"name":"","type":"uint256","baseType":"uint256","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"view","payable":false,"gas":null}',
    formatted: 'totalSupply()',
  },
  '0xa9059cbb': {
    fragment:
      '{"type":"function","inputs":[{"name":"_to","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null},{"name":"_value","type":"uint256","baseType":"uint256","components":null,"arrayLength":null,"arrayChildren":null}],"name":"transfer","constant":false,"outputs":[{"name":"","type":"bool","baseType":"bool","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"nonpayable","payable":false,"gas":null}',
    formatted: 'transfer(address,uint256)',
  },
  '0x23b872dd': {
    fragment:
      '{"type":"function","inputs":[{"name":"_from","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null},{"name":"_to","type":"address","baseType":"address","components":null,"arrayLength":null,"arrayChildren":null},{"name":"_value","type":"uint256","baseType":"uint256","components":null,"arrayLength":null,"arrayChildren":null}],"name":"transferFrom","constant":false,"outputs":[{"name":"","type":"bool","baseType":"bool","components":null,"arrayLength":null,"arrayChildren":null}],"stateMutability":"nonpayable","payable":false,"gas":null}',
    formatted: 'transferFrom(address,address,uint256)',
  },
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': {
    fragment:
      '{"type":"event","inputs":[{"name":"owner","type":"address","baseType":"address","indexed":true,"components":null,"arrayLength":null,"arrayChildren":null},{"name":"spender","type":"address","baseType":"address","indexed":true,"components":null,"arrayLength":null,"arrayChildren":null},{"name":"value","type":"uint256","baseType":"uint256","indexed":false,"components":null,"arrayLength":null,"arrayChildren":null}],"name":"Approval","anonymous":false}',
    formatted: 'Approval(address,address,uint256)',
  },
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': {
    fragment:
      '{"type":"event","inputs":[{"name":"from","type":"address","baseType":"address","indexed":true,"components":null,"arrayLength":null,"arrayChildren":null},{"name":"to","type":"address","baseType":"address","indexed":true,"components":null,"arrayLength":null,"arrayChildren":null},{"name":"value","type":"uint256","baseType":"uint256","indexed":false,"components":null,"arrayLength":null,"arrayChildren":null}],"name":"Transfer","anonymous":false}',
    formatted: 'Transfer(address,address,uint256)',
  },
}

export const LOCAL_FRAGMENTS: Record<
  string,
  {
    fragment: string
    formatted: string
  }
> = {
  ...ERC20_FRAGMENTS,
}
