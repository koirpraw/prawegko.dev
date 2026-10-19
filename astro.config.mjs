// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { execFileSync } from 'node:child_process';

/**
 * Sitemap `<lastmod>` comes from the real last-modified date of each page's OWN source
 * file (git committer date), not from the build time: a deploy that only touches a shared
 * layout must not tell Google every URL changed, and an edit to one page must bump that
 * page alone. The second element of each entry is the fallback used when git history is
 * unavailable (shallow clone, tarball export) — it is the date recorded here, and it goes
 * stale the moment a page is edited without git.
 */
const PAGES = {
  '/': ['src/pages/index.astro', '2026-10-05'],
  '/about/': ['src/pages/about.astro', '2026-10-05'],
  '/blog/': ['src/pages/blog/index.astro', '2026-10-05'],
  '/blog/hello-world/': ['src/pages/blog/hello-world.astro', '2026-10-05'],
  '/contact/': ['src/pages/contact.astro', '2026-10-05'],
  '/now/': ['src/pages/now.astro', '2026-10-05'],
  '/projects/': ['src/pages/projects/index.astro', '2026-10-05'],
  '/projects/comfyui-gcp-storage/': ['src/pages/projects/comfyui-gcp-storage.astro', '2026-10-06'],
  '/projects/goatreport/': ['src/pages/projects/goatreport.astro', '2026-10-05'],
  '/projects/kids-story-generator/': ['src/pages/projects/kids-story-generator.astro', '2026-10-06'],
  '/projects/lifukids-web/': ['src/pages/projects/lifukids-web.astro', '2026-10-05'],
  '/projects/mern-jobs-board/': ['src/pages/projects/mern-jobs-board.astro', '2026-10-05'],
  '/resume/': ['src/pages/resume.astro', '2026-10-06'],
};

/** `git log -1 --format=%cs -- <file>` → `YYYY-MM-DD`, or null when git can't answer.
 * @param {string} file */
function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

const lastmod = new Map(
  Object.entries(PAGES).map(([pathname, [file, fallback]]) => [pathname, gitDate(file) ?? fallback]),
);

// https://astro.build/config
export default defineConfig({
  site: 'https://prawegko.dev',
  build: {
    format: 'directory',
  },
  legacy: {
    collectionsBackwardsCompat: true,
  },
  integrations: [
    sitemap({
      // The 404 page is not a page Google should ever fetch, and it is noindexed anyway.
      filter: (page) => !/\/(404|500)\/?$/.test(new URL(page).pathname),
      serialize: (item) => {
        const date = lastmod.get(new URL(item.url).pathname);
        return date ? { ...item, lastmod: date } : item;
      },
    }),
    mdx(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
