import { ProjectDatabase } from '../src/db.js';
import path from 'path';
import fs from 'fs';

// Use a specific DB for this demo to avoid messing with real data (if any)
// But we want to test that gitignore ignores it.
const DEMO_DB = 'demo_project_memory.db';
const db = new ProjectDatabase(DEMO_DB);

console.log('=== Starting Gemini Project Memory Integration Demo ===\n');

try {
  // 1. Manage Phase (Init)
  console.log('[Test] Initializing Phase 1...');
  console.log(db.managePhase('init', '1', 'Integration Test Phase', 'Active', 'Testing all features'));

  // 2. Log Work
  console.log('\n[Test] Logging Work...');
  console.log(db.logWork('1', 'Run integration script', 'Success', ['logs.txt']));

  // 3. Add Phase Items
  console.log('\n[Test] Adding Objectives and Findings...');
  console.log(db.addPhaseItem('1', 'objective', 'Verify system stability'));
  console.log(db.addPhaseItem('1', 'finding', 'System is stable'));
  console.log(db.addPhaseItem('1', 'next_step', 'Deploy to prod'));

  // 4. Usage Example
  console.log('\n[Test] Adding Usage Example...');
  console.log(db.addUsageExample('1', 'Run Test', 'npm test', 'How to run tests'));

  // 5. Plan
  console.log('\n[Test] Adding Plan...');
  console.log(db.managePlan('1', 'Step 1: Write code'));

  // 6. Lesson
  console.log('\n[Test] Recording Lesson...');
  console.log(db.recordLesson('1', 'Always check gitignore'));

  // 7. Inventory
  console.log('\n[Test] Managing Inventory...');
  console.log(db.manageInventory('tests/integration_demo.ts', 'The demo script', 'Test', 'Active'));

  // 8. Overview
  console.log('\n[Test] Updating Overview...');
  console.log(db.manageOverview('To test everything', 'Monolithic', 'Why?', 'Because.'));

  // 9. Search (Keyword)
  console.log('\n[Test] Searching (Keyword: "stable")...');
  const searchRes = db.performSearch('stable', 'keyword');
  console.log(searchRes.join('\n'));

  // 10. Search (Regex)
  console.log('\n[Test] Searching (Regex: "Integration.*Phase")...');
  const regexRes = db.performSearch('Integration.*Phase', 'regex');
  console.log(regexRes.join('\n'));

  // 11. Reports
  console.log('\n[Test] Generating Reports...');
  console.log(db.generateReports('phase', '1'));
  console.log(db.generateReports('inventory'));
  console.log(db.generateReports('lessons'));
  console.log(db.generateReports('overview'));
  console.log(db.generateReports('search', undefined, 'stable', 'keyword'));
  
  console.log('\n[Test] Generating ALL Reports...');
  console.log(db.generateReports('all'));

  console.log('\n=== Demo Complete ===');

} catch (error) {
  console.error('Test Failed:', error);
  process.exit(1);
}
