export interface FileInvestigationReport {
  context: string;
  from: number;
  to: number;
}

export interface InvestigationReport {
  languages: string[];
  files: string[];

  findings: Record<string, FileInvestigationReport[]>;
}
