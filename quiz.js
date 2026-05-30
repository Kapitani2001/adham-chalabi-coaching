/* The Meaning Quiz — MLQ logic (Steger et al., 2006) */
(function () {
  "use strict";

  // Items in order. subscale: P (Presence) or S (Search). reverse: item 9.
  var ITEMS = [
    { id: 1,  text: "I understand my life's meaning.",                                          sub: "P", rev: false },
    { id: 2,  text: "I am looking for something that makes my life feel meaningful.",            sub: "S", rev: false },
    { id: 3,  text: "I am always looking to find my life's purpose.",                            sub: "S", rev: false },
    { id: 4,  text: "My life has a clear sense of purpose.",                                     sub: "P", rev: false },
    { id: 5,  text: "I have a good sense of what makes my life meaningful.",                      sub: "P", rev: false },
    { id: 6,  text: "I have discovered a satisfying life purpose.",                              sub: "P", rev: false },
    { id: 7,  text: "I am always searching for something that makes my life feel significant.",  sub: "S", rev: false },
    { id: 8,  text: "I am seeking a purpose or mission for my life.",                            sub: "S", rev: false },
    { id: 9,  text: "My life has no clear purpose.",                                             sub: "P", rev: true  },
    { id: 10, text: "I am searching for meaning in my life.",                                    sub: "S", rev: false }
  ];

  var ANCHORS = ["Absolutely\nUntrue","Mostly Untrue","Somewhat Untrue","Can't Say","Somewhat True","Mostly True","Absolutely\nTrue"];
  var THRESHOLD = 5.0; // applied High/Low split (mean >= 5.0 = High)
  var STORE_KEY = "mlq_quiz_v1";
  var SCREEN_KEY = "mlq_quiz_screen_v1";

  // ---- 4 profiles -------------------------------------------------------
  // keys: P=presence, S=search ; "H"/"L"
  var PROFILES = {
    HL: { // High presence, Low search
      title: "Settled",
      one: "You know what your life is about, and you're not restlessly chasing more. That's a rare kind of quiet.",
      body: [
        "Your sense of meaning is <strong>present and steady</strong>, and you're not burning energy searching for it. You've found the thing — the work, the people, the why — and you're living inside it rather than looking for it.",
        "The honest risk here isn't emptiness. It's <strong>quiet stagnation</strong> — mistaking \"settled\" for \"finished.\" Meaning you stop tending eventually thins out. The question worth sitting with: is this stillness, or is it the early edge of coasting?"
      ],
      ctaTitle: "Keep it sharp.",
      ctaBody: "If you want to pressure-test where this goes next — before comfort turns into autopilot — that's a good conversation to have.",
      ctaLabel: "Read the Field Notes →",
      ctaHref: "/blog"
    },
    HH: { // High presence, High search
      title: "Grounded, still growing",
      one: "You have real meaning, and you're still actively reaching for more. That combination is the healthiest one there is.",
      body: [
        "You're not searching because something's broken. You're searching because you have a <strong>foundation solid enough to build on</strong> — you know what matters, and you're deepening it on purpose.",
        "This is growth, not lack. The only thing to watch is the <strong>treadmill</strong>: making sure the searching is expanding your life, not just keeping you busy enough to avoid being still in it."
      ],
      ctaTitle: "Aim the search.",
      ctaBody: "When you're already moving, the leverage is in direction, not effort. If you want a sharper sense of where to point next, let's talk.",
      ctaLabel: "Book a call →",
      ctaHref: "/contact"
    },
    LL: { // Low presence, Low search  — Adham's person
      title: "Running on empty",
      one: "Right now, life doesn't feel like it points anywhere in particular — and you're not really looking, either.",
      body: [
        "This isn't a verdict, it's a reading. What it usually reflects is a kind of <strong>quiet self-protection</strong>: when looking for meaning has hurt before, the mind learns to stop looking. Numb is safer than disappointed. Most people here aren't lazy or broken — they're tired, and they've stopped expecting more.",
        "But the stillness costs something. <strong>This is exactly the spiral I work with</strong> — people who've tried the tools and still feel stuck. The way out isn't another technique. It's confronting the truth you've been avoiding, with someone who won't let you flinch from it."
      ],
      ctaTitle: "This is the work I do.",
      ctaBody: "If any of this landed too accurately, that's worth paying attention to. A single honest conversation can move more than another year of waiting.",
      ctaLabel: "Book a call →",
      ctaHref: "/contact"
    },
    LH: { // Low presence, High search — Adham's person
      title: "In the search",
      one: "You can feel that something's missing, and to your credit, you're actively looking for it. That ache is honest.",
      body: [
        "The searching isn't a flaw — it's the most alive thing about where you are. You haven't gone numb. But searching <strong>without a foundation</strong> can turn into a loop: new tool, new book, new practice, same spiral. Motion that feels like progress but doesn't land.",
        "The thing the search usually needs isn't more inputs — it's a <strong>truth you've been circling and avoiding</strong>. That's the part that's hard to do alone, because the mind protects exactly the spot that needs to be seen. This is the work I do with people."
      ],
      ctaTitle: "Stop circling. Land it.",
      ctaBody: "You're already looking in the right direction. Let's find what the search keeps almost-touching — and name it.",
      ctaLabel: "Book a call →",
      ctaHref: "/contact"
    }
  };

  // ---- state ------------------------------------------------------------
  var answers = {}; // id -> 1..7
  load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) answers = JSON.parse(raw) || {};
    } catch (e) { answers = {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) {}
  }

  // ---- render question groups ------------------------------------------
  function renderGroup(containerId, items) {
    var c = document.getElementById(containerId);
    c.innerHTML = "";
    items.forEach(function (it) {
      var wrap = document.createElement("div");
      wrap.className = "qitem";

      var q = document.createElement("div");
      q.className = "qtext";
      q.innerHTML = '<span class="qnum">' + it.id + '</span><span>' + it.text + '</span>';
      wrap.appendChild(q);

      var scale = document.createElement("div");
      scale.className = "scale";

      var dots = document.createElement("div");
      dots.className = "scale-dots";
      for (var v = 1; v <= 7; v++) {
        (function (val) {
          var d = document.createElement("button");
          d.className = "dot" + (answers[it.id] === val ? " sel" : "");
          d.type = "button";
          d.textContent = val;
          d.setAttribute("aria-label", ANCHORS[val - 1].replace("\n", " "));
          d.addEventListener("click", function () {
            answers[it.id] = val;
            save();
            dots.querySelectorAll(".dot").forEach(function (n) { n.classList.remove("sel"); });
            d.classList.add("sel");
            updateProgress();
          });
          dots.appendChild(d);
        })(v);
      }
      scale.appendChild(dots);

      var ends = document.createElement("div");
      ends.className = "scale-ends";
      ends.innerHTML = "<span>Untrue</span><span>True</span>";
      scale.appendChild(ends);

      wrap.appendChild(scale);
      c.appendChild(wrap);
    });
  }

  // ---- navigation -------------------------------------------------------
  function show(screen) {
    try { localStorage.setItem(SCREEN_KEY, screen); } catch (e) {}
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var el = document.getElementById("screen-" + screen);
    if (el) el.classList.add("active");
    var pw = document.getElementById("progressWrap");
    if (screen === "q1" || screen === "q2") pw.classList.add("show");
    else pw.classList.remove("show");
    updateProgress();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function answeredCount() {
    var n = 0;
    ITEMS.forEach(function (it) { if (answers[it.id]) n++; });
    return n;
  }
  function updateProgress() {
    var n = answeredCount();
    document.getElementById("progressFill").style.width = (n / 10 * 100) + "%";
    document.getElementById("progressLabel").textContent = n + " / 10";
  }
  function groupComplete(g) {
    var ids = g === 1 ? [1,2,3,4,5] : [6,7,8,9,10];
    return ids.every(function (id) { return !!answers[id]; });
  }

  // ---- scoring ----------------------------------------------------------
  function score() {
    function adj(it) {
      var v = answers[it.id];
      return it.rev ? (8 - v) : v;
    }
    var pres = ITEMS.filter(function (i) { return i.sub === "P"; }).map(adj);
    var sear = ITEMS.filter(function (i) { return i.sub === "S"; }).map(adj);
    var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
    return { presence: mean(pres), search: mean(sear) };
  }

  function renderResult() {
    var s = score();
    var pHigh = s.presence >= THRESHOLD;
    var sHigh = s.search >= THRESHOLD;
    var key = (pHigh ? "H" : "L") + (sHigh ? "H" : "L");
    var prof = PROFILES[key];

    document.getElementById("resTitle").textContent = prof.title;
    document.getElementById("resOneLiner").textContent = prof.one;

    var bodyEl = document.getElementById("resBody");
    bodyEl.innerHTML = prof.body.map(function (p) { return '<p class="body-copy">' + p + '</p>'; }).join("");

    document.getElementById("presVal").innerHTML = s.presence.toFixed(1) + "<span>/7</span>";
    document.getElementById("searVal").innerHTML = s.search.toFixed(1) + "<span>/7</span>";
    document.getElementById("presBar").style.width = (s.presence / 7 * 100) + "%";
    document.getElementById("searBar").style.width = (s.search / 7 * 100) + "%";

    var pt = document.getElementById("presTag");
    pt.textContent = pHigh ? "High — meaning feels present" : "Low — meaning feels thin";
    pt.className = "stag " + (pHigh ? "high" : "low");
    var st = document.getElementById("searTag");
    st.textContent = sHigh ? "High — actively searching" : "Low — not actively searching";
    st.className = "stag " + (sHigh ? "high" : "low");

    // quadrant map: highlight the matching cell + plot the exact position
    document.querySelectorAll(".quad-cell").forEach(function (c) { c.classList.remove("current"); });
    var cell = document.querySelector('.quad-cell[data-key="' + key + '"]');
    if (cell) cell.classList.add("current");
    function quadPos(v) { // map 1..7 so the 5.0 threshold sits on the 50% divider
      v = Math.max(1, Math.min(7, v));
      return v < THRESHOLD
        ? (v - 1) / (THRESHOLD - 1) * 50
        : 50 + (v - THRESHOLD) / (7 - THRESHOLD) * 50;
    }
    var dot = document.getElementById("quadDot");
    if (dot) {
      dot.style.left = quadPos(s.search) + "%";
      dot.style.top = (100 - quadPos(s.presence)) + "%";
    }

    document.getElementById("ctaTitle").textContent = prof.ctaTitle;
    document.getElementById("ctaBody").textContent = prof.ctaBody;
    document.getElementById("ctaBtn").innerHTML = prof.ctaLabel.replace("→", '<span class="arrow">&rarr;</span>');
    document.getElementById("ctaBtn").setAttribute("data-href", prof.ctaHref || "/contact");
  }

  // ---- wire up ----------------------------------------------------------
  function init() {
    renderGroup("group1", ITEMS.slice(0, 5));
    renderGroup("group2", ITEMS.slice(5, 10));
    updateProgress();

    document.getElementById("startBtn").addEventListener("click", function () {
      // Always start the quiz fresh — clear any saved answers so nothing is
      // pre-filled from a previous visit.
      answers = {};
      save();
      renderGroup("group1", ITEMS.slice(0, 5));
      renderGroup("group2", ITEMS.slice(5, 10));
      updateProgress();
      show("q1");
    });

    document.querySelectorAll("[data-back]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-back")); });
    });

    document.querySelectorAll("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = parseInt(b.getAttribute("data-group"), 10);
        var next = b.getAttribute("data-next");
        if (!groupComplete(g)) {
          var hint = document.getElementById("hint" + g);
          hint.classList.add("show");
          setTimeout(function () { hint.classList.remove("show"); }, 2600);
          return;
        }
        if (next === "result") renderResult();
        show(next);
      });
    });

    document.getElementById("restartBtn").addEventListener("click", function () {
      answers = {};
      save();
      renderGroup("group1", ITEMS.slice(0, 5));
      renderGroup("group2", ITEMS.slice(5, 10));
      updateProgress();
      show("intro");
    });

    document.querySelectorAll("#ctaBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        var href = b.getAttribute("data-href") || "/contact";
        window.location.href = href;
      });
    });

    // Resume where the visitor left off so a refresh never loses progress.
    // (Starting fresh is still explicit: the "Begin the quiz" and "Retake"
    // buttons clear answers.)
    var savedScreen = null;
    try { savedScreen = localStorage.getItem(SCREEN_KEY); } catch (e) {}
    if (savedScreen === "result" && groupComplete(1) && groupComplete(2)) {
      renderResult();
      show("result");
    } else if (savedScreen === "q1" || savedScreen === "q2") {
      show(savedScreen);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
