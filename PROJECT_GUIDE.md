# Retail Shop Manager: Complete Project Guide

**Product:** Offline-first desktop inventory, billing (POS), staff and reporting software for a retail shop that sells **clothes (men, women, T-shirts), cosmetics and perfumes**.
**Platform:** Windows 10/11 (64-bit) desktop app. Works with **no internet**. Optional local-network mode so a second computer (cashier) can use the same data.
**Goal:** Professional, user-friendly, maintainable and scalable software, **built flexible from day one** so new requirements can be added later without rewriting (see Section 16).

> **How to use this file:** Put it in the project root as `PROJECT_GUIDE.md`. Tell the AI agent: *"Read PROJECT_GUIDE.md fully. Follow it strictly. Work one phase at a time (Section 13). Stop after each phase, run tests, and wait for my approval."* Do not ask the agent to build everything in one go.

---

## 1. Rules for the AI Agent (read first)

1. Follow the stack, folder structure and naming in this guide. Do not swap technologies without asking.
2. Work **phase by phase** (Section 13). After each phase: run lint, type-check and tests, then summarize what changed.
3. **Money and stock logic must have unit tests** before any screen uses it.
4. Never store money as floating point. Use **integer minor units** (paisa = rupees x 100).
5. Every write that touches stock or money runs inside **one database transaction**.
6. Never hard-delete business records. Use **soft delete** or **void/cancel**.
7. All user-facing text goes through the **i18n layer** (English and Urdu). No hard-coded strings in components.
8. Keep files small and focused. Business logic lives in **services**, not in UI components or route handlers.
9. Validate all input with **Zod** (shared between UI and server).
10. Add short comments only where the reason is not obvious. Write clear commit messages, one commit per feature.
11. If a requirement is unclear, **ask** instead of guessing.
12. Do not add features that are not in this guide. Put new ideas in `docs/IDEAS.md`.
13. **Configurable, not hard-coded.** Product attributes, categories, payment methods, discount limits, receipt layout, roles, tax and business rules come from the database/settings, not from constants in code (Section 16).
14. **Modular.** Each feature area is a self-contained module registered through the module registry, so it can be switched on/off and new modules can be added without editing others (Section 16.2).
15. **Never break existing data.** Every schema change is a new migration that keeps old data working. Never edit an old migration.

---

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Language | **TypeScript** (strict mode) everywhere | Fewer bugs, better AI output |
| Package manager | **pnpm** workspaces (monorepo) | Shared code between UI, server and desktop |
| Desktop shell | **Electron** | Windows installer, printing, file access, runs the local server |
| UI framework | **Next.js (App Router) + React**, built as a **static export** | Familiar, fast UI |
| Styling | **Tailwind CSS + shadcn/ui + Radix UI**, **lucide-react** icons | Clean, accessible, consistent |
| Forms | **React Hook Form + Zod** | Fast forms, strong validation |
| Data fetching | **TanStack Query** | Caching, loading and error states |
| Tables | **TanStack Table** (+ virtualization for big lists) | Sorting, filtering, paging |
| UI state | **Zustand** | Cart, sidebar, small state |
| Charts | **Recharts** | Dashboard and reports |
| i18n | **i18next / react-i18next** (English + Urdu, RTL support) | Staff-friendly language |
| Local server | **Fastify** (runs inside Electron main process, or standalone Node) | Same API for desktop and LAN cashier |
| Database | **SQLite** via **better-sqlite3** | Offline, fast, single file, ACID |
| ORM / migrations | **Drizzle ORM + drizzle-kit** | Type-safe queries and versioned migrations |
| Auth | **bcryptjs** (pure JS, no native build issues) + session tokens | Safe passwords |
| Barcodes | **JsBarcode** (labels), USB scanner works as keyboard input | Simple |
| Receipts and printing | HTML receipt template + Electron silent print (80mm thermal), optional ESC/POS | Works with most printers |
| Excel / PDF | **exceljs**, **pdfmake** | Report export |
| Attendance device | **node-zklib** (ZKTeco-type machines) + CSV/USB import fallback | Depends on machine model |
| Logging | **pino** (to a rotating log file) | Support and debugging |
| Testing | **Vitest** (unit), **Playwright** (end-to-end) | Safe changes |
| Quality | ESLint, Prettier, Husky pre-commit | Consistent code |
| Packaging | **electron-builder** (NSIS installer), optional **electron-updater** | One `.exe` installer |

**Scalability path (do not build now, but do not block it):** every table has `uuid`, `created_at`, `updated_at`, and `branch_id`. The server layer is separate from the UI, so it can later run on a cloud server with PostgreSQL for multi-branch sync. Drizzle keeps the data layer swappable.

---

## 3. Architecture

