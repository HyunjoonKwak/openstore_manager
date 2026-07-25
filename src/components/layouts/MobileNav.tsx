'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'

const mobileNavItems = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '주문', href: '/orders', icon: ShoppingCart },
  { label: '발송', href: '/orders/dispatch', icon: Send },
  { label: '상품', href: '/inventory', icon: Package },
]

export function MobileNav() {
  const pathname = usePathname()

  // Safe-area padding sits on the bar itself so the tab row keeps its full
  // h-16 tap-target height instead of being squeezed on notched phones.
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive = item.href === '/orders'
            ? pathname === '/orders' || pathname === '/orders/send'
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
              <span className="text-xs font-medium leading-4 whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium leading-4 whitespace-nowrap">더보기</span>
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
