'use client'

import React from 'react'
import Link from 'next/link'

import {
  Link2,
  Palette,
  Settings2
} from 'lucide-react'

import { cn } from '@/lib/utils'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { ExternalLinkItems } from './external-link-items'
import { ThemeMenuItems } from './theme-menu-items'

export const Header: React.FC = () => {
  const { open } = useSidebar()
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 p-2 flex justify-between items-center z-50 backdrop-blur bg-background/95',
        'w-full h-12'
      )}
    >
      {/* Left side - Sidebar trigger */}
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>

      {/* Center - AhamAI Logo */}
      <div className="flex items-center">
        <h1 className="font-lobster text-3xl text-foreground font-normal tracking-wide">AhamAI</h1>
      </div>

      {/* Right side - Settings menu */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings2 className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <ThemeMenuItems />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Link2 className="mr-2 h-4 w-4" />
                <span>Links</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <ExternalLinkItems />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Header
