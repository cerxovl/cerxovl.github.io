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
  controlFlowFlatteningThreshold: 0.15, // Золотая середина: защита есть, лагов нет
  deadCodeInjection: false, // ГЛАВНЫЙ ВИНОВНИК ТОРМОЗОВ НА ПК - ВЫКЛЮЧАЕМ
  deadCodeInjectionThreshold: 0,
  numbersToExpressions: false,
  transformObjectKeys: true,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: "function",
  stringArrayWrappersParametersMaxCount: 2,
  rotateStringArray: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  identifierNamesGenerator: "mangled-shuffled",
  renameGlobals: false,
  renameProperties: false,
  debugProtection: false, // ВТОРОЙ ВИНОВНИК ТОРМОЗОВ - ВЫКЛЮЧАЕМ
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  selfDefending: false,
  unicodeEscapeSequence: false,


});

fs.writeFileSync("script.js", jsResult.getObfuscatedCode(), "utf8");
console.log(`   script.js: ${jsBefore} KB → ${kb("script.js")}`);

// ══════════════════════════════════════════════════════════════
//  2. CSS — минификация
// ══════════════════════════════════════════════════════════════
console.log("\n🎨 CSS минификация...");
const cssFiles = ["style.css", "pages.css"];

for (const file of cssFiles) {
  const origCss = path.join(ORIG_DIR, file);
  if (!fs.existsSync(origCss) && fs.existsSync(file)) backup(file);
  if (fs.existsSync(origCss)) {
    const cssSrc    = fs.readFileSync(origCss, "utf8");
    const cssResult = new CleanCSS({ level: 2 }).minify(cssSrc);
    fs.writeFileSync(file, cssResult.styles, "utf8");
    console.log(`   ${file}: ${(Buffer.byteLength(cssSrc)/1024).toFixed(1)} KB → ${kb(file)}`);
  }
}

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
    const origPath = path.join(ORIG_DIR, file);
    if (!fs.existsSync(origPath) && fs.existsSync(file)) backup(file);
    if (!fs.existsSync(origPath)) continue;
    const src     = fs.readFileSync(origPath, "utf8");
    const before  = (Buffer.byteLength(src) / 1024).toFixed(1);
    const result  = await minifyHtml(src, htmlOpts);
    fs.writeFileSync(file, result, "utf8");
    console.log(`   ${file}: ${before} KB → ${kb(file)}`);
  }

  console.log("\n✅ Готово! Исходники находятся в ./originals/ (или script.original.js)");
  console.log("   Для редактирования: правь оригиналы в ./originals/, потом node build.js\n");
})();
