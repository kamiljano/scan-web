import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';
import { SecretFinding } from './investigation-report';

const REPORT_FILE_NAME = 'scanweb-report.json';

interface GitleaksReport {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Secret: string;
  Commit: string;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  RuleId: string;
  File: string;
}

const getGitLeakReport = (projectPath: string): GitleaksReport[] => {
  spawnSync('gitleaks', ['detect', '-r', REPORT_FILE_NAME], {
    cwd: projectPath,
  });

  const gitLeaksReportPath = path.join(projectPath, REPORT_FILE_NAME);

  if (!fs.existsSync(gitLeaksReportPath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(gitLeaksReportPath, 'utf-8'));
};

const checkout = (projectPath: string, commit: string) => {
  spawnSync('git', ['checkout', commit], {
    cwd: projectPath,
  });
};

const isMinified = (filePath: string, body: string): boolean => {
  if (path.parse(filePath).ext !== '.js') {
    return false;
  }
  const lines = body.split('\n');

  if (lines.length >= 10) {
    return false;
  }

  for (const line of body.split('\n')) {
    if (line.length > 500) {
      return true;
    }
  }

  return false;
};

const getFullContext = (
  body: string,
  report: GitleaksReport,
): Pick<SecretFinding, 'context' | 'positionInContext'> => {
  const lines = body.split('\n');

  const contextArr = [];
  for (
    let i = Math.max(report.StartLine - 11, 0);
    i < Math.min(report.StartLine + 10, lines.length);
    i++
  ) {
    contextArr.push(lines[i]);
  }

  const context = contextArr.join('\n');
  const secretPos = context.indexOf(report.Secret);
  return {
    context,
    positionInContext: {
      from: secretPos,
      to: secretPos + report.Secret.length,
    },
  };
};

const getMinifiedContext = (
  body: string,
  report: GitleaksReport,
): Pick<SecretFinding, 'context' | 'positionInContext'> => {
  const line = body.split('\n')[report.StartLine - 1];

  const context = line.substring(
    Math.max(0, report.StartColumn - 20),
    Math.min(line.length, report.EndColumn + 20),
  );
  const secretPos = context.indexOf(report.Secret);
  return {
    context,
    positionInContext: {
      from: secretPos,
      to: secretPos + report.Secret.length,
    },
  };
};

const getContext = (
  file: string,
  report: GitleaksReport,
): Pick<SecretFinding, 'context' | 'positionInContext'> => {
  const body = fs.readFileSync(file, 'utf-8');

  return isMinified(file, body)
    ? getMinifiedContext(body, report)
    : getFullContext(body, report);
};

const toScanWebReport = (
  projectPath: string,
  report: GitleaksReport,
): SecretFinding => {
  checkout(projectPath, report.Commit);

  const context = getContext(path.join(projectPath, report.File), report);

  return {
    ...context,
    commit: report.Commit,
    file: report.File,
    secret: report.Secret,
    type: report.RuleId,
    positionInFile: {
      from: report.StartLine,
      to: report.EndLine,
    },
  };
};

const boringPathParts = ['node_modules', 'vendor', 'test', 'spec', 'jquery'];
const isNotBoring = (path: GitleaksReport): boolean => {
  return !boringPathParts.some((part) => path.File.includes(part));
};

export function detect(projectPath: string) {
  try {
    const reports = getGitLeakReport(projectPath).filter(isNotBoring);
    return reports.map((report) => toScanWebReport(projectPath, report));
  } catch (err) {
    console.error(err);
    return [];
  }
}
