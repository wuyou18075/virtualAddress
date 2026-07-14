/**
 * Lightweight unit checks for generators / utils (Node 18+).
 * Run: node --test test/unit.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { randomInt, randomElement, escapeHtml, attrEscape } from "../src/js/utils.js";
import { generateCreditCardInfo } from "../src/js/generators/identity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function luhnOk(num) {
  const digits = String(num).replace(/\D/g, "");
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

describe("utils", () => {
  it("randomInt stays in range", () => {
    for (let i = 0; i < 50; i++) {
      const n = randomInt(3, 7);
      assert.ok(n >= 3 && n <= 7);
    }
  });

  it("randomElement picks from array", () => {
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 20; i++) {
      assert.ok(arr.includes(randomElement(arr)));
    }
  });

  it("escapeHtml encodes tags", () => {
    assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), "&lt;img src=x onerror=alert(1)&gt;");
    assert.equal(attrEscape('"onclick='), "&quot;onclick=");
  });
});

describe("credit card (test numbers)", () => {
  it("generateCreditCardInfo returns Luhn-valid number", async () => {
    const card = await generateCreditCardInfo();
    assert.ok(card.rawNumber || card.number);
    const raw = card.rawNumber || String(card.number).replace(/\s/g, "");
    assert.ok(luhnOk(raw), `not Luhn: ${raw}`);
    assert.ok(card.cvv);
    assert.ok(card.expiryDate || card.expirationDate);
  });
});

describe("data files present", () => {
  it("names-pool and usData exist", () => {
    const names = JSON.parse(readFileSync(join(root, "data/names-pool.json"), "utf8"));
    assert.ok(names.nameGroups);
    const us = JSON.parse(readFileSync(join(root, "data/usData.json"), "utf8"));
    assert.ok(us.states);
  });
});

describe("sharded real pools", () => {
  it("us-real and us-taxfree shards exist", () => {
    const ca = JSON.parse(readFileSync(join(root, "data/us-real/CA.json"), "utf8"));
    assert.ok(Array.isArray(ca) && ca.length > 0);
    assert.ok(ca[0].street || ca[0].zip);
    const ak = JSON.parse(readFileSync(join(root, "data/us-taxfree/AK.json"), "utf8"));
    assert.ok(Array.isArray(ak) && ak.length > 0);
    const idx = JSON.parse(readFileSync(join(root, "data/us-real/index.json"), "utf8"));
    assert.ok(idx.sharded && idx.regions.length >= 50);
  });
});

describe("jp/in shards", () => {
  it("jp-real tokyo and in-pin AP exist", () => {
    const tokyo = JSON.parse(readFileSync(join(root, "data/jp-real/東京都.json"), "utf8"));
    assert.ok(Array.isArray(tokyo) && tokyo.length > 0);
    assert.ok(tokyo[0].prefecture || tokyo[0].fullAddress);
    const ap = JSON.parse(readFileSync(join(root, "data/in-pin/AP.json"), "utf8"));
    assert.ok(Array.isArray(ap) && ap.length > 0);
    assert.ok(ap[0].pincode || ap[0].fullAddress);
  });
});
