import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

// Nonce-based CSP (see src/proxy.ts) requires per-request rendering:
// statically prerendered HTML cannot carry a fresh nonce, so its inline
// framework scripts would be blocked by the browser.
export const dynamic = 'force-dynamic'

// `viewportFit: 'cover'` lets the page paint under the iOS notch/home indicator,
// which is what makes `env(safe-area-inset-*)` resolve to a non-zero value.
// Without it the safe-area padding in MobileNav is dead code.
export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'SmartStore Manager',
  description: '스마트스토어 통합 관리 시스템',
  icons: {
    icon: '/store-manager-icon.png',
    apple: '/store-manager-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
