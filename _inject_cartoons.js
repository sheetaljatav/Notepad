const fs = require("fs");
const path = require("path");
const base = __dirname;
const htmlPath = path.join(base, "index.html");
const modPath = path.join(base, "_cartoon_module.js");
const cssPath = path.join(base, "_cartoon_css.txt");
let h = fs.readFileSync(htmlPath, "utf8").replace(/\r\n/g, "\n");
const mod = fs.readFileSync(modPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
if (!h.includes("    function restorePrefs()")) throw new Error("anchor restorePrefs");
h = h.replace("    function restorePrefs()", mod + "\n    function restorePrefs()");
const initUiAnchor =
  h.includes("    initUiSfx();\n\n    function loadNotes")
    ? "    initUiSfx();\n\n    function loadNotes"
    : "    initUiSfx();\n    function loadNotes";
if (!h.includes(initUiAnchor)) throw new Error("anchor initUiSfx");
h = h.replace(
  initUiAnchor,
  "    initUiSfx();\n    initCartoons();\n\n    function loadNotes"
);
if (!h.includes("  </style>")) throw new Error("anchor style");
h = h.replace("  </style>", css + "\n  </style>");
fs.writeFileSync(htmlPath, h);
console.log("injected");
