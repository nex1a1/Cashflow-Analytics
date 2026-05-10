# 🌟 Cashflow Analytics:

[![Platform](https://img.shields.io/badge/Platform-Desktop--Only-blue?style=for-the-badge)](https://github.com/)
[![Tech Stack](https://img.shields.io/badge/Stack-React_|_Node_|_SQLite-61DAFB?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Cashflow Analytics** is a high-performance, professional-grade financial tracker and work-day logger. Designed with a **PC-First philosophy**, it maximizes screen real estate to provide dense, actionable insights into personal or small business cashflow.

---

## 🦈 Branding & Spirit

The **Shark** is our core identity. Why? Because sharks are symbols of **unstoppable determination**.
*   **Constant Motion:** Just like a shark must swim to survive, we believe in the continuous tracking and management of financial health.
*   **Goal-Focused:** Sharks never lose sight of their target. This application is built for users who are determined to hunt down their financial goals and achieve absolute freedom.
*   **Minimalist Precision:** Our custom SVG outline logo represents the sharp, clinical precision needed for elite financial intelligence.

---

## 🎯 Project Philosophy

Unlike generic mobile-first trackers, this application is built for the **Power User**.
*   **Desktop-Only UX:** Wide-screen data tables, multi-column dashboards, and keyboard-optimized interactions.
*   **CPA-Standard Logic:** Accurate tracking using Satang (integers) to prevent floating-point errors, distinguishing between *Target Savings* and *Net Worth Delta*.
*   **High Performance:** Single-pass aggregation engine capable of processing thousands of transactions in milliseconds.

---

## ✨ Key Features

### 📊 Advanced Dashboard (Command Center)
*   **Core Vitals:** 5-column header tracking Income, Expense, Target Savings, Net Worth Delta, and Discipline Grade.
*   **Smart Benchmarking:** Daily averages, fixed load analysis, and weekend lifestyle trap detection.
*   **Expense Proportion:** Hybrid hero chart with top category breakdown and grid-based deep dives.
*   **Forecasting:** Real-time run-rate projection and "Safe-to-Spend" daily budget for the current month.

### 📅 Modular Calendar View
*   **Work-Life Balance:** Log day types (Work, Holiday, OT, Sick Leave) alongside financial entries.
*   **Daily Detail Modals:** Quick-add transactions with all-time historical suggestions.

### 🎛️ Pro-Level Ledger (Database)
*   **Advanced Filtering:** Multi-select categories, amount ranges, and smart search (300ms debounce).
*   **Data Density:** Sticky headers/footers with semantic coloring for large dataset exploration.

### ⚙️ Power Settings
*   **Hierarchical Customization:** Manage Cashflow Groups, Categories (Fixed vs. Variable), and Day Types.
*   **Data Integrity:** Full CSV Import/Export system and one-click Factory Reset.

---

## 🛠️ Tech Stack

### Frontend (Client)
*   **Core:** React v18.2.0 (Vite v5.0.8)
*   **Styling:** Tailwind CSS v3.4.1 (PC-First architecture)
*   **Charts:** Chart.js v4.4.1 & react-chartjs-2
*   **Animations:** Framer Motion v12.38.0

### Backend (Server)
*   **Runtime:** Node.js v20 (LTS)
*   **Framework:** Express.js v4.18.2
*   **Database:** better-sqlite3 (High-performance synchronous SQLite)
*   **Validation:** Zod v4.4.2 (Strict schema enforcement)

### Infrastructure
*   **Containerization:** Docker & Docker Compose
*   **Timezone:** Asia/Bangkok (Standardized sync)

---

## 🚀 Installation & Setup

### Prerequisites
*   [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

### Quick Start
1.  Clone the repository and enter the directory.
2.  Launch the services:
    ```bash
    docker-compose up -d
    ```
3.  Access the application:
    *   **Frontend:** [http://localhost:5173](http://localhost:5173)
    *   **Backend API:** [http://localhost:3000](http://localhost:3000)

### Development Logs
```bash
# View backend logs
docker logs -f expense_api

# Access SQLite inside container
docker exec -it expense_api sh -c "sqlite3 /app/data/cashflow.db"
```

---

## 🛡️ Architecture Highlights

| Scenario | Strategy | Rationale |
| :--- | :--- | :--- |
| **Currency** | `INTEGER` (Satang) | Prevents math errors common with floating points. |
| **Deletion** | `is_deleted = 1` | Soft-delete ensures financial audit trails are preserved. |
| **Scaling** | Single-Pass Aggregate | Processes filters, trends, and charts in one O(n) loop. |
| **Layout** | CSS Grid / Flexbox | Maximizes desktop width without mobile constraints. |

---

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Developed with 💻 by the **Cashflow Dream Team**.
