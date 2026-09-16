import { describe, expect, it } from "vitest";
import { ownedGenerationPaths } from "./generationStorage";

const USER = "8f1b2c3d-1111-4222-8333-444455556666";
const OTHER = "0a0b0c0d-9999-4888-8777-666655554444";
const GEN = "c1d2e3f4-aaaa-4bbb-8ccc-ddddeeeeffff";

describe("ownedGenerationPaths", () => {
  it("keeps the paths persistGeneratedImages writes for this generation", () => {
    const paths = ownedGenerationPaths(USER, GEN, `${USER}/${GEN}/output.png`, {
      output_paths: [`${USER}/${GEN}/output.png`, `${USER}/${GEN}/output_1.jpg`, `${USER}/${GEN}/output_3.webp`],
    });
    expect(paths).toEqual([`${USER}/${GEN}/output.png`, `${USER}/${GEN}/output_1.jpg`, `${USER}/${GEN}/output_3.webp`]);
  });

  it("drops another user's file even when it was written into this user's row", () => {
    // The attack this exists to stop: rewrite output_paths in your own row, then
    // ask the service-role delete to remove someone else's image.
    const paths = ownedGenerationPaths(USER, GEN, null, { output_paths: [`${OTHER}/${GEN}/output.png`] });
    expect(paths).toEqual([]);
  });

  it("drops a file from a different generation of the same user", () => {
    const paths = ownedGenerationPaths(USER, GEN, `${USER}/some-other-generation/output.png`, null);
    expect(paths).toEqual([]);
  });

  it("drops traversal that would pass a plain prefix check", () => {
    const paths = ownedGenerationPaths(USER, GEN, null, {
      output_paths: [
        `${USER}/${GEN}/../../${OTHER}/x/output.png`,
        `${USER}/${GEN}/../output.png`,
        `${USER}/${GEN}/sub/output.png`,
        `/${USER}/${GEN}/output.png`,
      ],
    });
    expect(paths).toEqual([]);
  });

  it("drops files that are not generation outputs, such as the brand logo", () => {
    const paths = ownedGenerationPaths(USER, GEN, `${USER}/brand-kit/logo.png`, {
      output_paths: [`${USER}/${GEN}/logo.png`, `${USER}/${GEN}/output.gif`, `${USER}/${GEN}/output_.png`],
    });
    expect(paths).toEqual([]);
  });

  it("ignores malformed metadata and non-string entries without throwing", () => {
    expect(ownedGenerationPaths(USER, GEN, 42, "not-an-object")).toEqual([]);
    expect(ownedGenerationPaths(USER, GEN, undefined, { output_paths: "nope" })).toEqual([]);
    expect(ownedGenerationPaths(USER, GEN, null, { output_paths: [null, 7, {}] })).toEqual([]);
  });

  it("does not repeat a path listed in both places", () => {
    const path = `${USER}/${GEN}/output.png`;
    expect(ownedGenerationPaths(USER, GEN, path, { output_paths: [path] })).toEqual([path]);
  });
});
