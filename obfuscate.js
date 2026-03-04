const JavaScriptObfuscator = require("javascript-obfuscator");
const fs = require("fs");

const src = fs.readFileSync("script.original.js", "utf8");

const result = JavaScriptObfuscator.obfuscate(src, {
  compact: true,
  target: "browser",

  // Максимальное запутывание логики
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,

  // Много мёртвого кода
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,

  // Числа → сложные математические выражения
  numbersToExpressions: true,

  // Трансформация ключей объектов
  transformObjectKeys: true,

  // Строки: RC4 + base64 двойное шифрование
  stringArray: true,
  stringArrayEncoding: ["rc4", "base64"],
  stringArrayThreshold: 1,
  stringArrayWrappersCount: 5,
  stringArrayWrappersType: "function",
  stringArrayWrappersParametersMaxCount: 5,
  rotateStringArray: true,
  shuffleStringArray: true,

  // Разбивать строки на куски
  splitStrings: true,
  splitStringsChunkLength: 4,

  // Имена переменных — рандомный hex
  identifierNamesGenerator: "mangled-shuffled",
  renameGlobals: false,
  renameProperties: false,

  // Антидебаггер — блокирует DevTools
  debugProtection: true,
  debugProtectionInterval: 4000,

  // Отключить console.log (нельзя подглядеть в консоль)
  disableConsoleOutput: true,

  // Самозащита: если код изменить — перестаёт работать
  selfDefending: true,

  unicodeEscapeSequence: false,
});

fs.writeFileSync("script.js", result.getObfuscatedCode(), "utf8");

const orig = fs.statSync("script.original.js").size;
const obf  = fs.statSync("script.js").size;
console.log(`Done!`);
console.log(`Original : ${(orig/1024).toFixed(1)} KB`);
console.log(`Obfuscated: ${(obf/1024).toFixed(1)} KB`);
