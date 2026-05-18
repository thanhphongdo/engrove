import { describe, it, expect } from "vitest";
import { encodeCsv } from "./csv";

const BOM = "﻿";

describe("encodeCsv", () => {
  it("encodes a simple table with BOM and CRLF rows", () => {
    const out = encodeCsv(["a", "b"], [
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(out).toBe(`${BOM}a,b\r\n1,2\r\n3,4`);
  });

  it("quotes fields containing a comma", () => {
    const out = encodeCsv(["x"], [["a, b"]]);
    expect(out).toBe(`${BOM}x\r\n"a, b"`);
  });

  it("escapes embedded double quotes by doubling", () => {
    const out = encodeCsv(["x"], [['say "hi"']]);
    expect(out).toBe(`${BOM}x\r\n"say ""hi"""`);
  });

  it("quotes fields containing newlines", () => {
    const out = encodeCsv(["x"], [["line1\nline2"]]);
    expect(out).toBe(`${BOM}x\r\n"line1\nline2"`);
  });

  it("preserves Vietnamese unicode characters", () => {
    const out = encodeCsv(["phrase", "meaning"], [["airport", "sân bay"]]);
    expect(out).toBe(`${BOM}phrase,meaning\r\nairport,sân bay`);
  });

  it("renders null/undefined as empty fields", () => {
    const out = encodeCsv(["a", "b", "c"], [["x", null, undefined]]);
    expect(out).toBe(`${BOM}a,b,c\r\nx,,`);
  });
});
