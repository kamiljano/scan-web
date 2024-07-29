import tryFetch, { TryFetchResponse } from '../../utils/try-fetch';
import * as dns from 'node:dns/promises';

export const checkIp = async (ip: string): Promise<string[]> => {
  const responses = await Promise.allSettled([
    tryFetch(`http://${ip}`),
    tryFetch(`https://${ip}`),
  ]);

  const succesfulResponse = responses.reduce<TryFetchResponse[]>(
    (acc, response) => {
      if (response.status === 'fulfilled' && response.value.status === 200) {
        acc.push(response.value);
      }
      return acc;
    },
    [],
  );

  if (!succesfulResponse.length) {
    return [];
  }

  let domains: string[] = [];
  try {
    domains = await dns.reverse(ip);
  } catch (err) {
    //noop
  }

  const hasHttps = succesfulResponse.some((response) =>
    response.url.startsWith('https'),
  );

  if (!domains.length) {
    return [`${hasHttps ? 'https' : 'http'}://${ip}`];
  }

  return domains.map((domain) => `${hasHttps ? 'https' : 'http'}://${domain}`);
};
