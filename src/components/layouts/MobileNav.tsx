'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '주문', href: '/orders', icon: ShoppingCart },
  { label: '공급업체', href: '/suppliers', icon: Truck },
  { label: '재고', href: '/inventory', icon: Package },
  { label: '설정', href: '/settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
