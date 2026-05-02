/* ============================================================
   ADHAM CHALABI COACHING — vanilla JS app
   Hash-based router · 7 pages · fade-up observer
   ============================================================ */

const PAGES = [
  { id: 'home',      label: 'Home',        darkNav: false },
  { id: 'about',     label: 'About',       darkNav: false },
  { id: 'services',  label: 'Work With Me', darkNav: false },
  { id: 'blog',      label: 'Writing',     darkNav: false },
  { id: 'resources', label: 'Resources',   darkNav: false },
  { id: 'results',   label: 'Results',     darkNav: false },
  { id: 'contact',   label: 'Contact',     darkNav: false },
];

/* ---------- shared markup ---------- */

const navMarkup = (active, dark) => `
  <header class="nav ${dark ? 'dark' : ''}" id="nav">
    <div class="nav-inner">
      <a href="#home" class="logo" data-nav="home">
        <span class="mark"></span>
        <span>Adham Chalabi</span>
      </a>
      <nav>
        <ul class="nav-links">
          ${PAGES.filter(p => p.id !== 'contact').map(p => {
            if (p.id === 'blog') {
              return `
                <li class="nav-has-dropdown">
                  <a href="#${p.id}" data-nav="${p.id}" class="${active === p.id || active === 'series' ? 'active' : ''}">${p.label} <span class="nav-caret">▾</span></a>
                  <div class="nav-dropdown" role="menu">
                    <a href="#blog" data-nav="blog" role="menuitem">All essays</a>
                    <a href="#series" data-nav="series" data-scroll="series-section-themed" role="menuitem">Series</a>
                    <a href="#series" data-nav="series" data-scroll="series-section-pathways" role="menuitem">Pathways</a>
                  </div>
                </li>`;
            }
            return `<li><a href="#${p.id}" data-nav="${p.id}" class="${active === p.id ? 'active' : ''}">${p.label}</a></li>`;
          }).join('')}
        </ul>
      </nav>
      <div class="nav-cta">
        <a href="#contact" data-nav="contact" class="btn gold sm">Book a call <span class="arrow">→</span></a>
      </div>
      <button class="nav-burger" id="nav-burger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <div class="mobile-menu-inner">
      <ul class="mobile-menu-links">
        ${PAGES.map(p => {
          const items = [`
            <li><a href="#${p.id}" data-nav="${p.id}" class="${active === p.id ? 'active' : ''}">
              <span class="mobile-menu-num">0${PAGES.indexOf(p) + 1}</span>
              <span>${p.label}</span>
            </a></li>
          `];
          if (p.id === 'blog') {
            items.push(`
              <li class="mobile-menu-sub"><a href="#series" data-nav="series" data-scroll="series-section-pathways">
                <span class="mobile-menu-num">→</span><span>Pathways</span>
              </a></li>
              <li class="mobile-menu-sub"><a href="#series" data-nav="series" data-scroll="series-section-themed">
                <span class="mobile-menu-num">→</span><span>Series</span>
              </a></li>
            `);
          }
          return items.join('');
        }).join('')}
      </ul>
      <div class="mobile-menu-cta">
        <a href="#contact" data-nav="contact" class="btn gold lg" style="width:100%;">Book a free call <span class="arrow">→</span></a>
        <div class="mobile-menu-foot">
          <span>Adham@Adham.coach</span>
          <div class="mobile-menu-socials">
            ${['IG','YT','LI','X'].map(s => `<a href="#" aria-label="${s}">${s}</a>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;

const footerMarkup = () => `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="#home" class="logo" data-nav="home">
            <span class="mark"></span><span>Adham Chalabi</span>
          </a>
          <p class="body" style="color: rgba(245,241,232,0.6); max-width: 320px; margin-top: 16px;">
            Helping people break through, find meaning, and transcend suffering. One brave conversation at a time.
          </p>
          <div style="display: flex; gap: 12px; margin-top: 24px;">
            ${['IG','YT','LI','X'].map(s => `
              <a href="#" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-family:var(--f-mono);font-size:11px;letter-spacing:0.08em;">${s}</a>
            `).join('')}
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <ul>
            <li><a href="#about" data-nav="about">About</a></li>
            <li><a href="#services" data-nav="services">Work With Me</a></li>
            <li><a href="#blog" data-nav="blog">Writing</a></li>
            <li><a href="#resources" data-nav="resources">Resources</a></li>
            <li><a href="#results" data-nav="results">Results</a></li>
          </ul>
        </div>
        <div>
          <h4>Free</h4>
          <ul>
            <li><a href="#resources" data-nav="resources">The Anxiety Reset</a></li>
            <li><a href="#resources" data-nav="resources">Stuckness Audit</a></li>
            <li><a href="#blog" data-nav="blog">Field Notes</a></li>
          </ul>
        </div>
        <div>
          <h4>Get in touch</h4>
          <ul>
            <li><a href="#contact" data-nav="contact">Book a call</a></li>
            <li><a href="mailto:Adham@Adham.coach">Adham@Adham.coach</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Adham Chalabi Coaching</span>
        <span>Built with intention</span>
      </div>
    </div>
  </footer>`;

const sectionHead = ({ eyebrow, title, lead, align = 'left', maxWidth = 720, light = false }) => `
  <div style="text-align:${align};margin-bottom:56px;max-width:${maxWidth}px;${align === 'center' ? 'margin-left:auto;margin-right:auto;' : ''}">
    ${eyebrow ? `<div class="eyebrow fade-up">${eyebrow}</div>` : ''}
    <h2 class="display h-lg fade-up" style="margin:16px 0;${light ? 'color:var(--ivory);' : ''}">${title}</h2>
    ${lead ? `<p class="lead fade-up" style="${align === 'center' ? 'margin-left:auto;margin-right:auto;' : ''}${light ? 'color:rgba(245,241,232,0.78);' : ''}">${lead}</p>` : ''}
  </div>`;

/* ---------- HOME ---------- */

