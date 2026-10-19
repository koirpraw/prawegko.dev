// OG image renderer — prawegko.dev
// Single templated source: one layout function emits every card's SVG,
// sharp rasterises it to a 1200x630 PNG.
//
//   node design/render-og.mjs            (renders all cards)
//   node design/render-og.mjs og-image   (one card only, by key)
//
// Output: public/og-image.png and public/og/<slug>.png
// Palette / rules come from the site design tokens (see design/README.md).

import sharp from "sharp";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- design tokens (match src/styles/global.css dark theme) ----
const C = {
  bg: "#0a0a0f",
  surface: "#111118",
  fg: "#e0e0e8",
  muted: "#8888a0",
  accent: "#4f8fff",
  hairline: "#22223a",
};

const FONT_SANS = "Inter";
const FONT_MONO = "JetBrains Mono";

// Favicon "A" mark, from public/favicon.svg (viewBox 0 0 128 128).
const MARK_PATH =
  "M50.4 78.5a75.1 75.1 0 0 0-28.5 6.9l24.2-65.7c.7-2 1.9-3.2 3.4-3.2h29c1.5 0 2.7 1.2 3.4 3.2l24.2 65.7s-11.6-7-28.5-7L67 45.5c-.4-1.7-1.6-2.8-2.9-2.8-1.3 0-2.5 1.1-2.9 2.7L50.4 78.5Zm-1.1 28.2Zm-4.2-20.2c-2 6.6-.6 15.8 4.2 20.2a17.5 17.5 0 0 1 .2-.7 5.5 5.5 0 0 1 5.7-4.5c2.8.1 4.3 1.5 4.7 4.7.2 1.1.2 2.3.2 3.5v.4c0 2.7.7 5.2 2.2 7.4a13 13 0 0 0 5.7 4.9v-.3l-.2-.3c-1.8-5.6-.5-9.5 4.4-12.8l1.5-1a73 73 0 0 0 3.2-2.2 16 16 0 0 0 6.8-11.4c.3-2 .1-4-.6-6l-.8.6-1.6 1a37 37 0 0 1-22.4 2.7c-5-.7-9.7-2-13.2-6.2Z";

const W = 1200;
const H = 630;
const M = 72; // safe margin — no text or critical pixels outside this

// ---- card definitions -------------------------------------------------
// Every card is produced from the same layout function; only content varies.
const cards = [
  {
    key: "og-image",
    out: "public/og-image.png",
    label: "PRAWEGKO.DEV",
    titleLines: ["Praweg Koirala"],
    taglineLines: [
      "Entrepreneur who codes —",
      "building AI-powered products on the cloud",
    ],
    footer: null,
  },
  {
    key: "comfyui-gcp-storage",
    out: "public/og/comfyui-gcp-storage.png",
    label: "PROJECT",
    titleLines: ["ComfyUI GCP", "Storage Decouple"],
    taglineLines: [
      "Decoupling storage from compute —",
      "read/write cloud storage directly in ComfyUI",
    ],
    footer: "Praweg Koirala · prawegko.dev",
  },
  {
    key: "goatreport",
    out: "public/og/goatreport.png",
    label: "PROJECT",
    titleLines: ["GoatReport"],
    taglineLines: ["Fitness tracking app built with Flutter", "log workouts, set goals, view analytics"],
    footer: "Praweg Koirala · prawegko.dev",
  },
  {
    key: "kids-story-generator",
    out: "public/og/kids-story-generator.png",
    label: "PROJECT",
    titleLines: ["Kids Story Generator"],
    taglineLines: ["Agentic AI pipeline for illustrated", "children's stories — Python, ADK, Gemini"],
    footer: "Praweg Koirala · prawegko.dev",
  },
  {
    key: "lifukids-web",
    out: "public/og/lifukids-web.png",
    label: "PROJECT",
    titleLines: ["LifuKids Web"],
    taglineLines: ["Kids learning platform with NextJS & TypeScript", "interactive content, gamification, progress"],
    footer: "Praweg Koirala · prawegko.dev",
  },
  {
    key: "mern-jobs-board",
    out: "public/og/mern-jobs-board.png",
    label: "PROJECT",
    titleLines: ["MERN Jobs Board"],
    taglineLines: ["Full-stack CRUD job board — MongoDB,", "Express, React, Node.js with auth & search"],
    footer: "Praweg Koirala · prawegko.dev",
  },
  {
    key: "hello-world",
    out: "public/og/hello-world.png",
    label: "BLOG POST",
    titleLines: ["Hello, World —", "New Site, New Stack"],
    taglineLines: ["Rebuilding prawegko.dev with Astro,", "deployed on S3/CloudFront with OIDC CI/CD"],
    footer: "Praweg Koirala · prawegko.dev",
  },
];

