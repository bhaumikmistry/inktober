/* Placeholder ink drawings, one per day of October. Replace any file in
 * public/sketches with a real scan of the same name and nothing else changes.
 *
 * Every line is drawn twice with a little wobble so it reads as pen on paper
 * rather than as vector art. Seeded per day, so reruns produce the same set. */
import fs from 'node:fs'

const W = 600, H = 800
let seed = 1
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
const j = (n) => (rnd() - 0.5) * n

function curve(pts, w = 2.6, op = 1) {
  const pass = (k) => {
    const p = pts.map(([x, y]) => [x + j(2.4), y + j(2.4)])
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i]
      d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`
    }
    d += ` T${p[p.length - 1][0].toFixed(1)} ${p[p.length - 1][1].toFixed(1)}`
    return `<path d="${d}" fill="none" stroke="#141210" stroke-width="${(k ? w * 0.5 : w).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${k ? op * 0.7 : op}"/>`
  }
  return pass(0) + pass(1)
}
const ring = (x, y, rx, ry = rx, n = 28, a0 = 0, a1 = Math.PI * 2) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] })
const ln = (x1, y1, x2, y2, w, op) => curve([[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, y2]], w, op)
const hatch = (x, y, w, h, gap = 12, op = 0.55) => {
  let s = ''
  for (let i = -h; i < w; i += gap) s += ln(x + Math.max(0, i), y + Math.max(0, -i), x + Math.min(w, i + h), y + Math.min(h, h - (i + h - w > 0 ? i + h - w : 0)), 1.3, op)
  return s
}

const MOTIFS = [
  function moon() { return curve(ring(300, 300, 120)) + curve(ring(350, 270, 110, 110, 28, Math.PI * 0.62, Math.PI * 1.38)) +
    curve([[40, 640], [160, 560], [260, 600], [380, 520], [560, 620]]) + hatch(60, 640, 480, 100, 14) },
  function cup() { return curve([[190, 380], [200, 600], [400, 600], [410, 380], [190, 380]]) + curve(ring(440, 470, 50, 60, 20, -Math.PI / 2, Math.PI / 2)) +
    curve(ring(300, 620, 190, 26)) + [0, 1, 2].map(i => curve([[250 + i * 50, 340], [235 + i * 50, 290], [265 + i * 50, 240], [245 + i * 50, 190]], 2)).join('') },
  function leaf() { return curve([[300, 690], [180, 520], [210, 300], [300, 140], [390, 300], [420, 520], [300, 690]]) +
    curve([[300, 720], [300, 160]], 2.4) + [0, 1, 2, 3, 4].map(i => ln(300, 600 - i * 85, 220 + i * 6, 520 - i * 85, 1.6) + ln(300, 600 - i * 85, 380 - i * 6, 520 - i * 85, 1.6)).join('') },
  function house() { return curve([[160, 640], [160, 400], [300, 270], [440, 400], [440, 640], [160, 640]]) + curve([[270, 640], [270, 530], [330, 530], [330, 640]]) +
    curve([[190, 440], [250, 440], [250, 495], [190, 495], [190, 440]]) + curve([[360, 300], [360, 230], [395, 230], [395, 335]]) +
    [0, 1, 2].map(i => curve(ring(390 + i * 18, 200 - i * 40, 20 + i * 8, 14 + i * 5), 1.6)).join('') + hatch(300, 280, 140, 120, 11, 0.4) },
  function spiral() { const p = []; for (let i = 0; i < 260; i++) { const a = i * 0.09, r = 8 + i * 0.95; p.push([300 + Math.cos(a) * r, 400 + Math.sin(a) * r]) } return curve(p, 2.4) },
  function mountains() { return curve([[40, 600], [180, 300], [260, 420], [350, 220], [560, 600]]) + curve([[300, 330], [350, 220], [400, 330]], 2) +
    hatch(360, 280, 160, 300, 13, 0.45) + curve([[40, 660], [560, 660]], 2) + curve(ring(470, 180, 40), 2) },
  function umbrella() { return curve(ring(300, 360, 200, 150, 30, Math.PI, Math.PI * 2)) +
    curve([[100, 360], [150, 345], [200, 360], [250, 345], [300, 360], [350, 345], [400, 360], [450, 345], [500, 360]], 2.2) +
    curve([[300, 210], [300, 620], [280, 650], [255, 630]]) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => ln(80 + i * 64, 450 + (i % 3) * 60, 72 + i * 64, 490 + (i % 3) * 60, 1.4)).join('') },
  function tree() { return curve([[290, 660], [295, 420], [270, 330]], 3.2) + curve([[305, 660], [312, 420], [335, 330]], 3.2) +
    curve(ring(300, 280, 170, 140, 22)) + [0, 1, 2, 3, 4].map(i => curve(ring(230 + i * 35, 250 + (i % 2) * 50, 30, 24, 10), 1.4, 0.6)).join('') + curve([[120, 660], [480, 660]], 2) },
  function fish() { return curve([[130, 400], [250, 300], [420, 330], [480, 400], [420, 470], [250, 500], [130, 400]]) +
    curve([[480, 400], [560, 330], [550, 400], [560, 470], [480, 400]]) + curve(ring(210, 385, 10)) +
    [0, 1, 2, 3].map(i => curve(ring(260 + i * 45, 400, 22, 40, 10, -Math.PI / 2, Math.PI / 2), 1.4, 0.6)).join('') },
  function candle() { return curve([[250, 640], [250, 330], [350, 330], [350, 640]]) + curve(ring(300, 640, 120, 22)) +
    curve([[300, 330], [300, 300]], 2) + curve([[300, 300], [272, 250], [300, 190], [328, 250], [300, 300]]) +
    curve([[255, 360], [268, 420], [262, 470]], 1.6, 0.6) },
  function cat() { return curve([[200, 640], [180, 470], [220, 350], [210, 270], [255, 320], [345, 320], [390, 270], [380, 350], [420, 470], [400, 640], [200, 640]]) +
    curve([[400, 620], [500, 600], [520, 520], [470, 500]]) + ln(262, 395, 282, 395, 2) + ln(318, 395, 338, 395, 2) },
  function key() { return curve(ring(220, 400, 80)) + curve(ring(220, 400, 30)) + curve([[300, 400], [520, 400]]) +
    curve([[470, 400], [470, 450], [500, 450], [500, 400]]) + curve([[420, 400], [420, 440]]) },
]

const days = 31
fs.mkdirSync('public/sketches', { recursive: true })
for (let d = 1; d <= days; d++) {
  seed = d * 977 + 13
  const motif = MOTIFS[(d - 1) % MOTIFS.length]
  const body = motif()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">

${body}
<text x="${W - 40}" y="${H - 36}" text-anchor="end" font-family="Georgia, serif" font-style="italic" font-size="22" fill="#141210" opacity="0.6">${d}.10</text>
<text x="40" y="${H - 36}" font-family="system-ui, sans-serif" font-size="14" letter-spacing="2" fill="#141210" opacity="0.3">SAMPLE</text>
</svg>`
  fs.writeFileSync(`public/sketches/day-${String(d).padStart(2, '0')}.svg`, svg)
}
console.log(`wrote ${days} placeholder sketches`)
