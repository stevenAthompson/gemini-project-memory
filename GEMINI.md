# Gemini Project Memory

A comprehensive project management extension backed by SQLite. It helps you document phases, logs, plans, lessons learned, and inventory directly from the CLI.

## Usage

This extension maintains a persistent `project_memory.db` file in your project root and generates Markdown reports in the `artifacts/` directory.

### Core Workflows

1.  **Initialize a Phase**: Use `manage_phase` to start a new work unit.
2.  **Plan**: Use `manage_plan` to record steps before execution.
3.  **Execute & Log**: Use `log_work` to record actions and outcomes.
4.  **Review**: Use `record_lesson` and `add_phase_item` to capture knowledge.
5.  **Report**: Use `render_report` to generate Markdown files for the user.

## Tools

### manage_phase
Initialize or update a project phase.
- `action`: 'init' or 'update'.
- `phase_id`: Unique ID (e.g., "1", "01", "2").
- `title`: Required for init.
- `status`: e.g., "Active", "Completed", "Pending".
- `description`: High-level summary.

### log_work
Log execution steps, outcomes, and artifacts for a phase.
- `phase_id`: The phase ID.
- `action`: What was done (e.g., "Ran unit tests").
- `outcome`: Result (e.g., "Passed", "Failed with Error X").
- `artifacts`: List of file paths or output names generated.

### manage_plan
Manage the execution plan for a phase.
- `phase_id`: The phase ID.
- `step`: The plan step to add.

### add_phase_item
Add specific structured items to a phase.
- `phase_id`: The phase ID.
- `type`: 'objective', 'finding', or 'next_step'.
- `content`: The text content.

### add_usage_example
Add a code usage example to a phase (useful for "how-to" documentation).
- `phase_id`: The phase ID.
- `title`: Title of the example.
- `code`: The code snippet.
- `description`: Optional context.

### record_lesson
Record a lesson learned (technical or process-related).
- `phase_id`: The phase ID.
- `text`: The lesson content.

### manage_inventory
Register or update a script/tool in the project inventory.
- `path`: File path of the script/tool.
- `description`: What it does.
- `category`: e.g., "Build", "Test", "Utility".
- `status`: "Active", "Deprecated", etc.

### manage_overview
Update project-level information.
- `mission`: Project mission statement.
- `architecture`: High-level architecture description.
- `faq_question` / `faq_answer`: Add a FAQ pair.

### render_report

Generate Markdown reports and save them to the `artifacts/` directory.

- `report_type`: 'phase', 'inventory', 'lessons', 'overview', 'all', or 'search'.

- `phase_id`: Required if `report_type` is 'phase'.

- `search_query`: Required if `report_type` is 'search'.

- `search_type` (optional): 'keyword' (default) or 'regex'.







### search_memory

Search for project information using keywords or regex.

- `query`: The search query (keyword or regex pattern).

- `type` (optional): 'keyword' (default) or 'regex'.

- `tables` (optional): List of tables to search (default: all).
