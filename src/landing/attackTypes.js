// Shared data for the landing page battlefield, firing range and trap replay.

export const ATTACK_TYPES = [
  { key: 'brute', code: 'BRF', label: 'Brute force', dash: [], speed: [150, 240] },
  { key: 'sqli', code: 'SQL', label: 'SQL injection', dash: [6, 4], speed: [130, 210] },
  { key: 'scan', code: 'SCN', label: 'Port scan', dash: [1.5, 4], speed: [200, 300] },
  { key: 'stuff', code: 'CRD', label: 'Credential stuffing', dash: [10, 3, 2, 3], speed: [140, 220] },
  { key: 'probe', code: 'PRB', label: 'Slow probe', dash: [2, 9], speed: [60, 100] },
];

export const HONEYPOTS = [
  { id: 'T-01', name: 'SSH', port: 22, x: 0.24, y: 0.32 },
  { id: 'T-02', name: 'HTTP', port: 80, x: 0.74, y: 0.27 },
  { id: 'T-03', name: 'FTP', port: 21, x: 0.36, y: 0.64 },
  { id: 'T-04', name: 'MySQL', port: 3306, x: 0.68, y: 0.6 },
];