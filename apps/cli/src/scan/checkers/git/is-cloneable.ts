import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const ASK_PASS_USED = "invalid-ask-pass";

export default async function isCloneable(gitUrl: string) {
  console.debug(`Testing if ${gitUrl} is publicly accessible...`);
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "git-checker"));
  const clone = spawn("git", ["clone", gitUrl, tempDir], {
    env: {
      GIT_SSH_COMMAND: "ssh -o StrictHostKeyChecking=no",
      GIT_SSL_NO_VERIFY: "true",
      GIT_ASKPASS: ASK_PASS_USED,
    },
  });
  return Promise.race([
    new Promise<boolean>((resolve) => {
      const onData = (data: Buffer) => {
        const out = data.toString().toLowerCase();
        console.log(`Git said ${out}`);
        if (
          out.includes("password") ||
          out.includes("username") ||
          out.includes(ASK_PASS_USED)
        ) {
          console.debug(
            `Git clone subprocess for ${gitUrl} asked for a password. Aborting...`,
          );
          clone.stdout.off("data", onData);
          clone.stderr.off("data", onData);
          resolve(false);
          clone.kill();
        }
      };
      clone.stdout.on("data", onData);
      clone.stderr.on("data", onData);

      clone.once("close", (code) => {
        console.debug(
          `Git clone subprocess for ${gitUrl} exited with code ${code}`,
        );
        if (code === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
        clone.stdout.off("data", onData);
        clone.stderr.off("data", onData);
      });
    }),
    setTimeout(300000).then(() => {
      clone.kill();
      return false;
    }),
  ]);
}
