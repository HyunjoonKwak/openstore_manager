'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart,
  Send,
  Boxes,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'

// Mobile is the secondary environment: order checking and quick
// processing only. Four tabs — 주문 / 발송 / 재고 / 더보기 — everything
// else lives behind 더보기 (full sidebar) and points at read-only or
// PC-guided screens.

const mobileNavItems = [
  { label: '주문', href: '/orders', icon: ShoppingCart, exact: true },
  { label: '발송', href: '/orders/dispatch', icon: Send },
  { label: '재고', href: '/products/stock', icon: Boxes },
]

export function MobileNav() {
  const pathname = usePathname()

  // Safe-area padding sits on the bar itself so the tab row keeps its full
  // h-16 tap-target height instead of being squeezed on notched phones.
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-0.5 px-2 py-1.5',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="whitespace-nowrap text-xs font-medium leading-4">{item.label}</span>
            </Link>
          )
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
              <span className="whitespace-nowrap text-xs font-medium leading-4">더보기</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
