/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'path';
import { ProjectDatabase } from './db.js';

async function main() {
  try {
    // --- Database Setup ---
    const dbPath = path.join(process.cwd(), 'project_memory.db');
    let db: ProjectDatabase;
    try {
      db = new ProjectDatabase(dbPath);
    } catch (error: any) {
      console.error('FAILED to initialize SQLite database:', error);
      console.error('Ensure better-sqlite3 is compiled for the current Node version.');
      process.exit(1);
    }

    // --- MCP Server ---
    const server = new McpServer({
      name: 'gemini-project-memory',
      version: '1.0.0',
    });

    // 1. Manage Phase
    server.registerTool(
      'manage_phase',
      {
        description: 'Initialize or update a project phase.',
        inputSchema: z.object({
          action: z.enum(['init', 'update']).describe('Action to perform.'),
          phase_id: z.string().describe('Phase ID (e.g., "1", "01").'),
          title: z.string().optional().describe('Phase title (required for init).'),
          status: z.string().optional().describe('New status (e.g., "Active", "Completed").'),
          description: z.string().optional().describe('Phase description.'),
        }),
      },
      async ({ action, phase_id, title, status, description }) => {
        try {
          const result = db.managePhase(action, phase_id, title, status, description);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 2. Log Work
    server.registerTool(
      'log_work',
      {
        description: 'Log execution steps, outcomes, and artifacts for a phase.',
        inputSchema: z.object({
          phase_id: z.string(),
          action: z.string(),
          outcome: z.string(),
          artifacts: z.array(z.string()).optional(),
        }),
      },
      async ({ phase_id, action, outcome, artifacts }) => {
        try {
          const result = db.logWork(phase_id, action, outcome, artifacts);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 3. Add Phase Items (Objectives, Findings, Next Steps)
    server.registerTool(
      'add_phase_item',
      {
        description: 'Add specific items to a phase.',
        inputSchema: z.object({
          phase_id: z.string(),
          type: z.enum(['objective', 'finding', 'next_step']),
          content: z.string(),
        }),
      },
      async ({ phase_id, type, content }) => {
        try {
          const result = db.addPhaseItem(phase_id, type, content);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 4. Add Usage Example
    server.registerTool(
      'add_usage_example',
      {
        description: 'Add a code usage example to a phase.',
        inputSchema: z.object({
          phase_id: z.string(),
          title: z.string(),
          code: z.string(),
          description: z.string().optional(),
        }),
      },
      async ({ phase_id, title, code, description }) => {
        try {
          const result = db.addUsageExample(phase_id, title, code, description);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 5. Manage Plan
    server.registerTool(
      'manage_plan',
      {
        description: 'Manage the execution plan for a phase.',
        inputSchema: z.object({
          phase_id: z.string(),
          step: z.string().describe('The plan step to add.'),
        }),
      },
      async ({ phase_id, step }) => {
        try {
          const result = db.managePlan(phase_id, step);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 6. Record Lesson
    server.registerTool(
      'record_lesson',
      {
        description: 'Record a lesson learned.',
        inputSchema: z.object({
          phase_id: z.string(),
          text: z.string(),
        }),
      },
      async ({ phase_id, text }) => {
        try {
          const result = db.recordLesson(phase_id, text);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 7. Manage Inventory
    server.registerTool(
      'manage_inventory',
      {
        description: 'Register or update a script/tool in the inventory.',
        inputSchema: z.object({
          path: z.string(),
          description: z.string(),
          category: z.string().optional(),
          status: z.string().optional(),
          usage: z.string().optional(),
        }),
      },
      async ({ path: filePath, description, category, status, usage }) => {
        try {
          const result = db.manageInventory(filePath, description, category, status, usage);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 8. Manage Overview
    server.registerTool(
      'manage_overview',
      {
        description: 'Update project overview info or add FAQs.',
        inputSchema: z.object({
          mission: z.string().optional(),
          architecture: z.string().optional(),
          faq_question: z.string().optional(),
          faq_answer: z.string().optional(),
          phase_id: z.string().optional().describe('Optional phase ID for FAQs'),
        }),
      },
      async ({ mission, architecture, faq_question, faq_answer, phase_id }) => {
        try {
          const result = db.manageOverview(mission, architecture, faq_question, faq_answer, phase_id);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 9. Render Report
    server.registerTool(
      'render_report',
      {
        description: 'Generate Markdown reports and save them to the artifacts directory.',
        inputSchema: z.object({
          report_type: z.enum(['phase', 'inventory', 'lessons', 'overview', 'all', 'search']),
          phase_id: z.string().optional().describe('Required if report_type is "phase"'),
          search_query: z.string().optional().describe('Required if report_type is "search"'),
          search_type: z.enum(['keyword', 'regex']).optional().default('keyword').describe('Type of search if report_type is "search"'),
        }),
      },
      async ({ report_type, phase_id, search_query, search_type }) => {
        try {
          const result = db.generateReports(report_type, phase_id, search_query, search_type);
          return { content: [{ type: 'text', text: result }] };
        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // 10. Search Memory
    server.registerTool(
      'search_memory',
      {
        description: 'Search for project information using keywords or regex.',
        inputSchema: z.object({
          query: z.string().describe('The search query (keyword or regex pattern).'),
          type: z.enum(['keyword', 'regex']).optional().default('keyword').describe('Type of search.'),
          tables: z.array(z.string()).optional().describe('Tables to search (default: all relevant tables).'),
        }),
      },
      async ({ query, type, tables }) => {
        try {
          const results = db.performSearch(query, type, tables);
          if (results.length === 0) {
            return { content: [{ type: 'text', text: 'No matches found.' }] };
          }
          return { content: [{ type: 'text', text: results.join('\n') }] };

        } catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
      }
    );

    // Connect server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Gemini Project Memory Manager running on stdio');

  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

main();