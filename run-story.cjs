#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const storyId = process.argv[2];

if (!storyId) {
  console.error("Usage: node run-story.cjs EP-1.1");
  process.exit(1);
}

const backlogPath = path.join(process.cwd(), "docs", "IMPLEMENTATION-BACKLOG.md");

if (!fs.existsSync(backlogPath)) {
  console.error("Could not find docs/IMPLEMENTATION-BACKLOG.md");
  process.exit(1);
}

const backlog = fs.readFileSync(backlogPath, "utf8");

const storyRegex = new RegExp(
  `###\\s+${storyId.replace(".", "\\.")}\\s+—\\s+([^\\n]+)([\\s\\S]*?)(?=\\n###\\s+EP-|\\n##\\s+Epic|\\n#\\s|$)`,
  "m"
);

const match = backlog.match(storyRegex);

if (!match) {
  console.error(`Could not find story ${storyId} in IMPLEMENTATION-BACKLOG.md`);
  process.exit(1);
}

const storyTitle = match[1].trim();
const storyBody = match[2].trim();

const prompt = `
Implement backlog story: ${storyId} — ${storyTitle}

Story details from IMPLEMENTATION-BACKLOG.md:

${storyBody}

Before writing code, do all of the following:

1. Read:
- docs/00-START-HERE.md
- docs/ADR-001-Interactive-Demo-Platform-Architecture.md
- docs/CODING-STANDARDS.md
- docs/IMPLEMENTATION-BACKLOG.md

2. Read every PRD/TDS reference listed in this story.

3. Inspect the current repository structure and existing code.

4. Produce a short implementation plan first, including:
- files to create or modify
- affected app/service/package
- data model impact
- API impact, if any
- tests to add
- risks or ambiguities

Do not write code until I approve the plan.

Scope rules:
- Implement only ${storyId}.
- Do not implement future stories.
- Do not invent undocumented product behavior.
- Do not change architecture unless the ADR/TDS requires it.
- Do not mix LeadBoard product logic into the Experience Platform.
- Keep the implementation minimal, typed, tested, and aligned with CODING-STANDARDS.md.

After approval:
- implement the story,
- add or update tests,
- run typecheck/lint/tests where possible,
- update documentation only if behavior changes,
- summarize what changed and which acceptance criteria are satisfied.
`.trim();

const outDir = path.join(process.cwd(), ".cursor-prompts");
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, `${storyId}.md`);
fs.writeFileSync(outFile, prompt);

console.log(`Prompt created: ${outFile}`);
console.log("");
console.log(prompt);