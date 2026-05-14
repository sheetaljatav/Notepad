const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "index.html");
let html = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

const leftRe =
  /<aside class="side-art side-art-left"[^>]*>([\s\S]*?)<\/aside>\s*<div class="wrap">/;
const m = html.match(leftRe);
if (!m) throw new Error("left aside block not found");
const leftInner = m[1].trim();

const headerRe = /<div class="cartoon-strip"[^>]*>([\s\S]*?)<\/div>\s*<\/header>/;
const mh = html.match(headerRe);
if (!mh) throw new Error("header cartoon strip not found");
const headerInner = mh[1].trim();

const rightRe =
  /<aside class="side-art side-art-right"[^>]*>([\s\S]*?)<\/aside>\s*<\/div>\s*\n\s*<script>/;
const mr = html.match(rightRe);
if (!mr) throw new Error("right aside block not found");
const rightInner = mr[1].trim();

const newBodyStart = `<body>
  <div id="cartoon-default-source" hidden aria-hidden="true">
    <div data-zone="left">
${leftInner}
    </div>
    <div data-zone="header">
${headerInner}
    </div>
    <div data-zone="right">
${rightInner}
    </div>
  </div>
  <div class="page-shell">
    <aside class="side-art side-art-left" id="cartoonMountLeft" aria-hidden="true"></aside>
    <div class="wrap">`;

html = html.replace(leftRe, newBodyStart);

html = html.replace(
  headerRe,
  `<div class="cartoon-strip" id="cartoonMountHeader" aria-hidden="true"></div>
    </header>`
);

html = html.replace(
  rightRe,
  `<aside class="side-art side-art-right" id="cartoonMountRight" aria-hidden="true"></aside>
  </div>

  <script>`
);

const sfxInsertRe =
  /(<span>Makeup[^<]*<\/span>\s*<\/label>\s*<\/div>)\s*(<label for="note">Your note<\/label>)/;
if (!sfxInsertRe.test(html)) throw new Error("sfx row / note label anchor not found");
const cartoonBlock = `$1
      <details class="cartoon-editor" id="cartoonEditorPanel">
        <summary class="cartoon-editor-summary">Cartoon pictures — add, remove, or change</summary>
        <p class="cartoon-editor-hint">Add PNG, JPG, GIF, WebP, or SVG files from your device. Replace or delete each slot. About 1.5 MB max per file. Saved only in this browser (localStorage).</p>
        <input type="file" id="cartoonFile" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.svg" hidden />
        <div id="cartoonEditorZones"></div>
        <div class="cartoon-editor-actions">
          <button type="button" class="btn-3d secondary" id="cartoonResetBtn">Reset all to built‑in drawings</button>
        </div>
      </details>
      $2`;
html = html.replace(sfxInsertRe, cartoonBlock);

fs.writeFileSync(file, html.replace(/\n/g, "\r\n"));
console.log("patched ok");
