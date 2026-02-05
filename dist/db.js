/**
 * @license
 * SPDX-License-Identifier: MIT
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
/**
 * Constants for artifact directories.
 */
export const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
export const PHASES_DIR = path.join(ARTIFACTS_DIR, 'phases');
export const DOCS_DIR = path.join(ARTIFACTS_DIR, 'docs');
/**
 * Manages the SQLite database and project memory operations.
 */
export class ProjectDatabase {
    db;
    /**
     * Initializes the database connection and schema.
     * @param dbPath - Path to the SQLite database file.
     */
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.registerFunctions();
        this.initSchema();
    }
    /**
     * Registers custom SQL functions.
     */
    registerFunctions() {
        this.db.function('regexp', (pattern, text) => {
            try {
                return new RegExp(pattern, 'i').test(text) ? 1 : 0;
            }
            catch {
                return 0;
            }
        });
    }
    /**
     * Initializes the database tables.
     */
    initSchema() {
        const schema = `
      CREATE TABLE IF NOT EXISTS project_info (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS phases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        description TEXT,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME
      );

      CREATE TABLE IF NOT EXISTS objectives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        text TEXT,
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS execution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        action TEXT,
        outcome TEXT,
        artifacts TEXT, -- JSON string
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        text TEXT,
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS next_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        text TEXT,
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS usage_examples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        title TEXT,
        code TEXT,
        description TEXT,
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        step TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id TEXT,
        text TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(phase_id) REFERENCES phases(id)
      );

      CREATE TABLE IF NOT EXISTS inventory (
        path TEXT PRIMARY KEY,
        description TEXT,
        category TEXT DEFAULT 'Uncategorized',
        status TEXT DEFAULT 'Active',
        usage TEXT
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT,
        answer TEXT,
        phase_id TEXT -- NULL if global
      );
    `;
        this.db.exec(schema);
    }
    /**
     * Closes the database connection.
     */
    close() {
        this.db.close();
    }
    /**
     * Initializes or updates a project phase.
     */
    managePhase(action, phaseId, title, status, description) {
        if (action === 'init') {
            if (!title)
                throw new Error('Title is required for initialization.');
            const stmt = this.db.prepare('INSERT INTO phases (id, title, description, status) VALUES (?, ?, ?, ?)');
            stmt.run(phaseId, title, description || '', status || 'Pending');
            return `Phase ${phaseId} initialized.`;
        }
        else {
            const updates = [];
            const params = [];
            if (title) {
                updates.push('title = ?');
                params.push(title);
            }
            if (status) {
                updates.push('status = ?');
                params.push(status);
            }
            if (description) {
                updates.push('description = ?');
                params.push(description);
            }
            if (updates.length === 0)
                return 'No updates provided.';
            params.push(phaseId);
            const stmt = this.db.prepare(`UPDATE phases SET ${updates.join(', ')} WHERE id = ?`);
            const info = stmt.run(...params);
            if (info.changes === 0)
                throw new Error(`Phase ${phaseId} not found.`);
            return `Phase ${phaseId} updated.`;
        }
    }
    /**
     * Logs execution steps.
     */
    logWork(phaseId, action, outcome, artifacts = []) {
        const stmt = this.db.prepare('INSERT INTO execution_logs (phase_id, action, outcome, artifacts) VALUES (?, ?, ?, ?)');
        stmt.run(phaseId, action, outcome, JSON.stringify(artifacts));
        return `Work logged for Phase ${phaseId}.`;
    }
    /**
     * Adds items to a phase (objectives, findings, next steps).
     */
    addPhaseItem(phaseId, type, content) {
        let table = '';
        if (type === 'objective')
            table = 'objectives';
        else if (type === 'finding')
            table = 'findings';
        else if (type === 'next_step')
            table = 'next_steps';
        const stmt = this.db.prepare(`INSERT INTO ${table} (phase_id, text) VALUES (?, ?)`);
        stmt.run(phaseId, content);
        return `Added ${type} to Phase ${phaseId}.`;
    }
    /**
     * Adds a usage example.
     */
    addUsageExample(phaseId, title, code, description = '') {
        const stmt = this.db.prepare('INSERT INTO usage_examples (phase_id, title, code, description) VALUES (?, ?, ?, ?)');
        stmt.run(phaseId, title, code, description);
        return `Usage example added to Phase ${phaseId}.`;
    }
    /**
     * Adds a plan step.
     */
    managePlan(phaseId, step) {
        const stmt = this.db.prepare('INSERT INTO plans (phase_id, step) VALUES (?, ?)');
        stmt.run(phaseId, step);
        return `Plan step added to Phase ${phaseId}.`;
    }
    /**
     * Records a lesson learned.
     */
    recordLesson(phaseId, text) {
        const stmt = this.db.prepare('INSERT INTO lessons (phase_id, text) VALUES (?, ?)');
        stmt.run(phaseId, text);
        return `Lesson recorded for Phase ${phaseId}.`;
    }
    /**
     * Manages inventory items.
     */
    manageInventory(filePath, description, category = 'Uncategorized', status = 'Active', usage = null) {
        const stmt = this.db.prepare(`
      INSERT INTO inventory (path, description, category, status, usage)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
      description=excluded.description,
      category=coalesce(excluded.category, inventory.category),
      status=coalesce(excluded.status, inventory.status),
      usage=coalesce(excluded.usage, inventory.usage)
    `);
        stmt.run(filePath, description, category, status, usage);
        return `Inventory updated for ${filePath}.`;
    }
    /**
     * Updates overview info.
     */
    manageOverview(mission, architecture, faqQuestion, faqAnswer, phaseId) {
        if (mission)
            this.db.prepare('INSERT OR REPLACE INTO project_info (key, value) VALUES (?, ?)').run('mission', mission);
        if (architecture)
            this.db.prepare('INSERT OR REPLACE INTO project_info (key, value) VALUES (?, ?)').run('architecture', architecture);
        if (faqQuestion && faqAnswer) {
            this.db.prepare('INSERT INTO faqs (question, answer, phase_id) VALUES (?, ?, ?)').run(faqQuestion, faqAnswer, phaseId || null);
            return 'Overview updated and FAQ added.';
        }
        return 'Overview updated.';
    }
    /**
     * Performs a search across multiple tables.
     */
    performSearch(query, type, tables) {
        const searchAll = !tables || tables.length === 0;
        const results = [];
        const operator = type === 'regex' ? 'REGEXP' : 'LIKE';
        const param = type === 'regex' ? query : `%${query}%`;
        const runQuery = (sql, params) => this.db.prepare(sql).all(...params);
        if (searchAll || tables?.includes('phases')) {
            const matches = runQuery(`SELECT id, title, description FROM phases WHERE title ${operator} ? OR description ${operator} ?`, [param, param]);
            matches.forEach(r => results.push(`[PHASE ${r.id}] ${r.title}: ${r.description}`));
        }
        if (searchAll || tables?.includes('execution_logs')) {
            const matches = runQuery(`SELECT phase_id, action, outcome FROM execution_logs WHERE action ${operator} ? OR outcome ${operator} ?`, [param, param]);
            matches.forEach(r => results.push(`[LOG Phase ${r.phase_id}] ${r.action} -> ${r.outcome}`));
        }
        if (searchAll || tables?.includes('objectives')) {
            const matches = runQuery(`SELECT phase_id, text FROM objectives WHERE text ${operator} ?`, [param]);
            matches.forEach(r => results.push(`[OBJECTIVE Phase ${r.phase_id}] ${r.text}`));
        }
        if (searchAll || tables?.includes('findings')) {
            const matches = runQuery(`SELECT phase_id, text FROM findings WHERE text ${operator} ?`, [param]);
            matches.forEach(r => results.push(`[FINDING Phase ${r.phase_id}] ${r.text}`));
        }
        if (searchAll || tables?.includes('next_steps')) {
            const matches = runQuery(`SELECT phase_id, text FROM next_steps WHERE text ${operator} ?`, [param]);
            matches.forEach(r => results.push(`[NEXT STEP Phase ${r.phase_id}] ${r.text}`));
        }
        if (searchAll || tables?.includes('lessons')) {
            const matches = runQuery(`SELECT phase_id, text FROM lessons WHERE text ${operator} ?`, [param]);
            matches.forEach(r => results.push(`[LESSON Phase ${r.phase_id}] ${r.text}`));
        }
        if (searchAll || tables?.includes('inventory')) {
            const matches = runQuery(`SELECT path, description FROM inventory WHERE path ${operator} ? OR description ${operator} ?`, [param, param]);
            matches.forEach(r => results.push(`[INVENTORY] ${r.path}: ${r.description}`));
        }
        if (searchAll || tables?.includes('plans')) {
            const matches = runQuery(`SELECT phase_id, step FROM plans WHERE step ${operator} ?`, [param]);
            matches.forEach(r => results.push(`[PLAN Phase ${r.phase_id}] ${r.step}`));
        }
        if (searchAll || tables?.includes('faqs')) {
            const matches = runQuery(`SELECT question, answer FROM faqs WHERE question ${operator} ? OR answer ${operator} ?`, [param, param]);
            matches.forEach(r => results.push(`[FAQ] Q: ${r.question} | A: ${r.answer}`));
        }
        return results;
    }
    /**
     * Helper to ensure directories exist.
     */
    ensureDirs() {
        if (!fs.existsSync(ARTIFACTS_DIR))
            fs.mkdirSync(ARTIFACTS_DIR);
        if (!fs.existsSync(PHASES_DIR))
            fs.mkdirSync(PHASES_DIR);
        if (!fs.existsSync(DOCS_DIR))
            fs.mkdirSync(DOCS_DIR);
    }
    /**
     * Generates a specific report and returns the filename.
     */
    generateReport(type, pid, searchQuery, searchType) {
        this.ensureDirs();
        let output = '';
        let filename = '';
        if (type === 'phase') {
            if (!pid)
                throw new Error('phase_id required for phase report');
            const phase = this.db.prepare('SELECT * FROM phases WHERE id = ?').get(pid);
            if (!phase)
                throw new Error(`Phase ${pid} not found`);
            const objs = this.db.prepare('SELECT text FROM objectives WHERE phase_id = ?').all(pid);
            const logs = this.db.prepare('SELECT * FROM execution_logs WHERE phase_id = ?').all(pid);
            const findings = this.db.prepare('SELECT text FROM findings WHERE phase_id = ?').all(pid);
            const nexts = this.db.prepare('SELECT text FROM next_steps WHERE phase_id = ?').all(pid);
            const usages = this.db.prepare('SELECT * FROM usage_examples WHERE phase_id = ?').all(pid);
            const planItems = this.db.prepare('SELECT * FROM plans WHERE phase_id = ? ORDER BY id').all(pid);
            const lines = [
                `# Phase ${phase.id}: ${phase.title}`,
                '',
                `**Status:** ${phase.status}`,
                `**Date:** ${phase.start_date}`,
                `**Description:** ${phase.description || ''}`,
                '',
                '## Objectives',
                ...objs.map(o => `- ${o.text}`),
                '',
                '## Execution Plan',
                ...planItems.map(p => `- [${p.timestamp}] ${p.step}`),
                '',
                '## Execution Log',
                ...logs.map(l => `- **${l.timestamp}**: ${l.action}\n  - Outcome: ${l.outcome}`),
                '',
                '## Key Findings',
                ...findings.map(f => `- ${f.text}`),
                '',
                '## Next Steps',
                ...nexts.map(n => `- ${n.text}`),
                '',
                '## Usage Examples',
                ...usages.map(u => `### ${u.title}\n${u.description || ''}\n\`\`\`bash\n${u.code}\n\`\`\``),
            ];
            output = lines.join('\n');
            filename = path.join(PHASES_DIR, `Phase_${pid}_Report.md`);
        }
        else if (type === 'inventory') {
            const items = this.db.prepare('SELECT * FROM inventory ORDER BY category, path').all();
            const lines = [
                '# Project Inventory',
                '',
                '| Path | Description | Category | Status |',
                '|---|---|---|---|',
                ...items.map(i => `| \`${i.path}\` | ${i.description} | ${i.category} | ${i.status} |`),
            ];
            output = lines.join('\n');
            filename = path.join(DOCS_DIR, 'Inventory.md');
        }
        else if (type === 'lessons') {
            const lessons = this.db.prepare('SELECT l.*, p.title as phase_title FROM lessons l JOIN phases p ON l.phase_id = p.id ORDER BY l.timestamp').all();
            const lines = [
                '# Lessons Learned',
                '',
                ...lessons.map(l => `- **[Phase ${l.phase_id}: ${l.phase_title}]** ${l.text}`),
            ];
            output = lines.join('\n');
            filename = path.join(DOCS_DIR, 'Lessons_Learned.md');
        }
        else if (type === 'overview') {
            const mission = this.db.prepare("SELECT value FROM project_info WHERE key = 'mission'").get();
            const arch = this.db.prepare("SELECT value FROM project_info WHERE key = 'architecture'").get();
            const phases = this.db.prepare('SELECT * FROM phases ORDER BY id').all();
            const faqs = this.db.prepare('SELECT * FROM faqs WHERE phase_id IS NULL').all();
            const lines = [
                '# Project Overview',
                '',
                '## Mission',
                mission?.value || 'No mission defined.',
                '',
                '## Architecture',
                arch?.value || 'No architecture defined.',
                '',
                '## Roadmap / Phases',
                ...phases.map(p => `- **Phase ${p.id} (${p.title})**: [${p.status}] ${p.description || ''}`),
                '',
                '## FAQ',
                ...faqs.map(f => `### ${f.question}\n${f.answer}\n`),
            ];
            output = lines.join('\n');
            filename = path.join(DOCS_DIR, 'Overview.md');
        }
        else if (type === 'search') {
            if (!searchQuery)
                throw new Error('search_query required for search report');
            const stype = searchType || 'keyword';
            const results = this.performSearch(searchQuery, stype);
            const lines = [
                `# Search Results`,
                '',
                `**Query:** \`${searchQuery}\` (${stype})`,
                `**Date:** ${new Date().toISOString()}`,
                '',
                '## Matches',
                results.length > 0 ? results.map(r => `- ${r}`).join('\n') : '_No matches found._'
            ];
            output = lines.join('\n');
            const safeQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, '_');
            filename = path.join(DOCS_DIR, `Search_Results_${safeQuery}.md`);
        }
        fs.writeFileSync(filename, output);
        return filename;
    }
    /**
     * Generates multiple reports.
     */
    generateReports(reportType, phaseId, searchQuery, searchType) {
        const generatedFiles = [];
        if (reportType === 'all') {
            generatedFiles.push(this.generateReport('overview'));
            generatedFiles.push(this.generateReport('inventory'));
            generatedFiles.push(this.generateReport('lessons'));
            const phases = this.db.prepare('SELECT id FROM phases').all();
            for (const p of phases) {
                generatedFiles.push(this.generateReport('phase', p.id));
            }
            return `Successfully generated ${generatedFiles.length} reports in ${ARTIFACTS_DIR}.`;
        }
        else if (reportType === 'search') {
            const file = this.generateReport('search', undefined, searchQuery, searchType);
            return `Search report generated: ${file}`;
        }
        else {
            const file = this.generateReport(reportType, phaseId);
            return `Report generated: ${file}`;
        }
    }
}
