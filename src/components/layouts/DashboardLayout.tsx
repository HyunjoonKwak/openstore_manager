'use client'

import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MarketFilterProvider } from '@/contexts/MarketFilterContext'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <MarketFilterProvider>
        <div className="flex h-dvh w-full overflow-hidden">
          <Sidebar className="hidden lg:flex" />

          {/*
            Pages already reserve pb-20 (80px) for the 64px MobileNav. Now that the
            bar also grows by env(safe-area-inset-bottom), the same inset is added
            here so every page keeps clearance without touching each page's padding.
          */}
          <main className="flex h-full flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] lg:pb-0">
            {children}
          </main>

          <MobileNav />
        </div>
    </MarketFilterProvider>
  )
}