// ---- text width estimation (Inter, approx per-weight advance ratios) ---
// Used only to sanity-check that lines stay inside the safe margin; the
// actual layout uses fixed type sizes tuned to the longest line per card.
const estWidth = (text, px, weight) => {
  const k = weight >= 700 ? 0.56 : weight >= 600 ? 0.54 : 0.5;
  return text.length * px * k;
};

function assertFits(lines, px, weight, label) {
  const max = W - 2 * M;
  for (const line of lines) {
    const w = estWidth(line, px, weight);
    if (w > max) {
      throw new Error(`${label}: line too wide at ${px}px (${Math.round(w)} > ${max}): "${line}"`);
    }
  }
}

// ---- SVG template ------------------------------------------------------
// One layout for every card. The accent colour gets exactly one job per
// card: the short rule under the title (and the mark's inner counterweight).
function buildSvg(card) {
  assertFits(card.titleLines, 60, 700, `${card.key} title`);
  assertFits(card.taglineLines, 34, 400, `${card.key} tagline`);
  assertFits([card.label], 28, 500, `${card.key} label`);
  if (card.footer) assertFits([card.footer], 28, 400, `${card.key} footer`);

  const markSize = 64;
  const markY = M + 8; // top edge y of the mark box

  const titleSize = 60;
  const titleLineH = 74;
  const taglineSize = 34;
  const taglineLineH = 46;
  const labelSize = 28;

  // Vertical block starts lower than the mark; compute the y positions.
  const blockTop = 216;
  const ruleY = blockTop + card.titleLines.length * titleLineH - 14;
  const taglineStartY = ruleY + 64;
  const footerY = H - M + 8; // baseline sits just above bottom margin edge

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const titleText = card.titleLines
    .map(
      (line, i) =>
        `<text x="${M}" y="${blockTop + titleLineH * i}" font-family="${FONT_SANS}" font-weight="700" font-size="${titleSize}" fill="${C.fg}">${esc(line)}</text>`
    )
    .join("\n    ");

  const taglineText = card.taglineLines
    .map(
      (line, i) =>
        `<text x="${M}" y="${taglineStartY + taglineLineH * i}" font-family="${FONT_SANS}" font-weight="400" font-size="${taglineSize}" fill="${C.muted}">${esc(line)}</text>`
    )
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.accent}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="${C.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="0" y="0" width="${W}" height="220" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="1" fill="${C.hairline}"/>

  <!-- brand mark (evolved favicon "A") -->
  <g transform="translate(${M},${markY}) scale(${markSize / 128})">
    <path d="${MARK_PATH}" fill="${C.fg}"/>
  </g>

  <!-- top-right label -->
  <text x="${W - M}" y="${markY + 40}" text-anchor="end" font-family="${FONT_MONO}" font-weight="500" font-size="${labelSize}" fill="${C.muted}" letter-spacing="4">${esc(card.label)}</text>

  <g>
    ${titleText}
    <!-- the accent rule: the accent colour's single job on this card -->
    <rect x="${M}" y="${ruleY}" width="112" height="6" rx="3" fill="${C.accent}"/>
    ${taglineText}
  </g>

  ${
    card.footer
      ? `<text x="${W - M}" y="${footerY}" text-anchor="end" font-family="${FONT_SANS}" font-weight="400" font-size="28" fill="${C.muted}">${esc(card.footer)}</text>`
      : ""
  }
</svg>
`;
}

// ---- render ------------------------------------------------------------
async function render(card) {
  const svg = buildSvg(card);
  writeFileSync(join(ROOT, "design", `${card.key}.svg`), svg);
  mkdirSync(join(ROOT, "public", "og"), { recursive: true });
  const png = await sharp(Buffer.from(svg), { density: 96 })
    .resize(W, H)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const out = join(ROOT, card.out);
  writeFileSync(out, png);
  console.log(`wrote ${card.out} (${png.length} bytes)`);
}

const only = process.argv[2];
const chosen = only ? cards.filter((c) => c.key === only) : cards;
if (chosen.length === 0) {
  console.error(`no card matching "${only}" — keys: ${cards.map((c) => c.key).join(", ")}`);
  process.exit(1);
}
rmSync(join(ROOT, "public", "og"), { recursive: true, force: true });
for (const card of chosen) {
  await render(card);
}
