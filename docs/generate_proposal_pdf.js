const fs = require("fs");
const path = require("path");
const PDFDocument = require(path.join(
  process.env.TEMP,
  "ibmv-proposal-tools",
  "node_modules",
  "pdfkit",
  "js",
  "pdfkit.js"
));

const input = path.join(__dirname, "CUSTOMER_PROPOSAL.md");
const output = path.join(__dirname, "IBMV-Learning-Platform-Customer-Proposal.pdf");
const source = fs.readFileSync(input, "utf8");
const fontDir = "C:\\Windows\\Fonts";

const pdf = new PDFDocument({
  size: "A4",
  margins: { top: 58, bottom: 58, left: 48, right: 48 },
  bufferPages: true,
  info: {
    Title: "IBMV Learning Platform - Customer Proposal and Quotation",
    Author: "Aparupa Gouranga Das",
    Subject: "Public website, student portal, admin panel, testing, and quotation"
  }
});

const stream = fs.createWriteStream(output);
pdf.pipe(stream);
pdf.registerFont("Body", path.join(fontDir, "arial.ttf"));
pdf.registerFont("Bold", path.join(fontDir, "arialbd.ttf"));
pdf.registerFont("Italic", path.join(fontDir, "ariali.ttf"));
pdf.registerFont("BoldItalic", path.join(fontDir, "arialbi.ttf"));

const colors = {
  navy: "#14365D",
  blue: "#2473B9",
  teal: "#168A8A",
  ink: "#263445",
  muted: "#617184",
  pale: "#EFF5FA",
  line: "#D6E0E8",
  white: "#FFFFFF",
  green: "#18794E"
};

function clean(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
}

function ensure(height = 24) {
  if (pdf.y + height > pdf.page.height - 58) pdf.addPage();
}

function textLine(text, options = {}) {
  ensure(options.height || 24);
  pdf.font(options.font || "Body")
    .fontSize(options.size || 10)
    .fillColor(options.color || colors.ink)
    .text(text, 48, pdf.y, {
      width: pdf.page.width - 96,
      lineGap: options.lineGap || 2,
      paragraphGap: 0,
      ...options.textOptions
    });
}

function drawTable(rows) {
  if (rows.length < 2) return;
  const data = rows.map(row =>
    row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(clean)
  );
  const headers = data[0];
  const body = data.slice(1).filter(row => row.some(cell => cell.length));
  const count = headers.length;
  const available = pdf.page.width - 96;
  let weights;
  if (headers.includes("Amount")) {
    weights = count === 2 ? [0.78, 0.22] : [0.58, 0.17, 0.25];
  } else if (headers.includes("Indicative weeks")) {
    weights = [0.64, 0.23, 0.13];
  } else if (count === 2) weights = [0.43, 0.57];
  else if (count === 3) weights = [0.43, 0.30, 0.27];
  else weights = Array(count).fill(1 / count);
  const widths = weights.map((weight, i) =>
    i === weights.length - 1
      ? available - weights.slice(0, i).reduce((sum, item) => sum + item * available, 0)
      : weight * available
  );
  const left = 48;

  function rowHeight(cells, header = false) {
    pdf.font(header ? "Bold" : "Body").fontSize(header ? 8 : 8.1);
    return Math.max(28, ...cells.map((cell, i) =>
      pdf.heightOfString(cell, {
        width: widths[i] - 12,
        lineGap: 1.3
      }) + 12
    ));
  }

  function drawRow(cells, index, header = false) {
    const h = rowHeight(cells, header);
    if (pdf.y + h > pdf.page.height - 58) {
      pdf.addPage();
      if (!header) drawRow(headers, 0, true);
    }
    const y = pdf.y;
    pdf.save();
    pdf.rect(left, y, available, h)
      .fillAndStroke(header ? colors.navy : index % 2 ? colors.white : colors.pale,
        colors.line);
    let x = left;
    cells.forEach((cell, i) => {
      pdf.font(header ? "Bold" : "Body")
        .fontSize(header ? 8 : 8.1)
        .fillColor(header ? colors.white : colors.ink)
        .text(cell, x + 6, y + 6, {
          width: widths[i] - 12,
          height: h - 8,
          align: ["Amount", "Share", "Indicative weeks"].includes(headers[i])
            ? "right"
            : "left",
          lineGap: 1.3
        });
      x += widths[i];
    });
    pdf.restore();
    pdf.y = y + h;
  }

  if (body.length &&
      pdf.y + rowHeight(headers, true) + rowHeight(body[0]) > pdf.page.height - 58) {
    pdf.addPage();
  }
  drawRow(headers, 0, true);
  body.forEach((row, i) => drawRow(headers.map((_, j) => row[j] || ""), i));
  pdf.moveDown(0.65);
}