const HomePage = () => {
  const proofItems = ['IFNLP Certified','NLP Master Trainer','RCC® Certified','Trauma Coaching','Time Line Therapy®','Clinical Hypnotherapy','Huna & Ancient Healing','Hundreds of lives changed','6+ years experience','★ 4.7 average'];
  const marqueeRow = proofItems.map(p => `<span class="proof-bar-item"><span class="dot"></span>${p}</span>`).join('');

  const tier = ({ num, name, sub, popular, features, price, length, ctaCls, ctaLabel, variant, delay }) => `
    <div class="tier-card ${variant} ${popular ? 'popular' : ''} fade-up" style="--delay:${delay};">
      ${popular ? '<div class="tier-popular">Most Popular</div>' : ''}
      <div class="tier-num">${num}</div>
      <h3 class="tier-name">${name}</h3>
      <div class="tier-sub">${sub}</div>
      <div class="tier-divider"></div>
      <ul class="tier-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="tier-divider"></div>
      <div class="tier-meta">
        <div>
          <div class="tier-meta-label">Investment</div>
          <div class="tier-price">${price}</div>
        </div>
        <div style="text-align:right;">
          <div class="tier-meta-label">Length</div>
          <div class="tier-length">${length}</div>
        </div>
      </div>
      <a href="#services" data-nav="services" class="btn ${ctaCls} tier-cta">${ctaLabel} <span class="arrow">→</span></a>
    </div>`;

  return `
  <div class="page-home">

    <section class="hey-hero">
      <div class="container">
        <div class="hey-hero-grid">
          <div class="hey-hero-photo-col fade-in">
            <div class="hey-hero-photo">
              <img class="hey-hero-blob-img" src="adham-blob.svg" alt="Adham Chalabi">
            </div>
          </div>

          <div class="hey-hero-text">
            <div class="eyebrow fade-up">No mantras. No bullshit.</div>
            <h1 class="display h-xxl fade-up" style="--delay:0.1s;">
              Hey,<br class="hey-desktop-break">I'm <span class="has-double-underline blue">Adham</span> <span class="hey-wave" aria-hidden="true">👋</span>
            </h1>
            <p class="lead fade-up" style="--delay:0.2s;">
              I work with people who've tried therapy, meditation, journaling, and discipline, but they're still stuck in the same spiral. What's missing isn't another tool. It's the truth you've been avoiding.
            </p>
            <p class="lead fade-up" style="--delay:0.3s;">
              I believe that true growth arises from <span class="has-wave hero-truth-wave">confronting discomfort and embracing <span class="hero-truth-word">truth</span></span>.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="subscribe-section">
      <div class="container">
        <div class="subscribe-card fade-up">
          <div class="subscribe-card-grid">
            <div class="subscribe-card-left">
              <h2 class="display h-md">Get the 5-Minute <span class="has-circle yellow">Anxiety</span> Reset</h2>
              <p class="subscribe-card-stats-line">Microbravery — a 5-minute practice that calms anxiety the moment it starts. Built on the technique therapists use. Free.</p>
              <div class="subscribe-stats">
                <div class="subscribe-avatars">
                  <span class="avatar-stack" style="background:var(--accent-coral);"></span>
                  <span class="avatar-stack" style="background:var(--accent-blue);"></span>
                  <span class="avatar-stack" style="background:var(--accent-mint);"></span>
                </div>
                <div>
                  <div class="stars-row">★★★★★</div>
                  <div class="micro" style="margin-top:2px;">Thousands of downloads</div>
                </div>
              </div>
            </div>
            <div class="subscribe-card-right">
              <p class="body">
                The exact technique I use with 1:1 clients when anxiety hits. 5 minutes, science-backed, designed for the moment the spiral starts — not after.
              </p>
              <form class="subscribe-form brevo-form" data-brevo-action="${BREVO_LEAD_MAGNET_ACTION}" data-success="On its way — check your inbox for the reset.">
                <input type="email" name="EMAIL" placeholder="Your email" required>
                <button class="btn gold" type="submit">Send it <span class="arrow">↓</span></button>
              </form>
              <p class="micro subscribe-note">
                No spam. Unsubscribe anytime — you'll get the reset instantly + occasional Field Notes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="proof-bar">
      <div class="marquee">${marqueeRow}${marqueeRow}</div>
    </div>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: 'Where we start',
          title: `You're not lazy. You're not broken. You're <span class="has-circle coral">hiding</span>.`,
          lead: `Most coaching tells you to push harder. The opposite is true. Stuckness is a signal. It's pointing at the thing you've been avoiding. That's where we start.`,
          maxWidth: 780,
        })}
        <div class="problem-grid">
          ${[
            ['01', "You've already tried the obvious.", "Therapy. Meditation. Journaling. Discipline. Each one helped for a while. None of them finished the job."],
            ['02', "You can name the pattern. You can't break it.", "You see it coming. You watch yourself walk into it. You promise this time will be different. It isn't."],
            ['03', "The right answer doesn't move you.", `You know what you "should" do. You can describe it in detail. You still haven't done it.`],
          ].map(([n, h, p], i) => `
            <div class="problem-card fade-up" style="--delay:${i * 0.1}s;">
              <div class="num">${n}</div>
              <h3 class="display h-sm" style="margin:16px 0 12px;">${h}</h3>
              <p class="body">${p}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section dark">
      <div class="container">
        <div class="guide-grid">
          <div class="fade-in guide-photo-wrap">
            <img src="adham-blob-blue.svg" alt="Adham Chalabi" class="guide-photo-img">
          </div>
          <div>
            <div class="eyebrow fade-up">Meet your guide</div>
            <h2 class="display h-xl fade-up" style="--delay:0.1s; margin:16px 0 24px;">I've been where you are.</h2>
            <p class="lead fade-up" style="--delay:0.2s;">
              Ten years ago I hit a wall I couldn't push through. No amount of discipline, productivity, or hustle moved it. What did move it was something quieter — naming what was actually true, finding the meaning underneath the suffering, and walking through the fire instead of around it.
            </p>
            <p class="lead fade-up" style="--delay:0.3s;">
              That walk became my work. Now I do it with others.
            </p>
            <div class="fade-up" style="--delay:0.4s; margin-top:32px;">
              <a href="#about" data-nav="about" class="btn ghost-light">Read my full story <span class="arrow">→</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: 'The plan',
          title: 'A simple path through the stuck.',
          lead: 'No 30-step framework. No miracle promise. Just three steps — taken on purpose, in the right order.',
          align: 'center',
          maxWidth: 680,
        })}
        <div class="plan-grid">
          ${[
            ['Book a free call', 'A 30-minute conversation. No pitch. We figure out if this is the right fit, together.'],
            ['Get your plan', 'A custom path — designed around your actual life, not a template. We move at your pace.'],
            ['Step into meaning', "Each week, one brave move. In a year, you won't recognize the person you used to be."],
          ].map(([h, p], i) => `
            <div class="plan-step fade-up" style="--delay:${i * 0.12}s;">
              <span class="step-num">0${i + 1}</span>
              <h3>${h}</h3>
              <p class="body">${p}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section cream">
      <div class="container">
        ${sectionHead({
          eyebrow: 'Three ways to work together',
          title: `Three doors. <span class="has-circle">Pick yours.</span>`,
          align: 'center',
          maxWidth: 680,
        })}
        <div class="tiers-grid">
          ${tier({
            num: '01', name: 'Foundation', sub: 'I want to start',
            features: ['Full self-paced course (8 modules)', '72-page workbook + reflection prompts', 'Audio companion for every lesson', 'Private community access'],
            price: '$', length: 'Self-paced', ctaCls: 'ghost', ctaLabel: 'Choose Foundation', variant: 'low', delay: '0s',
          })}
          ${tier({
            num: '02', name: 'Breakthrough', sub: "I'm ready for change", popular: true,
            features: ['Everything in Foundation', '12 weekly 60-min 1:1 sessions on Zoom', 'Direct WhatsApp access between sessions', 'Two 90-min deep-dive sessions'],
            price: '$$', length: '12 weeks', ctaCls: 'gold', ctaLabel: 'Choose Breakthrough', variant: 'mid', delay: '0.08s',
          })}
          ${tier({
            num: '03', name: 'Transformation', sub: "I'm all in",
            features: ['Everything in Breakthrough', '12 months of weekly 1:1 coaching', 'Quarterly in-person intensive day', '24/7 emergency line for hard moments'],
            price: '$$$$', length: '12 months', ctaCls: 'navy', ctaLabel: 'Choose Transformation', variant: 'high', delay: '0.16s',
          })}
        </div>
        <div style="text-align:center; margin-top:48px;">
          <a href="#services" data-nav="services" class="btn ghost fade-up">Compare all tiers in detail <span class="arrow">→</span></a>
        </div>
      </div>
    </section>

    <section class="section deep">
      <div class="container">
        ${sectionHead({
          eyebrow: "What's at stake",
          title: `The cost of staying. The reward of <span class="has-wave">moving</span>.`,
          align: 'center', light: true, maxWidth: 780,
        })}
        <div class="stakes-grid">
          <div class="stakes-col before fade-up">
            <h4>Without it</h4>
            <ul>
              <li>Another year of "almost"</li>
              <li>The slow ache of unused potential</li>
              <li>A loud life with a quiet self</li>
              <li>Surviving, not living</li>
            </ul>
          </div>
          <div class="stakes-arrow fade-in" style="--delay:0.3s;">→</div>
          <div class="stakes-col after fade-up" style="--delay:0.15s;">
            <h4>With it</h4>
            <ul>
              <li>A year you'll talk about</li>
              <li>Work that means something</li>
              <li>Relationships that go deep</li>
              <li>You — finally, fully, here</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Real change</span>
        <blockquote class="display h-lg italic fade-up" style="--delay:0.1s; margin:24px 0 32px; font-weight:400;">
          "Adham didn't fix me. He helped me become who I already was — and find the courage to live like it."
        </blockquote>
        <div class="fade-up" style="--delay:0.2s; display:flex; align-items:center; justify-content:center; gap:12px;">
          <span style="width:40px;height:40px;border-radius:50%;background:var(--ivory-2);border:1px solid var(--ink-line);"></span>
          <div style="text-align:left;">
            <div style="font-weight:600;font-size:14px;">M. — 34, founder</div>
            <div class="micro">Worked together · 12 weeks</div>
          </div>
        </div>
        <div style="margin-top:32px;">
          <a href="#results" data-nav="results" class="btn ghost">Read more stories <span class="arrow">→</span></a>
        </div>
      </div>
    </section>

    <section class="cta-banner">
      <div class="container narrow" style="position:relative; z-index:1;">
        <span class="eyebrow fade-up" style="color:var(--gold-light);">Start here</span>
        <h2 class="display h-xl fade-up" style="--delay:0.1s; color:var(--ivory); margin:16px 0 24px;">Ready to break through?</h2>
        <p class="lead fade-up" style="--delay:0.2s; color:rgba(245,241,232,0.78); margin:0 auto 32px;">
          Start with the free 7-day guide. It's the same opening I use with every 1:1 client. No fluff. No funnel. Just the first real step.
        </p>
        <div class="fade-up" style="--delay:0.3s;">
          <a href="#resources" data-nav="resources" class="btn gold lg">Download the 7-day guide <span class="arrow">↓</span></a>
        </div>
      </div>
    </section>

  </div>`;
};

/* ---------- ABOUT ---------- */

const AboutPage = () => `
  <div class="page-about">
    <section class="about-hero">
      <div class="container">
        <div class="about-hero-grid">
          <div>
            <span class="eyebrow fade-up">About</span>
            <h1 class="display h-xl fade-up" style="--delay:0.1s; margin:16px 0 24px;">
              Hi, I'm Adham.<br>I coach you <span class="has-wave blue">through</span> what<br>you've been <span class="has-circle coral">avoiding</span>.
            </h1>
            <p class="lead fade-up" style="--delay:0.2s;">
              Coach, writer, and lifelong student of what makes a life feel real. I work with people who feel stuck — not because they lack discipline, but because they've outgrown the story they were living.
            </p>
            <div class="fade-up" style="--delay:0.3s; margin-top:32px; display:flex; gap:12px; flex-wrap:wrap;">
              <a href="#services" data-nav="services" class="btn navy">Work with me <span class="arrow">→</span></a>
              <a href="#contact" data-nav="contact" class="btn ghost">Send a note</a>
            </div>
          </div>
          <div class="fade-in about-portrait-wrap" style="--delay:0.2s;">
            <img src="adham-blob.svg" alt="Adham Chalabi" class="about-portrait-img">
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container narrow">
        ${sectionHead({ eyebrow: 'My story', title: 'What I learned in the dark, I now teach in the light.', maxWidth: 720 })}
        <div class="body lg fade-up" style="display:flex; flex-direction:column; gap:20px; max-width:680px;">
          <p>I didn't come to this work from a textbook. I came to it from a wall I couldn't climb.</p>
          <p>For most of my twenties I did everything right — the career, the goals, the discipline. And underneath it I was suffocating. I had the life I'd asked for, and it didn't feel like mine.</p>
          <p>Hitting that wall taught me something I now believe with my whole chest: <em class="display italic" style="color:var(--gold)">most people don't lack discipline. They lack a reason worth disciplining for.</em></p>
          <p>The work I do now is the work I needed then. It's not therapy. It's not motivation. It's a structured walk through the questions you've been avoiding — until they stop being scary and start being doors.</p>
        </div>
      </div>
    </section>

    <section class="section cream">
      <div class="container narrow">
        ${sectionHead({ eyebrow: 'Timeline', title: 'The journey, in four moments.' })}
        <div class="timeline">
          ${[
            ['2018', 'Hit the wall', 'Burned out, lost, and quietly desperate. The year I stopped pretending.'],
            ['2020', 'Trained as a coach', 'Began formal training in NLP, Time Line Therapy®, and clinical hypnotherapy.'],
            ['2022', 'Deepened the work', 'Studied trauma coaching, Huna, and ancient healing systems — integrating East and West.'],
            ['2026', 'Hundreds of lives changed', 'A growing community of people doing the brave work — coached, trained, and transformed.'],
          ].map(([year, h, p], i) => `
            <div class="timeline-item fade-up" style="--delay:${i * 0.08}s;">
              <div class="timeline-year">${year}</div>
              <div>
                <h3>${h}</h3>
                <p class="body">${p}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({ eyebrow: 'Credentials', title: 'Trained, certified, and tested in real life.', align: 'center', maxWidth: 620 })}
        <div class="cred-grid">
          ${[
            ['IFNLP', 'Certified Coach', 'International Federation of NLP'],
            ['RCC®', 'Root Cause Coaching', 'Certified practitioner'],
            ['NLP', 'Master Trainer', 'Neuro-Linguistic Programming'],
            ['TLT®', 'Time Line Therapy®', 'Certified practitioner'],
            ['CH', 'Clinical Hypnotherapy', 'Certified practitioner'],
            ['TC', 'Trauma Coaching', 'Specialized training'],
            ['Huna', 'Ancient Healing', 'Hawaiian wisdom systems'],
            ['6+', 'Years coaching', 'Hundreds of lives changed'],
          ].map(([icon, h, sub], i) => `
            <div class="cred-card fade-up" style="--delay:${i * 0.06}s;">
              <div class="cred-icon">${icon}</div>
              <h4 class="display h-sm" style="margin:0 0 4px; font-size:18px;">${h}</h4>
              <div class="micro">${sub}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="cta-banner">
      <div class="container narrow" style="position:relative; z-index:1;">
        <span class="eyebrow fade-up" style="color:var(--gold-light);">Next step</span>
        <h2 class="display h-xl fade-up" style="--delay:0.1s; color:var(--ivory); margin:16px 0 32px;">Want to know if we'd work well together?</h2>
        <div class="fade-up" style="--delay:0.2s; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="#resources" data-nav="resources" class="btn gold lg">Get the free guide <span class="arrow">↓</span></a>
          <a href="#contact" data-nav="contact" class="btn ghost-light lg">Book a free call</a>
        </div>
      </div>
    </section>
  </div>`;

/* ---------- SERVICES ---------- */

const ServicesPage = () => {
  const tier = ({ num, name, sub, popular, features, price, length, variant, delay }) => `
    <div class="tier-card ${variant} ${popular ? 'popular' : ''} fade-up" style="--delay:${delay};">
      ${popular ? '<div class="tier-popular">Most Popular</div>' : ''}
      <div class="tier-num">${num}</div>
      <h3 class="tier-name">${name}</h3>
      <div class="tier-sub">${sub}</div>
      <div class="tier-divider"></div>
      <ul class="tier-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="tier-divider"></div>
      <div class="tier-meta">
        <div>
          <div class="tier-meta-label">Investment</div>
          <div class="tier-price">${price}</div>
        </div>
        <div style="text-align:right;">
          <div class="tier-meta-label">Length</div>
          <div class="tier-length">${length}</div>
        </div>
      </div>
      <a href="#contact" data-nav="contact" class="btn ${variant === 'mid' ? 'gold' : (variant === 'high' ? 'navy' : 'ghost')} tier-cta">
        Choose ${name} <span class="arrow">→</span>
      </a>
    </div>`;

  const faq = (q, a) => `
    <div class="faq-item" data-faq>
      <div class="faq-q"><span>${q}</span><span class="faq-toggle">+</span></div>
      <div class="faq-a"><p class="body" style="padding-right:40px; max-width:720px;">${a}</p></div>
    </div>`;

  return `
  <div class="page-services">
    <section class="hero" style="padding-bottom:64px;">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Ways to work together</span>
        <h1 class="display h-xxl fade-up" style="--delay:0.1s; margin:16px 0 24px;">
          Three doors.<br><span class="has-circle">Pick yours.</span>
        </h1>
        <p class="lead fade-up" style="--delay:0.2s; margin:0 auto;">
          Same destination — different intensities. Whether you want a structured starting point, a guided breakthrough, or a year of full-on transformation, there's a tier for where you are right now.
        </p>
      </div>
    </section>

    <section class="section tight">
      <div class="container">
        <div class="tiers-grid">
          ${tier({
            num: '01', name: 'Foundation', sub: 'I want to start', variant: 'low', delay: '0s',
            price: '$', length: 'Self-paced',
            features: ['Full self-paced course (8 modules)', '72-page workbook with reflection prompts', 'Audio companion for every lesson', 'Private community access', 'Lifetime access to all updates'],
          })}
          ${tier({
            num: '02', name: 'Breakthrough', sub: "I'm ready for change", popular: true, variant: 'mid', delay: '0.08s',
            price: '$$', length: '12 weeks',
            features: ['Everything in Foundation', '12 weekly 60-min 1:1 sessions on Zoom', 'Direct WhatsApp access between sessions', 'Custom map built for your actual life', 'Two 90-min deep-dive sessions'],
          })}
          ${tier({
            num: '03', name: 'Transformation', sub: "I'm all in", variant: 'high', delay: '0.16s',
            price: '$$$$', length: '12 months',
            features: ['Everything in Breakthrough', '12 months of weekly 1:1 coaching', 'Quarterly in-person intensive day', '24/7 emergency line for hard moments', 'Personalized library of practices & tools'],
          })}
        </div>

        <div class="tier-promise fade-up" style="--delay:0.24s;">
          <div class="tier-promise-label">
            <span class="dot"></span> What's the same in every tier
          </div>
          <div class="tier-promise-grid">
            <div class="tier-promise-item">Real human, every step</div>
            <div class="tier-promise-item">Honest feedback</div>
            <div class="tier-promise-item">Lifetime access</div>
            <div class="tier-promise-item">30-day guarantee</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section cream">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Not sure which is right?</span>
        <h2 class="display h-md fade-up" style="--delay:0.1s; margin:16px 0 24px;">Take the 2-minute quiz.</h2>
        <p class="body fade-up" style="--delay:0.2s; max-width:520px; margin:0 auto 24px;">
          A few questions about where you are, what you've tried, and what you're ready for. I'll tell you which door to start with.
        </p>
        <a href="#" class="btn ghost fade-up" style="--delay:0.3s;">Start the quiz <span class="arrow">→</span></a>
      </div>
    </section>

    <section class="section">
      <div class="container narrow">
        ${sectionHead({ eyebrow: 'FAQ', title: 'Common questions, real answers.' })}
        <div>
          ${faq('How long is a coaching engagement?', 'Foundation is self-paced with lifetime access — most finish the core in 8–10 weeks. Breakthrough is 12 weeks of weekly 1:1. Transformation is a 12-month commitment with quarterly in-person intensives.')}
          ${faq("What's the time commitment?", 'For 1:1 tiers: a 60-minute session weekly, plus ~30 minutes of reflection between calls. For Foundation: ~1 hour per module, at whatever pace works for your life.')}
          ${faq('Do you offer refunds?', 'Every tier has a 30-day no-questions-asked refund. For Breakthrough and Transformation, the first session is also a fit-check — if we both don\'t think it\'s right, you don\'t pay.')}
          ${faq('Can I move up a tier later?', 'Yes — anything you\'ve already paid for Foundation or Breakthrough credits toward the next tier. People often start at Foundation and graduate up when they\'re ready for more.')}
          ${faq('Is this therapy?', 'No. Coaching is forward-looking — it\'s about where you\'re going. If you\'re working through trauma or clinical issues, I\'ll refer you to a great therapist before we start coaching.')}
        </div>
      </div>
    </section>

    <section class="cta-banner">
      <div class="container narrow" style="position:relative; z-index:1;">
        <h2 class="display h-xl fade-up" style="color:var(--ivory); margin:0 0 32px;">Still on the fence? Just talk to me.</h2>
        <a href="#contact" data-nav="contact" class="btn gold lg fade-up" style="--delay:0.1s;">Book a free 30-min call <span class="arrow">→</span></a>
      </div>
    </section>
  </div>`;
};

/* ---------- BLOG ---------- */

let postsCache = null;
let activeFilter = 'All';
let activeSeriesFilter = null;

async function loadPosts() {
  if (postsCache) return postsCache;
  const r = await fetch('posts/manifest.json', { cache: 'no-store' });
  postsCache = await r.json();
  return postsCache;
}

let seriesCache = null;
async function loadSeries() {
  if (seriesCache) return seriesCache;
  try {
    const r = await fetch('posts/series.json', { cache: 'no-store' });
    if (!r.ok) { seriesCache = {}; return seriesCache; }
    seriesCache = await r.json();
  } catch (e) {
    seriesCache = {};
  }
  return seriesCache;
}

const formatDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}`;
};

const BlogPage = () => `
  <div class="page-blog">
    <section class="hero" style="padding-bottom:16px;">
      <div class="container">
        <span class="eyebrow fade-up">Field Notes</span>
        <h1 class="display h-xl fade-up" style="--delay:0.1s; margin:16px 0;">
          Writing on meaning,<br>suffering, and<br><span class="has-wave coral">the way through.</span>
        </h1>
        <p class="lead fade-up" style="--delay:0.2s;">
          Short notes, essays, and occasional letters. New piece every other week.
        </p>
      </div>
    </section>

    <section class="section tight" id="blog-series-header" style="display:none;">
      <div class="container">
        <a href="#blog" data-nav="blog" class="micro" style="display:inline-flex; align-items:center; gap:6px; color:var(--fg-3); text-decoration:none; margin-bottom:12px;">
          <span style="display:inline-block; transform:rotate(180deg);">→</span> All writing
        </a>
        <div id="blog-series-ribbon-wrap"></div>
        <span class="eyebrow" id="blog-series-eyebrow" style="display:block; margin-bottom:8px;">Series</span>
        <h2 class="display h-md" id="blog-series-name" style="margin:0 0 8px;"></h2>
        <div id="blog-series-subtitle" style="display:none;"></div>
        <div id="blog-series-description" style="display:none;"></div>
        <div id="blog-series-intro" style="display:none;"></div>
        <p class="micro" id="blog-series-count" style="color:var(--fg-3); margin-top:16px;"></p>
      </div>
    </section>

    <section class="section tight" id="blog-featured-section">
      <div class="container">
        <div class="featured-post fade-up" id="blog-featured">
          <div class="img-slot" id="blog-featured-cover"><span class="label">Featured cover</span></div>
          <div>
            <span class="eyebrow" id="blog-featured-meta">Featured · Essay</span>
            <h2 class="display" id="blog-featured-title">Loading…</h2>
            <p class="lead" id="blog-featured-excerpt"></p>
            <a href="#" class="btn ghost" id="blog-featured-link" style="margin-top:16px;">Read essay <span class="arrow">→</span></a>
          </div>
        </div>
      </div>
    </section>

    <section class="section tight" id="blog-recent-section">
      <div class="container">
        <div class="blog-recent-header">
          <div>
            <span class="eyebrow fade-up">Recent writing</span>
            <h2 class="display h-md fade-up" style="--delay:0.05s; margin:8px 0 0;">Latest from the field.</h2>
            <p class="fade-up" style="--delay:0.1s; margin:8px 0 0;">
              <a href="#series" data-nav="series" class="micro" style="color:var(--fg-2); text-decoration:underline; text-underline-offset:3px;">Browse reading paths →</a>
            </p>
          </div>
          <div class="fade-up" style="--delay:0.1s;">
            <div class="res-filters" id="blog-filters">
              ${['All','Meaning','Stuckness','Practice','Self'].map(t => `
                <button class="res-filter ${t === activeFilter ? 'active' : ''}" data-filter="${t}">${t}</button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="posts-grid" id="blog-grid" style="margin-top:32px;">
          <p class="micro">Loading posts…</p>
        </div>
        <p class="body fade-up" id="blog-empty" style="text-align:center; margin-top:32px; display:none;">
          No posts in this category yet.
        </p>
      </div>
    </section>

    <section class="section cream">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Subscribe</span>
        <h2 class="display h-lg fade-up" style="--delay:0.1s; margin:16px 0;">New essays, in your inbox.</h2>
        <p class="body fade-up" style="--delay:0.2s; max-width:520px; margin:0 auto 32px;">
          One letter every other week. Honest writing on the work of becoming yourself. No spam, ever.
        </p>
        ${newsletterFormMarkup('blog-news')}
      </div>
    </section>
  </div>`;

function renderBlog(root) {
  Promise.all([loadPosts(), loadSeries()]).then(([posts, seriesMeta]) => {
    const featuredSection = root.querySelector('#blog-featured-section');
    const seriesHeader = root.querySelector('#blog-series-header');
    const inSeriesMode = !!activeSeriesFilter;
    const meta = inSeriesMode ? (seriesMeta[activeSeriesFilter] || {}) : {};
    const isPathway = isPathwaySeries(meta);

    const recentHeader = root.querySelector('.blog-recent-header');
    if (recentHeader) recentHeader.style.display = inSeriesMode ? 'none' : '';
    const blogPage = root.querySelector('.page-blog');
    if (blogPage) blogPage.classList.toggle('in-series-mode', inSeriesMode);

    if (inSeriesMode) {
      if (featuredSection) featuredSection.style.display = 'none';
      if (seriesHeader) {
        seriesHeader.style.display = '';
        const nameEl = root.querySelector('#blog-series-name');
        const countEl = root.querySelector('#blog-series-count');
        const eyebrowEl = root.querySelector('#blog-series-eyebrow');
        const ribbonWrap = root.querySelector('#blog-series-ribbon-wrap');
        const subtitleEl = root.querySelector('#blog-series-subtitle');
        const descEl = root.querySelector('#blog-series-description');
        const introEl = root.querySelector('#blog-series-intro');

        const inSeries = posts.filter(p => p.series === activeSeriesFilter);
        if (nameEl) nameEl.textContent = activeSeriesFilter;
        if (countEl) countEl.textContent = `${inSeries.length} ${inSeries.length === 1 ? 'essay' : 'essays'}`;

        if (isPathway) {
          const ribbonText = meta.is_welcome ? 'Start here' : `For ${meta.pathway_for}`;
          if (ribbonWrap) ribbonWrap.innerHTML = `<span class="pathway-eyebrow">${ribbonText}</span>`;
          if (eyebrowEl) eyebrowEl.style.display = 'none';
          if (subtitleEl) {
            if (meta.subtitle) {
              subtitleEl.innerHTML = `<p class="pathway-subtitle">${meta.subtitle}</p>`;
              subtitleEl.style.display = '';
            } else { subtitleEl.style.display = 'none'; }
          }
          if (descEl) {
            if (meta.description) {
              descEl.innerHTML = `<p class="body" style="max-width:60ch; margin:8px 0 0;">${meta.description}</p>`;
              descEl.style.display = '';
            } else { descEl.style.display = 'none'; }
          }
          if (introEl) {
            const intro = meta.pathway_intro || 'Read these in order. Take your time.';
            introEl.innerHTML = `<p class="pathway-intro">${intro}</p>`;
            introEl.style.display = '';
          }
        } else {
          if (ribbonWrap) ribbonWrap.innerHTML = '';
          if (eyebrowEl) { eyebrowEl.style.display = ''; eyebrowEl.textContent = 'Series'; }
          if (subtitleEl) subtitleEl.style.display = 'none';
          if (descEl) {
            if (meta.description) {
              descEl.innerHTML = `<p class="body" style="max-width:60ch; margin:8px 0 0;">${meta.description}</p>`;
              descEl.style.display = '';
            } else { descEl.style.display = 'none'; }
          }
          if (introEl) introEl.style.display = 'none';
        }
        seriesHeader.classList.toggle('is-pathway', isPathway);
      }
    } else {
      if (seriesHeader) seriesHeader.style.display = 'none';
      if (featuredSection) featuredSection.style.display = '';
      const featured = posts.find(p => p.featured) || posts[0];
      const featuredEl = root.querySelector('#blog-featured-link');
      if (featuredEl) {
        featuredEl.dataset.nav = `post/${featured.slug}`;
        featuredEl.href = `#post/${featured.slug}`;
      }
      const ft = root.querySelector('#blog-featured-title');
      const fe = root.querySelector('#blog-featured-excerpt');
      const fm = root.querySelector('#blog-featured-meta');
      if (ft) ft.textContent = featured.title;
      if (fe) fe.textContent = featured.excerpt;
      if (fm) fm.textContent = `Featured · ${featured.kind || 'Essay'} · ${featured.minutes} min`;
      const fc = root.querySelector('#blog-featured-cover');
      if (fc && featured.cover) {
        fc.classList.add('has-photo');
        fc.innerHTML = `<img src="${featured.cover}" alt="${featured.title}">`;
      }
    }

    const grid = root.querySelector('#blog-grid');
    const empty = root.querySelector('#blog-empty');
    let filtered = posts
      .filter(p => inSeriesMode ? p.series === activeSeriesFilter : !p.featured)
      .filter(p => activeFilter === 'All' || p.category === activeFilter);

    // Sort by series_order when in a pathway; otherwise default order
    if (inSeriesMode && isPathway) {
      filtered = [...filtered].sort((a, b) => (a.series_order || 99) - (b.series_order || 99));
      grid.classList.add('pathway-steps');
    } else {
      grid.classList.remove('pathway-steps');
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = filtered.map((p, i) => {
        const stepBadge = (inSeriesMode && isPathway)
          ? `<span class="pathway-step-badge">Step ${p.series_order || i + 1}</span>`
          : '';
        return `
        <a class="post-card fade-up" data-nav="post/${p.slug}" href="#post/${p.slug}" style="--delay:${i * 0.06}s; text-decoration:none; color:inherit; display:flex; flex-direction:column; gap:var(--s-3);">
          <div class="img-slot${p.cover ? ' has-photo' : ''}">${p.cover ? `<img src="${p.cover}" alt="${p.title}">` : `<span class="label">${p.title}</span>`}${stepBadge}</div>
          <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
            <span class="pill outline-gold" style="padding:3px 10px; font-size:10px;">${p.category}</span>
            <span class="micro">${p.minutes} min · ${formatDate(p.date)}</span>
          </div>
          <h3>${p.title}</h3>
        </a>
      `;
      }).join('');
    }

    initFadeUp();
    consumePendingScroll();
  }).catch(e => {
    const grid = root.querySelector('#blog-grid');
    if (grid) grid.innerHTML = `<p class="body">Couldn't load posts: ${e.message}</p>`;
  });

  root.querySelectorAll('#blog-filters [data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      if (activeSeriesFilter) {
        activeSeriesFilter = null;
        if (location.hash.startsWith('#blog/series/')) {
          history.replaceState(null, '', '#blog');
        }
      }
      root.querySelectorAll('#blog-filters [data-filter]').forEach(b => b.classList.toggle('active', b === btn));
      renderBlog(root);
    });
  });
}