```
+---------------------------------------------------------------+
|  Owner laptop (MAIN COMPUTER)                                 |
|                                                               |
|  Electron shell                                               |
|   |- Next.js static UI (window)                               |
|   |- Fastify server (REST API, port 3000)                     |
|   |     |- Routes -> Services -> Repositories (Drizzle)       |
|   |     |- Auth, permissions, audit log                       |
|   |- SQLite database file  (userData/shop.db)                 |
|   |- Backup scheduler, printing, attendance sync              |
+------------------------+--------------------------------------+
                         | shop router / LAN (no internet)
                  +------+-------+
                  | Cashier PC   |  opens http://<main-ip>:3000 in browser
                  | (POS only)   |  (or same app in "client mode")
                  +--------------+
```

**Key decisions**

- The **UI always talks to the server over HTTP** (`/api/...`), even on a single computer. This means one code path for single-PC use and LAN use.
- **Only the main computer opens the SQLite file.** Never share the database file over a network folder.
- The server listens on `127.0.0.1` by default. **LAN mode** is a setting that makes it listen on the network, and requires login.
- Layers: `Route -> Service (business rules, transactions) -> Repository (queries) -> Database`. Routes never contain business logic.
- All shared types and Zod schemas live in `packages/shared`.

---

## 4. Folder Structure

```
retail-shop-manager/
  PROJECT_GUIDE.md
  package.json
  pnpm-workspace.yaml
  docs/                     # IDEAS.md, API.md, USER_MANUAL.md
  packages/
    shared/                 # Zod schemas, types, constants, money helpers
      src/
        money.ts            # toMinor, fromMinor, format PKR
        schemas/            # product.ts, sale.ts, user.ts ...
        permissions.ts      # permission keys and role defaults
        i18n/               # en.json, ur.json
  apps/
    server/                 # Fastify API + business logic + database
      src/
        db/
          schema/           # Drizzle table definitions (one file per area)
          migrations/       # generated SQL migrations
          client.ts         # opens SQLite, sets pragmas, runs migrations
        modules/
          auth/  users/  catalog/  inventory/  purchasing/
          sales/  returns/  customers/  expenses/
          staff/  attendance/  salary/  reports/
          settings/  backup/  printing/  audit/
          # each module: routes.ts, service.ts, repository.ts, *.test.ts
        plugins/            # auth, error handler, rate limit, request logging
        server.ts
    ui/                     # Next.js (static export)
      src/
        app/                # routes: /login /dashboard /pos /products ...
        components/
          ui/               # shadcn components
          layout/           # Sidebar, Topbar, PageHeader
          shared/           # DataTable, ConfirmDialog, EmptyState, MoneyText
        features/           # pos/, products/, inventory/, staff/ ... (feature folders)
        lib/                # api client, query client, hooks
        stores/             # zustand stores
    desktop/                # Electron shell
      src/
        main.ts             # create window, start server, tray, single instance
        preload.ts          # minimal, contextIsolation ON
        printing.ts  backup-scheduler.ts  updater.ts
      electron-builder.yml
  tests/
    e2e/                    # Playwright flows
```

---

## 5. Users and Permissions

**Default roles:** Owner/Admin, Manager, Cashier. Owner can create custom roles. Permissions are checked on the **server**, and the UI hides what the user cannot do.

| Permission key | Owner | Manager | Cashier |
|---|:-:|:-:|:-:|
| `sale.create` | Yes | Yes | Yes |
| `sale.discount` (up to a set limit) | Yes | Yes | Limited |
| `sale.void` | Yes | Yes | No |
| `return.create` | Yes | Yes | Yes (needs approval above a set amount) |
| `product.view` | Yes | Yes | Yes |
| `product.edit` / `product.price` | Yes | Yes | No |
| `cost.view` (cost price, profit) | Yes | Yes | **No** |
| `stock.adjust` | Yes | Yes | No |
| `purchase.manage` | Yes | Yes | No |
| `customer.manage` / `ledger.view` | Yes | Yes | View only |
| `expense.manage` | Yes | Yes | No |
| `staff.manage` / `attendance.manage` | Yes | Yes | No |
| `salary.manage` | Yes | No | No |
| `report.view` | Yes | Yes | Daily summary only |
| `settings.manage` / `user.manage` | Yes | No | No |
| `backup.manage` | Yes | Yes | No |
| `audit.view` | Yes | No | No |

Rules: passwords hashed with bcrypt; lock the account after 5 failed attempts for a few minutes; cashier may use a quick **PIN login**; auto-logout after a configurable idle time; every sensitive action goes to the **audit log**.

---

## 6. Database Design (SQLite + Drizzle)

