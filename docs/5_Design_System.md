# Design System - SmartStore Comprehensive Solution

> **Version:** 2.0 (Merged)
> **Date:** 2026-01-05

## 1. Design Philosophy

### Core Keywords
- **Functional, High-Contrast, Professional, Fast**
- **Professional & Data-Centric**: 신뢰감을 주는 차분한 톤, 높은 정보 밀도
- **Clean & Focused**: 분석 결과(콘텐츠)가 주인공이 되도록 UI는 배경으로 물러남

### Design Metaphor
- **"Military-grade Cockpit"**: Dense information, handled clearly
- **Reference**: Modern SaaS Admin Dashboards (Vercel, Shadcn), Excel (Grid efficiency)

## 2. Color Palette

### Primary Colors (Brand & Trust)
- **Primary Dark**: `#0F172A` (Slate 900) - Headers, primary actions
- **Primary Light**: `#2563EB` (Blue 600) - Key highlights, buttons
- **Primary Foreground**: `#F8FAFC` (Slate 50) - Text on primary buttons

### Neutral Colors (Text & Surface)
- **Slate 900**: `#0F172A` - Headings, Main Data (강한 대비)
- **Slate 600**: `#475569` - Body Text, Descriptions
- **Slate 200**: `#E2E8F0` - Borders, Dividers
- **Slate 100**: `#F1F5F9` - Backgrounds for cards/panels
- **White**: `#FFFFFF` - Card Backgrounds, Canvas

### Semantic Colors
- **Blue 50**: `#EFF6FF` - Active states background
- **Emerald 500**: `#10B981` - Success, Positive (강점 분석, Shipped)
- **Rose 500 / Red 500**: `#EF4444` - Destructive, Negative (단점/개선점, Cancel)
- **Amber 500**: `#F59E0B` - Warning/Notice, Pending actions

## 3. Typography

### Font Families
- **Primary**: `Inter` (English), `Pretendard` (Korean)
- **Rationale**: 가독성 최우선, Korean optimization

### Type Scale
| Element | Size (Mobile / Desktop) | Weight | Use Case |
| :--- | :--- | :--- | :--- |
| **H1** | 24px / 30px | Bold | Page Titles |
| **H2** | 20px / 24px | SemiBold | Section Headers |
| **H3** | 16px | Medium | Card Titles |
| **Body** | 14px / 16px | Regular | Default Text (No tiny 12px for important text) |
| **Label** | 14px | Bold | Form labels |
| **Caption** | 12px | Regular | Meta Data, timestamps |

### Line Height
- **Headings**: 1.2
- **Body**: 1.5
- **Dense Data**: 1.3 (for tables)

## 4. Core Components (Shadcn/UI Base)

### Buttons
- **Primary**: Solid Blue-600 / Slate-900, Rounded-md, White Text
  - Use Case: "분석 시작", "주문 전송", Main CTAs
- **Secondary**: Outline Slate-300, Slate-700 Text
  - Use Case: "취소", "다시하기", Secondary actions
- **Destructive**: Solid Red-500, White Text
  - Use Case: "삭제", Critical actions
- **Ghost**: Transparent background
  - Use Case: Icon-only actions (Edit, Trash)

### Data Table (The Heart of the App)
- **Features**:
  - Sortable headers
  - Row selection checkboxes
  - Status badges (color-coded)
- **Mobile Modification**: Increase cell padding for touch targets (44px min)
- **Responsive**: Tables transform into "Card Lists" on mobile

### Cards (Dashboard/Result)
- **Style**:
  - White background
  - 1px Solid Slate-200 Border
  - Mild Shadow (`shadow-sm`)
  - Rounded-lg (8px)
- **Use Case**: Dashboard summaries (Daily Revenue, Order Count), Analysis results

### Input Fields
- **Size**: Large height (min 44px)
- **Placeholder**: Clear, helpful text ("스마트스토어 주소를 입력하세요")
- **Focus Ring**: Blue-500, 2px
- **Error State**: Red-500 border + error message below

### Badges (Status Indicators)
- **New Order**: Amber background
- **Shipped**: Emerald background
- **Cancelled**: Red background
- **Completed**: Slate background

## 5. Layout

### Desktop Layout
- **Structure**: Sidebar Navigation (Left, 240px) + Main Content (Right, flex)
- **Sidebar**: Logo at top, navigation menu, user profile at bottom

### Mobile Layout
- **Structure**: Bottom Navigation Bar (Easier for thumb use) OR Hamburger Menu
- **Bottom Nav Height**: 60px with 44px touch targets

### Responsive Breakpoints (Tailwind Default)
- **sm**: 640px
- **md**: 768px (Tablet threshold)
- **lg**: 1024px (Desktop threshold)
- **xl**: 1280px
- **2xl**: 1536px

### Grid System
- **Desktop**: 12-column grid
- **Mobile**: 4-column grid or stacked

## 6. Spacing & Sizing

### Spacing Scale (Tailwind)
- **4px**: `space-1` - Tight spacing
- **8px**: `space-2` - Component internal padding
- **16px**: `space-4` - Default spacing between elements
- **24px**: `space-6` - Section spacing
- **32px**: `space-8` - Large section spacing

### Touch Targets
- **Minimum**: 44px x 44px (Apple HIG / WCAG)
- **Preferred**: 48px x 48px

## 7. Animation & Transitions

### Principles
- **Fast & Subtle**: No distracting animations
- **Performance**: Use transform/opacity only (GPU-accelerated)

### Standard Transitions
- **Hover**: 150ms ease
- **Modal/Dialog**: 200ms ease-in-out
- **Page Transition**: 300ms ease

## 8. Accessibility

### WCAG 2.1 Level AA
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: Full support with visible focus states
- **Screen Reader**: Semantic HTML, ARIA labels where needed
- **Touch Targets**: 44px minimum

## 9. Dark Mode (Future Consideration)
- **Strategy**: CSS custom properties for easy theme switching
- **Priority**: Low for MVP (Focus on light mode first)