/* ---------- SERIES INDEX ---------- */

const SeriesPage = () => `
  <div class="page-series">
    <section class="hero" style="padding-top:clamp(120px,16vh,160px); padding-bottom:16px;">
      <div class="container">
        <span class="eyebrow fade-up">Reading paths</span>
        <h1 class="display h-xl fade-up" style="--delay:0.1s; margin:16px 0 12px;">
          Read with intent.
        </h1>
        <p class="lead fade-up" style="--delay:0.2s; max-width:60ch;">
          Most essays here float independently. These are sequenced. Paths I've walked clients down. Take them in order, sit with each.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="series-grid" id="series-grid">
          <p class="micro">Loading paths…</p>
        </div>
      </div>
    </section>
  </div>`;

function isPathwaySeries(meta) {
  return !!(meta && (meta.is_welcome || meta.pathway_for));
}

function seriesCardMarkup(name, meta, inSeries, i) {
  const cover = inSeries.find(p => p.cover)?.cover;
  const count = inSeries.length;
  const navTarget = `blog/series/${encodeURIComponent(name)}`;
  let ribbon = '';
  if (meta.is_welcome) {
    ribbon = '<span class="series-ribbon">Start here</span>';
  } else if (meta.pathway_for) {
    ribbon = `<span class="series-ribbon pathway">For ${meta.pathway_for}</span>`;
  }
  return `
    <a class="series-card fade-up" data-nav="${navTarget}" href="#${navTarget}" style="--delay:${i * 0.06}s;">
      <div class="series-card-cover${cover ? ' has-photo' : ''}">${cover ? `<img src="${cover}" alt="${name}">` : ''}${ribbon}</div>
      <div class="series-card-body">
        ${meta.subtitle ? `<span class="eyebrow">${meta.subtitle}</span>` : ''}
        <h3 class="display h-sm" style="margin:8px 0 12px;">${name}</h3>
        ${meta.description ? `<p class="body">${meta.description}</p>` : ''}
        <p class="micro" style="margin-top:16px;">${count} ${count === 1 ? 'essay' : 'essays'}</p>
      </div>
    </a>
  `;
}

