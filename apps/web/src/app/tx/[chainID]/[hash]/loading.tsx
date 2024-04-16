import { Label } from '@/components/ui/label'
import { SidebarNav } from '@/components/ui/sidebar-nav'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PlayIcon } from 'lucide-react'
import { NetworkSelect } from '@/components/ui/network-select'
import { sidebarNavItems } from '@/app/data'

export default function Loading() {
  return (
    <div className="grid h-full items-stretch gap-6 md:grid-cols-[1fr_200px] animate-pulse ">
      <div className="md:order-1 flex flex-col space-y-4">
        <form>
          <div className="flex w-full items-center space-x-2">
            <NetworkSelect disabled={true} />

            <Input className="flex-1 flex" id="hash" name="hash" disabled={true} />
            <Button type="submit" disabled={true}>
              Decode
            </Button>
            <Button variant={'outline'} disabled={true} type="button">
              <PlayIcon className="mr-2 h-4 w-4" />
              Interpret
            </Button>
          </div>
        </form>

        <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-2 h-full">
          <div className="flex flex-col gap-2 col-span-2">
            <Label>Interpretation:</Label>

            <div className="flex flex-1 bg-muted rounded-md"></div>
          </div>

          <div className="flex flex-col gap-2 ">
            <Label>Decoded transaction:</Label>
            <div className="flex flex-1 bg-muted rounded-md"></div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-row justify-between items-center">
              <Label>Result:</Label>
            </div>
            <div className="flex flex-1 bg-muted rounded-md"></div>
          </div>
        </div>
      </div>

      <div className=" md:order-2">
        <div className="space-y-4 pl-4">
          <p className="text-lg font-semibold tracking-tight">Example Transactions</p>

          {Object.entries(sidebarNavItems).map(([heading, items]) => (
            <div key={heading}>
              <p className="text-sm text-muted-foreground pl-4">{heading}</p>
              <SidebarNav items={items} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
