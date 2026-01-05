'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
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

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
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