function renderSeries(root) {
  Promise.all([loadPosts(), loadSeries()]).then(([posts, seriesMeta]) => {
    const grid = root.querySelector('#series-grid');
    if (!grid) return;

    const seriesNames = new Set(posts.map(p => p.series).filter(Boolean));
    Object.keys(seriesMeta).forEach(name => seriesNames.add(name));
    const names = [...seriesNames];

    if (names.length === 0) {
      grid.innerHTML = `<p class="body">No series yet. Set <code>series: Some Name</code> on a post's frontmatter to start one.</p>`;
      return;
    }

    const pathways = [];
    const plain = [];
    for (const name of names) {
      const meta = seriesMeta[name] || {};
      const inSeries = posts.filter(p => p.series === name)
        .sort((a, b) => (a.series_order || 99) - (b.series_order || 99));
      (isPathwaySeries(meta) ? pathways : plain).push({ name, meta, inSeries });
    }

    const sections = [];
    if (pathways.length) {
      sections.push(`
        <div class="series-section" id="series-section-pathways">
          <div class="series-section-header">
            <span class="eyebrow">Guided paths</span>
            <h2 class="display h-md" style="margin:8px 0 8px;">Walk these in order.</h2>
            <p class="body" style="color:var(--fg-3); max-width:60ch; margin:0;">Sequenced pathways. Read deliberately. Take a beat between each.</p>
          </div>
          <div class="series-grid">
            ${pathways.map((r, i) => seriesCardMarkup(r.name, r.meta, r.inSeries, i)).join('')}
          </div>
        </div>
      `);
    }
    if (plain.length) {
      sections.push(`
        <div class="series-section" id="series-section-themed" style="margin-top:64px;">
          <div class="series-section-header">
            <span class="eyebrow">Series</span>
            <h2 class="display h-md" style="margin:8px 0 8px;">Themed groups.</h2>
            <p class="body" style="color:var(--fg-3); max-width:60ch; margin:0;">Essays grouped by theme. Browse in any order.</p>
          </div>
          <div class="series-grid">
            ${plain.map((s, i) => seriesCardMarkup(s.name, s.meta, s.inSeries, i)).join('')}
          </div>
        </div>
      `);
    }

    // Replace single grid with split sections
    grid.outerHTML = sections.join('');
    initFadeUp();
    consumePendingScroll();
  }).catch(e => {
    const grid = root.querySelector('#series-grid');
    if (grid) grid.innerHTML = `<p class="body">Couldn't load series: ${e.message}</p>`;
  });
}

