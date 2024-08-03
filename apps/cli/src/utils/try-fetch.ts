interface TryFetchOptions {
  timeout: number;
}

export default async function tryFetch(url: string, options?: TryFetchOptions) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), options?.timeout ?? 4000);

  const response = await fetch(url.replace(/\/HEAD$/, ''), {
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`Response from ${url} was ${response.status}`);
  }

  return {
    text() {
      return response.text();
    },
    json() {
      return response.json();
    },
    arrayBuffer() {
      return response.arrayBuffer();
    },
    get body() {
      return response.body;
    },
    get ok() {
      return response.ok;
    },
    get status() {
      return response.status;
    },
    get url() {
      return response.url;
    },
  };
}

export type TryFetchResponse = Awaited<ReturnType<typeof tryFetch>>;
