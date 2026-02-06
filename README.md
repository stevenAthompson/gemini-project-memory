# Gemini Project Memory

A SQLite-backed project management extension for the Gemini CLI.

This extension allows Gemini (or you) to manage project phases, plans, logs, "lessons learned", and script inventory by storing it all in a sql lite database that lives in the root of your project folder. It automatically maintains the `project_memory.db` file and can "render" this data back into human-readable Markdown reports when requested. You can do that with comands, or gemini can do it when asked.

The best feature (to me) is that it gives Gemini CLI long term memory that it can search with either wildcards or regex! Stop letting it repeat mistakes from the past by telling it to save it's lessons learned to the database, and to query those lessons when it's stuck! All you have to do is install this, and add some instructions to your GEMINI.md. 

## Installation

1.  gemini extension install https://github.com/stevenAthompson/gemini-project-memory
2.  gemini extension update --all
3.  start gemini cli
4.  /extensions restart --all

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

The agent can read the included `GEMINI.md` automatically for the detailed list of available tools and their parameters.

If you want to force Gemini CLI to use it you can add instructions to your projects GEMINI.md telling it to save it's lessons learned with the tool after each phase, and to reference them whenever it's struggling. 
