import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

test('feedback workflow preserves critical checks and least privilege', () => {
  const workflow = readFileSync('.github/workflows/week-03-ci-amenazas-feedback.yml', 'utf8');
  expect(workflow).toMatch(/actions\/setup-node@v4/);
  expect(workflow).toMatch(/node-version:\s*['"]?22/);
  // The approved workflow delegates installation to the published Make target.
  // Validate the delegated command, not a misleading comment or literal string.
  if (!/^\s+run:\s*npm ci\s*$/m.test(workflow)) {
    expect(workflow).toMatch(/^\s+run:\s*make setup\s*$/m);
    const makefile = readFileSync('Makefile', 'utf8');
    const setup = makefile.match(/^setup:\s*\n((?:\t[^\n]*\n)+)/m);
    expect(setup).not.toBeNull();
    expect(setup![1]).toMatch(/^\t\$\(NPM\) ci\s*$/m);
  }
  expect(workflow).toMatch(/typecheck|verify-week-03/);
  expect(workflow).not.toMatch(/\|\|\s*true|continue-on-error:\s*true|--passWithNoTests/i);
  expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read/);
});

test('threat model links assets, threats, controls and verification', () => {
  const model = readFileSync('docs/threat-model.md', 'utf8');
  for (const concept of ['activo', 'amenaza', 'control', 'verificación']) expect(model.toLowerCase()).toContain(concept);
});

test('source code does not expose credentials', () => {
  const sourceRoots = ['App.tsx', 'index.ts', 'src', 'course-backend'];
  const sourceExtensions = new Set(['.cjs', '.js', '.mjs', '.ts', '.tsx']);
  const files: string[] = [];

  const collectSourceFiles = (path: string) => {
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path)) collectSourceFiles(join(path, entry));
      return;
    }
    if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) files.push(path);
  };

  for (const sourceRoot of sourceRoots) collectSourceFiles(sourceRoot);

  const secretPatterns = [
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /\b(?:api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{8,}["']/i,
  ];
  const exposedFiles = files.filter((file) => secretPatterns.some((pattern) => pattern.test(readFileSync(file, 'utf8'))));

  if (process.env.FAKE_TOKEN) exposedFiles.push('FAKE_TOKEN environment variable');
  expect(exposedFiles).toEqual([]);
});
