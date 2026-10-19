/**
 * The site's schema.org graph, built in one place.
 *
 * `Head.astro` emits the site-wide `Person` (#person) and `WebSite` (#website) nodes on
 * every page; page types add their own nodes (`BlogPosting`, `BreadcrumbList`) and point
 * at the site-wide ones by `@id`. Separate blocks, one graph: a crawler merges them
 * instead of seeing several unlinked claims about the same person.
 *
 * Objects are built in TS and serialised with `JSON.stringify` — never hand-written JSON
 * strings, which break on the first apostrophe or quote in a title.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const SITE_URL = 'https://prawegko.dev';
export const SITE_NAME = 'Praweg Koirala';
export const SITE_TAGLINE =
  'Entrepreneur who codes — building AI-powered products on the cloud';
export const SITE_DESCRIPTION =
  'Portfolio and blog of Praweg Koirala — software engineer and entrepreneur building AI-powered products on the cloud.';

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const FEED_PATH = '/rss.xml';
export const FEED_TITLE = 'Praweg Koirala — RSS';
export const FEED_TYPE = 'application/rss+xml';

/** Both the site card and every per-item card are authored at this size. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export type JsonLdNode = Record<string, unknown>;

/** A `<script type="application/ld+json">` block: a stable id plus the node it carries. */
export interface JsonLdBlock {
  id: string;
  data: JsonLdNode;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).href;
}

/** `/projects/goatreport/` → `goatreport`; `/` → `undefined`. */
export function slugFromPath(pathname: string): string | undefined {
  return pathname.split('/').filter(Boolean).pop();
}

/**
 * Alt copy for each card, verbatim from `public/og/README.md` (designer-mac's artwork
 * notes) — keep the two in sync rather than rewriting the lines here.
 */
const OG_ALT: Record<string, string> = {
  default:
    'Praweg Koirala — entrepreneur who codes, building AI-powered products on the cloud.',
  'hello-world': 'Praweg Koirala — Hello, World: rebuilding this site with Astro, deployed on AWS.',
  'comfyui-gcp-storage':
    'Praweg Koirala — ComfyUI GCP Storage Decouple: custom ComfyUI node that decouples storage from compute on GCP.',
  goatreport: 'Praweg Koirala — GoatReport: fitness tracking app built with Flutter.',
  'kids-story-generator':
    'Praweg Koirala — Kids Story Generator: agentic AI pipeline generating illustrated children\'s stories.',
  'lifukids-web':
    'Praweg Koirala — LifuKids Web: kids learning platform built with Next.js and TypeScript.',
  'mern-jobs-board':
    'Praweg Koirala — MERN Jobs Board: full-stack job board with authentication and job posting.',
};

const OG_DIR = join(process.cwd(), 'public', 'og');

/**
 * The card this page advertises: its own `/og/<slug>.png` when that file exists in the
 * build, otherwise the site card. Existence is checked at build time, so a page whose
 * card has not been designed yet falls back instead of pointing at a 404.
 */
export function ogImage(slug: string | undefined, pageTitle: string): { url: string; alt: string } {
  if (slug && existsSync(join(OG_DIR, `${slug}.png`))) {
    return {
      url: absoluteUrl(`/og/${slug}.png`),
      alt: OG_ALT[slug] ?? `${pageTitle} — ${SITE_NAME}`,
    };
  }
  return { url: absoluteUrl('/og-image.png'), alt: OG_ALT.default };
}

export function personNode(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    // No portrait asset exists yet; the branded site card stands in for it.
    image: absoluteUrl('/og-image.png'),
    jobTitle: 'Software Engineer & Entrepreneur',
    sameAs: ['https://github.com/koirpraw', 'https://www.linkedin.com/in/prawegko'],
    knowsAbout: [
      'Software Engineering',
      'Cloud Computing',
      'Artificial Intelligence',
      'Product Development',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'PkoLabs LLC',
      url: 'https://pkolabs.com/',
    },
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
  };
}

export function blogPostingNode(post: {
  title: string;
  description: string;
  path: string;
  datePublished: Date;
  /** Falls back to `datePublished` when the post has never been revised. */
  dateModified?: Date;
  tags?: string[];
  image: string;
}): JsonLdNode {
  const canonical = absoluteUrl(post.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonical}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical,
    headline: post.title,
    description: post.description,
    image: [post.image],
    inLanguage: 'en',
    datePublished: post.datePublished.toISOString(),
    dateModified: (post.dateModified ?? post.datePublished).toISOString(),
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
  };
}

export function breadcrumbNode(trail: { name: string; path: string }[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
