import { mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'www');
const files=[
  'index.html','styles.css','mobile.css','jalali.js','holidays.js','xlsx-lite.js',
  'solver.js','app.js','v11-extra.js','extras.js','mobile.js','manifest.webmanifest','service-worker.js',
  'icon-192.png','icon-512.png','sample_people.xlsx','sample_schedule.xlsx'
];
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of files) await copyFile(resolve(root,file),resolve(out,file));
console.log(`Mobile web bundle prepared in ${out}`);
