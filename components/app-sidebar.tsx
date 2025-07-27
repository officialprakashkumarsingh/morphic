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

import { ChatHistory } from './chat-history'

export default async function AppSidebar() {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="flex flex-row justify-center items-center px-2 py-3">
        {/* Header content removed since logo is now in main header */}
      </SidebarHeader>
      
      <SidebarContent className="flex flex-col h-full">
        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="p-4">
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            }
          >
            <ChatHistory />
          </Suspense>
        </div>

        {/* Navigation Menu */}
        <div className="p-2 border-t">
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
                <Link href="/profile">
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
