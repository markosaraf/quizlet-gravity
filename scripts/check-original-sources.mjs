import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sources=JSON.parse(readFileSync('docs/original-gravity-sources.json','utf8'));
const readme=readFileSync('README.md','utf8');
for (const url of sources.urls) assert(readme.includes(url), 'Restore original source URL to README: '+url);
assert.equal(createHash('sha256').update(readFileSync('docs/original-gravity-recovery-kit.md')).digest('hex'),sources.recoveryKitSha256,'Preserve the original recovery kit unchanged');
console.log('Preserved all '+sources.urls.length+' original archive URLs and the unchanged recovery kit.');
