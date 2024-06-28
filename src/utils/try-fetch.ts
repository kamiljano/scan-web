export default async function tryFetch(url: string) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10000);

  const response = await fetch(url.replace(/\/HEAD$/, ""), {
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`Response from ${url} was ${response.status}`);
  }

  return {
    text() {
      return response.text();
    },
    get body() {
      return response.body;
    },
  };
}
