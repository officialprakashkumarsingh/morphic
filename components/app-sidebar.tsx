import { Suspense } from 'react'
import Link from 'next/link'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

export default async function AppSidebar() {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="flex flex-row justify-center items-center px-2 py-3">
        {/* Header content removed since logo is now in main header */}
      </SidebarHeader>
      
      <SidebarContent className="flex flex-col h-full">
        {/* Navigation Menu */}
        <div className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/search">
                  <span>New Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
