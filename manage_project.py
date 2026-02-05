#!/usr/bin/env python3
"""Consolidated Project Management CLI.

Replaces manage_phase_results.py, manage_lessons.py, manage_inventory.py, manage_overview.py.
Includes Plan management.
"""

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# --- Constants ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS_ROOT = PROJECT_ROOT / "artifacts"
PHASES_ROOT = ARTIFACTS_ROOT / "phases"
DOCS_ROOT = ARTIFACTS_ROOT / "docs"

# --- Data Models ---


# 1. Phase Results Models


class LogEntry(BaseModel):
    """Execution log entry for a phase."""

    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    action: str

    outcome: str

    artifacts: List[str] = Field(default_factory=list)


class UsageExample(BaseModel):
    """Code example for phase outcomes."""

    title: str

    code: str

    description: Optional[str] = None


class FAQItem(BaseModel):
    """Frequently Asked Question."""

    question: str

    answer: str


class PhaseResults(BaseModel):
    """Comprehensive results for a phase."""

    phase_id: str

    title: str

    status: str = "Pending"

    start_date: str = Field(default_factory=lambda: datetime.now().date().isoformat())

    end_date: Optional[str] = None

    objectives: List[str] = Field(default_factory=list)

    execution_log: List[LogEntry] = Field(default_factory=list)

    metrics: Dict[str, Any] = Field(default_factory=dict)

    key_findings: List[str] = Field(default_factory=list)

    conclusion: Optional[str] = None

    next_steps: List[str] = Field(default_factory=list)

    faq: List[FAQItem] = Field(default_factory=list)

    usage_examples: List[UsageExample] = Field(default_factory=list)

    logs: List[str] = Field(default_factory=list)

    additional_docs: List[str] = Field(default_factory=list)

    def get_dir(self) -> Path:
        """Determines the phase directory.

        Returns:
            Path to the phase directory.

        """
        try:
            int(self.phase_id)

            dirname = f"phase_{int(self.phase_id):02d}"

        except ValueError:
            dirname = f"phase_{self.phase_id}"

        return PHASES_ROOT / dirname


# 2. Lessons Learned Models


class Lesson(BaseModel):
    """A technical or process lesson learned."""

    text: str

    timestamp: datetime = Field(default_factory=datetime.now)


class LessonsRegistry(BaseModel):
    """Global registry of lessons learned."""

    phases: Dict[str, List[Lesson]] = Field(default_factory=dict)


# 3. Inventory Models


class InventoryItem(BaseModel):
    """Registration entry for a project script."""

    path: str

    category: str = "Uncategorized"

    description: str

    status: str = "Active"

    usage: Optional[str] = None


class InventoryRegistry(BaseModel):
    """Registry of project scripts and tools."""

    items: Dict[str, InventoryItem] = Field(default_factory=dict)


# 4. Overview Models


class PhaseEntry(BaseModel):
    """Roadmap entry for a phase."""

    id: str

    title: str

    status: str = "Pending"

    description: str


class OverviewRegistry(BaseModel):
    """High-level project overview data."""

    title: str = "Project HYPERBORG Overview"

    mission: str = ""

    architecture: str = ""

    phases: List[PhaseEntry] = Field(default_factory=list)

    faq: List[FAQItem] = Field(default_factory=list)

    extra_sections: Dict[str, str] = Field(default_factory=dict)


# 5. Plan Models


class PlanItem(BaseModel):
    """A single planned execution step."""

    step: str

    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class PhasePlan(BaseModel):
    """Execution plan for a phase."""

    phase_id: str

    title: str

    items: List[PlanItem] = Field(default_factory=list)


# --- File I/O Helpers ---


def load_json(path: Path, model_cls):
    """Loads a JSON file into a Pydantic model.

    Args:
        path: Path to the JSON file.
        model_cls: Pydantic model class.

    Returns:
        Instance of model_cls or None.
    """
    if not path.exists():
        return (
            model_cls() if model_cls != PhaseResults else None
        )  # PhaseResults requires init
    try:
        with open(path, "r") as f:
            return model_cls(**json.load(f))
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return model_cls()


