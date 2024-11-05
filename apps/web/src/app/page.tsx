import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect to calldata page by default
  redirect('/decode')
}
