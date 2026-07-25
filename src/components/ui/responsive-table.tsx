'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

// Sub-pixel tolerance so fractional scroll offsets still count as "at the end".
const SCROLL_END_EPSILON = 1

export interface ResponsiveTableProps {
  /** Usually a single <Table>. */
  children: React.ReactNode
  /** Classes for the outer positioning wrapper. */
  className?: string
  /** Classes for the inner scroll container (the single scroll owner). */
  scrollClassName?: string
}

/**
 * Makes wide data tables usable on narrow screens.
 *
 * The inner container is the only horizontal scroll owner: the wrapper rendered
 * by <Table> is forced to `overflow: visible` so nested scrollbars cannot stack.
 * A right-edge fade hints that more columns exist and disappears at the end of
 * the scroll range, so desktop layouts with no overflow are left untouched.
 */
export function ResponsiveTable({
  children,
  className,
  scrollClassName,
}: ResponsiveTableProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [hasOverflowRight, setHasOverflowRight] = React.useState(false)

  const sync = React.useCallback(() => {
    const node = scrollRef.current
    if (!node) return
    const remaining = node.scrollWidth - node.clientWidth - node.scrollLeft
    setHasOverflowRight(remaining > SCROLL_END_EPSILON)
  }, [])

  React.useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    node.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    // Catches viewport changes that do not fire a window resize (sidebar collapse, etc.).
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync)
    observer?.observe(node)

    return () => {
      node.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      observer?.disconnect()
    }
  }, [sync])

  // Re-measure after every render so column toggles and data loads update the hint.
  // Re-setting the same boolean bails out, so this cannot loop.
  React.useEffect(sync)

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={scrollRef}
        data-slot="responsive-table-scroll"
        className={cn(
          'w-full overflow-x-auto',
          // Keep this element the single scroll owner by neutralising <Table>'s own wrapper.
          '[&_[data-slot=table-container]]:overflow-visible',
          scrollClassName
        )}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        data-slot="responsive-table-fade"
        style={{
          backgroundImage: 'linear-gradient(to right, transparent, var(--card))',
        }}
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-8',
          'motion-safe:transition-opacity motion-safe:duration-200',
          hasOverflowRight ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