function drawCover() {
  pdf.rect(0, 0, pdf.page.width, 245).fill(colors.navy);
  pdf.fillColor(colors.white)
    .font("Bold")
    .fontSize(11)
    .text("IBMV MAHAVIDYALAYA  |  CUSTOMER PROPOSAL", 48, 64, {
      characterSpacing: 0.6
    });
  pdf.font("Bold")
    .fontSize(27)
    .text("IBMV Learning Platform", 48, 102, { width: 480 });
  pdf.font("Body")
    .fontSize(13)
    .text("Public website  ·  Student portal  ·  Admin panel", 48, 147);
  pdf.font("Body")
    .fontSize(10)
    .text("A connected platform for visitors, learners, and IBMV staff", 48, 177);

  pdf.roundedRect(48, 214, 499, 100, 10).fill(colors.white);
  pdf.fillColor(colors.navy).font("Bold").fontSize(11)
    .text("PROJECT QUOTATION", 68, 240);
  pdf.fillColor(colors.muted).font("Body").fontSize(9.5)
    .text("Target delivery: 24 weeks", 68, 267);

  pdf.y = 350;
  textLine("Prepared for", { font: "Bold", size: 9, color: colors.muted });
  textLine("IBMV Mahavidyalaya", { font: "Bold", size: 17, color: colors.navy });
  pdf.moveDown(0.8);
  textLine("Prepared by", { font: "Bold", size: 9, color: colors.muted });
  textLine("Aparupa Gouranga Das", { font: "Bold", size: 12, color: colors.ink });
  pdf.moveDown(0.8);
  textLine("Proposal date: 19 October 2026", { size: 10, color: colors.muted });
  pdf.moveDown(1.5);

  pdf.roundedRect(48, pdf.y, 499, 112, 8).fill(colors.pale);
  const cardY = pdf.y + 15;
  pdf.fillColor(colors.navy).font("Bold").fontSize(11)
    .text("What this proposal covers", 65, cardY);
  pdf.fillColor(colors.ink).font("Body").fontSize(9.2)
    .text(
      "Detailed public website, student portal, and admin panel deliverables; shared integrations; testing and security checks; a defined 1,000+ concurrent virtual-user load-test objective; migration assistance; training; launch; and three months of bug-fix support.",
      65,
      cardY + 22,
      { width: 465, lineGap: 3 }
    );
  pdf.y = cardY + 124;
  pdf.moveDown(0.7);
  textLine("Commercial and capacity assumptions are stated in the proposal. Hosting, messaging, payment-provider, and other third-party charges are excluded.", {
    size: 8.5,
    color: colors.muted
  });
}

function isSeparator(line) {
  return /^\|[\s|:-]+\|$/.test(line.trim());
}

function render() {
  drawCover();
  pdf.addPage();

  const lines = source.split(/\r?\n/);
  let started = false;
  let tableRows = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = clean(paragraph.join(" "));
    paragraph = [];
    if (!value) return;
    if (value.startsWith("- ")) {
      ensure(30);
      const content = clean(value.slice(2));
      const bulletY = pdf.y;
      pdf.font("Body").fontSize(9.2).fillColor(colors.ink)
        .text("•", 52, bulletY, { width: 12, lineBreak: false });
      pdf.text(content, 64, bulletY, {
        width: pdf.page.width - 112,
        lineGap: 2
      });
      pdf.moveDown(0.25);
      return;
    }
    textLine(value, { size: 9.2, lineGap: 2.2 });
    pdf.moveDown(0.45);
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    drawTable(tableRows);
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!started) {
      if (raw.startsWith("## 1. ")) started = true;
      else continue;
    }

    if (raw.startsWith("|")) {
      flushParagraph();
      if (!isSeparator(raw)) tableRows.push(raw);
      continue;
    }
    flushTable();

    if (!raw || raw === "---") {
      flushParagraph();
      if (!raw) pdf.moveDown(0.25);
      continue;
    }

    if (raw.startsWith("# ")) {
      flushParagraph();
      ensure(45);
      pdf.moveDown(0.4);
      textLine(clean(raw.slice(2)), {
        font: "Bold",
        size: 18,
        color: colors.navy,
        lineGap: 3
      });
      pdf.moveDown(0.45);
      continue;
    }

    if (raw.startsWith("## ")) {
      flushParagraph();
      const nextContent = lines.slice(i + 1).map(line => line.trim())
        .find(line => line && line !== "---");
      ensure(nextContent && nextContent.startsWith("|") ? 150 : 50);
      pdf.moveDown(0.45);
      textLine(clean(raw.slice(3)), {
        font: "Bold",
        size: 14,
        color: colors.navy,
        lineGap: 2
      });
      pdf.moveTo(48, pdf.y + 2)
        .lineTo(pdf.page.width - 48, pdf.y + 2)
        .strokeColor(colors.line)
        .lineWidth(0.7)
        .stroke();
      pdf.moveDown(0.8);
      continue;
    }

    if (raw.startsWith("### ")) {
      flushParagraph();
      ensure(32);
      pdf.moveDown(0.25);
      textLine(clean(raw.slice(4)), {
        font: "Bold",
        size: 10.5,
        color: colors.blue
      });
      pdf.moveDown(0.3);
      continue;
    }

    if (raw.startsWith("> ")) {
      paragraph.push(raw.slice(2));
      flushParagraph();
      continue;
    }

    if (raw.startsWith("- ")) flushParagraph();
    paragraph.push(raw);
  }

  flushParagraph();
  flushTable();

  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    pdf.switchToPage(i);
    const pageNo = i + 1;
    const y = pdf.page.height - 38;
    pdf.save();
    pdf.strokeColor(colors.line).lineWidth(0.6)
      .moveTo(48, y - 10).lineTo(pdf.page.width - 48, y - 10).stroke();
    const bottomMargin = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 0;
    pdf.font("Body").fontSize(7.5).fillColor(colors.muted)
      .text("IBMV Learning Platform Proposal  |  Confidential customer quotation", 48, y, {
        width: 385,
        lineBreak: false
      })
      .text(`${pageNo} / ${range.count}`, pdf.page.width - 88, y, {
        width: 40,
        align: "right",
        lineBreak: false
      });
    pdf.page.margins.bottom = bottomMargin;
    pdf.restore();
  }
  pdf.end();
}

stream.on("finish", () => {
  console.log(`Created ${output}`);
});
stream.on("error", error => {
  console.error(error);
  process.exitCode = 1;
});

render();
