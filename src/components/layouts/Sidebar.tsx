'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Sparkles,
  Settings,
  Truck,
  PlusCircle,
  Rocket,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '주문관리', href: '/orders', icon: ShoppingCart },
  { label: '공급업체', href: '/suppliers', icon: Truck },
  { label: '재고관리', href: '/inventory', icon: Package },
  { label: '정산관리', href: '/settlements', icon: DollarSign },
  { label: 'AI 상세페이지', href: '/ai-generator', icon: Sparkles },
]

const bottomNavItems: NavItem[] = [
  { label: '설정', href: '/settings', icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex w-64 flex-col border-r border-sidebar-border bg-sidebar',
        className
      )}
    >
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
          <Rocket className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">SmartStore</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-3 py-6 overflow-y-auto">
        <nav className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold uppercase text-muted-foreground mb-2">
            메인 메뉴
          </p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
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
                    className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Button className="w-full gap-2" size="default">
            <PlusCircle className="h-4 w-4" />
            AI 상품 생성
          </Button>

          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
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
