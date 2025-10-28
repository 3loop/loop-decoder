'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { EXAMPLE_TXS, INTERPRETER_REPO } from '@/app/data'
import { useLocalStorage } from 'usehooks-ts'
import { PlayIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { DecodedTransaction } from '@3loop/transaction-decoder'
import type { Interpretation } from '@/lib/interpreter-server'
import CodeBlock from '@/components/ui/code-block'
import { NetworkSelect } from '@/components/ui/network-select'
import { fallbackInterpreter, getInterpreter } from '@3loop/transaction-interpreter'
import { ExampleTransactions } from '@/components/ui/examples'

interface FormProps {
  chainID: number
  decoded?: DecodedTransaction
  currentHash?: string
  error?: string
}

const PATH = 'interpret'

export default function DecodingForm({ decoded, currentHash, chainID, error }: FormProps) {
  const [result, setResult] = React.useState<Interpretation>()
  const [persistedSchema, setSchema] = useLocalStorage(decoded?.toAddress ?? 'unknown', '')
  const [isInterpreting, setIsInterpreting] = React.useState(false)
  const [userAddress, setUserAddress] = React.useState<string>('')

  const matchingExample = React.useMemo(() => {
    return Object.values(EXAMPLE_TXS)
      .flatMap((categoryTxs) => categoryTxs)
      .find((tx) => tx.hash.toLowerCase() === currentHash?.toLowerCase())
  }, [currentHash])

  const schema = React.useMemo(() => {
    if (persistedSchema !== '') return persistedSchema

    if (decoded?.toAddress == null) return null

    const schema = getInterpreter(decoded)

    if (schema != null) return schema

    return fallbackInterpreter
  }, [decoded, persistedSchema])

  const router = useRouter()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const hash = (e.target as any).hash.value
    router.push(`/${PATH}/${chainID}/${hash}`)
  }

  const onRun = React.useCallback(() => {
    if (schema && decoded != null) {
      const newInterpreter = {
        id: decoded.toAddress ?? 'unknown',
        schema: schema,
      }

      setIsInterpreting(true)
      setResult(undefined)

      // Call server-side API to run interpreter (avoids CORS issues)
      fetch('/api/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decodedTx: decoded,
          interpreter: newInterpreter,
          interpretAsUserAddress: userAddress || undefined,
        }),
      })
        .then((response) => response.json())
        .then((res) => {
          setResult(res)
        })
        .catch((error) => {
          setResult({
            tx: decoded,
            interpretation: null,
            error: error.message || 'Failed to interpret transaction',
          })
        })
        .finally(() => {
          setIsInterpreting(false)
        })
    }
  }, [schema, decoded, userAddress])

  // Set user address from example if available
  React.useEffect(() => {
    if (matchingExample && (matchingExample as any).interpretAsUserAddress) {
      setUserAddress((matchingExample as any).interpretAsUserAddress)
    }
  }, [matchingExample])

  // Run the interpreter on page load
  React.useEffect(() => {
    if (schema && decoded != null && result == null) {
      onRun()
    }
  }, [schema, decoded, result, onRun])

  const interpreterSourceLink = React.useMemo(() => {
    return matchingExample?.interpreter
      ? `${INTERPRETER_REPO}/interpreters/${matchingExample?.interpreter}.ts`
      : INTERPRETER_REPO
  }, [matchingExample])

  return (
    <div className="grid h-full items-stretch gap-6 grid-cols-1 lg:grid-cols-[1fr_200px]">
      <div className="md:order-1 flex flex-col space-y-4">
        <form onSubmit={onSubmit}>
          <div className="flex w-full lg:items-center gap-2 flex-col lg:flex-row">
            <div>
              <NetworkSelect
                defaultValue={chainID.toString()}
                onValueChange={(value) => {
                  const hash = currentHash || ''
                  router.push(`/${PATH}/${value}/${hash}`)
                }}
              />
            </div>
            <Input
              className="flex-1"
              id="hash"
              name="hash"
              placeholder={`Paste Ethereum transaction hash or click on examples`}
              defaultValue={currentHash}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Decode
              </Button>
              <Button variant={'outline'} onClick={onRun} type="button" className="flex-1" disabled={isInterpreting}>
                <PlayIcon className="mr-2 h-4 w-4" />
                {isInterpreting ? 'Interpreting...' : 'Interpret'}
              </Button>
            </div>
          </div>
          <div className="flex w-full lg:items-center gap-2 flex-col lg:flex-row mt-2">
            <Input
              className="flex-1"
              id="userAddress"
              name="userAddress"
              placeholder="Optional: interpret as user address"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
            />
          </div>
        </form>

        {error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-md whitespace-pre-line">{error}</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 h-full">
            <div className="flex flex-col gap-2 lg:col-span-2 min-h-[40vh] lg:min-h-[initial]">
              <Label>
                Interpretation:{' '}
                <a
                  href={interpreterSourceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  (Source Code)
                </a>
              </Label>

              <CodeBlock
                language="javascript"
                value={schema ?? ''}
                onChange={(value) => setSchema(value)}
                lineNumbers={true}
                readonly={false}
              />
            </div>

            <div className="flex flex-col gap-2  min-h-[40vh] lg:min-h-[initial]">
              <Label>Decoded transaction:</Label>
              <CodeBlock language="json" value={JSON.stringify(decoded, null, 2)} readonly={true} lineNumbers={false} />
            </div>

            <div className="flex flex-col gap-2  min-h-[40vh] lg:min-h-[initial]">
              <div className="flex flex-row justify-between items-center">
                <Label>Result:</Label>
              </div>

              {isInterpreting ? (
                <div className="flex items-center justify-center p-8 border rounded-md">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Interpreting transaction...</p>
                  </div>
                </div>
              ) : (
                <CodeBlock
                  language="json"
                  value={result?.error ? result?.error : JSON.stringify(result?.interpretation, null, 2)}
                  readonly={true}
                  lineNumbers={false}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="md:order-2">
        <ExampleTransactions path={PATH} />
      </div>
    </div>
  )
}
