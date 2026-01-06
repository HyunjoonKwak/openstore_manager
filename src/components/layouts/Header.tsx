'use client'

import { Bell, Search, Menu, Store, ChevronDown, Check, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sidebar } from './Sidebar'
import { useStore } from '@/contexts/StoreContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
              <Menu className="h-4 w-4" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && (
            <>
              <div className="hidden md:block h-3 w-px bg-border" />
              <p className="hidden md:flex text-muted-foreground text-xs items-center gap-1">
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{formattedTime}</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="검색..."
            className="w-48 h-8 pl-8 text-sm bg-background"
          />
        </div>

        {!isLoading && stores.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Store className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {currentStore?.storeName || '스토어'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {stores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => switchStore(store.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{store.storeName}</span>
                    <span className="text-xs text-muted-foreground">{store.platform}</span>
                  </div>
                  {currentStore?.id === store.id && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Plus className="h-3.5 w-3.5" />
                  <span>스토어 추가</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="sr-only">알림</span>
        </Button>

        <Avatar className="h-7 w-7 cursor-pointer">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            SM
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
