import investigateProject from "./investigate-project";
import printInvestigationReport from "./print-investigation-report";

export default async function investigateProjectCli(path: string) {
  const report = await investigateProject(path);

  printInvestigationReport(report);
}
