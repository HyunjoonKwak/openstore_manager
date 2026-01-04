# Design System - SmartStore Manager

## 1. Design Philosophy
- **Keywords:** Functional, High-Contrast, Professional, Fast.
- **Metaphor:** "Military-grade Cockpit" - Dense information, handled clearly.
- **Reference:** Modern SaaS Admin Dashboards (e.g., Vercel Dashboard, Shadcn Examples), Excel (Grid efficiency).

## 2. Color Palette
Using a strictly functional palette with semantic naming.

### Primary (Brand)
- **Primary:** `#0F172A` (Slate 900) - Deep Navy/Black for headers and primary actions.
- **Primary Foreground:** `#F8FAFC` (Slate 50) - Text on primary buttons.

### Secondary & Accents
- **Secondary:** `#F1F5F9` (Slate 100) - Backgrounds for cards/panels.
- **Destructive:** `#EF4444` (Red 500) - Critical actions (Delete, Cancel).
- **Success:** `#10B981` (Emerald 500) - Completed states (Shipped).
- **Warning:** `#F59E0B` (Amber 500) - Pending actions (New Order).

### Typography
- **Font Family:** `Inter`, `Pretendard` (Korean optimization).
- **Scale:**
  - **H1:** 24px (Mobile) / 30px (Desktop) - Page Titles
  - **H2:** 20px / 24px - Section Headers
  - **Body:** 16px - Standard readable text (No tiny 12px text anywhere important).
  - **Label:** 14px - Form labels (Bold).

## 3. Core Components (Shadcn/UI Base)
- **Data Table:** The heart of the app.
  - Features: Sortable headers, Row selection checkboxes, Status badges.
  - *Modification:* Increase cell padding for touch targets on mobile.
- **Cards:** Used for dashboard summaries (Daily Revenue, Order Count).
  - Style: White background, subtle border, large number display.
- **Buttons:**
  - **Default:** Solid Primary color.
  - **Outline:** For secondary actions (Cancel, Back).
  - **Ghost:** For icon-only actions (Edit, Trash).
- **Input Fields:**
  - Large click areas (min 44px height).
  - Clear focus rings for accessibility.

## 4. Layout
- **Desktop:** Sidebar Navigation (Left) + Main Content (Right).
- **Mobile:** Bottom Navigation Bar (Easier for thumb use) or Hamburger Menu.
- **Responsiveness Key:** Tables transform into "Card Lists" on mobile (Stack columns vertically or hide non-essentials).
