import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';

// Keep the published legal-section fragment URLs when an editor changes a heading.
function explicitHeadingIds() {
  return (tree) => {
    for (const node of tree.children) {
      if (node.type !== 'heading') continue;
      const text = node.children.at(-1);
      const match = text?.type === 'text' && / \{#([a-z][a-z0-9-]*)\}$/.exec(text.value);
      if (!match) continue;
      text.value = text.value.slice(0, match.index);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: match[1] } };
    }
  };
}

export default defineConfig({
  site: process.env.CLOVERSIGHT_PUBLIC_ORIGIN || 'https://cloversight.app',
  output: 'static',
  trailingSlash: 'never',
  outDir: '../../dist/public',
  cacheDir: '../../.local/astro-cache',
  build: { format: 'file', inlineStylesheets: 'never' },
  markdown: { processor: unified({ remarkPlugins: [explicitHeadingIds], smartypants: false }) },
  vite: { build: { assetsInlineLimit: 0 } },
});