/* ---------- POST READER ---------- */

const PostPage = () => `
  <div class="page-post">
    <div class="post-progress" id="post-progress" aria-hidden="true"><div class="post-progress-fill" id="post-progress-fill"></div></div>
    <section class="hero" style="padding-top:clamp(120px,16vh,160px); padding-bottom:24px;">
      <div class="container narrow">
        <a href="#blog" data-nav="blog" class="micro" style="display:inline-flex; align-items:center; gap:6px; color:var(--fg-3); text-decoration:none; margin-bottom:24px;" id="post-back">
          <span style="display:inline-block; transform:rotate(180deg);">→</span> Back to writing
        </a>
        <div class="eyebrow" id="post-meta-eyebrow" style="margin-bottom:16px;"></div>
        <div class="post-series" id="post-series" style="display:none;"></div>
        <h1 class="display h-xl" id="post-title" style="margin:0 0 12px;">Loading…</h1>
        <p class="post-subtitle" id="post-subtitle" style="display:none;"></p>
        <div class="post-byline" id="post-byline" style="display:none; margin-top:20px;">
          <img src="adham-blob.svg" alt="Adham Chalabi" class="post-byline-avatar">
          <span class="post-byline-text">by <strong>Adham Chalabi</strong></span>
          <span class="post-byline-sep">·</span>
          <span class="post-byline-text" id="post-byline-date"></span>
          <span class="post-byline-sep">·</span>
          <span class="post-byline-text" id="post-byline-time"></span>
        </div>
      </div>
    </section>

    <section class="post-cover-section" id="post-cover-section" style="display:none;">
      <div class="container narrow">
        <img id="post-cover-img" class="post-cover-img" alt="">
      </div>
    </section>

    <article class="section tight" style="padding-top:32px;">
      <div class="container narrow">
        <div class="post-body" id="post-body">
          <p class="body">Loading…</p>
        </div>

        <div class="post-share" id="post-share">
          <span class="micro post-share-label">Share this</span>
          <a href="#" target="_blank" rel="noopener noreferrer" class="post-share-btn" id="post-share-x" aria-label="Share on X">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" class="post-share-btn" id="post-share-linkedin" aria-label="Share on LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <button class="post-share-btn" id="post-share-copy" aria-label="Copy link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span class="post-share-copy-label" id="post-share-copy-label">Copy link</span>
          </button>
          <a href="#" class="post-share-btn" id="post-share-email" aria-label="Email this essay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>Email</span>
          </a>
        </div>

        <aside class="author-bio" id="author-bio">
          <div class="author-bio-photo-wrap"><img src="adham-blob-blue.svg" alt="Adham Chalabi" class="author-bio-photo"></div>
          <div class="author-bio-content">
            <span class="eyebrow">About the author</span>
            <h3 class="display h-sm" style="margin:8px 0 12px;">Adham Chalabi</h3>
            <p class="body">Coach and writer. I help people work through what they've been avoiding: the truth underneath the spiral, the meaning underneath the suffering. Field Notes goes out every other week.</p>
            <div class="author-bio-ctas">
              <a href="#contact" data-nav="contact" class="btn navy sm">Book a call <span class="arrow">→</span></a>
              <a href="#about" data-nav="about" class="btn ghost sm">Read my full story</a>
            </div>
          </div>
        </aside>
      </div>
    </article>

    <section class="section" id="post-related-section" style="display:none;">
      <div class="container">
        <span class="eyebrow fade-up">Read next</span>
        <h2 class="display h-md fade-up" style="--delay:0.1s; margin:8px 0 32px;">More from the field.</h2>
        <div class="posts-grid" id="post-related-grid"></div>
      </div>
    </section>

    <section class="section cream">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Subscribe</span>
        <h2 class="display h-lg fade-up" style="--delay:0.1s; margin:16px 0;">Get new essays in your inbox.</h2>
        <p class="body fade-up" style="--delay:0.2s; max-width:520px; margin:0 auto 32px;">
          One letter every other week. No spam, ever.
        </p>
        ${newsletterFormMarkup('post-news')}
      </div>
    </section>
  </div>`;

function updateMeta({ title, description, image, type, url }) {
  if (title) document.title = title;
  const setAttr = (sel, attr, val) => {
    const el = document.querySelector(sel);
    if (el && val != null) el.setAttribute(attr, val);
  };
  setAttr('meta[name="description"]', 'content', description);
  setAttr('meta[property="og:title"]', 'content', title);
  setAttr('meta[property="og:description"]', 'content', description);
  setAttr('meta[property="og:image"]', 'content', image);
  setAttr('meta[property="og:type"]', 'content', type);
  setAttr('meta[name="twitter:title"]', 'content', title);
  setAttr('meta[name="twitter:description"]', 'content', description);
  setAttr('meta[name="twitter:image"]', 'content', image);
  let urlEl = document.querySelector('meta[property="og:url"]');
  if (!urlEl) {
    urlEl = document.createElement('meta');
    urlEl.setAttribute('property', 'og:url');
    document.head.appendChild(urlEl);
  }
  urlEl.setAttribute('content', url || window.location.href);
}

const SITE_DEFAULT_META = {
  title: 'Adham Chalabi Coaching · Break through. Find meaning.',
  description: 'Life coaching with Adham Chalabi. Helping people break through, find meaning, and transcend suffering.',
  image: new URL('adham-clean.jpg', location.href).href,
  type: 'website',
  url: location.origin + location.pathname,
};

function resetSiteMeta() {
  updateMeta(SITE_DEFAULT_META);
  const old = document.getElementById('post-schema');
  if (old) old.remove();
}

function injectArticleSchema(post, absUrl, absImage) {
  const existing = document.getElementById('post-schema');
  if (existing) existing.remove();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Person', name: 'Adham Chalabi' },
    publisher: {
      '@type': 'Organization',
      name: 'Adham Chalabi Coaching',
      logo: { '@type': 'ImageObject', url: new URL('adham-blob-blue.svg', location.href).href }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl }
  };
  if (absImage) data.image = absImage;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'post-schema';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function setupPostProgress(root) {
  const fill = root.querySelector('#post-progress-fill');
  const article = root.querySelector('#post-body');
  if (!fill || !article) return;
  const update = () => {
    const rect = article.getBoundingClientRect();
    const start = window.scrollY + rect.top - window.innerHeight * 0.4;
    const end = window.scrollY + rect.top + article.offsetHeight - window.innerHeight * 0.4;
    const span = Math.max(1, end - start);
    const progress = Math.max(0, Math.min(1, (window.scrollY - start) / span));
    fill.style.transform = `scaleX(${progress})`;
  };
  if (window.__postProgressUpdate) {
    window.removeEventListener('scroll', window.__postProgressUpdate);
  }
  window.__postProgressUpdate = update;
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function formatLongDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function appendPathwayNav(bodyEl, post, posts, sMeta) {
  const inSeries = posts.filter(p => p.series === post.series)
    .sort((a, b) => (a.series_order || 99) - (b.series_order || 99));
  const idx = inSeries.findIndex(p => p.slug === post.slug);
  if (idx < 0) return;
  const total = inSeries.length;
  const prev = idx > 0 ? inSeries[idx - 1] : null;
  const next = idx < total - 1 ? inSeries[idx + 1] : null;
  const isLast = idx === total - 1;

  const nav = document.createElement('div');
  nav.className = 'pathway-nav';
  if (isLast) {
    nav.innerHTML = `
      <p class="pathway-closer">You walked the path. Sit with what surfaced.</p>
      <a href="#blog/series/${encodeURIComponent(post.series)}" data-nav="blog/series/${encodeURIComponent(post.series)}" class="btn ghost sm">Back to ${post.series}</a>
    `;
  } else {
    const prevHTML = prev ? `<a href="#post/${prev.slug}" data-nav="post/${prev.slug}" class="pathway-nav-prev"><span class="micro">← Step ${prev.series_order || idx}</span><span>${prev.title}</span></a>` : '<span></span>';
    const nextHTML = next ? `<a href="#post/${next.slug}" data-nav="post/${next.slug}" class="pathway-nav-next"><span class="micro">Step ${next.series_order || idx + 2} →</span><span>${next.title}</span></a>` : '<span></span>';
    nav.innerHTML = prevHTML + nextHTML;
  }
  bodyEl.appendChild(nav);
}

function applyGate(bodyEl, post) {
  const gateAfter = post.gate_after_paragraph || 3;
  const allChildren = [...bodyEl.children];
  let pCount = 0;
  let gateIndex = -1;
  for (let i = 0; i < allChildren.length; i++) {
    const el = allChildren[i];
    if (el.tagName === 'P' && !el.classList.contains('post-signoff')) {
      pCount++;
      if (pCount === gateAfter) { gateIndex = i; break; }
    }
  }
  if (gateIndex < 0) return;

  for (let i = gateIndex + 1; i < allChildren.length; i++) {
    allChildren[i].classList.add('gated-hidden');
  }

  const gate = document.createElement('div');
  gate.className = 'post-gate';
  gate.innerHTML = `
    <span class="eyebrow">For subscribers</span>
    <h3 class="display h-sm" style="margin:8px 0 12px;">Read the rest of this essay.</h3>
    <p class="body">Drop your email. I'll send you the full essay, plus future Field Notes every other week.</p>
    <form class="post-gate-form" id="post-gate-form">
      <input type="email" name="email" placeholder="your@email.com" required>
      <button type="submit" class="btn navy">Unlock essay <span class="arrow">→</span></button>
    </form>
    <p class="micro post-gate-promise">No spam. Unsubscribe anytime.</p>
  `;
  allChildren[gateIndex].after(gate);

  const form = gate.querySelector('#post-gate-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await submitEmailToBrevo(email, BREVO_NEWSLETTER_ACTION);
      localStorage.setItem('field-notes-subscriber', 'true');
      bodyEl.querySelectorAll('.gated-hidden').forEach(el => el.classList.remove('gated-hidden'));
      gate.innerHTML = `<p class="body" style="margin:0; text-align:center; color:var(--fg-2);">✓ You're in. Welcome to Field Notes.</p>`;
      setTimeout(() => gate.remove(), 2400);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = 'Unlock essay <span class="arrow">→</span>';
      const msg = document.createElement('p');
      msg.className = 'micro';
      msg.style.color = 'var(--accent-coral)';
      msg.textContent = 'Something went wrong. Try again?';
      gate.appendChild(msg);
    }
  });
}

