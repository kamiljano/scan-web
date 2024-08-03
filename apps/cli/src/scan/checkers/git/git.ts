import { CheckerValidation, textDecoder } from '../checker';
import tryFetch from '../../../utils/try-fetch';
import ini from 'ini';
import isCloneable from './is-cloneable';

const getDotGitUrl = (url: string): string => {
  const dotGitUrlMatch = url.match(/^.*\/\.git/);
  if (!dotGitUrlMatch) {
    throw new Error('URL does not contain .git');
  }
  return dotGitUrlMatch[0];
};

const getGitRepo = async (url: string): Promise<string | undefined> => {
  let configUrl: string | undefined = undefined;
  let body: string | undefined = undefined;
  try {
    configUrl = `${getDotGitUrl(url)}/config`;
    const response = await tryFetch(configUrl);
    body = await response.text();
    return ini.parse(body)['remote "origin"'].url;
  } catch (err) {
    console.log(`Git confing could not be fetched: ${configUrl}`, body, err);
  }
  return undefined;
};

const isDirectoryExposed = async (url: string): Promise<boolean> => {
  try {
    const response = await tryFetch(getDotGitUrl(url));
    const body = await response.text();
    return (
      body.includes('<html') &&
      body.includes('>HEAD<') &&
      body.includes('>index<')
    );
  } catch (err) {
    return false;
  }
};

export const git: CheckerValidation = async (ctx) => {
  if (ctx.body && ctx.body.length) {
    const body = textDecoder.decode(ctx.body);
    if (body.startsWith('ref:')) {
      const [directoryExposed, gitRepo] = await Promise.all([
        isDirectoryExposed(ctx.url),
        getGitRepo(ctx.url),
      ]);
      const meta: Record<string, string | boolean> = {
        url: ctx.url,
        directoryExposed,
      };

      if (gitRepo) {
        meta.gitRepo = gitRepo;
        //meta.cloneable = await isCloneable(gitRepo);
      }

      return {
        success: true,
        meta,
      };
    }
  }

  return {
    success: false,
  };
};
