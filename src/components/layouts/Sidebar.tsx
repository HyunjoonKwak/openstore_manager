'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Settings,
  Truck,
  Wallet,
  WandSparkles,
  Search,
  Send,
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/contexts/StoreContext'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  activeHrefs?: string[]
}

const navItems: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '주문관리', href: '/orders', icon: ShoppingCart },
  { label: '발송처리', href: '/orders/dispatch', icon: Send },
  { label: '상품관리', href: '/inventory', icon: Package },
  { label: '정산관리', href: '/settlements', icon: Wallet },
  { label: '공급업체', href: '/suppliers', icon: Truck },
  { label: '배송조회', href: '/tracking', icon: Search },
  {
    label: '판매페이지 스튜디오',
    href: '/benchmarking',
    icon: WandSparkles,
    activeHrefs: ['/benchmarking'],
  },
]

const bottomNavItems: NavItem[] = [
  { label: '설정', href: '/settings', icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { currentStore, isLoading } = useStore()

  return (
    <aside
      className={cn(
        'flex w-64 flex-col border-r border-sidebar-border bg-sidebar',
        className
      )}
    >
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground shrink-0">
          <Store className="h-5 w-5" />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="h-5 w-28 bg-muted animate-pulse rounded" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold tracking-tight truncate">
              {currentStore?.storeName || 'Store Manager'}
            </h1>
            {currentStore?.platform && (
              <span className="text-xs text-muted-foreground">{currentStore.platform}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-3 py-6 overflow-y-auto">
        <nav className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold uppercase text-muted-foreground mb-2">
            메인 메뉴
          </p>
          {navItems.map((item) => {
            const isActive = item.activeHrefs
              ? item.activeHrefs.some((href) => pathname.startsWith(href))
              : item.href === '/orders'
              ? pathname === '/orders' || pathname === '/orders/send'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-11 items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 min-w-5 px-1.5 text-xs font-bold bg-primary/20 text-primary border border-primary/30"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-11 items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
