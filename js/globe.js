/* AfriWay — globe 3D animé, canvas 2D pur (aucune dépendance, fonctionne hors-ligne).
   Un globe de points + arcs corail animés reliant Dakar aux destinations du corridor.
   Angular 17+ : ce module devient un composant <app-globe> (ViewChild canvas + render loop). */
(function () {
  "use strict";

  var GOLDEN = Math.PI * (3 - Math.sqrt(5));

  var COUNTRIES = {
    SN: { name: "Sénégal", lat: 14.69, lon: -17.44 },
    CI: { name: "Côte d'Ivoire", lat: 5.36, lon: -4.01 },
    ML: { name: "Mali", lat: 12.64, lon: -8.0 },
    BF: { name: "Burkina Faso", lat: 12.37, lon: -1.52 },
    GN: { name: "Guinée", lat: 9.64, lon: -13.58 }
  };
  var ORIGIN = "SN";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function toVec(lat, lon) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function buildSphere(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var t = i * GOLDEN;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    return pts;
  }

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var stage = canvas.closest(".globe-stage") || canvas;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var colors = {
      fg: cssVar("--fg", "#141413"),
      muted: cssVar("--muted", "#5e5d59"),
      accent: cssVar("--accent", "#d97757"),
      accentInk: cssVar("--accent-ink", "#c96442"),
      border: cssVar("--border", "#e8e6dc"),
      byCountry: {
        SN: cssVar("--c-sn", "#c96442"),
        CI: cssVar("--c-ci", "#a06a18"),
        ML: cssVar("--c-ml", "#56743f"),
        BF: cssVar("--c-bf", "#27716b"),
        GN: cssVar("--c-gn", "#3c5c93")
      }
    };
    function countryColor(code, fallback) { return colors.byCountry[code] || fallback || colors.accent; }

    var w = 0, h = 0, dpr = 1, R = 100, cx = 0, cy = 0;
    var sphere = [];
    var rotY = opts.rotY != null ? opts.rotY : -0.6;
    var rotX = opts.rotX != null ? opts.rotX : -0.42;
    var vel = 0, dragging = false, lastX = 0, lastY = 0, moved = false;
    var running = true, visible = true, raf = 0, t = 0;
    var active = opts.active || ORIGIN;

    // arêtes pré-calculées (a0 -> mid -> a1), en vecteurs unitaires
    var origin = toVec(COUNTRIES[ORIGIN].lat, COUNTRIES[ORIGIN].lon);
    var edges = [];
    Object.keys(COUNTRIES).forEach(function (code) {
      if (code === ORIGIN) return;
      var c = COUNTRIES[code];
      var a1 = toVec(c.lat, c.lon);
      var dot = clamp(origin[0] * a1[0] + origin[1] * a1[1] + origin[2] * a1[2], -1, 1);
      var ang = Math.acos(dot);
      var mid = [origin[0] + a1[0], origin[1] + a1[1], origin[2] + a1[2]];
      var ml = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]) || 1;
      mid = [mid[0] / ml, mid[1] / ml, mid[2] / ml];
      var raise = 1.18 + 0.5 * (ang / Math.PI);
      edges.push({ code: code, a0: origin, a1: a1, mid: mid, raise: raise, phase: Math.random() });
    });

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      R = Math.min(w, h) * 0.39;
      var n = w < 420 ? 820 : w < 720 ? 1200 : 1650;
      if (sphere.length !== n) sphere = buildSphere(n);
    }

    function project(v) {
      var cyw = Math.cos(rotY), syw = Math.sin(rotY);
      var x = v[0] * cyw + v[2] * syw;
      var z = -v[0] * syw + v[2] * cyw;
      var y = v[1];
      var cxw = Math.cos(rotX), sxw = Math.sin(rotX);
      var y2 = y * cxw - z * sxw;
      var z2 = y * sxw + z * cxw;
      var persp = 2.9 / (2.9 - z2);
      return { x: cx + x * persp * R, y: cy - y2 * persp * R, z: z2, s: persp };
    }

    function arcPoint(e, k) {
      var u = 1 - k, a = e.a0, m = e.mid, b = e.a1;
      var x = u * u * a[0] + 2 * u * k * m[0] * e.raise + k * k * b[0];
      var y = u * u * a[1] + 2 * u * k * m[1] * e.raise + k * k * b[1];
      var z = u * u * a[2] + 2 * u * k * m[2] * e.raise + k * k * b[2];
      return [x, y, z];
    }

    function drawDots() {
      var base = R * 0.006;
      for (var i = 0; i < sphere.length; i++) {
        var p = project(sphere[i]);
        var front = p.z > 0;
        var a = front ? 0.16 + 0.44 * p.z : 0.05;
        var s = base * (front ? 0.85 + 0.6 * p.z : 0.7) * p.s;
        ctx.globalAlpha = a;
        ctx.fillStyle = colors.fg;
        ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      // horizon
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.0, 0, Math.PI * 2);
      ctx.strokeStyle = colors.border;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawArcs() {
      var SAMPLES = 56;
      for (var e = 0; e < edges.length; e++) {
        var edge = edges[e];
        var isActive = edge.code === active;
        var prev = null;
        for (var i = 0; i <= SAMPLES; i++) {
          var k = i / SAMPLES;
          var v = arcPoint(edge, k);
          var p = project(v);
          if (prev) {
            var behind = p.z < -0.12 || prev.z < -0.12;
            if (!behind) {
              var depth = clamp((p.z + prev.z) / 2 + 0.4, 0, 1);
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = isActive ? countryColor(active, colors.accentInk) : colors.muted;
              ctx.globalAlpha = (isActive ? 0.5 : 0.22) * depth;
              ctx.lineWidth = isActive ? 1.5 : 1;
              ctx.stroke();
            }
          }
          prev = p;
        }

        // comète
        if (!reduce) {
          var c = (t * 0.00028 + edge.phase) % 1;
          var tail = 0.14;
          var seg = null;
          ctx.globalAlpha = 1;
          ctx.lineCap = "round";
          for (var j = 0; j <= 10; j++) {
            var kk = c - (j / 10) * tail;
            if (kk < 0 || kk > 1) { seg = null; continue; }
            var pv = project(arcPoint(edge, kk));
            if (pv.z < -0.1) { seg = null; continue; }
            if (seg) {
              ctx.beginPath();
              ctx.moveTo(seg.x, seg.y);
              ctx.lineTo(pv.x, pv.y);
              ctx.strokeStyle = colors.byCountry[edge.code] || colors.accent;
              ctx.globalAlpha = (1 - j / 10) * 0.9 * (0.5 + pv.z);
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            seg = pv;
          }
          ctx.globalAlpha = 1;
        }
      }
    }

    function drawMarkers() {
      var order = Object.keys(COUNTRIES);
      for (var i = 0; i < order.length; i++) {
        var code = order[i];
        var c = COUNTRIES[code];
        var p = project(toVec(c.lat, c.lon));
        if (p.z < -0.05) continue;
        var isOrigin = code === ORIGIN;
        var isActive = code === active;
        var col = colors.byCountry[code] || colors.fg;
        var depthA = clamp(0.35 + p.z, 0.2, 1);
        var base = (isOrigin ? 4 : 3) * p.s;
        ctx.globalAlpha = depthA;
        // anneau
        ctx.beginPath();
        ctx.arc(p.x, p.y, base + 4, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.globalAlpha = depthA * 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        // pulse origine
        if (isOrigin && !reduce) {
          var pr = base + 4 + ((t * 0.045) % 26);
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
          ctx.globalAlpha = (1 - ((t * 0.045) % 26) / 26) * depthA * 0.6;
          ctx.strokeStyle = col;
          ctx.stroke();
        }
        // point
        ctx.globalAlpha = depthA;
        ctx.beginPath();
        ctx.arc(p.x, p.y, base, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        // étiquette
        if (p.z > 0.2) {
          ctx.globalAlpha = clamp((p.z - 0.2) * 2.4, 0, 1) * 0.9;
          ctx.fillStyle = isOrigin || isActive ? (colors.byCountry[code] || colors.accentInk) : colors.muted;
          ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
          ctx.textAlign = "left";
          ctx.fillText(c.name, p.x + base + 8, p.y + 3.5);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!running || !visible) return;
      t = now || 0;

      if (!reduce) {
        if (!dragging) {
          rotY += 0.0016 + vel;
          vel *= 0.94;
          if (Math.abs(vel) < 0.00002) vel = 0;
        }
      }

      ctx.clearRect(0, 0, w, h);
      drawDots();
      drawArcs();
      drawMarkers();
    }

    // ── interactions ──
    function onDown(e) {
      dragging = true; moved = false; vel = 0;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      rotY += dx * 0.006;
      rotX = clamp(rotX + dy * 0.006, -1.15, 1.15);
      vel = dx * 0.0004;
    }
    function onUp(e) {
      dragging = false;
      canvas.releasePointerCapture && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId) && canvas.releasePointerCapture(e.pointerId);
    }

    if (!reduce) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      canvas.addEventListener("pointerleave", onUp);
    }

    // pause hors écran / onglet caché
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible = en.isIntersecting; });
      }, { threshold: 0.02 });
      io.observe(stage);
    }
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) t = performance.now();
    });

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(resize);
      ro.observe(stage);
    }
    window.addEventListener("resize", resize);

    resize();
    raf = requestAnimationFrame(frame);

    return {
      setActive: function (code) { if (COUNTRIES[code]) active = code; },
      setData: function (countries, originCode) {
        if (originCode && COUNTRIES[originCode]) { /* reserved */ }
      },
      get canvas() { return canvas; }
    };
  }

  window.AfriWayGlobe = { mount: mount, COUNTRIES: COUNTRIES, ORIGIN: ORIGIN };
})();