function buildTOC(bodyEl) {
  const h2s = bodyEl.querySelectorAll('h2');
  if (h2s.length < 2) return;
  const items = [...h2s].map((h, i) => {
    if (!h.id) {
      const slug = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      h.id = slug || `s-${i}`;
    }
    return `<li><a href="#${h.id}">${h.textContent}</a></li>`;
  });
  const toc = document.createElement('aside');
  toc.className = 'post-toc';
  toc.innerHTML = `<div class="post-toc-label">Contents</div><ol>${items.join('')}</ol>`;
  bodyEl.insertBefore(toc, bodyEl.firstChild);
}

function setupQuoteShare(root) {
  const old = document.getElementById('quote-share-pill');
  if (old) old.remove();
  const pill = document.createElement('div');
  pill.id = 'quote-share-pill';
  pill.className = 'quote-share-pill';
  pill.innerHTML = `
    <a class="quote-share-btn" target="_blank" rel="noopener noreferrer" aria-label="Share on X">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      <span>Share quote</span>
    </a>
    <button class="quote-share-btn quote-share-copy" aria-label="Copy quote">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      <span class="quote-share-copy-label">Copy</span>
    </button>
  `;
  document.body.appendChild(pill);

  const shareLink = pill.querySelector('.quote-share-btn');
  const copyBtn = pill.querySelector('.quote-share-copy');
  const copyLabel = pill.querySelector('.quote-share-copy-label');
  let currentText = '';

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`"${currentText}"\n\n${window.location.href}`);
      copyLabel.textContent = 'Copied';
      setTimeout(() => { copyLabel.textContent = 'Copy'; }, 1500);
    } catch (e) {}
  });

  const update = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() || '';
    const bodyEl = root.querySelector('#post-body');
    if (!text || text.length < 20 || !sel.anchorNode || !bodyEl?.contains(sel.anchorNode)) {
      pill.classList.remove('show');
      return;
    }
    currentText = text;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    pill.style.top = (window.scrollY + rect.top - 52) + 'px';
    pill.style.left = (rect.left + rect.width / 2) + 'px';
    pill.classList.add('show');
    shareLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent('"' + text + '"')}&url=${encodeURIComponent(window.location.href)}`;
  };

  document.addEventListener('mouseup', () => setTimeout(update, 10));
  document.addEventListener('selectionchange', () => {
    if (!window.getSelection()?.toString().trim()) pill.classList.remove('show');
  });
}

function renderPost(root, slug) {
  const titleEl = root.querySelector('#post-title');
  const bodyEl = root.querySelector('#post-body');
  const eyebrowEl = root.querySelector('#post-meta-eyebrow');
  const seriesEl = root.querySelector('#post-series');
  const subtitleEl = root.querySelector('#post-subtitle');

  Promise.all([loadPosts(), loadSeries()]).then(([posts, seriesMeta]) => {
    const post = posts.find(p => p.slug === slug);
    if (!post) {
      titleEl.textContent = 'Essay not found';
      bodyEl.innerHTML = `<p class="body">We couldn't find that essay. <a href="#blog" data-nav="blog">Browse all writing</a>.</p>`;
      return;
    }
    const absUrl = location.origin + location.pathname + '#post/' + slug;
    const absImage = post.cover ? new URL(post.cover, location.href).href : SITE_DEFAULT_META.image;
    updateMeta({
      title: `${post.title} — Adham Chalabi Coaching`,
      description: post.excerpt,
      image: absImage,
      type: 'article',
      url: absUrl,
    });
    injectArticleSchema(post, absUrl, absImage);
    titleEl.textContent = post.title;
    if (eyebrowEl) {
      const parts = [];
      if (post.field_note) parts.push(`Field Note №${String(post.field_note).padStart(3, '0')}`);
      if (post.category) parts.push(post.category);
      eyebrowEl.textContent = parts.join(' · ');
    }
    const sMeta = post.series ? (seriesMeta[post.series] || {}) : {};
    const inPathway = isPathwaySeries(sMeta);
    if (seriesEl) {
      if (post.series) {
        const order = post.series_order
          ? (inPathway
              ? `Step ${post.series_order} of ${post.series_total || '?'} · `
              : `Part ${post.series_order} of ${post.series_total || '?'} · `)
          : '';
        const seriesNav = `blog/series/${encodeURIComponent(post.series)}`;
        const prefix = inPathway
          ? (sMeta.is_welcome ? '<span class="pathway-flag">Begin Here · </span>' : `<span class="pathway-flag">Pathway · </span>`)
          : '';
        seriesEl.innerHTML = `${prefix}${order}<a href="#${seriesNav}" data-nav="${seriesNav}" class="post-series-link">${post.series}</a>`;
        seriesEl.style.display = '';
      } else {
        seriesEl.style.display = 'none';
      }
    }
    if (subtitleEl) {
      if (post.subtitle) {
        subtitleEl.textContent = post.subtitle;
        subtitleEl.style.display = '';
      } else {
        subtitleEl.style.display = 'none';
      }
    }

    const byline = root.querySelector('#post-byline');
    if (byline) {
      byline.style.display = '';
      const dateEl = root.querySelector('#post-byline-date');
      const timeEl = root.querySelector('#post-byline-time');
      if (dateEl) dateEl.textContent = formatLongDate(post.date);
      if (timeEl) timeEl.textContent = `${post.minutes} min read`;
    }

    const coverSection = root.querySelector('#post-cover-section');
    const coverImg = root.querySelector('#post-cover-img');
    if (coverSection && coverImg && post.cover) {
      coverImg.src = post.cover;
      coverImg.alt = post.title;
      coverSection.style.display = '';
    }

    const shareUrl = window.location.href;
    const shareText = post.title;
    const xLink = root.querySelector('#post-share-x');
    const liLink = root.querySelector('#post-share-linkedin');
    if (xLink) xLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    if (liLink) liLink.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    const emailLink = root.querySelector('#post-share-email');
    if (emailLink) {
      const subject = encodeURIComponent(post.title);
      const body = encodeURIComponent(`I thought you'd find this worth reading: ${post.title}\n\n${shareUrl}`);
      emailLink.href = `mailto:?subject=${subject}&body=${body}`;
    }
    const copyBtn = root.querySelector('#post-share-copy');
    const copyLabel = root.querySelector('#post-share-copy-label');
    if (copyBtn && copyLabel) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copyLabel.textContent = 'Copied';
          setTimeout(() => { copyLabel.textContent = 'Copy link'; }, 1800);
        } catch (e) {
          copyLabel.textContent = 'Copy failed';
        }
      });
    }

    const relSection = root.querySelector('#post-related-section');
    const relGrid = root.querySelector('#post-related-grid');
    if (relSection && relGrid) {
      const sameCat = posts.filter(p => p.slug !== slug && p.category === post.category);
      const others = posts.filter(p => p.slug !== slug && p.category !== post.category);
      const related = [...sameCat, ...others].slice(0, 3);
      if (related.length) {
        relSection.style.display = '';
        relGrid.innerHTML = related.map((p, i) => `
          <a class="post-card fade-up" data-nav="post/${p.slug}" href="#post/${p.slug}" style="--delay:${i * 0.06}s; text-decoration:none; color:inherit; display:flex; flex-direction:column; gap:var(--s-3);">
            <div class="img-slot${p.cover ? ' has-photo' : ''}">${p.cover ? `<img src="${p.cover}" alt="${p.title}">` : `<span class="label">${p.title}</span>`}</div>
            <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
              <span class="pill outline-gold" style="padding:3px 10px; font-size:10px;">${p.category}</span>
              <span class="micro">${p.minutes} min · ${formatDate(p.date)}</span>
            </div>
            <h3>${p.title}</h3>
          </a>
        `).join('');
      }
    }

    return fetch(`posts/${slug}.md`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }).then(md => {
      const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      const html = window.marked ? window.marked.parse(body) : `<pre>${body}</pre>`;
      bodyEl.innerHTML = html + `<p class="post-signoff">— Adham</p>`;
      buildTOC(bodyEl);
      if (post.gated && !localStorage.getItem('field-notes-subscriber')) {
        applyGate(bodyEl, post);
      }
      if (inPathway) appendPathwayNav(bodyEl, post, posts, sMeta);
      initFadeUp();
      setupPostProgress(root);
      setupQuoteShare(root);
    });
  }).catch(e => {
    bodyEl.innerHTML = `<p class="body">Couldn't load this essay: ${e.message}. <a href="#blog" data-nav="blog">Back to writing</a>.</p>`;
  });
}

/* ---------- NEWSLETTER (Brevo) ---------- */

// Field Notes newsletter (list #286, double opt-in)
const BREVO_NEWSLETTER_ACTION = 'https://ebebc29d.sibforms.com/serve/MUIFAEYyzr-kp4cTQSXY2rAL1sqdxgaYfy4KqgejyxpD1IwHubrE-ki_fO-BYKtqKzi5CCJnhbhpoIs4UKi4I8JH5f5Zkdx48_2wR2i9KIgCaYppxOkad9mVijNhxtFlYWsWweCzGq-XD5B_041p4uXuBB9c45H61gZC0rceUr-ke8t3qsEG7ypISKBo3R5Blu86C4QdpA7sdAim';

// Lead magnet — 5-Minute Anxiety Reset (list #287, single opt-in, instant PDF email)
const BREVO_LEAD_MAGNET_ACTION = 'https://ebebc29d.sibforms.com/serve/MUIFAFfKcS8sPQHlohrzRSvtaym6TVQmw98RgWFIC2KxHDKKOq9naNTh8gFhPw0KdICTYDMT_NlEugV0RMhOKkoTLCbzO0BaNLu_MWXdZ3zIYJbseuecpdWAZ2lG0GDNcyE-8wiGcISdQzcRYv7HWWJCxLSuOX9kZyPK_flWLkEf73yu3hcWzon71CZLPpZJBLAlGCK1oheRsXkW';

async function submitEmailToBrevo(email, action) {
  const fd = new FormData();
  fd.append('EMAIL', email);
  fd.append('email_address_check', '');
  fd.append('locale', 'en');
  await fetch(action || BREVO_NEWSLETTER_ACTION, { method: 'POST', mode: 'no-cors', body: fd });
}

function newsletterFormMarkup(formId) {
  return `
    <form class="newsletter-form brevo-form fade-up" id="${formId}" data-success="You're in. Check your inbox to confirm." style="--delay:0.3s; display:flex; gap:8px; max-width:480px; margin:0 auto; flex-wrap:wrap;">
      <input type="email" name="EMAIL" placeholder="your@email.com" required
             style="flex:1; min-width:200px; padding:14px 16px; border:1.5px solid var(--bg-4); border-radius:var(--r-pill); font-size:15px; font-family:var(--f-body); background:var(--bg-1);">
      <button class="btn navy" type="submit">Subscribe <span class="arrow">→</span></button>
      <p class="micro brevo-status" style="width:100%; margin-top:8px; text-align:center; display:none;"></p>
    </form>`;
}

