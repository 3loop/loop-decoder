import { geSidebarNavItems } from '@/app/data'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@/components/ui/sidebar'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function ExampleTransactions({ path }: { path: string }) {
  return (
    <SidebarProvider className="items-start">
      <Sidebar collapsible="none" className="hidden md:flex">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Example Transactions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {geSidebarNavItems(path).map(({ title, items }, index) => (
                  <Collapsible key={title} title={title} defaultOpen={true} className="group/collapsible">
                    <SidebarMenuItem key={title}>
                      <CollapsibleTrigger>{title}</CollapsibleTrigger>

                      {items
                        ? items.map((item) => (
                            <CollapsibleContent key={item.title}>
                              <SidebarMenuSub key={item.title}>
                                <SidebarMenuSubItem key={item.title}>
                                  <SidebarMenuButton asChild>
                                    <a href={item.url}>{item.title}</a>
                                  </SidebarMenuButton>
                                </SidebarMenuSubItem>
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          ))
                        : null}
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
