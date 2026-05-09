# Kanban Board

A polished Kanban-style task manager built with React, TypeScript, and Supabase. Drag tasks across four workflow columns, set priorities and due dates, organize with color-coded labels, and track changes through a per-task activity log.

## Features

- **4-column board** — To Do, In Progress, In Review, Done
- **Drag and drop** — move tasks between columns with smooth visual feedback
- **Task details** — title, description, priority (Low/Medium/High), and due date
- **Labels** — create color-coded labels, assign them to tasks, and filter the board by label
- **Activity log** — timeline of status changes, edits, and other task history
- **Comments** — per-task comment thread in the detail panel
- **Guest auth** — auto sign-in via Supabase anonymous auth; no account required
- **Dark mode** — toggle in the header, persisted to localStorage

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — PostgreSQL, Row Level Security, anonymous auth
- [@dnd-kit](https://dndkit.com) — drag and drop

## Local Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd kanban-project
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` file in the project root:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```
