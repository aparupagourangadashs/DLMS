import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCsv, parseEnrolmentCsv } from "./csv-import.ts";

test("csv: quoted cells, doubled quotes, commas, newlines and BOM", () => {
    assert.deepEqual(parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\n"line\nbreak",z\n'), [["a", "b"], ["x, y", 'say "hi"'], ["line\nbreak", "z"]]);
    assert.deepEqual(parseCsv("a,b\n\n  ,\n1,2"), [["a", "b"], ["1", "2"]], "blank lines are ignored");
    assert.deepEqual(parseCsv(""), []);
});

test("enrolment csv: columns in any order, case-insensitive, optional name", () => {
    const rows = parseEnrolmentCsv("Batch,EMAIL,Name\nBatch A,Asha@Example.com,Asha Rao\nBatch B, ravi@example.com ,\n");
    assert.deepEqual(rows, [
        { line: 2, email: "asha@example.com", name: "Asha Rao", batch: "Batch A" },
        { line: 3, email: "ravi@example.com", name: "", batch: "Batch B" },
    ]);
    assert.equal(parseEnrolmentCsv("email,batch\nx@example.com,B")[0].name, "");
});

test("enrolment csv: unusable files are explained", () => {
    assert.throws(() => parseEnrolmentCsv(""), /empty/);
    assert.throws(() => parseEnrolmentCsv("email,name\nx@example.com,X"), /email and batch/);
    assert.throws(() => parseEnrolmentCsv("email,batch\n"), /no data rows/);
    const many = `email,batch\n${Array.from({ length: 6 }, (_, i) => `u${i}@example.com,B`).join("\n")}`;
    assert.throws(() => parseEnrolmentCsv(many, 5), /at most 5/);
});
