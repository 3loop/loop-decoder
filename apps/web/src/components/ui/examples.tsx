import { geSidebarNavItems } from '@/app/data'
import { SidebarNav } from '@/components/ui/sidebar-nav'

export function ExampleTransactions({ path }: { path: string }) {
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold tracking-tight">Example Transactions</p>

      {Object.entries(geSidebarNavItems(path)).map(([heading, items]) => (
        <div key={heading}>
          <p className="text-sm text-muted-foreground">{heading}</p>
          <SidebarNav items={items} />
        </div>
      ))}
    </div>
  )
}
