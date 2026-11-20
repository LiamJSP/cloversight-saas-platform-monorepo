import fs from 'node:fs/promises';
for (const target of ['dist','.local']) await fs.rm(target,{recursive:true,force:true});
console.log('Removed dist/ and .local/.');