**Conventions for every table:** `id` (integer primary key), `uuid` (text, unique), `branch_id` (default 1), `created_at`, `updated_at`, `created_by`, `is_deleted` (soft delete). Money columns are **integers in minor units**. Dates are stored as ISO text in UTC.

**Extensibility columns:** customers, employees, suppliers, sales and expenses also get a `custom_fields` (JSON) column so small extra fields can be added later without a migration.

**SQLite settings on startup:** `journal_mode = WAL`, `synchronous = FULL`, `foreign_keys = ON`, `busy_timeout = 5000`. Run `PRAGMA integrity_check` on startup.

### 6.1 Core tables

| Area | Table | Key fields |
|---|---|---|
| Access | `users` | username, password_hash, pin_hash, role_id, full_name, is_active, failed_attempts, locked_until |
| | `roles` | name, permissions (JSON list) |
| | `audit_log` | user_id, action, entity, entity_id, old_value, new_value, at |
| | `settings` | key, value (shop name, logo, currency, receipt footer, tax %, LAN mode, language) |
| Catalog | `categories` | name, parent_id, profile (`clothing` / `cosmetic` / `perfume` / `custom`, sets default attributes and rules), is_active |
| | `brands` | name |
| | `products` | name, brand_id, category_id, gender (`men` / `women` / `unisex`), description, has_expiry, return_rule (`allowed` / `not_if_opened` / `never`), image_path, custom_fields (JSON) |
| | `product_variants` | product_id, sku, barcode (unique), cost_price, sale_price, reorder_level, is_tester, custom_fields (JSON). Size, color, shade, volume etc. are **attributes** (next rows), not fixed columns. |
| | `attribute_definitions` | name (Size, Color, Shade, Volume ml...), input_type (`text` / `number` / `select` / `color` / `date`), options (JSON list), is_variant_axis (creates variants), is_required, sort_order |
| | `category_attributes` | category_id, attribute_id, is_required, sort_order. Products inherit the attributes of their category. |
| | `variant_attribute_values` | variant_id, attribute_id, value |
| Stock | `stock_levels` | variant_id, quantity (cached, updated only inside transactions) |
| | `batches` | variant_id, batch_no, expiry_date, quantity_remaining, purchase_item_id |
| | `stock_movements` | variant_id, batch_id, type (`opening` / `purchase` / `sale` / `return_in` / `return_out` / `adjust` / `damage` / `transfer`), quantity (+/-), unit_cost, ref_type, ref_id, note |
| Buying | `suppliers` | name, phone, address, opening_balance |
| | `purchases` | supplier_id, invoice_no, date, subtotal, discount, total, paid, status |
| | `purchase_items` | purchase_id, variant_id, quantity, unit_cost, batch_no, expiry_date |
| | `supplier_payments` | supplier_id, amount, method, date, note |
| Selling | `customers` | name, phone, address, credit_limit, opening_balance |
| | `sales` | invoice_no (unique, sequential), customer_id, cashier_id, subtotal, discount, tax, total, paid, change, status (`completed` / `voided`), voided_by, void_reason |
| | `sale_items` | sale_id, variant_id, batch_id, quantity, unit_price, unit_cost, discount, line_total |
| | `sale_payments` | sale_id, method (`cash` / `card` / `bank` / `credit`), amount, reference |
| | `returns` | sale_id, customer_id, type (`return` / `exchange`), refund_method, total, reason, approved_by |
| | `return_items` | return_id, sale_item_id, variant_id, quantity, restock (true/false), amount |
| | `customer_ledger` | customer_id, type (`sale` / `payment` / `return` / `adjust`), amount (+/-), ref_type, ref_id, balance_after |
| Money | `expense_categories`, `expenses` | category_id, amount, date, method, note |
| Staff | `employees` | name, phone, cnic, designation, join_date, monthly_salary, device_user_id, shift_id, is_active |
| | `shifts` | name, start_time, end_time, grace_minutes, weekly_off |
| | `attendance_punches` | employee_id, punched_at, source (`device` / `manual` / `import`), device_id |
| | `attendance_days` | employee_id, date, status (`present` / `absent` / `late` / `half_day` / `leave` / `holiday`), check_in, check_out, late_minutes, overtime_minutes, is_manual_override, note |
| | `salary_advances` | employee_id, amount, date, note, deducted_in_run_id |
| | `salary_runs` | month, status (`draft` / `approved` / `paid`) |
| | `salary_items` | run_id, employee_id, base, absent_deduction, late_deduction, advance_deduction, bonus, overtime_pay, net, paid_at |
| System | `attendance_devices` | name, ip, port, model, last_sync_at |
| | `backups_log` | file_path, size, type, verified, created_at |

### 6.2 Data rules (must be enforced in services and tests)

