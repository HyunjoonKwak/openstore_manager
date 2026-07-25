/**
 * Mobile-only tap target expander.
 *
 * Renders an invisible `::before` box centred on the control so the hit area reaches the
 * 44x44 CSS px accessibility minimum on phones (< 768px). The painted control keeps its
 * original size on every breakpoint, so desktop is untouched: every pseudo-element rule
 * lives inside the `max-md` media query.
 *
 * `min-h-full` / `min-w-full` clamp the expander to the control whenever the control is
 * already larger than 44px, so wide buttons never bleed sideways over their neighbours.
 * `relative` is intentionally unscoped so `tailwind-merge` can drop it when a caller
 * passes its own positioning class (e.g. `absolute`).
 */
export const touchTarget =
  'relative ' +
  'max-md:before:absolute max-md:before:top-1/2 max-md:before:left-1/2 ' +
  'max-md:before:h-11 max-md:before:w-11 ' +
  'max-md:before:min-h-full max-md:before:min-w-full ' +
  'max-md:before:-translate-x-1/2 max-md:before:-translate-y-1/2 ' +
  "max-md:before:content-['']"
