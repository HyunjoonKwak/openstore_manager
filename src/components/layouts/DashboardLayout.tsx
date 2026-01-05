'use client'

import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { StoreProvider } from '@/contexts/StoreContext'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <StoreProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className="hidden lg:flex" />

        <main className="flex flex-1 flex-col h-full overflow-hidden">
          {children}
        </main>

        <MobileNav />
      </div>
    </StoreProvider>
  )
}
