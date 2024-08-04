interface SecretPosition {
  from: number;
  to: number;
}

export interface SecretFinding {
  context: string;
  file: string;
  type: string;
  secret: string;
  commit: string;
  positionInFile: SecretPosition;
  positionInContext: SecretPosition;
}

export interface InvestigationReport {
  languages: string[];
  findings: SecretFinding[];
}
