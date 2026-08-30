import assert from "node:assert/strict";
import { test } from "node:test";
import { mirrorNine } from "./image.ts";
import {
  assignMissingSlots,
  duplicateKey,
  EMPTY_CARD,
  findDuplicate,
  nextSlot,
  normalizeCard,
  parseValue,
  sortCards,
  toCsv,
  type Card,
} from "./cards.ts";

function card(partial: Partial<Card>): Card {
  return {
    ...EMPTY_CARD,
    id: partial.id || "a",
    createdAt: partial.createdAt || 1,
    name: partial.name || "Test",
    ...partial,
  };
}

test("duplicate key ignores case and extra space", () => {
  assert.equal(
    duplicateKey({ name: "Charizard", setName: "Base Set", number: "4", year: "1999" }),
    duplicateKey({ name: " charizard", setName: "base set", number: "4", year: "1999" }),
  );
});

test("findDuplicate matches name/set/number/year", () => {
  const existing = [
    card({
      id: "1",
      name: "Julio Rodríguez",
      setName: "Chrome",
      number: "1",
      year: "2023",
    }),
  ];
  const hit = findDuplicate(existing, {
    ...EMPTY_CARD,
    name: "Julio Rodríguez",
    setName: "Chrome",
    number: "1",
    year: "2023",
  });
  assert.equal(hit?.id, "1");
  assert.equal(
    findDuplicate(existing, { ...EMPTY_CARD, name: "Julio Rodríguez", setName: "Chrome", number: "1", year: "2023" }, "1"),
    null,
  );
});

test("nextSlot fills empty pockets in page order", () => {
  const filled = [card({ page: 1, pocket: 0 }), card({ page: 1, pocket: 1 })];
  assert.deepEqual(nextSlot(filled), { page: 1, pocket: 2 });
});

test("assignMissingSlots places cards without a pocket", () => {
  const rows = assignMissingSlots([
    card({ id: "a", name: "A", page: 0, pocket: -1 }),
    card({ id: "b", name: "B", page: 0, pocket: -1 }),
  ]);
  assert.equal(rows[0].page, 1);
  assert.equal(rows[0].pocket, 0);
  assert.equal(rows[1].page, 1);
  assert.equal(rows[1].pocket, 1);
});

test("sort by value uses numeric dollars", () => {
  const rows = sortCards(
    [
      card({ id: "cheap", name: "A", value: "$2", createdAt: 1 }),
      card({ id: "rich", name: "B", value: "$40.50", createdAt: 2 }),
    ],
    "value",
  );
  assert.equal(rows[0].id, "rich");
  assert.equal(parseValue("$40.50"), 40.5);
});

test("csv escapes commas and quotes", () => {
  const csv = toCsv([
    card({
      name: 'Shohei, "Ohtani"',
      setName: "Topps Chrome",
      notes: "line\nbreak",
    }),
  ]);
  assert.match(csv, /^name,team,/);
  assert.match(csv, /"Shohei, ""Ohtani"""/);
});

test("normalizeCard fills new fields on old imports", () => {
  const c = normalizeCard({ name: "Pikachu", category: "Pokémon", set: "Base" });
  assert.equal(c?.setName, "Base");
  assert.equal(c?.status, "owned");
  assert.equal(c?.kind, "single");
  assert.equal(c?.category, "Pokémon");
});

test("mirrorNine reverses each row of a 9-pocket page", () => {
  assert.deepEqual(mirrorNine([1, 2, 3, 4, 5, 6, 7, 8, 9]), [3, 2, 1, 6, 5, 4, 9, 8, 7]);
});
