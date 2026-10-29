import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', '.jest-cache', 'coverage', 'dist', 'build', 'android', 'ios']);

function versionedFiles(relativeDirectory: string): string[] {
  const directory = path.join(repositoryRoot, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  const result: string[] = [];
  const visit = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) visit(path.join(current, entry.name));
      else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|json|md|yml|yaml|txt)$/.test(entry.name)) result.push(path.join(current, entry.name));
    }
  };
  visit(directory);
  return result;
}

function readText(file: string): string { return fs.readFileSync(file, 'utf8'); }

function containsWebSurface(): boolean {
  const packageJson = JSON.parse(readText(path.join(repositoryRoot, 'package.json')));
  return Boolean(packageJson.dependencies?.['react-dom'] || packageJson.devDependencies?.['react-dom'] || packageJson.scripts?.web || fs.existsSync(path.join(repositoryRoot, 'web')));
}

function secretFindings(text: string): string[] {
  const patterns: [string, RegExp][] = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
    ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
    ['JWT-like token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
    ['credential assignment', /\b(?:password|secret|api[_-]?key)\s*[:=]\s*["'][^"']{12,}["']/i],
  ];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([kind]) => kind);
}

describe('security boundary checks', () => {
  test('does not introduce browser HTML sinks into the native source tree', () => {
    const sourceText = versionedFiles('src').map(readText).join('\n');
    expect(sourceText).not.toMatch(/dangerouslySetInnerHTML|innerHTML|document\.write|eval\s*\(/i);
    expect(sourceText).not.toMatch(/<script|javascript:/i);
  });

  test('does not claim CSP, HTTP headers, or robots.txt without a web surface', () => {
    expect(containsWebSurface()).toBe(false);
    expect(fs.existsSync(path.join(repositoryRoot, 'public', 'robots.txt'))).toBe(false);
  });

  test('detects synthetic secret patterns without exposing their contents', () => {
    expect(secretFindings('token = "ghp_123456789012345678901234567890"')).toContain('GitHub token');
    expect(secretFindings('-----BEGIN PRIVATE KEY-----')).toContain('private key');
  });

  test('does not classify public fixtures, field names, or idempotency headers as secrets', () => {
    const sourceFiles = [...versionedFiles('src'), ...versionedFiles('course-backend'), ...versionedFiles('docs')];
    const sourceText = sourceFiles.map(readText).join('\n');
    expect(sourceText).toContain('Idempotency-Key');
    expect(secretFindings('Authorization: Bearer course-valid-token')).not.toContain('credential assignment');
    expect(secretFindings(sourceText)).not.toContain('credential assignment');
  });

  test('excludes generated directories from the source/configuration scan', () => {
    const scannedFiles = [...versionedFiles('src'), ...versionedFiles('course-backend'), ...versionedFiles('docs')];
    expect(scannedFiles.some((file) => file.includes(`${path.sep}node_modules${path.sep}`))).toBe(false);
    expect(scannedFiles.some((file) => file.includes(`${path.sep}coverage${path.sep}`))).toBe(false);
  });
});
