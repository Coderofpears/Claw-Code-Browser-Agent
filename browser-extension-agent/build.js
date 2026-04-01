import { readdirSync, copyFileSync, mkdirSync, existsSync, rmSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname);
const distDir = resolve(rootDir, 'dist');
const tempDir = resolve(rootDir, 'dist-temp');

// Clean dist
if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

// Copy manifest
copyFileSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'));
console.log('Copied manifest.json');

function flattenDist() {
  if (!existsSync(tempDir)) {
    console.error('dist-temp not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('Walking dist-temp:', tempDir);
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const src = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(src);
      } else {
        const dest = resolve(distDir, entry.name);
        copyFileSync(src, dest);
        const stat = statSync(dest);
        console.log(`  Copied ${entry.name} (${stat.size} bytes) to ${dest}`);
        files.push(entry.name);
      }
    }
  }

  walk(tempDir);

  // Rename index.html to sidepanel.html
  const indexHtml = resolve(distDir, 'index.html');
  if (existsSync(indexHtml)) {
    copyFileSync(indexHtml, resolve(distDir, 'sidepanel.html'));
    console.log('Created sidepanel.html from index.html');
  }

  // Clean up tempDir
  rmSync(tempDir, { recursive: true, force: true });
  console.log('Cleaned dist-temp');

  // Final verification
  console.log('\nFinal dist contents:');
  for (const f of readdirSync(distDir)) {
    const stat = statSync(resolve(distDir, f));
    console.log(`  ${f} (${stat.size} bytes)`);
  }

  console.log('\nBuild complete. Load', distDir, 'as unpacked extension.');
}

flattenDist();
