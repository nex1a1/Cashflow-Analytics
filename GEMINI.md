# 🦈 Cashflow Shark: Elite Financial Intelligence

## 🎯 Project Overview
**Cashflow Shark** is a high-performance personal/small business financial tracker and work-day logger. It integrates financial management with work-life balance tracking (day types like Work, Holiday, OT), built with a **PC-First (Desktop)** philosophy.

### 🦈 Branding & Spirit
The **Shark** identity represents **unstoppable determination**. Like a shark that must keep swimming to survive, this app is for users who are determined to hunt down their financial goals and achieve absolute freedom through precise tracking and management.

---

## 🛠️ Tech Stack

#### 💻 Frontend (Client-side)
- **Core:** `React v18.2.0` (Vite v5.0.8)
- **Styling:** `Tailwind CSS v3.4.1`
- **Charts:** `Chart.js v4.4.1` & `react-chartjs-2 v5.2.0`
- **Icons:** `Lucide React` & Custom **Shark Outline** SVG
- **Animations:** `Framer Motion v12.38.0`

#### 🖥️ Backend (Server-side)
- **Runtime:** `Node.js v20 (LTS)`
- **Framework:** `Express.js v4.18.2`
- **Database:** `better-sqlite3 v12.9.0` (High-performance SQLite)
- **Validation:** `Zod v4.4.2` (Schema integrity)

---

## 🚀 Building & Running

### 🐳 Docker (Recommended)
```bash
docker-compose up -d
docker-compose down
docker logs -f expense_api
```

### 💻 Local Development
#### Backend
```bash
cd backend && npm install && npm start
```
#### Frontend
```bash
cd frontend && npm install && npm run dev
```

---

## 🗄️ Database Schema (SQLite)

*   **Table `cashflow_groups`**: High-level groups (Income, Expense, Savings).
*   **Table `categories`**: Sub-categories with `is_fixed` flags and global `order_index`.
*   **Table `transactions`**: Financial records stored in **Satang (Integers)**.
*   **Table `day_types`**: Work-life balance categories (Work, Holiday, OT).
*   **Table `calendar_days`**: Daily day-type assignments.

---

## ✅ Recent Major Updates (May 2026)

### 1. 🌊 Elite Sankey Flow Engine (May 2026)
- **Multi-Tier Cashflow Pipeline:** Architected a 5-column Sankey flow: `Income Groups` -> `Total Cash` -> `Expenses / Savings Groups` -> `Specific Categories`. This ensures a logical "left-to-right" narrative of how money fuels lifestyle and wealth building.
- **Priority-Driven Vertical Order:** Implemented a `priority` mapping system to enforce vertical consistency. Nodes like `Remaining Balance` are anchored at the top, followed by core cash nodes, and then sorted expense groups.
- **Column Anchor System:** Explicitly mapped nodes to specific horizontal columns (0-4) using the `column` property. This prevents terminal nodes from drifting and maintains a rigid, professional grid structure even with sparse data.
- **Dynamic Tooltip Sync:** Engineered scriptable tooltip callbacks that pull real-time element colors. Tooltips now dynamically shift their background and border colors to match the hovered category or link, providing immediate visual feedback.
- **Net Balance Logic:** Integrated a smart `Remaining Balance` / `Overspent` detection system that visualizes unspent income or budget deficits as distinct flow paths.

### 2. 🚀 Master HUD & On-Demand Deep Dives (May 2026)
- **Cell Splitter Architecture:** Engineered a complex column-splitting logic in `CashflowTable.jsx`. Users can now click Group headers to instantly inject color-coded category columns, enabling deep-dives into housing or income details without permanent UI clutter.
- **Dynamic Cluster Filtering:** Expanded columns automatically hide categories with zero totals for the active period, maximizing horizontal density.
- **Section Partitioning:** Implemented a physical vertical separator (`|`) to anchor the boundary between Income and Expense sections across the entire grid.

### 3. 📊 Elite Analytics & Precision Metrics
- **Work-Life Analysis:** Upgraded `ActivityTimeline` legend with high-precision percentages (2 decimal places) for automated work vs. holiday distribution tracking.
- **Restored Daily Food HUD:** Re-implemented and precision-tuned the "Daily Food Average" metric in `SummaryCards`, providing a 2-decimal burn-rate insight.
- **MoM Trend Engine:** Restored status-aware color coding (Red/Emerald) for Month-over-Month expense trends with subtle UI highlights.

### 4. 🏗️ High-Density Ledger Refactor
- **Master-Class Sorting:** Implemented a strict multi-level sort hierarchy: Date (1-31) > Group Index > Category Index > Amount (DESC). This ensures the ledger perfectly syncs with user preferences in Settings.
- **Command Bar Pagination:** Refactored ledger navigation into a dedicated "Command Bar" at the card base, consolidating record counts, centered pagination, and page-specific totals.

### 5. 🏗️ Dashboard Architecture Consolidation (May 2026)
- **Monolithic Component Shift:** Refactored the Dashboard from a fragmented "micro-component" pattern (13+ files) into 4 high-density, self-contained modules (`SummaryCards`, `MainChart`, `ActivityTimeline`, `CashflowTable`). This improves readability for DevOps/IT Support roles and reduces "prop-drilling" complexity.
- **Directory Flattening:** Eliminated the `Segments/` sub-directories in the Dashboard view to create a more linear and discoverable codebase.

---

## 📝 Developer Notes & Lessons Learned
- **PC-First Mandate:** Desktop width and visual density are priorities. Ignore mobile breakpoints.
- **Monolithic Component Preference:** For complex analytical views (Dashboard), prefer single-file components with internal sub-components over fragmented directory structures. This keeps logic local and makes the "Narrative" of the code easier to follow.
- **Monolithic Grids:** Use `gap-[1px] bg-slate-700/20` to create professional table dividers without bulky borders.
- **Micro-Typography:** Small, uppercase, tracked-out fonts (`text-[9px] font-black tracking-widest`) are used for HUD headers to maximize data density.
- **Extension Discipline:** Always include `.jsx` extensions in imports during major directory shifts to ensure Vite HMR re-analyzes dependency chains correctly.
- **Sankey Stability:** Always use `priority` AND `column` properties together in the Sankey dataset. Relying on default layout logic causes visual jitter during data updates; explicit mapping ensures a "stable" financial map.
- **Tooltip Theming:** For dynamic tooltips, use `ctx.tooltipItems[0].element.options.backgroundColor` as a source. It is more reliable than pulling from raw data when gradients or state-based colors are involved.

## 🎯 Current Focus
1.  **Stress Testing:** Validating single-pass engine with 10,000+ records.
2.  **Advanced Insights:** Deepening CPA-standard logic for automated "Shark Insights" headers.
3.  **UI Polish:** Ensuring zero-gap consistency across all remaining modal views.
