import { cp, mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = process.argv[2];
if (!arg) throw new Error('用法: node new-scene.mjs <新工程目录>');
const destination = resolve(arg);
const template = fileURLToPath(new URL('../assets/template/', import.meta.url));
await mkdir(destination, { recursive: true });
if ((await readdir(destination)).length) throw new Error('目标目录含有文件。请选择空目录，或直接编辑已有项目。');
for (const name of await readdir(template)) {
  await cp(join(template, name), join(destination, name), { recursive: true, force: false, errorOnExist: true });
}
console.log(destination);
