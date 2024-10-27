import { main } from './decoder.ts'

const appElement = document.querySelector<HTMLDivElement>('#app')

if (!appElement) {
  console.error('Could not find app element')
  throw new Error('Missing #app element')
}

const hash = '0xc0bd04d7e94542e58709f51879f64946ff4a744e1c37f5f920cea3d478e115d7'

appElement.innerHTML = `
  <div>
    <a>Decoded Transaction ${hash}</a>
    <pre id="json">${await main({ hash }).catch((err) => {
      console.error('Failed to decode transaction:', err)
      return 'Error decoding transaction'
    })}</pre>
  </div>
`
