// Analyze data quality issues
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/app/lib/data/jsonl/programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json', 'utf-8'));

// Group by institution|program|cip_code
const groups = new Map();
data.forEach((p, idx) => {
  const key = `${p.iro_institution}|${p.program}|${p.cip_code}`;
  if (!groups.has(key)) {
    groups.set(key, []);
  }
  groups.get(key).push({ idx, desc: p.program_desc });
});

// Find groups with multiple different descriptions
const problemGroups = [];
groups.forEach((programs, key) => {
  if (programs.length > 1) {
    const uniqueDescs = new Set(programs.map(p => p.desc));
    if (uniqueDescs.size > 1) {
      problemGroups.push({
        key,
        count: programs.length,
        descriptions: Array.from(uniqueDescs),
        examples: programs.slice(0, 3)
      });
    }
  }
});

console.log('=== Data Quality Analysis ===\n');
console.log(`Total programs in file: ${data.length}`);
console.log(`Unique (institution|program|cip) keys: ${groups.size}`);
console.log(`Keys with multiple DIFFERENT descriptions: ${problemGroups.length}`);

const totalLost = problemGroups.reduce((sum, g) => sum + (g.count - 1), 0);
console.log(`Programs that would be lost: ${totalLost}`);
console.log(`Programs that would be kept: ${data.length - totalLost}`);

console.log(`\n=== Top 10 Most Affected Keys ===\n`);
problemGroups
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .forEach((g, i) => {
    console.log(`${i + 1}. Key: ${g.key}`);
    console.log(`   Variants: ${g.count} different programs`);
    console.log(`   Examples:`);
    g.descriptions.slice(0, 3).forEach(desc => {
      console.log(`     - ${desc}`);
    });
    console.log();
  });
