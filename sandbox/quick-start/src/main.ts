import { main } from './decoder.ts'

const appElement = document.querySelector<HTMLDivElement>('#app')

if (!appElement) {
  console.error('Could not find app element')
  throw new Error('Missing #app element')
}

const hash = '0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7'

appElement.innerHTML = `
  <div>
    <a>NOTE:
    <br />
    * Add your Etherscan API in decoder.ts file for proper calldata and logs decoding
    <br />
    * To fetch transaction traces, provide an URL with achive RPC and remove 'traceAPI: 'none'' from 'getPublicClient' function
    <br />
    </a>
    <br />
    <a>Transaction hash: ${hash}</a>
    <br />
    <pre id="json">${await main({ hash }).catch((err) => {
      console.error('Failed to decode transaction:', err)
      return 'Error decoding transaction'
    })}</pre>
  </div>
`
