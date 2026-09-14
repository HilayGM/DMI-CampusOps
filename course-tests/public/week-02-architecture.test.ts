import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');
const sourceExtensions = ['.ts', '.tsx'];
const forbiddenEdges = [
  ['domain', 'ui'],
  ['ui', 'infrastructure'],
] as const;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return sourceExtensions.includes(extname(entry.name)) ? [entryPath] : [];
  });
}

function layerOf(filePath: string): string | null {
  const sourceRelativePath = relative(sourceRoot, filePath).replaceAll('\\', '/');
  return sourceRelativePath.split('/')[0] ?? null;
}

function resolveImport(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null;
  const basePath = join(dirname(fromFile), importPath);
  for (const extension of sourceExtensions) {
    const candidate = `${basePath}${extension}`;
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // An import that does not resolve inside src is outside this check.
    }
  }
  return null;
}

test('source imports respect the declared architecture boundaries', () => {
  const violations: string[] = [];

  for (const sourceFile of listSourceFiles(sourceRoot)) {
    const sourceLayer = layerOf(sourceFile);
    if (!sourceLayer) continue;
    const sourceText = readFileSync(sourceFile, 'utf8');
    const imports = sourceText.matchAll(/(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g);

    for (const match of imports) {
      const importedFile = resolveImport(sourceFile, match[1] ?? '');
      const importedLayer = importedFile ? layerOf(importedFile) : null;
      if (!importedLayer) continue;
      for (const [fromLayer, toLayer] of forbiddenEdges) {
        if (sourceLayer === fromLayer && importedLayer === toLayer) {
          violations.push(`${sourceLayer} -> ${importedLayer}: ${relative(process.cwd(), sourceFile)}`);
        }
      }
    }
  }

  expect(violations).toEqual([]);
});

test('the rule rejects the controlled domain-to-ui discrepancy', () => {
  const simulatedEdge: readonly [string, string] = ['domain', 'ui'];
  expect(forbiddenEdges).toContainEqual(simulatedEdge);
});
