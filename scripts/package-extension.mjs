import fs from 'node:fs/promises';import { spawnSync } from 'node:child_process';
await fs.mkdir('dist',{recursive:true});await fs.rm('dist/cloversight-target-picker.zip',{force:true});
const result=spawnSync('zip',['-qr',`${process.cwd()}/dist/cloversight-target-picker.zip`,'.'],{cwd:'extensions/chrome-target-picker',stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);console.log('Created dist/cloversight-target-picker.zip');
