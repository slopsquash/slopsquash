import { writeFileSync } from 'fs';

const resp = await fetch('https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.min.json');
const json = await resp.json();
const packages = json.rows.map(r => r.project);

const data = {
  description: 'Top PyPI packages by 30-day downloads',
  source: 'https://hugovk.github.io/top-pypi-packages/',
  count: packages.length,
  packages: packages
};

writeFileSync('data/top-packages-pypi.json', JSON.stringify(data, null, 2));
console.log(`Wrote ${packages.length} packages to data/top-packages-pypi.json`);
