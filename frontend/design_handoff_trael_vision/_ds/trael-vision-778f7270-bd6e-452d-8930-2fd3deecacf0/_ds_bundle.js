/* @ds-bundle: {"namespace":"TraelVision","components":[],"sourceHashes":{},"inlinedExternals":["trael-vision-tokens"],"builtBy":"cc-design-sync"} */
var TraelVision = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // .design-sync/.cache/nm/node_modules/trael-vision-tokens/tokens.ts
  var tokens_exports = {};
  __export(tokens_exports, {
    brand: () => brand,
    fonts: () => fonts,
    layout: () => layout,
    motion: () => motion,
    reading: () => reading,
    viz: () => viz
  });
  var brand = {
    primary: "#006536",
    primary600: "#00542d",
    primary700: "#013f22",
    medium: "#5AA646",
    accent: "#8FC73E",
    ink: "#04120a",
    on: "#ffffff",
    gradient: "linear-gradient(100deg, #006536 0%, #2f8a46 55%, #5AA646 100%)"
  };
  var reading = {
    pending: { base: "#64748b", hc: "#94a3b8" },
    processing: { base: "#2f81f7", hc: "#4c9dff" },
    success: { base: "#8FC73E", hc: "#b7f24a" },
    lowconf: { base: "#e0a12b", hc: "#ffc247" },
    mismatch: { base: "#e5484d", hc: "#ff6166" },
    validated: { base: "#9a6bf0", hc: "#b98cff" }
  };
  var viz = ["#2f81f7", "#8FC73E", "#e0a12b", "#9a6bf0", "#37c0b4", "#e5484d"];
  var fonts = {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    /** aplicar em números de série / IDs / timestamps */
    monoFeatures: '"tnum" 1, "zero" 1, "ss01" 1, "cv01" 1'
  };
  var layout = {
    sidebarW: 248,
    sidebarWCollapsed: 60,
    topbarH: 52,
    rowH: 40,
    controlSm: 24,
    controlMd: 30,
    controlLg: 36
  };
  var motion = {
    easeStandard: "cubic-bezier(0.2, 0, 0, 1)",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    durFast: 90,
    durBase: 150,
    durSlow: 240
  };
  return __toCommonJS(tokens_exports);
})();
window.TraelVision=TraelVision.__dsMainNs?Object.assign({},TraelVision,TraelVision.__dsMainNs,{__dsMainNs:undefined}):TraelVision;
