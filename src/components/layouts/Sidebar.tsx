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
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Two-level IA, always expanded — desktop is the primary environment
// and has the vertical room, so no collapse interactions.

interface NavLeaf {
  label: string
  href: string
  /** Exact match instead of prefix (for parent/child same-prefix routes) */
  exact?: boolean
}

interface NavSection {
  label: string
  icon: React.ElementType
  href?: string
  exact?: boolean
  children?: NavLeaf[]
}

const sections: NavSection[] = [
  { label: '대시보드', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: '주문',
    icon: ShoppingCart,
    children: [
      { label: '주문 목록', href: '/orders', exact: true },
      { label: '발송 처리', href: '/orders/dispatch' },
      { label: '공급업체 발주', href: '/orders/purchase' },
    ],
  },
  {
    label: '상품',
    icon: Package,
    children: [
      { label: '원본상품', href: '/products', exact: true },
      { label: '마켓 배포', href: '/products/listings' },
      { label: '재고', href: '/products/stock' },
    ],
  },
  {
    label: '판매페이지 스튜디오',
    icon: WandSparkles,
    children: [
      { label: '시장 조사', href: '/studio/research' },
      { label: 'AI 인터뷰', href: '/studio/interview' },
      { label: '벤치마킹', href: '/studio/benchmarking' },
      { label: '템플릿', href: '/studio/templates' },
    ],
  },
  { label: '정산', icon: Wallet, href: '/settlements' },
  { label: '배송조회', icon: Search, href: '/tracking' },
  { label: '공급업체', icon: Truck, href: '/suppliers' },
]

function isLeafActive(pathname: string, leaf: { href: string; exact?: boolean }) {
  return leaf.exact ? pathname === leaf.href : pathname.startsWith(leaf.href)
}

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
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
          <Store className="h-5 w-5" />
        </div>
        <h1 className="truncate text-base font-bold tracking-tight">Store Manager</h1>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {sections.map((section) => {
          if (!section.children) {
            const active = isLeafActive(pathname, { href: section.href!, exact: section.exact })
            return (
              <Link
                key={section.href}
                href={section.href!}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                  active
                    ? 'border border-primary/30 bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <section.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{section.label}</span>
              </Link>
            )
          }

          const sectionActive = section.children.some((leaf) => isLeafActive(pathname, leaf))
          return (
            <div key={section.label} className="mt-1">
              <div
                className={cn(
                  'flex min-h-9 items-center gap-3 px-3 py-1.5',
                  sectionActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <section.icon className="h-5 w-5" />
                <span className="text-sm font-semibold">{section.label}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-sidebar-border ml-[22px] pl-2">
                {section.children.map((leaf) => {
                  const active = isLeafActive(pathname, leaf)
                  return (
                    <Link
                      key={leaf.href}
                      href={leaf.href}
                      className={cn(
                        'flex min-h-8 items-center rounded-md px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-primary/20 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      {leaf.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-sidebar-border px-3 py-3">
        <Link
          href="/settings"
          className={cn(
            'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="text-sm font-medium">설정</span>
        </Link>
      </div>
    </aside>
  )
}
