const sharp = require("sharp");
const path = require("path");

const OUT = path.join(__dirname, "..", "public");

function starPoints(cx, cy, outerR, innerR, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = -Math.PI / 2 + (Math.PI / n) * i;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function makeSvg(size, { maskable = false } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  // maskable: star fits in inner 80% safe zone
  const scale = maskable ? 0.32 : 0.38;
  const outerR = size * scale;
  const innerR = outerR * 0.4;
  // shift star down slightly for optical center
  const yOff = size * 0.02;
  const rx = maskable ? 0 : Math.round(size * 0.2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7c6cf7"/>
      <stop offset="100%" stop-color="#5a4bd1"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.015}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)"/>
  <polygon points="${starPoints(cx, cy + yOff, outerR, innerR)}"
           fill="#FFD93D" filter="url(#glow)"/>
  <polygon points="${starPoints(cx, cy + yOff, outerR * 0.82, innerR * 0.82)}"
           fill="#FFE566" opacity="0.4"/>
</svg>`;
}

async function generate() {
  const configs = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "icon-192-maskable.png", size: 192, maskable: true },
    { name: "icon-512-maskable.png", size: 512, maskable: true },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-32.png", size: 32 },
    { name: "favicon-16.png", size: 16 },
  ];

  for (const c of configs) {
    const svg = makeSvg(c.size, { maskable: c.maskable });
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, c.name));
    console.log(`  ✓ ${c.name}`);
  }

  // favicon.svg (scalable)
  const fs = require("fs");
  fs.writeFileSync(path.join(OUT, "favicon.svg"), makeSvg(32));
  console.log("  ✓ favicon.svg");

  // favicon.ico from 32px + 16px
  const ico32 = await sharp(Buffer.from(makeSvg(32))).png().toBuffer();
  const ico16 = await sharp(Buffer.from(makeSvg(16))).png().toBuffer();
  // Simple ICO: just use the 32px PNG as favicon.ico (browsers handle PNG-in-ICO)
  await sharp(Buffer.from(makeSvg(32))).resize(32, 32).png().toFile(path.join(OUT, "favicon.ico"));
  console.log("  ✓ favicon.ico");

  console.log("\nDone! All icons generated in public/");
}

generate().catch(console.error);
