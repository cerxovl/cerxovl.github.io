/**
 * build.js — одна команда защищает всё:
 *   node build.js
 *
 * Что делает:
 *  1. script.original.js  → script.js        (JS обфускация RC4+anti-debug)
 *  2. style.css           → style.css        (CSS минификация)
 *  3. index/about/hobbies → те же файлы      (HTML минификация)
 *
 * Оригиналы сохраняются в папке originals/
 */

const JavaScriptObfuscator = require("javascript-obfuscator");
const CleanCSS              = require("clean-css");
const { minify: minifyHtml } = require("html-minifier-terser");
const fs   = require("fs");
const path = require("path");

// ── папка с бэкапами ───────────────────────────────────────────
const ORIG_DIR = path.join(__dirname, "originals");
if (!fs.existsSync(ORIG_DIR)) fs.mkdirSync(ORIG_DIR);

function backup(file) {
  fs.copyFileSync(file, path.join(ORIG_DIR, path.basename(file)));
}

function kb(file) {
  return (fs.statSync(file).size / 1024).toFixed(1) + " KB";
}

// ══════════════════════════════════════════════════════════════
//  1. JS — максимальная обфускация
// ══════════════════════════════════════════════════════════════
console.log("\n🔐 JS обфускация...");
const jsSrc = fs.readFileSync("script.original.js", "utf8");
const jsBefore = (Buffer.byteLength(jsSrc) / 1024).toFixed(1);

const jsResult = JavaScriptObfuscator.obfuscate(jsSrc, {
  compact: true,
  target: "browser",
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  numbersToExpressions: true,
  transformObjectKeys: true,
  stringArray: true,
  stringArrayEncoding: ["rc4", "base64"],
  stringArrayThreshold: 1,
  stringArrayWrappersCount: 5,
  stringArrayWrappersType: "function",
  stringArrayWrappersParametersMaxCount: 5,
  rotateStringArray: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 4,
  identifierNamesGenerator: "mangled-shuffled",
  renameGlobals: false,
  renameProperties: false,
  debugProtection: true,
  debugProtectionInterval: 4000,
  disableConsoleOutput: true,
  selfDefending: true,
  unicodeEscapeSequence: false,
});

fs.writeFileSync("script.js", jsResult.getObfuscatedCode(), "utf8");
console.log(`   script.js: ${jsBefore} KB → ${kb("script.js")}`);

// ══════════════════════════════════════════════════════════════
//  2. CSS — минификация
// ══════════════════════════════════════════════════════════════
console.log("\n🎨 CSS минификация...");
backup("style.css");
const cssSrc    = fs.readFileSync("style.css", "utf8");
const cssResult = new CleanCSS({ level: 2 }).minify(cssSrc);
fs.writeFileSync("style.css", cssResult.styles, "utf8");
console.log(`   style.css: ${(Buffer.byteLength(cssSrc)/1024).toFixed(1)} KB → ${kb("style.css")}`);

// ══════════════════════════════════════════════════════════════
//  3. HTML — минификация
// ══════════════════════════════════════════════════════════════
console.log("\n📄 HTML минификация...");
const htmlFiles = ["index.html", "about.html", "hobbies.html"];

const htmlOpts = {
  collapseWhitespace: true,
  removeComments: true,
  removeOptionalTags: false,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  minifyCSS: true,
  minifyJS: false,   // JS уже обфусцирован отдельно
  useShortDoctype: true,
  decodeEntities: false,
};

(async () => {
  for (const file of htmlFiles) {
    if (!fs.existsSync(file)) continue;
    backup(file);
    const src     = fs.readFileSync(file, "utf8");
    const before  = (Buffer.byteLength(src) / 1024).toFixed(1);
    const result  = await minifyHtml(src, htmlOpts);
    fs.writeFileSync(file, result, "utf8");
    console.log(`   ${file}: ${before} KB → ${kb(file)}`);
  }

  console.log("\n✅ Готово! Бэкапы сохранены в ./originals/");
  console.log("   Для редактирования: правь оригиналы в ./originals/, потом node build.js\n");
})();
