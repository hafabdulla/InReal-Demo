#!/usr/bin/env node
// Keeps this project's living docs from quietly falling behind the code.
//
// SessionStart ("start") records where both repos were when the session began.
// Stop ("stop") compares that mark against what changed, and if code moved
// while documents/InReal_Master_Tracker.md did not, it blocks the stop once and
// says so. Once per session, deliberately: a check that can fire repeatedly is
// a check people learn to route around.
//
// It reminds; it does not write. Deciding what a tracker entry should say is
// the judgement the tracker exists to capture.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const mode = process.argv[2];
const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docsRepo = join(repo, 'documents');

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { input = {}; }
const sessionId = String(input.session_id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
const stateDir = join(homedir(), '.claude', 'inreal-doc-state');
const stateFile = join(stateDir, `${sessionId}.json`);

// What counts as code worth a tracker entry, and what counts as the docs.
const CODE = /^(server\.js|mailer\.js|src\/|ops-admin-portal\/|database\/|tools\/|test-escaping\.mjs|package\.json)/;
const GUIDE = /^(CLAUDE\.md)$/;
const TRACKER = /InReal_Master_Tracker\.md$/;

if (mode === 'start') {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify({
    at: new Date().toISOString(),
    appHead: git(repo, ['rev-parse', 'HEAD']),
    docsHead: git(docsRepo, ['rev-parse', 'HEAD']),
    warned: false,
  }, null, 2));
  process.exit(0);
}

if (mode !== 'stop' || !existsSync(stateFile)) process.exit(0);

let state;
try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch { process.exit(0); }
if (state.warned) process.exit(0);

// Everything touched since the session began: committed since the mark, plus
// whatever is still sitting in the working tree.
const touched = (cwd, head) => {
  const committed = head ? git(cwd, ['diff', '--name-only', `${head}..HEAD`]) : '';
  const working = git(cwd, ['status', '--porcelain'])
    .split('\n').map((line) => line.slice(3).trim()).filter(Boolean).join('\n');
  return [...new Set(`${committed}\n${working}`.split('\n').map((f) => f.trim()).filter(Boolean))];
};

const appFiles = touched(repo, state.appHead);
const docFiles = touched(docsRepo, state.docsHead);

const code = appFiles.filter((f) => CODE.test(f));
const trackerUpdated = docFiles.some((f) => TRACKER.test(f)) || appFiles.some((f) => TRACKER.test(f));
const guideUpdated = appFiles.some((f) => GUIDE.test(f));

if (code.length === 0 || trackerUpdated) process.exit(0);

state.warned = true;
writeFileSync(stateFile, JSON.stringify(state, null, 2));

const sample = code.slice(0, 6).join(', ') + (code.length > 6 ? `, and ${code.length - 6} more` : '');
const reason = [
  `This session changed code (${sample}) but documents/InReal_Master_Tracker.md was not updated.`,
  'That tracker is this project\'s living record: add or extend the relevant entry with what was built, what was decided and how it was tested, and update the Plain-English Status row so it does not drift behind the log.',
  guideUpdated ? '' : 'Check CLAUDE.md too: a new migration, env var, role rule or gotcha belongs there.',
  'If this session genuinely needs no doc update - a scratch experiment, a test run, a question answered - say so and stop again. This fires once per session.',
].filter(Boolean).join(' ');

console.log(JSON.stringify({
  decision: 'block',
  reason,
  systemMessage: `Docs check: code changed (${code.length} file(s)) without a tracker update.`,
}));