function ensureFlipStyles() {
  if (document.getElementById('brevo-flip-styles')) return;
  const style = document.createElement('style');
  style.id = 'brevo-flip-styles';
  style.textContent = `
    .brevo-flip { perspective: 1400px; width: 100%; isolation: isolate; }
    .brevo-flip-inner {
      position: relative; width: 100%;
      transform-style: preserve-3d;
      transition: transform 720ms cubic-bezier(.6,.2,.25,1);
      will-change: transform;
    }
    .brevo-flip-inner.is-flipped { transform: rotateY(180deg); }
    .brevo-flip-front, .brevo-flip-back {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .brevo-flip-back {
      position: absolute; inset: 0;
      transform: rotateY(180deg);
      display: flex; align-items: center; justify-content: center;
      padding: 12px 24px;
      border-radius: 999px;
      background: var(--navy, #1a2332);
      color: var(--ivory, #f5f1e8);
      font-family: var(--f-body, system-ui);
      font-size: 15px; font-weight: 500;
      text-align: center; line-height: 1.35;
      box-shadow: 0 12px 32px rgba(0,0,0,0.14);
    }
  `;
  document.head.appendChild(style);
}

function wrapInFlipShell(form) {
  if (form.parentElement?.classList.contains('brevo-flip-front')) {
    return form.parentElement.parentElement;
  }
  ensureFlipStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'brevo-flip';
  // Inherit width / margin so the wrapped form sits where it did
  const cs = getComputedStyle(form);
  const inheritWidth = form.style.maxWidth || (cs.maxWidth !== 'none' ? cs.maxWidth : null);
  if (inheritWidth) {
    wrapper.style.maxWidth = inheritWidth;
    form.style.maxWidth = '';
  }
  if (form.style.margin) {
    wrapper.style.margin = form.style.margin;
    form.style.margin = '';
  } else if (cs.marginLeft === cs.marginRight && cs.marginLeft.includes('auto')) {
    wrapper.style.margin = '0 auto';
  }

  const inner = document.createElement('div');
  inner.className = 'brevo-flip-inner';

  const front = document.createElement('div');
  front.className = 'brevo-flip-front';

  const back = document.createElement('div');
  back.className = 'brevo-flip-back';
  back.textContent = form.dataset.success || "You're subscribed. Check your inbox to confirm.";

  form.parentNode.insertBefore(wrapper, form);
  front.appendChild(form);
  inner.appendChild(front);
  inner.appendChild(back);
  wrapper.appendChild(inner);
  return inner;
}

function initNewsletterForm(root) {
  root.querySelectorAll('.brevo-form').forEach(form => {
    if (form.dataset.brevoBound) return;
    form.dataset.brevoBound = '1';
    const flipInner = wrapInFlipShell(form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"], input[name="EMAIL"]');
      const email = emailInput?.value.trim();
      if (!email) return;
      const button = form.querySelector('button[type="submit"]');
      const originalLabel = button?.innerHTML;
      if (button) { button.disabled = true; button.innerHTML = 'Sending…'; }

      try {
        await submitEmailToBrevo(email, form.dataset.brevoAction);
        const back = flipInner.querySelector('.brevo-flip-back');
        if (back) back.textContent = form.dataset.success || "You're subscribed. Check your inbox to confirm.";
        flipInner.classList.add('is-flipped');
        form.reset();
      } catch (err) {
        let errEl = form.querySelector('.brevo-error');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.className = 'micro brevo-error';
          errEl.style.cssText = 'width:100%; margin:10px 0 0; text-align:center; color:#c0392b;';
          form.appendChild(errEl);
        }
        errEl.textContent = "Couldn't send that just now. Try again in a moment.";
      } finally {
        if (button) { button.disabled = false; button.innerHTML = originalLabel; }
      }
    });
  });
}

/* ---------- RESOURCES ---------- */

