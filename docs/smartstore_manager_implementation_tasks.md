# TASKS: SmartStore Manager Implementation Plan

## [M0] Project Initialization
- [ ] **Task 0.1: Scaffolding**
  - **Context:** Initialize Next.js 14 project with Typescript, Tailwind, ESLint.
  - **Instruction:** Create a new Next.js app using `create-next-app`. Configure strict mode. Setup Shadcn/UI init.
  - **Output:** Running "Hello World" app with basic layout.

- [ ] **Task 0.2: Supabase Integration**
  - **Context:** Connect local app to Supabase project.
  - **Instruction:** Install `@supabase/ssr` `@supabase/supabase-js`. Create `utils/supabase` client/server helpers. Setup environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`).
  - **Output:** Successful connection log in console.

## [M1] Design System & Layout
- [ ] **Task 1.1: Base Components**
  - **Reference:** `smartstore_manager_design_system.md`
  - **Instruction:** Install Shadcn components: `button`, `input`, `card`, `table`, `dialog`, `dropdown-menu`, `badge`. customize `globals.css` with the Color Palette defined in Design System.
  - **Output:** A `/design` route showing all components in the defined style.

- [ ] **Task 1.2: App Shell (Responsive)**
  - **Context:** PC Sidebar / Mobile Bottom Nav.
  - **Instruction:** Create `layouts/DashboardLayout`. Implement a responsive navigation structure that follows the Design System.
  - **Output:** Navigation works, switches layout on resize.

## [M2] Auth & User Management
- [ ] **Task 2.1: Authentication Flow**
  - **Context:** Email/Password login.
  - **Instruction:** Create Login/Signup pages using Supabase Auth. Redirect to `/dashboard` on success. Handle errors (wrong password) gracefully.
  - **Output:** Functional login/logout flow.

- [ ] **Task 2.2: User/Store Profile**
  - **Reference:** `smartstore_manager_db_schema.md`
  - **Instruction:** Create `users` and `stores` tables in Supabase (via SQL Editor or Migration). Create a profile settings page to edit Store Name and API Keys.

## [M3] Core Features (MVP)
- [ ] **Task 3.1: Integrated Dashboard Integration (FEAT-1)**
  - **Context:** Display dummy order data in Table.
  - **Instruction:** Create `orders` table. Create `Dashboard` page with Summary Cards (Today's Orders) and Recent Orders Table. Use Mock Data first.
  - **Output:** Professional dashboard UI with mocked data.

- [ ] **Task 3.2: Order Management CRUD**
  - **Instruction:** Connect Dashboard to Real DB. Implement "Add Order" (Manual) and "Edit Status".
  - **Output:** Ability to Create/Read/Update/Delete orders.

- [ ] **Task 3.3: One-Click Send (FEAT-2)**
  - **Context:** Select orders -> Send text.
  - **Instruction:** Add "Select" capability to Order Table. Add "Send to Supplier" button. For MVP, implement a Modal that generates the text string to copy/paste (Simulate API integration).
  - **Output:** User selects 3 orders, clicks button, gets a formatted text string to send.

- [ ] **Task 3.4: Supplier Management**
  - **Instruction:** Create `suppliers` CRUD. Link Products to Suppliers.
  - **Output:** Ability to manage who supplies what.

## [M4] Integrations & Advanced Features
- [ ] **Task 4.1: AI Detail Page Generator (FEAT-4)**
  - **Context:** Text-to-page generation.
  - **Instruction:** Create `pages/generator`. Input form (Product Name, Key features). Connect to OpenAI API (Mock first if no key) to generate sales copy. Display in a simple template.
  - **Output:** Input -> Generated HTML Preview.

- [ ] **Task 4.2: Logistics API (FEAT-3)**
  - **Instruction:** Create structure for Hanjin API. Implement "Input Tracking Number" field that updates Order Status to "Shipped".

## [M5] Polish & Deploy
- [ ] **Task 5.1: Mobile Optimization**
  - **Instruction:** rigorous testing on Mobile view. Ensure buttons are tappable, tables don't overflow (scroll or stack).
  - **Output:** Mobile-perfect UI.

- [ ] **Task 5.2: Deployment**
  - **Instruction:** Deploy to Vercel. Map Supabase production environment.
  - **Output:** Live URL.
