import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/**
 * Astro 集成：在构建后恢复自定义的 robots.txt
 * 因为 @astrojs/sitemap 会自动生成并覆盖 public/robots.txt
 */
export function preserveRobotsTxt() {
  return {
    name: 'preserve-robots-txt',
    hooks: {
      'astro:build:done': () => {
        // 构建完成后，将自定义 robots.txt 复制到输出目录
        const source = resolve(root, 'public/robots.txt');
        const dest = resolve(root, 'dist/robots.txt');
        try {
          copyFileSync(source, dest);
          console.log('✓ Custom robots.txt preserved');
        } catch (error) {
          console.warn('⚠ Failed to preserve custom robots.txt:', error.message);
        }
      }
    }
  };
}
