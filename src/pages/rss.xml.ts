import rss from '@astrojs/rss';

export async function GET(context) {
  const posts = [
    {
      title: 'Hello, World — New Site, New Stack',
      pubDate: new Date('2026-09-30'),
      description: 'Rebuilding prawegko.dev with Astro, deployed on S3/CloudFront with OIDC CI/CD.',
      link: '/blog/hello-world/',
      categories: ['Meta', 'Astro', 'AWS', 'Cloud'],
    },
  ];
  return rss({
    title: 'Praweg Koirala — Blog',
    description: 'Thoughts on software engineering, AI, cloud computing, and building products.',
    site: context.site,
    items: posts,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
  });
}