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
  // Free, on-page content. The gated parts (struggles + what to work on) live
  // server-side in the quiz-result edge function and are emailed, never shown.
  var PROFILES = {
    HL: {
      title: "Settled",
      one: "You know what your life is about, and you are not chasing more. That is a rare kind of quiet.",
      whatItMeans: "Your life feels meaningful, and you are not restlessly looking for more. You have found your thing, the work, the people, the why, and you are living inside it instead of searching for it. Most people never get here.",
      whyItMatters: "This matters because the risk for you is not emptiness, it is drifting. Meaning that you stop tending slowly fades. Knowing you are settled lets you ask the honest question: is this real stillness, or the first sign of coasting?"
    },
    HH: {
      title: "Grounded, still growing",
      one: "You have real meaning, and you are still reaching for more. That mix is the healthiest one there is.",
      whatItMeans: "You are not searching because something is broken. You are searching because you have a solid foundation and you want to build on it. You know what matters, and you are deepening it on purpose. That is growth, not lack.",
      whyItMatters: "This matters because your energy is already pointed the right way. The only thing that can trip you up is busyness that looks like growth but is really just motion. Knowing you are here lets you aim, instead of just run."
    },
    LL: {
      title: "Running on empty",
      one: "Right now life does not feel like it points anywhere in particular, and you are not really looking either.",
      whatItMeans: "This is not a verdict, it is a snapshot of right now. Usually it means a quiet kind of self-protection. When looking for meaning has hurt before, the mind learns to stop looking. Numb feels safer than disappointed. Most people here are not lazy or broken. They are tired, and they have stopped expecting more.",
      whyItMatters: "This matters because the numbness has a cost. It is the exact place a life quietly shrinks. Naming it is the first honest step, because you cannot change a thing you keep avoiding."
    },
    LH: {
      title: "In the search",
      one: "You can feel that something is missing, and to your credit, you are actively looking for it. That ache is honest.",
      whatItMeans: "You do not feel much meaning right now, but you have not given up. You are still looking. That ache is not a weakness, it is honesty. Part of you still believes there is more, and you are reaching for it.",
      whyItMatters: "This matters because the answer for you is not to try harder or find one more tool. You already have the effort. What you are missing is a direction. Naming where you are is the first step to pointing that energy somewhere it can land."
    }
  };

  // Edge function for the email-gated reading (lead capture + personalized send).
  var FN_URL = "https://pldcachbsnslroybflyu.supabase.co/functions/v1/quiz-result";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZGNhY2hic25zbHJveWJmbHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTkzNDUsImV4cCI6MjA5Mzk5NTM0NX0.KXvFeZ6pYGYO5hE4h7-EMiz0llXhQxwVcCUq7Fb_qGA";
  var lastResult = null; // { key, presence, search } for the email form

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

    document.getElementById("resWhatItMeans").textContent = prof.whatItMeans;
    document.getElementById("resWhyItMatters").textContent = prof.whyItMatters;

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

    // remember this result for the email form submission
    lastResult = { key: key, presence: s.presence, search: s.search };

    // reset the email gate to its default (unsent) state on each render
    var gate = document.getElementById("emailGate");
    if (gate) {
      gate.classList.remove("sent");
      var stEl = document.getElementById("egStatus");
      if (stEl) { stEl.textContent = ""; stEl.className = "eg-status"; }
      var btnEl = document.getElementById("egSubmit");
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = 'Send my reading <span class="arrow">&rarr;</span>'; }
    }
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

    // Email gate: send the personalized reading to a real inbox (lead capture).
    var egForm = document.getElementById("egForm");
    if (egForm) {
      egForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!lastResult) return;
        var email = (document.getElementById("egEmail").value || "").trim();
        if (!email) return;
        var btn = document.getElementById("egSubmit");
        var status = document.getElementById("egStatus");
        btn.disabled = true;
        btn.textContent = "Sending…";
        status.className = "eg-status";
        status.textContent = "";
        fetch(FN_URL, {
          method: "POST",
          headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, profile: lastResult.key, presence: lastResult.presence, search: lastResult.search }),
        }).then(function (r) {
          return r.json().then(function (j) { return { ok: r.ok, j: j }; });
        }).then(function (res) {
          if (res.ok && res.j && res.j.ok) {
            document.getElementById("emailGate").classList.add("sent");
            status.className = "eg-status ok";
            status.textContent = "Check your inbox. Your full reading is on its way.";
          } else {
            btn.disabled = false;
            btn.innerHTML = 'Send my reading <span class="arrow">&rarr;</span>';
            status.className = "eg-status err";
            status.textContent = "Couldn't send just now. Check the address and try again.";
          }
        }).catch(function () {
          btn.disabled = false;
          btn.innerHTML = 'Send my reading <span class="arrow">&rarr;</span>';
          status.className = "eg-status err";
          status.textContent = "Couldn't send just now. Try again in a moment.";
        });
      });
    }

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
