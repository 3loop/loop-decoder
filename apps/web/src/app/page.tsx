import { redirect } from 'next/navigation'
import { ROUTES } from '@/config'

export default function RootPage() {
  // Redirect to calldata page by default
  redirect(ROUTES.CALLDATA)
}
