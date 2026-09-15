const test = require('node:test');
const assert = require('node:assert/strict');
const { checkSource } = require('./check-architecture.cjs');
const { classify, lineCount } = require('./check-maintainability.cjs');
const renderer = 'electron/src/renderer/components/Fake.tsx';
test('renderer rejects static, dynamic, CommonJS, export and type-only privileged imports', () => {
  for (const code of [
    "import fs from 'node:fs';", "const fs = require('fs/promises');", "import('child_process');",
    "export { ipcRenderer } from 'electron';", "import type { Shell } from 'electron';",
    "type Shell = import('electron').Shell;", "import x = require('node:fs');",
    "import x from '../../main/paths';", "import '../../../../runtime/src/index';",
    "import('../../main/' + name);", "require(name);",
  ]) assert(checkSource(renderer, code).some(i => i.rule === 'ARCH-001'), code);
  assert(checkSource(renderer, "import x from '@main/paths';", () => 'electron/src/main/paths.ts').some(i => i.rule === 'ARCH-001'));
});
test('common, Runtime decision boundary and development-only imports reject violations', () => {
  assert(checkSource('electron/src/common/fake.ts', "import fs from 'fs';").some(i => i.rule === 'ARCH-002'));
  assert(checkSource('electron/src/common/fake.ts', "export * from '../main/paths';").some(i => i.rule === 'ARCH-002'));
  for (const code of ["import OpenAI from 'openai';", "import { query } from '@anthropic-ai/claude-agent-sdk';", "import '../../electron/src/main/agent';"])
    assert(checkSource('runtime/src/fake.ts', code).some(i => i.rule === 'ARCH-003'), code);
  for (const code of ["import '../../../scripts/dev/project.cjs';", "import map from '../../../.vibecoding/project-map.yaml';"])
    assert(checkSource('electron/src/main/fake.ts', code).some(i => i.rule === 'ARCH-004'), code);
});
test('comments, browser imports, shared types and existing Runtime bridge remain allowed', () => {
  assert.deepEqual(checkSource(renderer, "// require('fs')\nimport React from 'react';\nimport type { X } from '../../common/explore';\nconst note = \"import('electron')\";"), []);
  assert.deepEqual(checkSource('runtime/src/attachment/client.ts', "import fs from 'node:fs';\nfetch(bridgeUrl, { method: 'POST' });"), []);
  assert(checkSource(renderer, 'import {').some(i => i.rule === 'PARSE'));
});
test('size budgets warn without treating existing large files as failed behavior', () => {
  assert.equal(lineCount('a\r\nb\r\n'), 2);
  for (const [lines, expected] of [[399,'NORMAL'],[400,'REVIEW'],[800,'REVIEW'],[801,'EXTRACTION_PREFERRED'],[1201,'NO_NEW_MAJOR_BUSINESS_LOGIC']]) assert.equal(classify('X.tsx', lines), expected);
  assert.equal(classify('service.ts', 499), 'NORMAL');
  assert.equal(classify('service.ts', 500), 'REVIEW');
  assert.equal(classify('service.ts', 801), 'EXTRACTION_PREFERRED');
});