- **Stock is a ledger.** `stock_movements` is the source of truth. `stock_levels.quantity` must always equal the sum of movements for that variant (write a test and an admin "Recount stock" tool).
- **Expiry items** (cosmetics, perfumes with expiry): sell using **FEFO** (first expired, first out) from `batches`. Block or warn on expired batches.
- **Testers** (`is_tester`) never appear as sellable stock.
- **Negative stock:** blocked by default. A setting allows it with a warning for the Owner only.
- **Invoice numbers** are sequential with no gaps, generated inside the sale transaction. Voided invoices keep their number.
- **Price at time of sale** is copied into `sale_items`, so later price changes never alter old bills.
- **Returns** restore stock only when `restock = true`. Category rule: opened cosmetics and perfumes are not returnable unless the Manager overrides.
- **Void a sale** = reverse the stock and ledger entries in one transaction, with a required reason.
- **Salary** = base − absent deduction − late deduction − advances (this month's installment) + bonus + overtime. Formulas and rounding are configurable and documented in `docs/SALARY_RULES.md`.

---

## 7. Features and Functionality

### 7.1 Dashboard
Today's sales, bills, profit (Owner/Manager only), cash in hand, low stock count, near-expiry count, top 5 products, sales chart (7/30 days), pending customer credit, pending supplier payments, last backup status, staff present today.

### 7.2 Products and Variants
- Add a product once, then add **variants** quickly (a grid: choose sizes and colors, and it creates all combinations).
- The product form is **driven by the category's attribute list**. Defaults are seeded: **Clothing** (Size, Color), **Cosmetic** (Shade, Volume, expiry), **Perfume** (Volume ml, tester flag, expiry optional). The owner can add new categories and new attributes (for example Fabric, Fragrance family, Shoe size) in Settings without a developer.
- Auto-generated SKU and barcode; scan or type an existing barcode.
- Images (optional), categories, brands, gender, reorder level.
- **Bulk import from Excel** with a preview and error report. **Bulk price update.**
- **Barcode label printing** (choose size, quantity, include price and shop name).
- Search by name, SKU, barcode, brand, category.

### 7.3 Inventory
Opening stock, stock in (via purchase), adjustment (damage, loss, found) with reason, stock count / stock take screen, stock value (cost and sale), low stock list, **expiry list** (expired, 30/60/90 days), stock movement history per variant, dead stock (no sales in N days).

### 7.4 Purchasing and Suppliers
Purchase entry (scan or search items, batch and expiry for cosmetics), supplier list and ledger, supplier payments (partial or full), purchase returns, print purchase invoice, payable balance.

### 7.5 POS (Billing), the most important screen
- Always-focused **search/scan box**; scanning adds the item at once. Same item scanned twice increases quantity.
- Variant picker for items without a barcode (size/color chips).
- Cart with quantity +/-, line discount, bill discount (percent or amount, limited by role).
- Customer attach (optional), walk-in by default.
- **Split payment** (cash + card + credit), change calculation, **hold and resume bill**, quick items.
- Shortcuts: `F2` search, `F3` customer, `F4` discount, `F6` hold, `F8` pay, `F9` print, `Esc` cancel.
- Print receipt (80mm thermal or A4), reprint, share as PDF.
- Recent bills list, void (permission required), **close day / cash count**.
- Works quickly with 10,000+ variants (indexed search, debounced, virtual list).

### 7.6 Returns and Exchanges
Find the bill by invoice number, phone or scan; choose items and quantity; return reason; refund as cash, store credit or customer ledger; exchange (return + new sale in one flow); restock or send to damaged.

### 7.7 Customers and Credit (Udhar)
Customer list, history, credit limit, ledger, receive payment (partial), statement print, reminder list of overdue balances.

### 7.8 Expenses
Categories (rent, electricity, transport, tea, etc.), daily entry, monthly summary, included in profit.

### 7.9 Staff, Attendance and Salary
- **Employees:** profile, shift, salary, machine user ID.
- **Attendance:**
  - **Manual mode:** daily grid to mark present / absent / half day / leave.
  - **Device mode:** read punches from the fingerprint machine over the network (`node-zklib`), or import a CSV/USB export. Map `device_user_id` to the employee.
  - Convert punches into daily status using the **shift rules** (late after grace minutes, half day below X hours, weekly off, holidays).
  - Manager can **correct** any day (kept in audit log).
- **Advances:** record advance money and deduct it in the salary run (full or installments).
- **Salary run:** pick month, review the draft (editable bonus/deductions), approve, mark paid, **print salary slip**. Paid salary is added to expenses automatically.
- Attendance and salary reports, per employee history.

### 7.10 Reports (all exportable to Excel and PDF)
Daily / monthly / yearly sales, sales by category, brand, cashier, payment method; **profit by product** (Owner/Manager); best sellers and slow movers; stock valuation; expiry report; supplier and customer ledgers; expense report; profit and loss; attendance and salary reports; day-close report.

### 7.11 Settings
Shop profile and logo, receipt design (header, footer, paper size), printer selection, currency and number format, tax (optional), language (English/Urdu), users and roles, discount limits, negative stock policy, invoice prefix, LAN mode and port, attendance device setup, backup location and schedule.

### 7.12 Backup and Restore
- Automatic backup on app start, on exit, and every 1 to 2 hours while running. Uses SQLite's safe `backup` API, **not a file copy**.
- Keep the last 30 daily backups; verify each backup with `integrity_check`; delete failed ones.
- Second location (USB or another drive) chosen in Settings. Optional password-protected backup file.
- **Restore screen:** list backups, make a safety copy of the current data first, restore, restart, verify.
- Startup `integrity_check`; if it fails, offer to restore the newest good backup.
- Backup status card on the dashboard, with a warning if no backup for 2 days.
- Automatic backup **before every migration/update**.

### 7.13 Audit Log
Records price changes, stock adjustments, voids, discounts above the limit, attendance edits, salary changes, user changes, and logins. Filter by user, date and action.

### 7.14 LAN Mode (cashier on a second computer)
Setting to enable network access; shows the main computer's address and a QR/text to open on the cashier PC. The cashier opens the POS in a browser. Cashier role sees POS, recent bills, and returns only. Handles connection loss with a clear message and automatic retry. Never allow two machines to open the database file directly.

---

## 8. UI and UX Design System (professional and easy to understand)

**Principle:** the shop staff are not computer experts. Every screen must be understandable in 5 seconds.

### 8.1 Look and feel
| Item | Decision |
|---|---|
| Style | Clean, modern, lots of white space, soft shadows, rounded corners (8px) |
| Primary color | Teal `#0F8B8D` (buttons, active menu, links) |
| Sidebar | Dark navy `#14213D` with white icons and text |
| Status colors | Success green `#1E8E5A`, warning amber `#B7791F`, danger red `#B83A3A`, info blue `#2563EB` |
| Background | `#F6F8FA`, cards in white with a light border |
| Fonts | **Inter** for English; **Noto Naskh Arabic** or **Noto Nastaliq Urdu** for Urdu; base size 15-16px, POS text 18px+ |
| Icons | lucide-react, always with a text label in menus |
| Theme | Light by default; dark mode optional (design tokens as CSS variables) |
| Language | English / Urdu switch, with full RTL layout support |

### 8.2 Layout
- **Left sidebar** with grouped menu: Dashboard, POS, Products, Inventory, Purchases, Customers, Returns, Expenses, Staff, Reports, Settings. Collapsible. Shows only what the role may use.
- **Top bar:** shop name, global search, backup status, language, user menu.
- **Page header:** title, short helper text, and the primary action button on the right.
- The POS opens in a **full-screen layout** without distractions.

### 8.3 Interaction rules
1. One primary action per screen, in the accent color. Secondary actions are outlined.
2. Big click targets (min 40px, POS buttons 48px+). Works with touch screens.
3. **Plain words:** "Stock left", "Cancel bill", "Money received". No technical terms.
4. **Empty states** explain what to do ("No products yet. Add your first product").
5. **Loading skeletons**, never a blank screen. **Toast** messages for success and errors.
6. **Confirm dialogs** for risky actions, and say what will happen. Provide undo where possible.
7. **Error messages** say how to fix the problem ("Only 2 in stock. Reduce the quantity.").
8. Forms: labels above fields, inline validation, sensible defaults, keyboard `Enter` to save, `Tab` order correct.
9. Tables: sticky header, search, filters, column sorting, paging or virtual scroll, export button, row click opens details.
10. Numbers: PKR with thousands separators; right-aligned; negative or low values highlighted.
11. Colored badges: In stock (green), Low stock (amber), Out (red), Near expiry (amber), Expired (red).
12. **Keyboard-first** POS, and show the shortcut keys on the buttons.
13. Accessible contrast (WCAG AA), visible focus states, no color-only meaning.
14. Every screen tested at 1366x768 (common shop laptop) and 1920x1080.
15. **First-run wizard:** shop details, logo, printer test, create owner account, optional Excel import of products.
16. Built-in **help tips** (small "?" icons) and a printable quick guide in Settings.

### 8.4 Key screens (layout notes for the agent)
- **Login:** shop logo, username and password (and PIN option), language switch.
- **Dashboard:** 4 summary cards on top, sales chart, low stock and expiry lists, backup and staff cards.
- **POS:** left 60% = search box + product tiles/results; right 40% = cart, totals, customer, payment buttons; big **Pay** button; receipt preview after payment.
- **Products list:** filter chips (type, gender, brand, low stock), table with image, name, variants count, stock, price. Row opens the product page with a **variant grid**.
- **Add product:** step layout (Basic info, Variants, Pricing and stock). The variant step is generated from the category's attributes (for example size/color chips for clothing, shade and volume for cosmetics).
- **Purchase entry:** supplier, scan items, quantities, cost, batch and expiry, totals, payment.
- **Staff:** employee list, attendance calendar grid (colored cells), salary run wizard with review table.
- **Reports:** left list of reports, right filters and chart + table, export buttons.
- **Backup and restore:** big status card, "Backup now" button, list of backups with a Restore button.

---

## 9. Security

- Passwords hashed (bcrypt), lockout after repeated failures, idle auto-logout.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, no remote content, strict Content Security Policy, block navigation to external URLs.
- The server binds to localhost unless LAN mode is enabled; LAN mode requires login and uses per-session tokens; rate-limit the login route.
- Validate every request with Zod; parameterized queries only (Drizzle).
- Cost price and profit hidden from Cashier **on the server**, not only in the UI.
- Optional: encrypted backups (password) and database encryption (SQLCipher) as a later add-on.
- Log errors to a file, never log passwords or full personal data.

---

## 10. Printing

- **Receipt:** an HTML template sized for 80mm, printed silently to the chosen printer through Electron. Includes shop name/logo, invoice number, date, cashier, items (name, size/color, qty, price), discount, total, payment, change, footer text.
- **A4 invoice** and **reports** as PDF.
- **Barcode labels** with configurable size (for example 50x25mm).
- A **printer test** button in Settings and a **reprint** option on every bill.
- Test on the client's real receipt printer and scanner before delivery.

---

## 11. Testing and Quality

| Level | What to test |
|---|---|
| Unit (Vitest) | Money helpers, discount rules, FEFO batch picking, stock ledger vs cached quantity, returns, void, salary calculation, attendance rules, invoice numbering |
| Integration | API routes with a temporary SQLite database; permission checks; migrations from an empty database and from the previous version |
| End-to-end (Playwright) | Login, add product with variants, purchase, sell, print (mock), return, close day, backup and restore |
| Data safety | Kill the app in the middle of a sale (no half-saved data); two machines selling the last item at the same time; restore a backup and compare totals |
| Performance | 10,000 variants, 100,000 sales: POS search under 200 ms, dashboard under 1 s |
| Manual | Run on a clean Windows install, on a low-end PC (4 GB RAM), with the real printer and scanner |

Definition of done for each feature: works, has tests, has i18n strings (English and Urdu), handles empty/error/loading states, respects permissions, and is written to the audit log where relevant.

---

## 12. Build, Packaging and Delivery

- `pnpm build` builds the UI (static export), bundles the server (tsup/esbuild), and packages Electron.
- **electron-builder (NSIS)** produces `RetailShopManager-Setup.exe`. Unpack native modules (`better-sqlite3`) from the asar archive and rebuild them for Electron.
- Database and backups live in Electron's `userData` folder, **never** in the install folder, so updates never delete data.
- Migrations run automatically at startup, after an automatic backup. If a migration fails, restore that backup and show a clear message.
- Include a version number, a changelog, and (later) auto-update.
- Deliver: installer, `docs/USER_MANUAL.md` (with screenshots), a short training checklist, and a restore test done together with the client.

---

## 13. Build Phases and Prompts for the Agent

### Release plan (start with the core, add the rest later)

| Release | Contents | Notes |
|---|---|---|
| **v1.0 (start here, deliver first)** | Phases 0 to 6, Phase 8 (dashboard and core reports), Phase 9A (backup and hardening), Phase 10 (polish and installer) | A complete, sellable shop system: products, stock, purchases, POS, returns, customers, expenses, reports, roles, backup |
| **v1.1 (optional module)** | Phase 7: staff, attendance, salary | Manual attendance first; fingerprint device integration after the exact machine model is confirmed |
| **v1.2 (optional module)** | Phase 9B: LAN mode for a second cashier computer | Architecture is already ready; this adds the network settings and testing |
| **v2.x (future)** | Multi-branch and cloud sync, WhatsApp/SMS, tax integration, mobile owner app, extra reports | Quoted as separate work |

Because of the flexible design in Section 16, v1.1, v1.2 and later releases are **added as modules**, without rewriting v1.0.

Give the agent **one phase at a time**. After each phase, run everything and review before continuing. Each prompt begins with: *"Read PROJECT_GUIDE.md. Follow Sections 1 to 12."*

### Phase 0: Project setup
**Prompt:** Create the pnpm monorepo exactly as in Section 4 with TypeScript strict, ESLint, Prettier, Vitest and Husky. Set up `apps/ui` (Next.js static export, Tailwind, shadcn/ui, i18next with en/ur), `apps/server` (Fastify, Drizzle, better-sqlite3), `apps/desktop` (Electron that starts the server and opens the UI), and `packages/shared`. Make `pnpm dev` open a window showing a health check from the API.
**Done when:** the app opens, the server responds, and lint, type-check and tests pass.

### Phase 1: Database and core services
**Prompt:** Implement the Drizzle schema for Section 6 (core tables first), the database client with the pragmas, automatic migrations, and the money helpers. Write the stock ledger service and tests (Section 6.2).
**Done when:** migrations run from an empty database, and stock ledger tests pass.

### Phase 2: Authentication, roles, settings, audit
**Prompt:** Build login (password and PIN), sessions, lockout, roles and the permission middleware (Section 5), the settings module, the audit log, the first-run wizard, and the app shell (sidebar, topbar, layout) following Section 8.
**Done when:** a user can log in, sees only permitted menus, and the server rejects unauthorized calls.

### Phase 3: Catalog
**Prompt:** Build categories, brands, products and variants with the variant grid generator, product-type specific forms, barcode generation, Excel import with preview, and barcode label printing.
**Done when:** 5,000 imported variants are searchable in under 200 ms.

### Phase 4: Inventory and purchasing
**Prompt:** Build opening stock, purchases with batch and expiry, supplier ledger and payments, stock adjustment, stock take, low stock and expiry lists, and stock movement history.
**Done when:** every stock change appears in movements, and cached quantity always matches the ledger.

### Phase 5: POS and receipts
**Prompt:** Build the POS screen per Sections 7.5 and 8.4: scan/search, cart, discounts by role, split payments, hold/resume, FEFO batch selection, sequential invoices in one transaction, receipt printing, recent bills, void, and day close.
**Done when:** a full sale with two payment methods prints a correct receipt, and stock and totals are exact.

### Phase 6: Returns, customers, expenses
**Prompt:** Build returns and exchanges with category rules, customer ledger and payments, statements, and expenses with categories.
**Done when:** returns restore stock correctly and customer balances match ledger totals.

### Phase 7: Staff, attendance, salary (optional module, v1.1)
**Prompt:** Build employees, shifts, manual attendance grid, attendance from punches (CSV import first, then the network device with node-zklib behind an interface), corrections, advances, the salary run wizard, salary slips, and posting salary to expenses. Write `docs/SALARY_RULES.md` and tests.
**Done when:** the salary tests pass for absences, late marks, advances and bonuses.

### Phase 8: Dashboard and reports
**Prompt:** Build the dashboard cards and charts and every report in Section 7.10 with filters and Excel/PDF export. Hide cost and profit from users without `cost.view`.
**Done when:** report totals match the raw sales and stock data in tests.

### Phase 9A: Backup and hardening (part of v1.0)
**Prompt:** Build the backup scheduler, verification, restore, the safety copy, startup integrity check, and pre-migration backups. Apply all Section 9 security rules.
**Done when:** a restore test recovers exact totals.

### Phase 9B: LAN mode (optional module, v1.2)
**Prompt:** Build LAN mode (Section 7.14) with the firewall and fixed-IP instructions in the settings screen, a live recent-sales feed and active users for the Owner, connection-loss handling, and duplicate-safe sales using a `requestId`.
**Done when:** a second computer can bill through the browser at the same time as the main one, and a retried sale is never saved twice.

### Phase 10: Polish, installer, documentation
**Prompt:** Complete the Urdu translations and RTL layout, empty/loading/error states, keyboard shortcuts, help tips, performance checks (Section 11), the electron-builder installer, the user manual, and a demo data seeder.
**Done when:** a clean Windows machine installs it and completes the full workflow.

---

## 14. Scope Control (for you, not the agent)

- **Included:** everything in Sections 5 to 12 for one shop.
- **Separate paid add-ons:** LAN cashier mode with multiple computers, direct fingerprint machine integration (needs the exact model tested first), SMS/WhatsApp bills, tax authority integration, multi-branch and cloud sync, mobile app, database encryption.
- Confirm the feature list with the client **in writing**. Anything else is a change request, handled with the routine in Section 16.5.
- Deliver **v1.0 first** (see the release plan in Section 13), then add staff/salary and LAN mode as later modules.
- Ask the client now: fingerprint machine brand and model, receipt printer model, barcode scanner, number of staff, whether Urdu is needed, and whether a second computer will bill.

---

## 15. Master Prompt (paste this first into the agent)

> You are a senior full-stack engineer. Build "Retail Shop Manager", an offline-first Windows desktop application for a clothes, cosmetics and perfume shop, following `PROJECT_GUIDE.md` exactly. Use the specified stack (Electron, Next.js static export, TypeScript, Tailwind, shadcn/ui, Fastify, SQLite with Drizzle, Zod, TanStack Query/Table, Vitest, Playwright) and the monorepo layout in Section 4. Keep business logic in services, run all stock and money changes in database transactions, store money as integer minor units, never hard-delete business records, support English and Urdu, and enforce permissions on the server. Design everything to be flexible and modular as described in Section 16, so later customization needs configuration or a new module, not a rewrite. Work one phase at a time as defined in Section 13, starting with release v1.0. After each phase, run lint, type-check and tests, summarize what you built, list anything you were unsure about, and wait for my approval before continuing. Start with Phase 0.

---

## 16. Flexible Design: Built for Later Customization

The software will be customized after delivery, so these rules apply from Phase 0.

### 16.1 The customization ladder (cheapest first)

| Level | Change needed | How it is done | Code change? |
|---|---|---|---|
| 1 | New category, brand, payment method, expense type, shift, role | Settings screens | No |
| 2 | New product attribute (Fabric, Shoe size, Fragrance family) | Settings, Attributes | No |
| 3 | Small extra field on customer, employee, sale, etc. | Custom fields (JSON) with a settings screen to define them | No or tiny |
| 4 | Receipt, label, invoice or salary slip layout | Editable templates in `templates/` (HTML + variables), chosen in Settings | Template only |
| 5 | Business rule value (discount limit, negative stock, late minutes, return rules) | Settings | No |
| 6 | New report | Add one report file in `modules/reports/definitions/` (query + columns + filters) | Small |
| 7 | New feature area (loyalty points, WhatsApp bills, tax export) | New module (16.2) | Yes, isolated |

### 16.2 Module registry
Every feature area (`catalog`, `inventory`, `purchasing`, `sales`, `returns`, `customers`, `expenses`, `staff`, `attendance`, `salary`, `reports`, `backup`, `lan`) is a **module** that exports a manifest:

```ts
export const salaryModule: ModuleManifest = {
  id: "salary",
  version: "1.0.0",
  dependsOn: ["staff", "attendance", "expenses"],
  permissions: ["salary.manage"],
  menu: { label: "salary.menu", icon: "wallet", route: "/salary" },
  registerRoutes: (app) => { /* fastify routes */ },
  migrations: "./migrations",          // module owns its tables
  settingsSchema: salarySettingsSchema // its own settings
};
```

- The server loads only **enabled modules** (`settings.modules_enabled`). The UI builds the sidebar from the manifests and the user's permissions.
- A disabled module adds no menu, no routes, and no cost. Enabling it later runs its migrations.
- Modules talk to each other through **services and events** (for example `sale.completed`, `stock.low`, `salary.paid`), not by reading each other's tables. New behavior can subscribe to an event without editing the sender.

### 16.3 Configuration over code
- Business rules live in the `settings` table with defaults in `packages/shared/src/defaults.ts`.
- Payment methods, discount limits per role, return rules per category, tax rate, invoice prefix, rounding, low-stock defaults, and expiry alert days are all settings.
- Labels and receipts read from templates and settings, not fixed layouts.
- Never write `if (category === "perfume")` in code. Use category attributes and rules (`has_expiry`, `return_rule`).

### 16.4 Safe change rules
1. **Migrations only go forward**, one file per change, never editing old ones. An automatic backup runs before each migration.
2. New columns must have defaults or be nullable, so old data keeps working.
3. **API versioning:** routes live under `/api/v1`. Breaking changes go to `/api/v2` while `v1` still works.
4. **Feature flags** for unfinished or optional features (`settings.features`).
5. Shared Zod schemas in `packages/shared` are the single contract between UI and server.
6. Keep `CHANGELOG.md` and bump the version for each release. Record decisions in `docs/DECISIONS.md`.
7. Tests protect old behavior. A change is not done until the old tests still pass.
8. Each module has a short `README.md` (purpose, tables, events, settings).

### 16.5 Change request routine (for you)
1. Write the request in one sentence and decide its level in 16.1.
2. Levels 1 to 5: configure or edit a template, then test and deliver.
3. Levels 6 and 7: give the agent a small prompt: *"Add module/report X following Section 16. Do not modify other modules. Add tests, i18n strings, a migration, and update the module README and CHANGELOG."*
4. Quote the client for levels 6 and 7 as paid changes, in writing.

### 16.6 Ready-to-extend hooks (do not build now, but keep the door open)
- `branch_id` and `uuid` on every table (multi-branch and sync later)
- Server independent from Electron (can run on a cloud server later)
- Repository layer over Drizzle (database engine can change later)
- Event bus inside the server (notifications, WhatsApp, integrations later)
- Import/export functions for every major table (moving data later)