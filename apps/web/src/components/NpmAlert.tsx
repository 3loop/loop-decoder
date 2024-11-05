'use client'

import { Terminal } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useState } from 'react'

export function NpmAlert() {
  const [copied, setCopied] = useState(false)
  const onCopy = () => {
    window.navigator.clipboard.writeText('npm i @3loop/transaction-decoder')
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }

  return (
    <button className="mb-4 text-left w-full" onClick={onCopy}>
      <Alert variant="info">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Try it out!</AlertTitle>
        <AlertDescription>{copied ? 'Copied!' : <pre>npm i @3loop/transaction-decoder</pre>}</AlertDescription>
      </Alert>
    </button>
  )
}
