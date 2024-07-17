import { InvestigationReport } from "./investigation-report";
import chalk from "chalk";
import * as process from "node:process";

export default function printInvestigationReport(report: InvestigationReport) {
  console.log("Investigation report:");
  console.log(`Languages found: ${report.languages.join(", ")}`);
  console.log(`Files found: ${report.files.length}`);

  if (!Object.keys(report.findings).length) {
    console.log(chalk.blue("No findings"));
    return;
  } else {
    console.log("Findings:");

    Object.entries(report.findings).forEach(([file, findings]) => {
      console.log(
        chalk.yellow(
          "--------------------------------------------------------------------------",
        ),
      );
      console.log(chalk.yellow(`File: ${file}`));
      console.log(
        chalk.yellow(
          "--------------------------------------------------------------------------",
        ),
      );
      findings.forEach((finding) => {
        console.log(
          chalk.blue(
            "--------------------------------------------------------------------------",
          ),
        );
        process.stdout.write(
          chalk.green(finding.context.substring(0, finding.from)),
        );
        process.stdout.write(
          chalk.red(finding.context.substring(finding.from, finding.to)),
        );
        process.stdout.write(
          chalk.green(finding.context.substring(finding.to)),
        );

        console.log(
          chalk.blue(
            "--------------------------------------------------------------------------",
          ),
        );
      });

      process.stdout.write("\n\n");
    });
  }
}
