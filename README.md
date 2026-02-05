# Gemini Project Memory

A SQLite-backed project management extension for the Gemini CLI.

This extension replaces manual Markdown logging with a structured database approach, allowing you to manage project phases, plans, logs, lessons learned, and inventory programmatically. It automatically maintains a `project_memory.db` file in your project root and can "render" this data back into human-readable Markdown reports.

## Installation

1.  Clone this repository.
2.  Run `npm install` to install dependencies.
3.  Run `npm run build` to compile.
4.  Ensure `gemini-extension.json` is properly configured.

## Features

-   **Phase Management**: Track status, objectives, and timeline of project phases (`manage_phase`).
-   **Execution Logging**: Structured logging of actions, outcomes, and artifacts (`log_work`).
-   **Planning**: Define and track plan steps (`manage_plan`).
-   **Knowledge Management**: Record lessons learned and key findings (`record_lesson`, `add_phase_item`).
-   **Full-Text Search**: Powerful keyword and regex-based search across all project data (`search_memory`).
-   **Inventory**: Track scripts and tools in your project (`manage_inventory`).
-   **Comprehensive Reporting**: 
    -   Generate reports for individual phases, inventory, lessons, or a complete project overview.
    -   Export **ALL** documentation at once with `render_report({ report_type: 'all' })`.
    -   Generate reports based on search queries.

## Usage

See `GEMINI.md` for the detailed list of available tools and their parameters.
