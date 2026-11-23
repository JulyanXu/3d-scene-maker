import { build } from 'esbuild';
import { readFile, writeFile, rename, rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiled = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110'],
  minify: true,
  legalComments: 'inline',
  write: false,
  plugins: [{
    name: 'embedded-url',
    setup(build) {
      build.onResolve({ filter: /\?inline$/ }, async ({ path, resolveDir, kind }) => {
        const asset = await build.resolve(path.slice(0, -7), { resolveDir, kind });
        if (asset.errors.length) return { errors: asset.errors };
        return { path: asset.path, namespace: 'embedded-url' };
      });
      build.onLoad({ filter: /.*/, namespace: 'embedded-url' }, async ({ path }) => ({
        contents: await readFile(path), loader: 'dataurl'
      }));
    }
  }],
  loader: {
    '.glb': 'binary', '.bin': 'binary', '.wasm': 'dataurl',
    '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.webp': 'dataurl',
    '.avif': 'dataurl', '.gif': 'dataurl', '.svg': 'dataurl', '.hdr': 'binary',
    '.ktx2': 'binary', '.woff': 'dataurl', '.woff2': 'dataurl', '.mp3': 'dataurl',
    '.ogg': 'dataurl', '.wav': 'dataurl'
  }
});
if (compiled.outputFiles.length !== 1) throw new Error('构建产生了外部文件。请使用静态导入内嵌素材，并把页面样式放入 shell.html。');
const shell = await readFile(join(root, 'src/shell.html'), 'utf8');
const marker = '<!-- SCENE_BUNDLE -->';
if (shell.split(marker).length !== 2) throw new Error('页面需要一个 SCENE_BUNDLE 标记。');
const js = compiled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const sources = [await readFile(join(root, 'ASSETS.md'), 'utf8')];
const licenseDir = join(root, 'licenses');
const licenses = await readdir(licenseDir).catch(error => {
  if (error.code === 'ENOENT') return [];
  throw error;
});
for (const name of licenses.filter(name => /\.(txt|md)$/i.test(name)).sort()) {
  sources.push(name + '\n\n' + await readFile(join(licenseDir, name), 'utf8'));
}
sources.push('Three.js\n\n' + await readFile(join(root, 'node_modules/three/LICENSE'), 'utf8'));
const credits = sources.join('\n\n────────\n\n').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const html = shell.replace('<!-- CREDITS -->', () => credits).replace(marker, () => '<script>' + js + '</script>');
const pending = join(root, '.' + randomUUID() + '.html');
try {
  await writeFile(pending, html);
  await rename(pending, join(root, 'scene.html'));
} finally {
  await rm(pending, { force: true });
}
console.log('scene.html · ' + (Buffer.byteLength(html) / 1048576).toFixed(2) + ' MiB');
