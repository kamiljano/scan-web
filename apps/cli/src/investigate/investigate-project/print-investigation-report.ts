import { InvestigationReport } from './investigation-report';
import chalk from 'chalk';
import * as process from 'node:process';

export default function printInvestigationReport(report: InvestigationReport) {
  console.log('Investigation report:');
  console.log(`Languages found: ${report.languages.join(', ')}`);

  if (!Object.keys(report.findings).length) {
    console.log(chalk.blue('No findings'));
    return;
  } else {
    console.log('Findings:');

    for (const finding of report.findings) {
      console.log(
        chalk.yellow(
          '--------------------------------------------------------------------------',
        ),
      );
      console.log(
        chalk.yellow(`File: ${finding.file}; Commit: ${finding.commit}`),
      );
      console.log(
        chalk.yellow(
          '--------------------------------------------------------------------------',
        ),
      );
      console.log(
        chalk.blue(
          '--------------------------------------------------------------------------',
        ),
      );
      process.stdout.write(
        chalk.green(
          finding.context.substring(0, finding.positionInContext.from),
        ),
      );
      process.stdout.write(
        chalk.red(
          finding.context.substring(
            finding.positionInContext.from,
            finding.positionInContext.to,
          ),
        ),
      );
      process.stdout.write(
        chalk.green(finding.context.substring(finding.positionInContext.to)),
      );
      process.stdout.write('\n');

      console.log(
        chalk.blue(
          '--------------------------------------------------------------------------',
        ),
      );
    }
  }
}
