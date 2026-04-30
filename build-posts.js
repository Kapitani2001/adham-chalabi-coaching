// Reads frontmatter from every posts/*.md and regenerates posts/manifest.json.
// Run after editing posts in Obsidian: `node build-posts.js`

const fs = require('node:fs');
const path = require('node:path');

const POSTS_DIR = path.join(__dirname, 'posts');
const MANIFEST_PATH = path.join(POSTS_DIR, 'manifest.json');
const SERIES_PATH = path.join(POSTS_DIR, 'series.json');

const SERIES_FIELDS = ['series_subtitle', 'series_description', 'ritual_for', 'ritual_intro', 'is_welcome'];
const SERIES_FIELD_TO_META = {
  series_subtitle: 'subtitle',
  series_description: 'description',
  ritual_for: 'ritual_for',
  ritual_intro: 'ritual_intro',
  is_welcome: 'is_welcome',
};

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: null, body: content };
  const yaml = m[1];
  const body = m[2];
  const data = {};
  for (const line of yaml.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const km = line.match(/^([\w-]+):\s*(.*)$/);
    if (!km) continue;
    const key = km[1];
    let value = km[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+$/.test(value)) value = Number(value);
    else if (/^-?\d+\.\d+$/.test(value)) value = Number(value);
    data[key] = value;
  }
  return { data, body };
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
const entries = [];
const skipped = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data } = parseFrontmatter(raw);
  if (!data || !data.title || !data.date) {
    skipped.push(`${file} (missing frontmatter or title/date)`);
    continue;
  }
  entries.push({ slug, ...data });
}

entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

// Auto-assign Field Note numbers (oldest = 1) unless explicitly set in frontmatter
const ascByDate = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
ascByDate.forEach((e, i) => {
  if (e.field_note === undefined) e.field_note = i + 1;
});

// Compute series_total per series (count of posts in that series)
const seriesCounts = {};
for (const e of entries) {
  if (e.series) seriesCounts[e.series] = (seriesCounts[e.series] || 0) + 1;
}
for (const e of entries) {
  if (e.series) e.series_total = seriesCounts[e.series];
}

// Merge per-post series metadata fields into series.json
let seriesMeta = {};
if (fs.existsSync(SERIES_PATH)) {
  try { seriesMeta = JSON.parse(fs.readFileSync(SERIES_PATH, 'utf8')); }
  catch (e) { console.warn('series.json malformed, starting fresh'); seriesMeta = {}; }
}

const seriesUpdates = {};
for (const e of entries) {
  if (!e.series) continue;
  const updates = {};
  for (const field of SERIES_FIELDS) {
    if (e[field] !== undefined && e[field] !== '' && e[field] !== null) {
      updates[SERIES_FIELD_TO_META[field]] = e[field];
    }
  }
  if (Object.keys(updates).length === 0) continue;
  if (!seriesUpdates[e.series]) seriesUpdates[e.series] = updates;
  else seriesUpdates[e.series] = { ...updates, ...seriesUpdates[e.series] };  // earlier post wins on conflict
}

let seriesChanged = false;
for (const [name, updates] of Object.entries(seriesUpdates)) {
  const existing = seriesMeta[name] || {};
  const merged = { ...existing, ...updates };
  if (JSON.stringify(existing) !== JSON.stringify(merged)) {
    seriesMeta[name] = merged;
    seriesChanged = true;
  }
}

if (seriesChanged) {
  fs.writeFileSync(SERIES_PATH, JSON.stringify(seriesMeta, null, 2) + '\n');
  console.log(`Updated series.json from post frontmatter`);
}

// Strip per-post series-meta fields from the manifest output (they live in series.json)
const cleanedEntries = entries.map(e => {
  const out = { ...e };
  for (const field of SERIES_FIELDS) delete out[field];
  return out;
});

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(cleanedEntries, null, 2) + '\n');
console.log(`Wrote ${cleanedEntries.length} entries to posts/manifest.json`);
if (skipped.length) {
  console.log('Skipped:');
  skipped.forEach(s => console.log('  ' + s));
}
