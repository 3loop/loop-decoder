import { Label } from '@/components/ui/label'
import { SidebarNav } from '@/components/ui/sidebar-nav'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NetworkSelect } from '@/components/ui/network-select'
import { geSidebarNavItems } from '@/app/data'

export default function Loading() {
  return (
    <div className="grid h-full items-stretch gap-6 grid-cols-1 lg:grid-cols-[1fr_200px] animate-pulse">
      <div className="md:order-1 flex flex-col space-y-4">
        <form>
          <div className="flex w-full lg:items-center gap-2 flex-col lg:flex-row">
            <div>
              <NetworkSelect disabled={true} />
            </div>
            <Input className="flex-1" id="hash" name="hash" disabled={true} />
            <div className="flex gap-2">
              <Button type="submit" disabled={true} className="flex-1">
                Decode
              </Button>
            </div>
          </div>
        </form>

        <div className="grid gap-6 h-full">
          <div className="flex flex-col gap-2 min-h-[40vh] lg:min-h-[initial]">
            <Label>Decoded transaction:</Label>
            <div className="flex flex-1 bg-muted rounded-md"></div>
          </div>
        </div>
      </div>

      <div className="md:order-2">
        <div className="space-y-4">
          <p className="text-lg font-semibold tracking-tight">Example Transactions</p>

          {Object.entries(geSidebarNavItems('decode')).map(([heading, items]) => (
            <div key={heading}>
              <p className="text-sm text-muted-foreground">{heading}</p>
              <SidebarNav items={items} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
