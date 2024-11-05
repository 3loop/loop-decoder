import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { CalldataParams } from './types'
import { DEFAULT_CHAIN_ID } from '@/app/data'

export function useCalldataForm(initialData?: { data?: string; chainID?: number; contractAddress?: string }) {
  const router = useRouter()
  const form = useForm<CalldataParams>({
    defaultValues: {
      data: initialData?.data || '',
      chainID: (initialData?.chainID || DEFAULT_CHAIN_ID).toString(),
      contractAddress: initialData?.contractAddress || '',
    },
  })

  const onSubmit = (formData: CalldataParams) => {
    let path = `/calldata?data=${formData.data}`

    if (formData.chainID && formData.contractAddress) {
      path += `&chainID=${formData.chainID}&contractAddress=${formData.contractAddress}`
    }

    router.push(path)
  }

  return {
    form,
    onSubmit,
  }
}
