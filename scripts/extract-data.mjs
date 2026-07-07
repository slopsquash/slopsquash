import { npmHighImpact } from 'npm-high-impact';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('data', { recursive: true });

const data = {
  description: 'High-impact npm packages (1M+ weekly downloads or 500+ dependents)',
  source: 'https://github.com/wooorm/npm-high-impact',
  count: npmHighImpact.length,
  packages: npmHighImpact
};

writeFileSync('data/top-packages-npm.json', JSON.stringify(data, null, 2));
console.log(`Wrote ${npmHighImpact.length} packages to data/top-packages-npm.json`);
