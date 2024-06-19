import { describe, test, expect } from "vitest";
import { firestoreChecker } from "../../src/checkers/firestore-checker";

const getBody = async (url: string) => {
  const result = await fetch(url);
  const readable = result.body!;
  const chunks: number[] = [];
  //@ts-ignore
  for await (let chunk of readable) {
    chunks.push(...chunk);
  }
  return Uint8Array.from(chunks);
};

describe("firestore-checker", () => {
  test("https://vuejsexamples.com contains firebase, should find public credentials", async () => {
    const body = await getBody("https://vuejsexamples.com");

    const result = await firestoreChecker({
      body,
      url: "https://vuejsexamples.com",
    });

    expect(result.success).toBe(true);
  }, 9999999);
});
