// Shared data for the landing page battlefield, firing range and trap replay.

// `shape` is the head of the attack in the field and its icon in the dashboard legend.
export const ATTACK_TYPES = [
  { key: 'brute', code: 'BRF', label: 'Brute force', shape: 'circle', dash: [], speed: [150, 240] },
  { key: 'sqli', code: 'SQL', label: 'SQL injection', shape: 'triangle', dash: [6, 4], speed: [130, 210] },
  { key: 'scan', code: 'SCN', label: 'Port scan', shape: 'square', dash: [1.5, 4], speed: [200, 300] },
  { key: 'stuff', code: 'CRD', label: 'Credential stuffing', shape: 'diamond', dash: [10, 3, 2, 3], speed: [140, 220] },
  { key: 'probe', code: 'PRB', label: 'Slow probe', shape: 'hexagon', dash: [2, 9], speed: [60, 100] },
];

// Regular polygons used for the shapes (circle is drawn as an arc, so it isn't listed).
const POLY = {
  triangle: { n: 3, rot: 0, k: 1.2 },
  square: { n: 4, rot: Math.PI / 4, k: 1 },
  diamond: { n: 4, rot: 0, k: 1.2 },
  hexagon: { n: 6, rot: 0, k: 1.05 },
};

// Corner offsets [[dx,dy],...] of a shape of radius r, pointing along `angle`.
// Returns null for a circle. Used by both the canvas engine and the SVG legend,
// so the legend always matches what flies across the field.
export function shapePoints(shape, r, angle = 0) {
  const p = POLY[shape];
  if (!p) return null;
  const pts = [];
  for (let i = 0; i < p.n; i++) {
    const a = angle + p.rot + (Math.PI * 2 * i) / p.n;
    pts.push([Math.cos(a) * r * p.k, Math.sin(a) * r * p.k]);
  }
  return pts;
}

// `rgb` = fallback neon colour per pot (dark theme). The live values come from
// --sx-pot-<key> in landing.css, which also has darker light-theme variants.
// Pots are spread vertically so SSH/FTP and HTTP/MySQL don't crowd each other.
export const HONEYPOTS = [
  { id: 'T-01', name: 'SSH', key: 'ssh', port: 22, x: 0.24, y: 0.27, rgb: '180,77,255' },   // punk violet
  { id: 'T-02', name: 'HTTP', key: 'http', port: 80, x: 0.74, y: 0.25, rgb: '0,229,255' },  // neon cyan
  { id: 'T-03', name: 'FTP', key: 'ftp', port: 21, x: 0.36, y: 0.73, rgb: '182,255,0' },    // acid lime
  { id: 'T-04', name: 'MySQL', key: 'mysql', port: 3306, x: 0.68, y: 0.71, rgb: '255,46,147' }, // hot pink
];