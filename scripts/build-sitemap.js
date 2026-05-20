#!/usr/bin/env node
// Build sitemap.xml from posts/manifest.json + posts/series.json.
// No dependencies. Run from repo root: `node scripts/build-sitemap.js`.
//
// When you add a post or series, rerun this. When you add a static SPA route,
// update STATIC_PAGES below to match PAGES[] in app.js, then rerun.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://adham.coach';
const TODAY = new Date().toISOString().slice(0, 10);

// Keep in sync with PAGES[] in app.js (plus the two legal HTML files).
// `id` 'home' renders at '/', not '/home'.
const STATIC_PAGES = [
  { loc: '/',             priority: '1.0', changefreq: 'weekly'  },
  { loc: '/about',        priority: '0.7', changefreq: 'monthly' },
  { loc: '/services',     priority: '0.9', changefreq: 'monthly' },
  { loc: '/blog',         priority: '0.8', changefreq: 'weekly'  },
  { loc: '/series',       priority: '0.7', changefreq: 'monthly' },
  { loc: '/resources',    priority: '0.7', changefreq: 'monthly' },
  { loc: '/results',      priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact',      priority: '0.7', changefreq: 'yearly'  },
  { loc: '/privacy.html', priority: '0.3', changefreq: 'yearly'  },
  { loc: '/terms.html',   priority: '0.3', changefreq: 'yearly'  },
];

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

const manifest = loadJson('posts/manifest.json');
const series = loadJson('posts/series.json');

const entries = [];

for (const p of STATIC_PAGES) {
  entries.push(urlEntry({
    loc: SITE + p.loc,
    lastmod: TODAY,
    changefreq: p.changefreq,
    priority: p.priority,
  }));
}

for (const post of manifest) {
  entries.push(urlEntry({
    loc: `${SITE}/post/${post.slug}`,
    lastmod: post.date || TODAY,
    changefreq: 'yearly',
    priority: '0.6',
  }));
}

for (const name of Object.keys(series)) {
  entries.push(urlEntry({
    loc: `${SITE}/blog/series/${encodeURIComponent(name)}`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: '0.6',
  }));
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  entries.join('\n'),
  '</urlset>',
  '',
].join('\n');

const outPath = path.join(ROOT, 'sitemap.xml');
fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Wrote ${path.relative(ROOT, outPath)} with ${entries.length} URLs.`);
