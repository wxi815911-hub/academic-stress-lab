import {access,readFile} from 'node:fs/promises';
const html=await readFile('public/index.html','utf8');
for(const m of html.matchAll(/(?:src|href)="(\/(?:assets\/|favicon)[^"]+)"/g))await access('public'+m[1]);
await import('../netlify/functions/classroom.mjs');
console.log('Deployment files verified: frontend assets and classroom function.');
