import {describe, expect, test} from "vitest";

import {deleteAtPath, getAtPath, insertArrayItem, moveArrayItem, removeArrayItem, setAtPath, toFieldPath, toPointer} from "./paths";

describe("path utilities", () => {
  test("reads and writes nested values immutably", () => {
    const source = {profile: {name: "Ada"}};
    const next = setAtPath(source, ["profile", "email"], "ada@example.com");

    expect(next).toEqual({profile: {name: "Ada", email: "ada@example.com"}});
    expect(source).toEqual({profile: {name: "Ada"}});
    expect(getAtPath(next, ["profile", "email"])).toBe("ada@example.com");
  });

  test("deletes fields and formats paths", () => {
    const next = deleteAtPath({profile: {name: "Ada", email: "ada@example.com"}}, ["profile", "email"]);

    expect(next).toEqual({profile: {name: "Ada"}});
    expect(toPointer(["profile", "email"])).toBe("/profile/email");
    expect(toFieldPath(["items", 1, "name"])).toBe("items[1].name");
  });

  test("updates arrays without losing sibling values", () => {
    const source = {items: [{name: "First"}, {name: "Second"}]};

    const inserted = insertArrayItem(source, ["items"], 1, {name: "Middle"});
    expect(inserted).toEqual({items: [{name: "First"}, {name: "Middle"}, {name: "Second"}]});

    const moved = moveArrayItem(inserted, ["items"], 2, 0);
    expect(moved).toEqual({items: [{name: "Second"}, {name: "First"}, {name: "Middle"}]});

    const removed = removeArrayItem(moved, ["items"], 1);
    expect(removed).toEqual({items: [{name: "Second"}, {name: "Middle"}]});
  });
});