const ResourcesPage = () => {
  const items = [
    { type: 'PDF · Guide', title: 'The Stuckness Audit', body: "A 4-page worksheet to name what's actually stuck.", cover: 'navy', emoji: 'A' },
    { type: 'Audio · 22 min', title: 'Morning meditation for the lost', body: 'A guided practice for days when nothing makes sense.', cover: 'gold', emoji: '◐' },
    { type: 'Video · 14 min', title: 'How to interview your own pain', body: 'A short masterclass on the most useful question I know.', cover: 'cream', emoji: '?' },
    { type: 'PDF · 18 pp', title: 'A Field Guide for the Lost', body: "A short book on what to do when you don't know what to do.", cover: 'navy', emoji: '✦' },
    { type: 'Worksheet · 6 pp', title: 'The Meaning Inventory', body: "Map the parts of your life that actually matter — and the parts that don't.", cover: 'gold', emoji: '✓' },
    { type: 'Audio · 35 min', title: 'On grief and gravity', body: 'A slow conversation with myself about loss.', cover: 'cream', emoji: '~' },
  ];

  return `
  <div class="page-resources">
    <section class="hero" style="padding-bottom:64px;">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Free resources</span>
        <h1 class="display h-xxl fade-up" style="--delay:0.1s; margin:16px 0 24px;">
          Tools to help you <span class="has-circle">move.</span>
        </h1>
        <p class="lead fade-up" style="--delay:0.2s; margin:0 auto;">
          Guides, worksheets, audio, and video — the same things I use with 1:1 clients. All free. No catch.
        </p>
      </div>
    </section>

    <section class="section tight">
      <div class="container">
        <div class="card dark fade-up" style="padding:0; overflow:hidden; background:var(--navy); border-color:var(--navy);">
          <div class="featured-magnet">
            <div class="featured-magnet-text">
              <span class="pill gold" style="margin-bottom:16px;">★ Most downloaded</span>
              <h2 class="display h-lg" style="color:var(--ivory); margin:0 0 16px;">The 5-Minute Anxiety Reset</h2>
              <p class="body" style="color:rgba(245,241,232,0.78); max-width:420px;">
                The Microbravery practice in a 5-minute walkthrough. Built on the technique therapists actually use — for the moment the spiral starts.
              </p>
              <div style="display:flex; gap:16px; align-items:center; margin:24px 0;">
                <span class="micro" style="color:rgba(245,241,232,0.6);">★★★★★</span>
                <span class="micro" style="color:rgba(245,241,232,0.6);">2,400+ downloads</span>
              </div>
              <form class="brevo-form" data-brevo-action="${BREVO_LEAD_MAGNET_ACTION}" data-success="On its way — check your inbox for the reset." style="display:flex; gap:8px; flex-wrap:wrap;">
                <input type="email" name="EMAIL" required placeholder="your@email.com" style="flex:1 1 220px; padding:14px 16px; border:1px solid rgba(255,255,255,0.15); border-radius:var(--r-sm); font-size:15px; background:rgba(0,0,0,0.2); color:var(--ivory);">
                <button class="btn gold" type="submit">Send it <span class="arrow">↓</span></button>
              </form>
              <div class="micro" style="color:rgba(245,241,232,0.5); margin-top:12px;">No spam. Unsubscribe anytime.</div>
            </div>
            <div class="featured-magnet-cover">
              <div style="width:220px; aspect-ratio:3/4; background:var(--ivory); border-radius:var(--r-sm); box-shadow:0 24px 60px rgba(0,0,0,0.5), 0 -8px 24px rgba(184,137,58,0.2); padding:28px; transform:rotate(-4deg); display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="font-family:var(--f-mono); font-size:9px; letter-spacing:0.16em; color:var(--gold); text-transform:uppercase;">PDF · Free guide</div>
                  <div style="font-family:var(--f-display); font-size:26px; font-style:italic; color:var(--navy); line-height:1.05; margin-top:16px;">5-Minute Anxiety Reset</div>
                </div>
                <div>
                  <div style="width:36px; height:1.5px; background:var(--gold); margin-bottom:8px;"></div>
                  <div style="font-family:var(--f-display); font-size:13px; color:var(--navy);">Adham Chalabi</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({ eyebrow: 'The library', title: 'Browse all free tools.' })}
        <div class="res-filters fade-up">
          ${['All','Guides','Worksheets','Audio','Video'].map((t, i) => `
            <button class="res-filter ${i === 0 ? 'active' : ''}">${t}</button>
          `).join('')}
        </div>
        <div class="res-grid">
          ${items.map((r, i) => `
            <div class="res-card fade-up" style="--delay:${i * 0.05}s;">
              <div class="res-cover ${r.cover}">
                <span class="res-type">${r.type}</span>
                <div class="res-cover-title">${r.title}</div>
                <span style="position:absolute; bottom:12px; right:12px; font-family:var(--f-display); font-size:32px; font-style:italic; opacity:0.4;">${r.emoji}</span>
              </div>
              <div>
                <h3>${r.title}</h3>
                <p class="body" style="margin-bottom:16px;">${r.body}</p>
                <a href="#" class="btn ghost sm">Get it free <span class="arrow">↓</span></a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  </div>`;
};

/* ---------- RESULTS ---------- */

const ResultsPage = () => {
  const wall = [
    { stars: 5, q: "Adham didn't fix me. He helped me become who I already was — and find the courage to live like it.", who: 'M.', role: '34 · founder', tone: 'gold', big: true },
    { stars: 5, q: "I've worked with three coaches before. Adham is the only one who didn't hand me a template. He met me where I was.", who: 'J.', role: '41 · parent' },
    { stars: 5, q: "I went into our first call expecting another pep talk. I got something far better — a real, human, kind of brutal honesty.", who: 'S.', role: '28 · artist', tone: 'dark' },
    { stars: 5, q: "Twelve weeks later I'd quit the job that was killing me, started writing again, and called my mother for the first time in two years.", who: 'A.', role: '52 · executive' },
    { stars: 5, q: "He asks the question you've been avoiding. Then he holds the silence until you answer it honestly.", who: 'R.', role: '36 · teacher' },
    { stars: 5, q: "The course alone was worth ten times what I paid. The 1:1 work was a different kind of investment — in myself.", who: 'K.', role: '47 · engineer', tone: 'dark' },
    { stars: 5, q: "I came in stuck. I left in motion. Still moving.", who: 'L.', role: '39 · designer' },
    { stars: 5, q: "Adham's framework gave me language for things I'd been carrying for years. That alone changed everything.", who: 'D.', role: '44 · therapist' },
    { stars: 5, q: "Direct without being harsh. Warm without being soft. Exactly what I needed.", who: 'P.', role: '31 · founder' },
  ];

  return `
  <div class="page-results">
    <section class="hero" style="padding-bottom:16px;">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Results</span>
        <h1 class="display h-xxl fade-up" style="--delay:0.1s; margin:16px 0 24px;">
          Real people.<br><span class="has-double-underline blue">Real change.</span>
        </h1>
        <p class="lead fade-up" style="--delay:0.2s; margin:0 auto;">
          These are the people I've walked with. Names abbreviated for privacy. Words their own.
        </p>
      </div>
    </section>

    <section class="section tight">
      <div class="container">
        <div class="stats-row">
          ${[
            ['Hundreds', 'Of lives changed'],
            ['6+ yrs', 'Experience'],
            ['★ 4.7', 'Average rating'],
          ].map(([n, l], i) => `
            <div class="stat fade-up" style="--delay:${i * 0.08}s; text-align:center;">
              <div class="num">${n}</div>
              <div class="label">${l}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({ eyebrow: 'Wall of love', title: 'What clients say.', align: 'center' })}
        <div class="testimonial-wall">
          ${wall.map((t, i) => `
            <div class="testimonial ${t.tone || ''} fade-up" style="--delay:${(i % 4) * 0.08}s;">
              <div class="stars">${'★'.repeat(t.stars)}</div>
              <blockquote class="${t.big ? 'lg' : ''}">"${t.q}"</blockquote>
              <cite>
                <span class="avatar"></span>
                <span>
                  <span class="who">${t.who}</span><br>
                  <span class="role">${t.role}</span>
                </span>
              </cite>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="cta-banner">
      <div class="container narrow" style="position:relative; z-index:1;">
        <span class="eyebrow fade-up" style="color:var(--gold-light);">Be next</span>
        <h2 class="display h-xl fade-up" style="--delay:0.1s; color:var(--ivory); margin:16px 0 32px;">Be the next story.</h2>
        <div class="fade-up" style="--delay:0.2s; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="#contact" data-nav="contact" class="btn gold lg">Apply for 1:1 <span class="arrow">→</span></a>
          <a href="#resources" data-nav="resources" class="btn ghost-light lg">Start with the free guide</a>
        </div>
      </div>
    </section>
  </div>`;
};

/* ---------- CONTACT ---------- */

const TIDYCAL_PATH = 'captain/mwm';

const ContactPage = () => `
  <div class="page-contact">
    <section class="hero" style="padding-bottom:16px;">
      <div class="container narrow" style="text-align:center;">
        <span class="eyebrow fade-up">Get in touch</span>
        <h1 class="display h-xxl fade-up" style="--delay:0.1s; margin:16px 0 24px;">
          Two ways to <span class="has-wave">reach me.</span>
        </h1>
        <p class="lead fade-up" style="--delay:0.2s; margin:0 auto;">
          Send a note if you want to say hi. Book a call if you're ready to talk about working together. Both reach me directly.
        </p>
      </div>
    </section>

    <section class="section tight">
      <div class="container">
        <div class="contact-grid">

          <div class="contact-shell fade-up">
            <span class="eyebrow navy">A · Send a note</span>
            <div class="contact-card">
              <h3>Just want to say hi?</h3>
              <p class="body" style="margin-bottom:24px;">
                I read every message myself. Tell me where you are, what you're chewing on, or just say hello. I'll get back within 48 hours.
              </p>
              <form onsubmit="event.preventDefault()" style="display:flex; flex-direction:column; flex:1;">
                <div class="field">
                  <label>Your name</label>
                  <input type="text" placeholder="Jane Doe">
                </div>
                <div class="field">
                  <label>Email</label>
                  <input type="email" placeholder="your@email.com">
                </div>
                <div class="field">
                  <label>What's on your mind?</label>
                  <textarea placeholder="Anything — a question, a story, a hello..."></textarea>
                </div>
                <button class="btn navy" type="submit" style="width:100%; margin-top:8px;">
                  Send the note <span class="arrow">→</span>
                </button>
              </form>
            </div>
          </div>

          <div class="contact-shell booking-shell fade-up" style="--delay:0.1s;">
            <span class="eyebrow navy">B · Book a free call</span>
            <div class="booking-widget">
              <div class="booking-meeting">
                <div class="booking-avatar"><img src="adham-blob.svg" alt="Adham Chalabi"></div>
                <div class="booking-meeting-info">
                  <div class="booking-host">Schedule with Adham</div>
                  <div class="booking-title">Pick a time that works for you.</div>
                  <div class="booking-tagline">Free · 1:1 · Zoom · No pitch — just a real conversation.</div>
                </div>
              </div>

              <div class="tidycal-frame">
                <div class="tidycal-embed" data-path="${TIDYCAL_PATH}"></div>
              </div>
            </div>
          </div>

        </div>

        <div class="contact-other fade-up">
          <div class="item"><div class="label">Email</div><div class="val">Adham@Adham.coach</div></div>
          <div class="item"><div class="label">Instagram</div><div class="val">@captain_adham</div></div>
          <div class="item"><div class="label">Newsletter</div><div class="val">Field Notes</div></div>
        </div>
      </div>
    </section>
  </div>`;

const PAGE_RENDERERS = { home: HomePage, about: AboutPage, services: ServicesPage, blog: BlogPage, resources: ResourcesPage, results: ResultsPage, contact: ContactPage };

/* ---------- router + interactions ---------- */

let fadeObserver = null;

function initFadeUp() {
  if (fadeObserver) fadeObserver.disconnect();
  document.querySelectorAll('.fade-up.in, .fade-in.in').forEach(el => el.classList.remove('in'));
  fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        fadeObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.fade-up:not(.in), .fade-in:not(.in)').forEach(el => fadeObserver.observe(el));
}

function initFaq(root) {
  root.querySelectorAll('[data-faq]').forEach(item => {
    item.addEventListener('click', () => item.classList.toggle('open'));
  });
}

function initTidyCal(root) {
  const target = root.querySelector('.tidycal-embed');
  if (!target || target.tagName === 'IFRAME') return;

  // If TidyCal lib already loaded, just call its init on the new div
  if (window.TidyCal && typeof window.TidyCal.init === 'function') {
    try { window.TidyCal.init(target); } catch (e) { console.warn('TidyCal.init failed', e); }
    return;
  }

  // First-time load: inject the script (auto-discovers .tidycal-embed divs on execute)
  if (document.querySelector('script[data-tidycal-loader]')) return;
  const s = document.createElement('script');
  s.src = 'https://asset-tidycal.b-cdn.net/js/embed.js';
  s.async = true;
  s.dataset.tidycalLoader = 'true';
  document.head.appendChild(s);
}

function initScrolledNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.removeEventListener('scroll', window.__navScroll || (() => {}));
  window.__navScroll = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
}

function setMobileMenu(open) {
  const burger = document.getElementById('nav-burger');
  const menu = document.getElementById('mobile-menu');
  if (!burger || !menu) return;
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('menu-open', open);
}

function initMobileMenu() {
  const burger = document.getElementById('nav-burger');
  if (!burger) return;
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = burger.classList.contains('open');
    setMobileMenu(!isOpen);
  });
}

function navigate(id, opts = {}) {
  // Series index: id is "series" — render the all-series page
  if (id === 'series') {
    document.body.dataset.page = 'series';
    document.getElementById('nav-mount').innerHTML = navMarkup('blog', false);
    document.getElementById('main-mount').innerHTML = SeriesPage();
    document.getElementById('footer-mount').innerHTML = footerMarkup();
    if (!opts.silent) window.location.hash = id;
    if (!opts.preserveScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    initScrolledNav();
    initMobileMenu();
    initFadeUp();
    renderSeries(document.getElementById('main-mount'));
    return;
  }

  // Series-filtered blog: id like "blog/series/<name>" — render blog with filter
  let hashOverride = null;
  if (id && id.startsWith('blog/series/')) {
    activeSeriesFilter = decodeURIComponent(id.slice('blog/series/'.length));
    activeFilter = 'All';
    hashOverride = id;
    id = 'blog';
  } else if (id === 'blog') {
    // entering plain blog clears any active series filter
    activeSeriesFilter = null;
  }

  // Post route: id is "post/<slug>" — render the essay reader
  if (id && id.startsWith('post/')) {
    const slug = id.slice(5);
    document.body.dataset.page = 'post';
    document.getElementById('nav-mount').innerHTML = navMarkup('blog', false);
    document.getElementById('main-mount').innerHTML = PostPage();
    document.getElementById('footer-mount').innerHTML = footerMarkup();
    if (!opts.silent) window.location.hash = id;
    if (!opts.preserveScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    initScrolledNav();
    initMobileMenu();
    initFadeUp();
    renderPost(document.getElementById('main-mount'), slug);
    initNewsletterForm(document.getElementById('main-mount'));
    return;
  }

  const page = PAGES.find(p => p.id === id) || PAGES[0];
  document.body.dataset.page = page.id;
  resetSiteMeta();
  if (page.id !== 'home') {
    updateMeta({
      title: `${page.label} — Adham Chalabi Coaching`,
      description: SITE_DEFAULT_META.description,
      image: SITE_DEFAULT_META.image,
      type: 'website',
      url: location.origin + location.pathname + '#' + page.id,
    });
  }

  document.getElementById('nav-mount').innerHTML = navMarkup(page.id, page.darkNav);
  document.getElementById('main-mount').innerHTML = PAGE_RENDERERS[page.id]();
  document.getElementById('footer-mount').innerHTML = footerMarkup();

  if (!opts.silent) window.location.hash = hashOverride || page.id;
  if (!opts.preserveScroll) window.scrollTo({ top: 0, behavior: 'instant' });

  initScrolledNav();
  initMobileMenu();
  initFadeUp();
  if (page.id === 'services') initFaq(document.getElementById('main-mount'));
  if (page.id === 'contact') initTidyCal(document.getElementById('main-mount'));
  if (page.id === 'blog') renderBlog(document.getElementById('main-mount'));
  initNewsletterForm(document.getElementById('main-mount'));
}

let pendingScrollTo = null;

function consumePendingScroll() {
  if (!pendingScrollTo) return;
  const id = pendingScrollTo;
  pendingScrollTo = null;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'instant' });
  }));
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-nav]');
  if (!target) return;
  e.preventDefault();
  setMobileMenu(false);
  pendingScrollTo = target.dataset.scroll || null;
  navigate(target.dataset.nav);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMobileMenu(false);
});

window.addEventListener('hashchange', () => {
  const id = (window.location.hash || '#home').replace('#', '');
  navigate(id, { silent: true });
});

document.addEventListener('DOMContentLoaded', () => {
  const id = (window.location.hash || '#home').replace('#', '');
  const valid = PAGES.find(p => p.id === id) || id.startsWith('post/') || id.startsWith('blog/series/') || id === 'series';
  navigate(valid ? id : 'home', { silent: true });
});
