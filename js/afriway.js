/* AfriWay — interactions globales (v3)
   Angular 17+ : à transposer en signals/services ; ce fichier = comportement de l'interface. */
(function () {
  "use strict";

  var STORAGE_KEY = "afriway.state.v1";
  var STORAGE_KEY_LEGACY = "afriway.mvp.v1";

  var DEFAULT_USER = { email: "demo@afriway.sn", password: "afriway", name: "Awa Diop" };

  var NAV = [
    { href: "accueil.html", page: "accueil", title: "Accueil", desc: "Présentation", public: true },
    { href: "auth.html", page: "auth", title: "Connexion", desc: "Se connecter", public: true },
    { href: "dashboard.html", page: "dashboard", title: "Tableau de bord", desc: "Assistant & modules" },
    { href: "parcours.html", page: "parcours", title: "Parcours", desc: "Pays + objectif" },
    { href: "pays.html", page: "pays", title: "Fiche pays", desc: "Modules détaillés" },
    { href: "evenement.html", page: "evenement", title: "Événements", desc: "Voyager pour un événement" },
    { href: "checklist.html", page: "checklist", title: "Checklist", desc: "Suivi des étapes" },
    { href: "profil.html", page: "profil", title: "Profil", desc: "Parcours enregistrés" }
  ];

  var NAME_TO_CODE = {
    "Sénégal": "SN", "Côte d'Ivoire": "CI", "Mali": "ML",
    "Burkina Faso": "BF", "Guinée": "GN"
  };

  var memStore = {};
  function readRaw(key) {
    try { var v = window.localStorage.getItem(key); if (v != null) return v; } catch (e) { /* stockage indisponible */ }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }
  function writeRaw(key, val) {
    memStore[key] = val;
    try { window.localStorage.setItem(key, val); } catch (e) { /* stockage indisponible : mémoire seule */ }
  }

  function loadState() {
    try {
      var raw = readRaw(STORAGE_KEY);
      if (!raw) raw = readRaw(STORAGE_KEY_LEGACY);
      return JSON.parse(raw || "{}");
    } catch (e) { return {}; }
  }
  function saveState(patch) {
    var next = Object.assign(loadState(), patch, { updatedAt: Date.now() });
    writeRaw(STORAGE_KEY, JSON.stringify(next));
    return next;
  }
  function toast(message) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("is-on"); }, 2200);
  }
  function currentPage() { return (document.body.getAttribute("data-page") || "").trim(); }
  function isAuthed() { return loadState().auth === true; }
  function signIn(user) {
    saveState({ auth: true, user: Object.assign({}, loadState().user || {}, user || {}) });
  }
  function signOut() {
    var s = loadState();
    delete s.auth;
    writeRaw(STORAGE_KEY, JSON.stringify(s));
  }

  /* ─── navigation mobile plein écran ─────────────────────────────── */
  function injectNav() {
    if (document.querySelector("[data-nav-toggle]")) return;
    var page = currentPage();
    var inner = document.querySelector(".topbar-inner");
    if (!inner) return;

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.setAttribute("data-nav-toggle", "");
    toggle.setAttribute("aria-label", "Ouvrir le menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "afriway-menu");
    toggle.innerHTML = '<span class="bars" aria-hidden="true"><span></span><span></span></span>';
    inner.appendChild(toggle);

    var overlay = document.createElement("nav");
    overlay.className = "nav-overlay";
    overlay.id = "afriway-menu";
    overlay.setAttribute("data-nav-overlay", "");
    overlay.setAttribute("aria-label", "Navigation AfriWay");

    var authed = isAuthed();
    var list = NAV.filter(function (it) { return authed ? !it.public : it.public; });
    var items = list.map(function (it, i) {
      var num = (i + 1 < 10 ? "0" : "") + (i + 1);
      var cur = it.page === page ? ' aria-current="page"' : "";
      return '<a class="ov-item" href="' + it.href + '"' + cur + '>' +
        '<span class="ov-idx">' + num + '</span>' +
        '<span class="ov-name">' + it.title + '</span>' +
        '<span class="ov-desc">' + it.desc + '</span></a>';
    }).join("");

    var foot = authed
      ? '<button type="button" class="btn btn-secondary btn-arrow" data-logout>Se déconnecter</button>' +
        '<p class="meta">Connecté · ' + ((loadState().user || {}).email || DEFAULT_USER.email) + '</p>'
      : '<a class="btn btn-primary btn-arrow" href="inscription.html">Créer mon compte</a>' +
        '<a class="btn btn-secondary" href="auth.html">Se connecter</a>';

    overlay.innerHTML =
      '<div class="ov-head"><span class="eyebrow" style="margin:0;">Menu</span><span class="meta">AfriWay · 2026</span></div>' +
      '<div class="ov-list">' + items + '</div>' +
      '<div class="ov-foot">' + foot + '</div>';

    document.body.appendChild(overlay);

    function setOpen(on) {
      document.body.classList.toggle("nav-open", on);
      toggle.setAttribute("aria-expanded", on ? "true" : "false");
      toggle.setAttribute("aria-label", on ? "Fermer le menu" : "Ouvrir le menu");
    }
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  function initReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ─── globe 3D ───────────────────────────────────────────────────── */
  function initGlobes() {
    if (!window.AfriWayGlobe || !window.AfriWayGlobe.mount) return;
    var state = loadState();
    var activeCode = NAME_TO_CODE[state.to] || "SN";
    document.querySelectorAll("[data-globe]").forEach(function (canvas) {
      var inst = window.AfriWayGlobe.mount(canvas, { active: activeCode });
      canvas._globe = inst;
    });

    function activate(code) {
      document.querySelectorAll("[data-globe]").forEach(function (c) {
        if (c._globe && c._globe.setActive) c._globe.setActive(code);
      });
      var name = (window.AfriWayGlobe.COUNTRIES[code] || {}).name || code;
      document.querySelectorAll("[data-map-label]").forEach(function (el) {
        el.textContent = name;
        el.setAttribute("data-country", code);
        var badge = el.closest ? el.closest(".route-badge") : null;
        if (badge) badge.setAttribute("data-country", code);
      });
      document.querySelectorAll("[data-country-code]").forEach(function (chip) {
        chip.classList.toggle("is-on", chip.getAttribute("data-country-code") === code);
      });
    }
    activate(activeCode);

    document.querySelectorAll("[data-country-code]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        activate(chip.getAttribute("data-country-code"));
      });
    });
  }

  function initAuth() {
    var root = document.querySelector("[data-auth]");
    if (!root) return;

    if (isAuthed()) { location.replace("dashboard.html"); return; }

    var panels = {
      login: root.querySelector("[data-panel='login']"),
      signup: root.querySelector("[data-panel='signup']")
    };
    root.querySelectorAll("[data-auth-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var id = tab.getAttribute("data-auth-tab");
        root.querySelectorAll("[data-auth-tab]").forEach(function (t) {
          t.classList.toggle("btn-primary", t === tab);
          t.classList.toggle("btn-secondary", t !== tab);
        });
        Object.keys(panels).forEach(function (key) {
          if (panels[key]) panels[key].hidden = key !== id;
        });
      });
    });

    function validate(form) {
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        var wrap = input.closest(".field");
        var err = wrap && wrap.querySelector(".field-error");
        var min = parseInt(input.getAttribute("minlength") || "0", 10);
        var invalid = !input.value.trim() ||
          (input.type === "email" && input.value.indexOf("@") === -1) ||
          (input.type === "password" && min && input.value.length < min);
        input.classList.toggle("is-invalid", invalid);
        if (err) err.classList.toggle("is-visible", invalid);
        if (invalid) ok = false;
      });
      return ok;
    }
    function setError(form, message) {
      var box = form.querySelector(".auth-error");
      if (box) { box.textContent = message; box.hidden = false; }
      else { toast(message); }
    }
    function clearError(form) {
      var box = form.querySelector(".auth-error");
      if (box) box.hidden = true;
    }

    root.querySelectorAll("form").forEach(function (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        clearError(form);
        if (!validate(form)) { toast("Vérifiez les champs en rouge."); return; }
        var email = (form.querySelector('input[type="email"]') || {}).value || "";
        var pass = (form.querySelector('input[type="password"]') || {}).value || "";
        var nameInput = form.querySelector("[name='name']");
        var isLogin = form.getAttribute("data-panel") === "login";

        if (isLogin) {
          var okCreds = email.trim().toLowerCase() === DEFAULT_USER.email && pass.trim() === DEFAULT_USER.password;
          if (!okCreds) {
            setError(form, "Identifiants incorrects. Démo : " + DEFAULT_USER.email + " / " + DEFAULT_USER.password);
            return;
          }
          signIn({ email: DEFAULT_USER.email, name: DEFAULT_USER.name });
        } else {
          var name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Voyageur AfriWay";
          signIn({ email: email.trim(), name: name });
        }
        toast("Bienvenue. Redirection…");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 600);
      });
    });
  }

  function labelGoal(id) {
    return { etudes: "Études", travail: "Travail", voyage: "Voyage", installation: "Installation", entrepreneuriat: "Entrepreneuriat" }[id] || id;
  }

  function initChoices() {
    document.querySelectorAll("[data-choice-group]").forEach(function (group) {
      var multi = group.getAttribute("data-multi") === "true";
      group.querySelectorAll("[data-choice]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!multi) {
            group.querySelectorAll("[data-choice]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          }
          var pressed = btn.getAttribute("aria-pressed") === "true";
          btn.setAttribute("aria-pressed", multi ? (!pressed).toString() : "true");
        });
      });
    });

    var form = document.querySelector("[data-parcours-form]");
    if (!form) return;
    var state = loadState();
    if (state.from) form.querySelector('[name="from"]').value = state.from;
    if (state.to) form.querySelector('[name="to"]').value = state.to;

    function syncPreview() {
      var from = form.querySelector('[name="from"]').value || "—";
      var to = form.querySelector('[name="to"]').value || "—";
      var goalBtn = document.querySelector('[data-choice-group="goal"] [aria-pressed="true"]');
      var goal = goalBtn ? goalBtn.getAttribute("data-choice") : "";
      document.querySelectorAll("[data-preview-from]").forEach(function (el) { el.textContent = from; });
      document.querySelectorAll("[data-preview-to]").forEach(function (el) { el.textContent = to; });
      document.querySelectorAll("[data-preview-goal]").forEach(function (el) { el.textContent = labelGoal(goal || "etudes"); });
      var code = NAME_TO_CODE[to];
      if (code) {
        document.querySelectorAll("[data-globe]").forEach(function (c) {
          if (c._globe && c._globe.setActive) c._globe.setActive(code);
        });
        document.querySelectorAll("[data-map-label]").forEach(function (el) { el.textContent = to; });
      }
    }
    form.querySelectorAll("select").forEach(function (s) { s.addEventListener("change", syncPreview); });
    document.querySelectorAll('[data-choice-group="goal"] [data-choice]').forEach(function (b) {
      b.addEventListener("click", function () { setTimeout(syncPreview, 0); });
    });
    syncPreview();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var from = form.querySelector('[name="from"]').value;
      var to = form.querySelector('[name="to"]').value;
      var goalBtn = document.querySelector('[data-choice-group="goal"] [aria-pressed="true"]');
      var goal = goalBtn ? goalBtn.getAttribute("data-choice") : "";
      var ok = true;
      if (!from || !to || from === to) { toast("Choisissez deux pays différents."); ok = false; }
      if (!goal) { toast("Sélectionnez un objectif."); ok = false; }
      if (!ok) return;
      saveState({ from: from, to: to, goal: goal });
      toast("Parcours enregistré.");
      setTimeout(function () { window.location.href = "dashboard.html"; }, 400);
    });
  }

  function fillJourneyHints() {
    var state = loadState();
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var key = el.getAttribute("data-bind");
      var map = {
        from: state.from || "Sénégal",
        to: state.to || "Côte d'Ivoire",
        goal: labelGoal(state.goal || "etudes"),
        name: (state.user && state.user.name) || "Awa Diop",
        email: (state.user && state.user.email) || "awa@exemple.sn"
      };
      if (map[key] != null) el.textContent = map[key];
    });
  }

  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (root) {
      var tabs = root.querySelectorAll("[role='tab']");
      var panels = root.querySelectorAll("[role='tabpanel']");
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          var id = tab.getAttribute("aria-controls");
          tabs.forEach(function (t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
          panels.forEach(function (p) { p.hidden = p.id !== id; });
        });
      });
    });
  }

  function initChecklist() {
    var list = document.querySelector("[data-checklist]");
    if (!list) return;
    var key = "checklist";
    var state = loadState();
    var done = new Set(state[key] || []);
    var items = list.querySelectorAll("[data-check-id]");
    function sync() {
      var n = 0;
      items.forEach(function (item) {
        var id = item.getAttribute("data-check-id");
        var on = done.has(id);
        item.classList.toggle("is-done", on);
        item.querySelector(".check-toggle").setAttribute("aria-pressed", on ? "true" : "false");
        if (on) n += 1;
      });
      var pct = items.length ? Math.round((n / items.length) * 100) : 0;
      var bar = document.querySelector("[data-progress]");
      var label = document.querySelector("[data-progress-label]");
      if (bar) bar.style.setProperty("--p", pct + "%");
      if (label) label.textContent = pct + " %";
      var patch = {}; patch[key] = Array.from(done); saveState(patch);
    }
    items.forEach(function (item) {
      var btn = item.querySelector(".check-toggle");
      btn.addEventListener("click", function () {
        var id = item.getAttribute("data-check-id");
        if (done.has(id)) done.delete(id); else done.add(id);
        sync();
      });
    });
    sync();
  }

  function initChat() {
    var shells = document.querySelectorAll("[data-chat]");
    if (!shells.length) return;

    var synth = ("speechSynthesis" in window) ? window.speechSynthesis : null;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var replies = [
      "Pour un séjour études, préparez le dossier d'admission et une preuve de ressources. Le détail est dans le module Documents.",
      "Les délais consulaires varient selon le pays. Visez 8 à 12 semaines avant le départ pour rester serein.",
      "Côté logement, privilégiez un quartier proche du campus pour limiter les trajets. Le module Logement liste les pistes.",
      "Pensez à vérifier la validité de votre passeport : six mois après la date de retour est un bon repère."
    ];
    var i = 0;

    function pickVoice() {
      if (!synth || !synth.getVoices) return null;
      var voices = synth.getVoices() || [];
      return voices.filter(function (v) { return /^fr/i.test(v.lang); })[0] || null;
    }

    shells.forEach(function (root) {
      if (root.hasAttribute("data-lock-when-anon") && !isAuthed()) {
        root.classList.add("is-locked");
        return;
      }
      var log = root.querySelector(".chat-log");
      var form = root.querySelector(".chat-compose");
      var input = form ? form.querySelector("input") : null;
      if (!log) return;

      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var modeGroup = root.querySelector("[data-chat-mode]");
      var voiceStage = root.querySelector("[data-voice-stage]");
      var mic = root.querySelector("[data-mic]");
      var hint = root.querySelector("[data-voice-hint]");
      var rec = null;
      var listening = false;
      var said = "";

      function scroll() { log.scrollTop = log.scrollHeight; }
      function isVoice() { return root.classList.contains("is-voice"); }

      function typeInto(el, text) {
        if (reduce) { el.textContent = text; scroll(); return; }
        var caret = document.createElement("span");
        caret.className = "caret";
        el.appendChild(caret);
        var n = 0;
        (function step() {
          if (n < text.length) {
            caret.insertAdjacentText("beforebegin", text.charAt(n));
            n += 1;
            scroll();
            window.setTimeout(step, 14);
          } else {
            caret.remove();
            scroll();
          }
        })();
      }

      function speak(text) {
        if (!isVoice()) return;
        var finished = false;
        root.classList.add("is-speaking");
        function done() {
          if (finished) return;
          finished = true;
          root.classList.remove("is-speaking", "is-thinking");
        }
        if (synth) {
          var u = new SpeechSynthesisUtterance(text);
          u.lang = "fr-FR";
          var v = pickVoice();
          if (v) u.voice = v;
          u.onend = done;
          u.onerror = done;
          try { synth.cancel(); synth.speak(u); } catch (e) { /* ignore */ }
          window.setTimeout(done, Math.min(30000, 1800 + text.length * 78));
        } else {
          window.setTimeout(done, Math.min(6000, 900 + text.length * 35));
        }
      }

      function ask(text) {
        var user = document.createElement("div");
        user.className = "bubble bubble-user";
        user.textContent = text;
        log.appendChild(user);
        scroll();

        root.classList.add("is-thinking");
        var typing = document.createElement("div");
        typing.className = "typing";
        typing.setAttribute("aria-label", "L'assistant écrit");
        typing.innerHTML = "<span></span><span></span><span></span>";
        log.appendChild(typing);
        scroll();

        var reply = replies[i % replies.length];
        i += 1;
        window.setTimeout(function () {
          typing.remove();
          root.classList.remove("is-thinking");
          var bot = document.createElement("div");
          bot.className = "bubble bubble-bot";
          log.appendChild(bot);
          typeInto(bot, reply);
          speak(reply);
        }, reduce ? 150 : 950);
      }

      if (form && input) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var text = input.value.trim();
          if (!text) return;
          input.value = "";
          ask(text);
        });
      }

      root.querySelectorAll("[data-suggest]").forEach(function (chip) {
        chip.addEventListener("click", function () { ask(chip.getAttribute("data-suggest")); });
      });

      function stopRec() {
        listening = false;
        if (voiceStage) voiceStage.classList.remove("is-recording");
        if (mic) mic.setAttribute("aria-pressed", "false");
        try { if (rec) rec.stop(); } catch (e) { /* ignore */ }
      }

      function startRec() {
        if (!rec || listening) return;
        if (synth) synth.cancel();
        root.classList.remove("is-speaking");
        said = "";
        try { rec.start(); } catch (e) { /* ignore */ }
      }

      if (SR) {
        rec = new SR();
        rec.lang = "fr-FR";
        rec.interimResults = true;
        rec.continuous = false;
        rec.onstart = function () {
          listening = true;
          said = "";
          if (voiceStage) voiceStage.classList.add("is-recording");
          if (mic) mic.setAttribute("aria-pressed", "true");
          if (hint) hint.textContent = "Je vous écoute…";
        };
        rec.onresult = function (ev) {
          var interim = "";
          for (var k = ev.resultIndex; k < ev.results.length; k++) {
            var r = ev.results[k];
            if (r.isFinal) said += r[0].transcript;
            else interim += r[0].transcript;
          }
          if (hint) hint.textContent = (interim.trim() || "Je vous écoute…");
        };
        rec.onerror = function () {
          stopRec();
          if (hint) hint.textContent = "Je n'ai pas bien saisi. Réessayez.";
        };
        rec.onend = function () {
          var text = said.trim();
          stopRec();
          if (hint) hint.textContent = text ? "Réponse en cours…" : "Appuyez sur le micro et parlez";
          if (text) ask(text);
        };
      }

      if (mic) {
        mic.addEventListener("click", function () {
          if (listening) stopRec(); else startRec();
        });
      }

      function setMode(m) {
        var voice = m === "voice";
        if (voice) root.classList.add("is-voice"); else root.classList.remove("is-voice");
        if (modeGroup) {
          modeGroup.querySelectorAll("[data-mode]").forEach(function (b) {
            var on = b.getAttribute("data-mode") === m;
            if (on) b.classList.add("is-on"); else b.classList.remove("is-on");
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
        }
        if (voice) {
          if (hint) hint.textContent = SR
            ? "Appuyez sur le micro et parlez"
            : "Dictée indisponible ici — l'assistant répondra à voix haute";
        } else {
          if (synth) synth.cancel();
          root.classList.remove("is-speaking");
          stopRec();
        }
      }

      if (mic && !SR) {
        mic.disabled = true;
        mic.setAttribute("title", "Dictée non prise en charge par ce navigateur");
      }

      if (modeGroup) {
        modeGroup.querySelectorAll("[data-mode]").forEach(function (btn) {
          btn.addEventListener("click", function () { setMode(btn.getAttribute("data-mode")); });
        });
      }
    });
  }

  function initFilters() {
    var input = document.querySelector("[data-filter-input]");
    var scope = document.querySelector("[data-filter-scope]");
    if (!input || !scope) return;
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      scope.querySelectorAll("[data-filter-item]").forEach(function (row) {
        var hay = (row.getAttribute("data-filter-item") || "").toLowerCase();
        row.hidden = q !== "" && hay.indexOf(q) === -1;
      });
    });
  }

  function initEvents() {
    var root = document.querySelector("[data-events]");
    if (!root) return;

    var dataEl = document.querySelector("[data-events-json]");
    var events = [];
    if (dataEl) { try { events = JSON.parse(dataEl.textContent || "[]"); } catch (e) { events = []; } }
    var byId = {};
    events.forEach(function (ev) { byId[ev.id] = ev; });

    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    var grid = root.querySelector("[data-event-grid]");
    var cards = [];
    if (grid && grid.hasAttribute("data-event-render")) {
      events.forEach(function (ev) {
        var card = document.createElement("article");
        card.className = "ev-card";
        if (ev.featured) card.classList.add("is-featured");
        card.setAttribute("data-country", ev.code);
        card.setAttribute("data-event-id", ev.id);
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", "Détails : " + ev.title);
        card.innerHTML =
          '<span class="ev-card-top">' +
            '<span class="ev-date">' + esc(ev.dateLabel) + '</span>' +
            (ev.featured ? '<span class="ev-badge"><span class="dot" aria-hidden="true"></span>À venir</span>' : "") +
          '</span>' +
          '<h3>' + esc(ev.title) + '</h3>' +
          '<span class="ev-place"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>' + esc(ev.place) + '</span>' +
          '<p class="ev-desc">' + esc(ev.short) + '</p>' +
          '<span class="ev-arrow">Voir les détails <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
        grid.appendChild(card);
        cards.push(card);
      });
    } else {
      cards = Array.prototype.slice.call(grid
        ? grid.querySelectorAll("[data-event-card]")
        : root.querySelectorAll("[data-event-card]"));
    }
    var chips = Array.prototype.slice.call(root.querySelectorAll("[data-event-country]"));

    function apply(country) {
      cards.forEach(function (card) {
        var match = country === "all" || card.getAttribute("data-country") === country;
        card.hidden = !match;
        if (match) {
          card.classList.remove("is-in");
          void card.offsetWidth;
          card.classList.add("is-in");
        }
      });
      var count = cards.filter(function (c) { return !c.hidden; }).length;
      var counter = root.querySelector("[data-event-count]");
      if (counter) counter.textContent = (count < 10 ? "0" : "") + count;
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle("is-on", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        apply(chip.getAttribute("data-event-country"));
      });
    });

    var modal = document.querySelector("[data-event-modal]");
    var lastFocus = null;

    function open(id) {
      var ev = byId[id];
      if (!ev || !modal) return;
      var set = function (sel, val) { var el = modal.querySelector(sel); if (el) el.textContent = val; };
      set("[data-ev-kicker]", ev.kicker || "Événement");
      set("[data-ev-title]", ev.title);
      set("[data-ev-date]", ev.date);
      set("[data-ev-place]", ev.place);
      set("[data-ev-desc]", ev.desc);
      set("[data-ev-access]", ev.access);
      set("[data-ev-watch]", ev.watch);
      var link = modal.querySelector("[data-ev-link]");
      if (link) {
        link.setAttribute("href", "pays.html");
        link.setAttribute("data-ev-country", ev.code);
      }
      lastFocus = document.activeElement;
      modal.hidden = false;
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      var close = modal.querySelector("[data-ev-close]");
      if (close) close.focus();
    }

    function close() {
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () { open(card.getAttribute("data-event-id")); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(card.getAttribute("data-event-id"));
        }
      });
    });

    if (modal) {
      modal.querySelectorAll("[data-ev-close]").forEach(function (b) {
        b.addEventListener("click", close);
      });
      modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.hidden) close();
      });
      var link = modal.querySelector("[data-ev-link]");
      if (link) {
        link.addEventListener("click", function () {
          var code = link.getAttribute("data-ev-country");
          if (code) saveState({ country: code });
        });
      }
    }

    apply("all");
  }

  function safe(fn) { try { fn(); } catch (e) { /* une étape ne doit pas bloquer les autres */ } }

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-logout]") : null;
      if (!b) return;
      e.preventDefault();
      signOut();
      window.location.href = "accueil.html";
    });

    safe(initAuth);
    safe(injectNav);
    safe(initReveal);
    safe(initGlobes);
    safe(initChoices);
    safe(fillJourneyHints);
    safe(initTabs);
    safe(initChecklist);
    safe(initChat);
    safe(initFilters);
    safe(initEvents);
  });

  window.AfriWay = {
    loadState: loadState,
    saveState: saveState,
    toast: toast,
    isAuthed: isAuthed,
    signIn: signIn,
    signOut: signOut
  };
})();