def save_json(path: Path, model_inst):
    """Saves a Pydantic model to a JSON file.

    Args:
        path: Path to the JSON file.
        model_inst: Pydantic model instance.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        # Pydantic V1 uses .json(), V2 uses .model_dump_json()
        if hasattr(model_inst, "model_dump_json"):
            f.write(model_inst.model_dump_json(indent=2))
        else:
            f.write(model_inst.json(indent=2))


# --- Logic Controllers ---


def cmd_log(args):
    """Handle 'log' command for Phase Results.

    Args:
        args: Parsed arguments.
    """
    try:
        int(args.phase_id)
        dirname = f"phase_{int(args.phase_id):02d}"
    except ValueError:
        dirname = f"phase_{args.phase_id}"

    phase_dir = PHASES_ROOT / dirname
    json_path = phase_dir / "results.json"

    if args.init:
        if args.title is None:
            print("Error: --title required for init")
            sys.exit(1)
        phase = PhaseResults(phase_id=args.phase_id, title=args.title)
        print(f"Initialized Phase {args.phase_id}")
    else:
        if not json_path.exists():
            print(f"Error: Phase {args.phase_id} not found. Use --init.")
            sys.exit(1)
        with open(json_path, "r") as f:
            phase = PhaseResults(**json.load(f))

    # Updates
    if args.status:
        # Enforce Plan Requirement for Active status
        if args.status.lower() == "active":
            plan_path = phase_dir / "plan.json"
            if not plan_path.exists():
                print(
                    "Error: Cannot move to Active without a Plan. Run 'plan --init' first."
                )
                sys.exit(1)
            # Check if plan has items
            with open(plan_path, "r") as f:
                p_data = json.load(f)
                if not p_data.get("items"):
                    print("Error: Plan is empty. Add items with 'plan --add'.")
                    sys.exit(1)
        phase.status = args.status

    if args.add_obj:
        phase.objectives.append(args.add_obj)
    if args.add_finding:
        phase.key_findings.append(args.add_finding)
    if args.add_usage_title and args.add_usage_code:
        phase.usage_examples.append(
            UsageExample(
                title=args.add_usage_title,
                code=args.add_usage_code,
                description=args.add_usage_desc,
            )
        )

    if args.action and args.outcome:
        phase.execution_log.append(
            LogEntry(
                action=args.action, outcome=args.outcome, artifacts=args.artifacts or []
            )
        )

    # Save
    save_json(json_path, phase)
    # Regenerate MD
    md_path = phase_dir / f"HYPERBORG_PHASE_{phase.phase_id}.md"
    _render_phase_md(phase, md_path)
    # Sync
    DOCS_ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copy2(md_path, DOCS_ROOT / md_path.name)
    print(f"Updated Phase {args.phase_id} results.")


def _render_phase_md(phase: PhaseResults, path: Path):
    """Renders phase results to Markdown.

    Args:
        phase: Phase results instance.
        path: Output path.
    """
    lines = [
        f"# Phase {phase.phase_id}: {phase.title}",
        "",
        f"**Status:** {phase.status}",
        f"**Date:** {phase.start_date}",
        "",
        "## Objectives",
    ]
    for o in phase.objectives:
        lines.append(f"- {o}")
    lines.append("")

    if phase.execution_log:
        lines.append("## Execution Log")
        for log in phase.execution_log:
            lines.append(f"- **{log.timestamp.split('T')[0]}**: {log.action}")
            lines.append(f"  - Outcome: {log.outcome}")

    if phase.metrics:
        lines.append("## Metrics")
        for k, v in phase.metrics.items():
            lines.append(f"- **{k}:** {v}")

    if phase.key_findings:
        lines.append("## Key Findings")
        for f in phase.key_findings:
            lines.append(f"- {f}")

    if phase.next_steps:
        lines.append("## Next Steps")
        for n in phase.next_steps:
            lines.append(f"- {n}")

    if phase.usage_examples:
        lines.append("## Usage Examples")
        for ex in phase.usage_examples:
            lines.append(f"### {ex.title}")
            if ex.description:
                lines.append(ex.description)
                lines.append("")
            lines.append(f"```bash\n{ex.code}\n```")

    with open(path, "w") as f:
        f.write("\n".join(lines))


def cmd_plan(args):
    """Handle 'plan' command.

    Args:
        args: Parsed arguments.
    """
    try:
        int(args.phase_id)
        dirname = f"phase_{int(args.phase_id):02d}"
    except ValueError:
        dirname = f"phase_{args.phase_id}"

    phase_dir = PHASES_ROOT / dirname
    json_path = phase_dir / "plan.json"

    plan = None
    if json_path.exists():
        with open(json_path, "r") as f:
            plan = PhasePlan(**json.load(f))

    if args.init:
        if plan:
            print(f"Plan for Phase {args.phase_id} already exists.")
        else:
            # Try to get title from results if exists, else "Untitled"
            res_path = phase_dir / "results.json"
            title = "Untitled Plan"
            if res_path.exists():
                with open(res_path, "r") as f:
                    title = json.load(f).get("title", title)

            plan = PhasePlan(phase_id=args.phase_id, title=title)
            save_json(json_path, plan)
            print(f"Initialized Plan for Phase {args.phase_id}")

    if args.add:
        if not plan:
            print("Error: Plan not found. Run --init first.")
            sys.exit(1)
        plan.items.append(PlanItem(step=args.add))
        save_json(json_path, plan)
        print("Added plan item.")

    if plan:
        # Always render MD
        md_path = phase_dir / f"HYPERBORG_PLAN_{args.phase_id}.md"
        lines = [f"# Plan: Phase {plan.phase_id} - {plan.title}", ""]
        for i, item in enumerate(plan.items, 1):
            ts = item.timestamp.split("T")[0]
            lines.append(f"{i}. **[{ts}]** {item.step}")

        with open(md_path, "w") as f:
            f.write("\n".join(lines))
        # Sync to docs
        DOCS_ROOT.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md_path, DOCS_ROOT / md_path.name)
        if args.render:
            print(f"Rendered plan to {md_path}")


def cmd_lessons(args):
    """Handle 'lessons' command.

    Args:
        args: Parsed arguments.
    """
    path = DOCS_ROOT / "lessons_learned.json"
    registry = load_json(path, LessonsRegistry)

    if args.render:
        md_lines = ["# Project HYPERBORG - Lessons Learned", ""]
        for phase in sorted(
            registry.phases.keys(), key=lambda x: int(x) if x.isdigit() else 999
        ):
            md_lines.append(f"## Phase {phase}")
            for lesson in registry.phases[phase]:
                md_lines.append(
                    f"- **[{lesson.timestamp.strftime('%Y-%m-%d')}]** {lesson.text}"
                )
            md_lines.append("")

        out_md = DOCS_ROOT / "lessons_learned.md"
        with open(out_md, "w") as f:
            f.write("\n".join(md_lines))
        print(f"Rendered lessons to {out_md}")
        return

    if not args.phase or not args.text:
        print("Error: --phase and --text required to add lesson.")
        sys.exit(1)

    pid = str(args.phase).replace("phase", "").strip()
    if pid not in registry.phases:
        registry.phases[pid] = []

    if not any(lesson.text == args.text for lesson in registry.phases[pid]):
        registry.phases[pid].append(Lesson(text=args.text))
        save_json(path, registry)
        print(f"Lesson added to Phase {pid}.")
    else:
        print("Duplicate lesson ignored.")


def cmd_inventory(args):
    """Handle 'inventory' command.

    Args:
        args: Parsed arguments.
    """
    path = DOCS_ROOT / "inventory.json"
    registry = load_json(path, InventoryRegistry)

    if args.render:
        md_lines = [
            "# Hyperborg Script & Tool Inventory",
            "",
            "| Path | Description | Status |",
            "|---|---|---|",
        ]
        for k in sorted(registry.items.keys()):
            item = registry.items[k]
            md_lines.append(f"| `{item.path}` | {item.description} | {item.status} |")

        out_md = DOCS_ROOT / "HYPERBORG_Inventory.md"
        with open(out_md, "w") as f:
            f.write("\n".join(md_lines))
        print(f"Rendered inventory to {out_md}")
        return

    if not args.path:
        print("Error: --path required.")
        sys.exit(1)

    registry.items[args.path] = InventoryItem(
        path=args.path,
        description=args.desc or "No description",
        category=args.cat or "Uncategorized",
        status=args.status or "Active",
    )
    save_json(path, registry)
    print(f"Updated inventory: {args.path}")


def cmd_report(args):
    """Handle 'report' command (Overview).

    Args:
        args: Parsed arguments.
    """
    path = DOCS_ROOT / "overview.json"
    registry = load_json(path, OverviewRegistry)

    if args.render:
        md_lines = [f"# {registry.title}", "", registry.mission, "", "## Roadmap"]
        for p in sorted(
            registry.phases, key=lambda x: int(x.id) if x.id.isdigit() else 999
        ):
            md_lines.append(f"- **Phase {p.id} ({p.title})**: [{p.status}]")

        if registry.faq:
            md_lines.extend(["", "## FAQ", ""])
            for item in registry.faq:
                md_lines.append(f"### {item.question}")
                md_lines.append(item.answer)
                md_lines.append("")

        if registry.extra_sections:
            for section_title, content in registry.extra_sections.items():
                md_lines.extend(["", f"## {section_title}", "", content])

        out_md = DOCS_ROOT / "HYPERBORG_Overview.md"
        with open(out_md, "w") as f:
            f.write("\n".join(md_lines))
        print(f"Rendered overview to {out_md}")
        return

    if args.add_faq_q and args.add_faq_a:
        registry.faq.append(FAQItem(question=args.add_faq_q, answer=args.add_faq_a))
        save_json(path, registry)
        print(f"Added FAQ item: {args.add_faq_q}")

    if args.phase_id and args.title:
        existing = next((p for p in registry.phases if p.id == args.phase_id), None)
        if existing:
            existing.title = args.title
            if args.status:
                existing.status = args.status
            if args.desc:
                existing.description = args.desc
        else:
            registry.phases.append(
                PhaseEntry(
                    id=args.phase_id,
                    title=args.title,
                    status=args.status or "Pending",
                    description=args.desc or "",
                )
            )
        save_json(path, registry)
        print(f"Updated overview for Phase {args.phase_id}")


# --- Main CLI ---


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Hyperborg Project Manager")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. LOG
    p_log = subparsers.add_parser("log", help="Manage Phase Results")
    p_log.add_argument("phase_id", help="Phase ID")
    p_log.add_argument("--init", action="store_true", help="Initialize new phase")
    p_log.add_argument("--title", help="Phase Title")
    p_log.add_argument("--status", help="Update Status")
    p_log.add_argument("--action", help="Log execution action")
    p_log.add_argument("--outcome", help="Log execution outcome")
    p_log.add_argument("--add-obj", help="Add objective")
    p_log.add_argument("--add-finding", help="Add finding")
    p_log.add_argument("--add-next", help="Add next step")
    p_log.add_argument("--add-usage-title", help="Title for usage example")
    p_log.add_argument("--add-usage-code", help="Code for usage example")
    p_log.add_argument("--add-usage-desc", help="Description for usage example")
    p_log.add_argument("--artifact", action="append", dest="artifacts")

    # 2. LESSONS
    p_less = subparsers.add_parser("lessons", help="Manage Lessons Learned")
    p_less.add_argument("--phase", help="Phase ID")
    p_less.add_argument("--text", help="Lesson content")
    p_less.add_argument("--render", action="store_true", help="Render to MD")

    # 3. INVENTORY
    p_inv = subparsers.add_parser("inventory", help="Manage Script Inventory")
    p_inv.add_argument("--path", help="Script path")
    p_inv.add_argument("--desc", help="Description")
    p_inv.add_argument("--cat", help="Category")
    p_inv.add_argument("--status", help="Status")
    p_inv.add_argument("--render", action="store_true", help="Render to MD")

    # 4. REPORT
    p_rep = subparsers.add_parser("report", help="Manage Overview/Roadmap")
    p_rep.add_argument("--render", action="store_true", help="Render to MD")
    p_rep.add_argument("--phase_id", help="Phase ID")
    p_rep.add_argument("--title", help="Phase Title")
    p_rep.add_argument("--status", help="Phase Status")
    p_rep.add_argument("--desc", help="Phase Description")
    p_rep.add_argument("--add-faq-q", help="FAQ Question")
    p_rep.add_argument("--add-faq-a", help="FAQ Answer")

    # 5. PLAN
    p_plan = subparsers.add_parser("plan", help="Manage Phase Plans")
    p_plan.add_argument("phase_id", help="Phase ID")
    p_plan.add_argument("--init", action="store_true", help="Initialize plan")
    p_plan.add_argument("--add", help="Add plan step")
    p_plan.add_argument("--render", action="store_true", help="Render to MD")

    args = parser.parse_args()

    if args.command == "log":
        cmd_log(args)
    elif args.command == "lessons":
        cmd_lessons(args)
    elif args.command == "inventory":
        cmd_inventory(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "plan":
        cmd_plan(args)


if __name__ == "__main__":
    main()
