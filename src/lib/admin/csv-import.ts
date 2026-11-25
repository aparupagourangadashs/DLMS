// Minimal RFC 4180 reader for staff-uploaded CSV files: quoted cells, doubled quotes, CRLF or LF line ends, optional BOM.
export function parseCsv(text: string): string[][] {
    const source = text.replace(/^\uFEFF/, "");
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (quoted) {
            if (char === '"') {
                if (source[i + 1] === '"') {
                    cell += '"';
                    i += 1;
                } else quoted = false;
            } else cell += char;
        } else if (char === '"') quoted = true;
        else if (char === ",") {
            row.push(cell);
            cell = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && source[i + 1] === "\n") i += 1;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else cell += char;
    }
    if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type EnrolmentCsvRow = { line: number; email: string; name: string; batch: string };

/** Reads an enrolment file with the columns `email`, `batch` and optionally `name`. Throws an Error with a plain message when the file cannot be used. */
export function parseEnrolmentCsv(text: string, maxRows = 500): EnrolmentCsvRow[] {
    const table = parseCsv(text);
    if (table.length === 0) throw new Error("The file is empty.");
    const header = table[0].map((h) => h.trim().toLowerCase());
    const email = header.indexOf("email");
    const batch = header.indexOf("batch");
    const name = header.indexOf("name");
    if (email < 0 || batch < 0) throw new Error("The first row must name the columns: email and batch (name is optional).");
    const body = table.slice(1);
    if (body.length === 0) throw new Error("The file has no data rows.");
    if (body.length > maxRows) throw new Error(`The file has ${body.length} rows. Upload at most ${maxRows} at a time.`);
    return body.map((cells, index) => ({
        line: index + 2,
        email: (cells[email] ?? "").trim().toLowerCase(),
        name: name >= 0 ? (cells[name] ?? "").trim() : "",
        batch: (cells[batch] ?? "").trim(),
    }));
}
