import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SecretFinding, InvestigationReport } from './investigation-report';
import { detect } from './gitleaks';

async function* iterateFiles(dir: string): AsyncIterable<string> {
  if (dir.endsWith('/.git') || dir.endsWith('/node_modules')) {
    return;
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* iterateFiles(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

const extensionMappings: Record<string, string> = {
  '.ts': 'typescript',
  '.js': 'javascript',
  '.php': 'php',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.cs': 'csharp',
  '.sh': 'shell',
  '.bash': 'bash',
};

const findLanguages = (files: string[]): string[] => {
  const extensionCounters = new Map<string, number>();

  for (const file of files) {
    const extension = path.extname(file);
    extensionCounters.set(
      extension,
      (extensionCounters.get(extension) ?? 0) + 1,
    );
  }

  const extensionsWithMostFiles = Array.from(extensionCounters.entries()).sort(
    ([extA, countA], [extB, countB]) => {
      return countB - countA;
    },
  );

  return extensionsWithMostFiles
    .map(([ext]) => extensionMappings[ext])
    .filter((language) => !!language) as string[];
};

export default async function investigateProject(
  projectDir: string,
): Promise<InvestigationReport> {
  const fullPathFiles: string[] = [];

  for await (const file of iterateFiles(projectDir)) {
    fullPathFiles.push(file);
  }

  const findings = detect(projectDir);

  return {
    languages: findLanguages(fullPathFiles),
    findings,
  };
}
