'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Adaptive dialog built on a single Radix dialog instance.
 *
 * Layout is driven purely by CSS, so the tree never remounts across the breakpoint and
 * focus / form state survives a rotation or a resize:
 *  - `sm` and up: the regular centred shadcn dialog (same widths, same animation).
 *  - below `sm`: a bottom sheet (full-bleed, bottom-anchored, rounded top, slide-up).
 *
 * Every mobile-only rule is written with the `max-sm:` variant so it lives in its own
 * media query. That keeps `tailwind-merge` from folding it into a caller's unprefixed
 * class (e.g. `max-w-2xl`) and keeps desktop output byte-identical to the plain dialog.
 *
 * <ResponsiveDialogContent> also caps itself at `85dvh` and scrolls its own body, so the
 * header stays pinned at the top and the footer stays reachable on short screens.
 */

const HEADER_DISPLAY_NAME = 'ResponsiveDialogHeader'
const FOOTER_DISPLAY_NAME = 'ResponsiveDialogFooter'

function getDisplayName(node: React.ReactNode): string | undefined {
  if (!React.isValidElement(node)) return undefined
  const { type } = node
  if (typeof type === 'string') return undefined
  return (type as { displayName?: string }).displayName
}

function ResponsiveDialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="responsive-dialog" {...props} />
}

function ResponsiveDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return (
    <DialogPrimitive.Trigger data-slot="responsive-dialog-trigger" {...props} />
  )
}

function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="responsive-dialog-close" {...props} />
}

function ResponsiveDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="responsive-dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50',
        'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
}

interface ResponsiveDialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** Renders the top-right close button. */
  showCloseButton?: boolean
  /** Extra classes for the internal scroll container that wraps the body. */
  bodyClassName?: string
}

function ResponsiveDialogContent({
  className,
  bodyClassName,
  children,
  showCloseButton = true,
  ...props
}: ResponsiveDialogContentProps) {
  // Split the children into the three fixed zones so the middle one can own the scroll.
  // Call sites keep their existing markup: anything that is not a header or a footer is body.
  const childList = React.Children.toArray(children)
  const header = childList.filter(
    (child) => getDisplayName(child) === HEADER_DISPLAY_NAME
  )
  const footer = childList.filter(
    (child) => getDisplayName(child) === FOOTER_DISPLAY_NAME
  )
  const body = childList.filter((child) => {
    const displayName = getDisplayName(child)
    return (
      displayName !== HEADER_DISPLAY_NAME && displayName !== FOOTER_DISPLAY_NAME
    )
  })

  return (
    <DialogPrimitive.Portal data-slot="responsive-dialog-portal">
      <ResponsiveDialogOverlay />
      <DialogPrimitive.Content
        data-slot="responsive-dialog-content"
        className={cn(
          // Desktop / default: identical geometry to <DialogContent>.
          'bg-background fixed top-[50%] left-[50%] z-50 flex max-h-[85dvh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg',
          // Mobile: bottom sheet, full-bleed, safe-area aware.
          'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0',
          'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-b-0 max-sm:p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]',
          // Animation: zoom on desktop, slide-up on mobile, none when motion is reduced.
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
          'max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom',
          className
        )}
        {...props}
      >
        {/* Sheet grabber: a mobile-only affordance, purely decorative. */}
        <div
          aria-hidden="true"
          data-slot="responsive-dialog-handle"
          className="bg-muted-foreground/30 mx-auto -mb-1 h-1.5 w-10 shrink-0 rounded-full sm:hidden"
        />
        {header}
        {body.length > 0 && (
          <div
            data-slot="responsive-dialog-body"
            className={cn(
              // `min-h-0` lets this flex child shrink below its content height so it,
              // and not the viewport, is the element that scrolls.
              // `-mx-1 px-1` keeps focus rings from being clipped without shifting content.
              '-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1',
              bodyClassName
            )}
          >
            {body}
          </div>
        )}
        {footer}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="responsive-dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="responsive-dialog-header"
      // `max-sm:pr-8` keeps long titles clear of the close button in the tighter sheet padding.
      className={cn(
        'flex shrink-0 flex-col gap-2 text-left max-sm:pr-8',
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogHeader.displayName = HEADER_DISPLAY_NAME

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="responsive-dialog-footer"
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        // The footer sits outside the scroll area on phones, so a rule separates it.
        'max-sm:border-border max-sm:border-t max-sm:pt-3',
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogFooter.displayName = FOOTER_DISPLAY_NAME

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="responsive-dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="responsive-dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
