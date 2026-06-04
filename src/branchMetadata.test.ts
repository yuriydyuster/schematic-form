import {describe, expect, test} from "vitest";

import {rebaseArrayPointerRecord} from "./branchMetadata";

describe("branch metadata rebasing", () => {
  test("rebases pointer records when array items are inserted", () => {
    expect(
      rebaseArrayPointerRecord(
        {
          "/items/0/kind": "first",
          "/items/1/kind": "second",
          "/other/1/kind": "other",
        },
        "/items",
        {type: "insert", index: 1},
      ),
    ).toEqual({
      "/items/0/kind": "first",
      "/items/2/kind": "second",
      "/other/1/kind": "other",
    });
  });

  test("drops removed item metadata and shifts later rows", () => {
    expect(
      rebaseArrayPointerRecord(
        {
          "/items/0/kind": "removed",
          "/items/0/details/mode": "also removed",
          "/items/1/kind": "kept",
          "/items/2/kind": "shifted",
        },
        "/items",
        {type: "remove", index: 0},
      ),
    ).toEqual({
      "/items/0/kind": "kept",
      "/items/1/kind": "shifted",
    });
  });

  test("moves item metadata with the row", () => {
    expect(
      rebaseArrayPointerRecord(
        {
          "/items/0/kind": "first",
          "/items/1/kind": "second",
          "/items/2/kind": "third",
          "/items/2/details/mode": "third nested",
        },
        "/items",
        {type: "move", from: 0, to: 2},
      ),
    ).toEqual({
      "/items/2/kind": "first",
      "/items/0/kind": "second",
      "/items/1/kind": "third",
      "/items/1/details/mode": "third nested",
    });
  });
});
