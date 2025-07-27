'use client'

import React from 'react'

import { User } from '@supabase/supabase-js'

import { cn } from '@/lib/utils'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

import GuestMenu from './guest-menu'
import UserMenu from './user-menu'

interface HeaderProps {
  user: User | null
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { open } = useSidebar()
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 p-2 flex justify-between items-center z-50 backdrop-blur bg-background/95 border-b border-border/10',
        'w-full h-12'
      )}
    >
      {/* Left side - Sidebar trigger */}
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>

      {/* Center - AhamAI Logo */}
      <div className="flex items-center">
        <h1 className="font-pacifico text-xl text-blue-600 font-normal">AhamAI</h1>
      </div>

      {/* Right side - User/Guest menu */}
      <div className="flex items-center gap-2">
        {user ? <UserMenu user={user} /> : <GuestMenu />}
      </div>
    </header>
  )
}

export default Header
