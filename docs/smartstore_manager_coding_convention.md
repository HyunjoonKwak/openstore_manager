# Coding Convention & AI Collaboration Guide

## 1. Core Principles
- **"Trust, but Verify":** AI generates code, but User (Human) or Tests must verify logic.
- **Simplicity Over Cleverness:** Write code that a 50-year-old non-developer might *almost* understand. Explicit is better than implicit.
- **Mobile First:** Always consider how a UI element looks on a 360px wide screen before calling it done.

## 2. Tech Stack Specifics

### Markdown / Documentation
- Use English for code comments and commits (universal standard).
- Use Korean for UI Text (User requirement).

### Frontend (Next.js + React)
- **Functional Components:** Always use `const Component = () => {}`.
- **Typing:** Strict standard. No `any`. Define Interfaces for all Props and DB entities.
  - Example: `interface OrderProps { id: string; amount: number; }`
- **Hooks:** Extract complex logic into custom hooks (`useOrderLogic.ts`).
- **File Naming:**
  - Components: PascalCase (`OrderCard.tsx`)
  - Utilities/Hooks: camelCase (`formatDate.ts`, `useAuth.ts`)

### Styling (Tailwind)
- Use `clsx` or `tailwind-merge` for conditional classes.
- Avoid arbitrary values (`w-[123px]`). Use theme tokens (`w-32`).

### Database (Supabase)
- Use **Snake Case** for DB columns (`order_date`, `user_id`).
- Use **Camel Case** for JS variables transformed from DB (`orderDate`, `userId`).

## 3. Git & Version Control
- **Commit Messages:**
  - `feat: Add new order modal`
  - `fix: Resolve mobile table overflow`
  - `docs: Update PRD`
  - `style: Adjust button padding`

## 4. AI Prompting Strategy (for User)
- When asking for code, reference the **Document Filenames**.
  - *Bad:* "Make the login page."
  - *Good:* "Implement the Login Page following the design in `smartstore_manager_design_system.md` and using the auth flow in `smartstore_manager_trd.md`."
- If the AI gets stuck, ask it to "Check the folder structure and verify file paths".

## 5. Security Checklist
- [ ] Never commit `.env` files.
- [ ] Ensure RLS (Row Level Security) is enabled on all Supabase tables.
- [ ] Validate all inputs on both Client and Server side.
