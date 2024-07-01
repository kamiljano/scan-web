import tryFetch from "../../utils/try-fetch";

interface Collinfo {
  id: string;
  name: string;
  timegate: string;
  "ctx-api": string;
  from: string;
  to: string;
}

export default async function getCommonCrawlOptions() {
  const response = await tryFetch(
    "https://index.commoncrawl.org/collinfo.json",
    {
      timeout: 10_000,
    },
  );
  const body = (await response.json()) as Collinfo[];

  return body.map((info) => info.id);
}
