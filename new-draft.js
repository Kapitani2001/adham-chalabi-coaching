// new-draft.js — create a new draft from the template, ready to edit in Obsidian.
//
// Usage:  node new-draft.js <slug>
// Example: node new-draft.js forge-your-meaning
//
// The slug becomes the filename and the URL: /#post/<slug>

const fs = require('node:fs');
const path = require('node:path');

const POSTS_DIR = path.join(__dirname, 'posts');
const DRAFTS_DIR = path.join(POSTS_DIR, 'drafts');
const TEMPLATE_PATH = path.join(POSTS_DIR, 'templates', 'new-essay.md');

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node new-draft.js <slug>');
  console.error('Example: node new-draft.js forge-your-meaning');
  process.exit(1);
}

const slug = arg.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
const dest = path.join(DRAFTS_DIR, slug + '.md');

if (fs.existsSync(dest)) {
  console.error(`Draft already exists: posts/drafts/${slug}.md`);
  process.exit(1);
}
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('Template not found: posts/templates/new-essay.md');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
template = template
  .replace(/^date:\s*$/m, `date: ${today}`)
  .replace(/^cover:\s*posts\/covers\/\.png$/m, `cover: posts/covers/${slug}.png`);

fs.writeFileSync(dest, template);
console.log(`✓ Created posts/drafts/${slug}.md`);
console.log(`  Open it in Obsidian, fill in title and excerpt, write your essay.`);
console.log(`  When done: node publish.js ${slug}`);
