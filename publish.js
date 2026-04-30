// publish.js — move a draft from posts/drafts/ to live posts, then regenerate manifest.json.
//
// Usage:  node publish.js <slug>
// Example: node publish.js the-terror-of-history
//
// Where <slug> is the filename of your draft (without .md).
// The slug also becomes the URL: /#post/<slug>

const fs = require('node:fs');
const path = require('node:path');

const POSTS_DIR = path.join(__dirname, 'posts');
const DRAFTS_DIR = path.join(POSTS_DIR, 'drafts');

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node publish.js <slug>');
  console.error('Example: node publish.js my-new-essay');
  console.error('\nDrafts available:');
  if (fs.existsSync(DRAFTS_DIR)) {
    const drafts = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
    if (drafts.length) drafts.forEach(d => console.error('  ' + d.replace(/\.md$/, '')));
    else console.error('  (none)');
  }
  process.exit(1);
}

const slug = arg.replace(/\.md$/, '');
const src = path.join(DRAFTS_DIR, slug + '.md');
const dest = path.join(POSTS_DIR, slug + '.md');

if (!fs.existsSync(src)) {
  console.error(`Draft not found: posts/drafts/${slug}.md`);
  process.exit(1);
}
if (fs.existsSync(dest)) {
  console.error(`A live post already exists: posts/${slug}.md`);
  console.error('Rename the slug or delete the existing post first.');
  process.exit(1);
}

fs.renameSync(src, dest);
console.log(`✓ Moved ${slug}.md from drafts/ to live posts`);

// Regenerate manifest
require('./build-posts.js');

console.log(`\nNext: commit and push to deploy.`);
