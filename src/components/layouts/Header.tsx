'use client'

import { Bell, Search, Menu, Store, ChevronDown, Check, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sidebar } from './Sidebar'
import { useStore } from '@/contexts/StoreContext'
import Link from 'next/link'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { stores, currentStore, switchStore, isLoading } = useStore()
  const now = new Date()
  const formattedDate = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const formattedTime = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <>
              <div className="hidden md:block h-4 w-px bg-border" />
              <p className="hidden md:flex text-muted-foreground text-sm items-center gap-1">
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{formattedTime}</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="주문, 상품 검색..."
            className="w-64 pl-9 bg-background"
          />
        </div>

        {!isLoading && stores.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {currentStore?.storeName || '스토어 선택'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {stores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => switchStore(store.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{store.storeName}</span>
                    <span className="text-xs text-muted-foreground">{store.platform}</span>
                  </div>
                  {currentStore?.id === store.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span>스토어 추가</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">알림</span>
        </Button>

        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            SM
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
