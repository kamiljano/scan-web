interface Collinfo {
  id: string;
  name: string;
  timegate: string;
  "ctx-api": string;
  from: string;
  to: string;
}

export default async function getCommonCrawlOptions() {
  const response = await fetch("https://index.commoncrawl.org/collinfo.json");
  const body = (await response.json()) as Collinfo[];

  return body.map((info) => info.id);
}
