/*!
 * landing-motion runtime v1.2
 * Declarative scroll motion for landing pages, driven by data-* attributes.
 * Requires: gsap 3.12+ and ScrollTrigger. Optional: Lenis 1.3+ (smooth scroll).
 *
 * Usage:
 *   const motion = LandingMotion.init();          // whole document
 *   const motion = LandingMotion.init({ root });  // scoped (React component, etc.)
 *   motion.destroy();                             // reverts every tween/trigger it created
 *
 * Attributes (see references/patterns.md for the full contract):
 *   data-boot-cover                solid cover until load + fonts + paint (pages without a preloader)
 *   data-preloader                 real-progress preloader (one per page)
 *   data-preloader="staged"        choreographed brand intro: scripted stops, wipe, split exit
 *   data-intro="up|fade|pop"       plays once after the preloader (hero entrance)
 *   data-reveal="up|left|right|scale|pop|fade"   one-shot reveal on enter, reverses on leave-back
 *   data-reveal-group              children with [data-reveal-item] reveal with stagger
 *   data-scrub-reveal              fade + rise tied to scroll position
 *   data-words                     headline lights up word by word while scrolling
 *   data-parallax="from,to"        yPercent drift tied to the closest [data-parallax-scope]
 *   data-drift="px"                small independent float (±px) for layered scenes
 *   data-count="150"               number counts up on enter (prefix/suffix attributes optional)
 *   data-pin-path                  pinned section that draws [data-path] and lights [data-step]
 *   data-floating-cta              fixed CTA shown between [data-floating-show] and [data-floating-hide]
 *   a[data-transition="Label"]     page transition to another document (panel up → label → panel collapses)
 *
 * Utilities: LandingMotion.bus (event bus with replay), LandingMotion.blurSwap(el, content),
 *            LandingMotion.focusList(container) → { set(index) }
 */
(function (global) {
  'use strict';

  var TOKENS = {
    ease: {
      out: 'power3.out',      // default for reveals: fast start, long soft landing
      soft: 'power1.out',     // scrubbed motion (the scroll already provides acceleration)
      count: 'power2.out',    // counters
      curtain: 'power4.inOut',// big surfaces leaving the screen (preloader)
      pop: 'back.out(1.6)',   // small playful objects
      drift: 'sine.inOut',    // ambient float
      linear: 'none'          // parallax and path drawing (must track the scroll 1:1)
    },
    dur: { micro: 0.25, fast: 0.6, base: 0.9, slow: 1.2, hero: 1.3, count: 1.8, curtain: 0.7 },
    dist: { sm: 40, md: 56, lg: 88 },
    stagger: { tight: 0.08, base: 0.12, loose: 0.16 },
    start: { enter: 'top 85%', group: 'top 86%', late: 'top 70%' },
    scrub: { tight: 0.3, base: 0.5, loose: 0.8 }
  };

  var FROM = {
    up:    function (d) { return { autoAlpha: 0, y: d }; },
    left:  function (d) { return { autoAlpha: 0, x: -d }; },
    right: function (d) { return { autoAlpha: 0, x: d }; },
    scale: function (d) { return { autoAlpha: 0, y: d * 1.6, scale: 0.97 }; },
    pop:   function (d) { return { autoAlpha: 0, y: d * 1.6, scale: 0.68 }; },
    fade:  function () { return { autoAlpha: 0 }; },
    blur:  function () { return { autoAlpha: 0, y: 18, filter: 'blur(12px)' }; }   // "focus in"
  };
  var TO = { autoAlpha: 1, x: 0, y: 0, scale: 1 };
  function toFor(kind, extra) {
    return Object.assign({}, TO, kind === 'blur' ? { filter: 'blur(0px)', ease: 'power2.out' } : {}, extra || {});
  }

  // CSS-style cubic-bezier as a GSAP ease (no CustomEase plugin needed)
  function cubicBezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var X = function (u) { return ((ax * u + bx) * u + cx) * u; };
    var dX = function (u) { return (3 * ax * u + 2 * bx) * u + cx; };
    return function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      var u = t, i, x, d;
      for (i = 0; i < 8; i++) {                       // Newton
        x = X(u) - t; if (Math.abs(x) < 1e-6) break;
        d = dX(u); if (Math.abs(d) < 1e-6) break;
        u -= x / d;
      }
      if (u < 0 || u > 1 || Math.abs(X(u) - t) > 1e-4) { // bisection fallback
        var lo = 0, hi = 1; u = t;
        for (i = 0; i < 30; i++) { x = X(u); if (Math.abs(x - t) < 1e-6) break; if (x < t) lo = u; else hi = u; u = (lo + hi) / 2; }
      }
      return ((ay * u + by) * u + cy) * u;
    };
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function all(root, sel) {
    var list = Array.prototype.slice.call(root.querySelectorAll(sel));
    if (root !== document && root.matches && root.matches(sel)) list.unshift(root);
    return list;
  }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---------- word splitting (accessible) ---------- */
  function splitWords(el) {
    if (el.__lmSplit) return el.__lmSplit;
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var words = [];
    // keep <br> and line wrappers, only split text nodes
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.textContent.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
        var span = document.createElement('span');
        span.className = 'lm-word';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = p;
        frag.appendChild(span);
        words.push(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    // screen readers get the sentence once, not word fragments
    var sr = document.createElement('span');
    sr.className = 'lm-sr';
    sr.textContent = text;
    el.appendChild(sr);
    el.__lmSplit = words;
    return words;
  }

  /* ---------- the runtime ---------- */
  function init(options) {
    var opts = options || {};
    var gsap = global.gsap;
    var ScrollTrigger = global.ScrollTrigger;
    if (!gsap || !ScrollTrigger) {
      console.warn('[landing-motion] gsap + ScrollTrigger are required');
      document.documentElement.classList.remove('has-motion');
      return { destroy: function () {}, refresh: function () {}, lenis: null };
    }
    gsap.registerPlugin(ScrollTrigger);

    var root = opts.root || document;
    var reduced = opts.reducedMotion != null ? opts.reducedMotion : prefersReducedMotion();
    var cleanups = [];
    var lenis = null;
    global.__lmBooted = true;

    /* Smooth scroll: Lenis driven by GSAP's ticker so both share one clock. */
    if (!reduced && opts.smooth !== false && global.Lenis && root === document) {
      lenis = new global.Lenis({ duration: opts.smoothDuration || 1.2, anchors: true });
      lenis.on('scroll', ScrollTrigger.update);
      var tick = function (time) { lenis.raf(time * 1000); };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(function () { gsap.ticker.remove(tick); lenis.destroy(); });
    }

    var ctx = gsap.context(function () {
      if (reduced) { settleFinalStates(root); return; }
      setupReveals(root);
      setupGroups(root);
      setupScrubReveals(root);
      setupWords(root);
      setupParallax(root);
      setupCounters(root);
      setupPinPaths(root);
    }, root === document ? undefined : root);

    var floating = setupFloatingCta(root, reduced);
    if (floating) cleanups.push(floating);

    /* Preloader → intro → refresh. Layout changes after fonts/images, so refresh triggers. */
    var refresh = function () { ScrollTrigger.refresh(); };
    if (root === document) cleanups.push(setupTransitions(reduced));
    var incoming = root === document ? readIncoming() : null;
    var loading = incoming && !reduced
      ? runIncoming(incoming, lenis)          // arrived through a page transition: it is the loader
      : runPreloader(root, reduced, opts, lenis);
    var ready = loading.then(function () {
      if (!reduced) ctx.add(function () { playIntro(root); });
      else all(root, '[data-intro]').forEach(function (el) { gsap.set(el, TO); });
      refresh();
      document.dispatchEvent(new CustomEvent('motion:ready'));
    });
    global.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    cleanups.push(function () { global.removeEventListener('load', refresh); });

    return {
      lenis: lenis,
      ready: ready,
      tokens: TOKENS,
      refresh: refresh,
      destroy: function () {
        ctx.revert();
        cleanups.forEach(function (fn) { fn(); });
      }
    };
  }

  /* ---------- reduced motion: show everything in its final state ---------- */
  function settleFinalStates(root) {
    var gsap = global.gsap;
    gsap.set(all(root, '[data-reveal],[data-reveal-item],[data-scrub-reveal],[data-intro]'), TO);
    all(root, '[data-count]').forEach(function (el) { writeCount(el, num(el.getAttribute('data-count'), 0)); });
    all(root, '[data-step]').forEach(function (el) { gsap.set(el, { opacity: 1 }); });
  }

  /* ---------- one-shot reveal ---------- */
  function setupReveals(root) {
    var gsap = global.gsap;
    all(root, '[data-reveal]').forEach(function (el) {
      var kind = el.getAttribute('data-reveal') || 'up';
      var from = (FROM[kind] || FROM.up)(num(el.getAttribute('data-distance'), TOKENS.dist.md));
      var big = kind === 'scale' || kind === 'pop';
      gsap.fromTo(el, from, toFor(kind, {
        duration: num(el.getAttribute('data-duration'), big ? TOKENS.dur.slow : kind === 'blur' ? 0.7 : TOKENS.dur.base),
        delay: num(el.getAttribute('data-delay'), 0),
        ease: kind === 'blur' ? 'power2.out' : TOKENS.ease.out,
        scrollTrigger: {
          trigger: el,
          start: el.getAttribute('data-start') || TOKENS.start.enter,
          toggleActions: 'play none none reverse'
        }
      }));
    });
  }

  function setupGroups(root) {
    var gsap = global.gsap;
    all(root, '[data-reveal-group]').forEach(function (group) {
      var items = all(group, '[data-reveal-item]');
      if (!items.length) return;
      gsap.fromTo(items, FROM.up(num(group.getAttribute('data-distance'), 64)), Object.assign({}, TO, {
        duration: 0.85,
        stagger: num(group.getAttribute('data-stagger'), TOKENS.stagger.base),
        ease: TOKENS.ease.out,
        scrollTrigger: {
          trigger: group,
          start: group.getAttribute('data-start') || TOKENS.start.group,
          toggleActions: 'play none none reverse'
        }
      }));
    });
  }

  /* ---------- scrubbed reveal ---------- */
  function setupScrubReveals(root) {
    var gsap = global.gsap;
    all(root, '[data-scrub-reveal]').forEach(function (el) {
      var targets = el.hasAttribute('data-scrub-children') ? el.children : el;
      gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: el.getAttribute('data-start') || 'top 88%',
          end: el.getAttribute('data-end') || 'top 45%',
          scrub: TOKENS.scrub.base
        }
      }).fromTo(targets, { opacity: 0, y: 52 }, {
        opacity: 1, y: 0, duration: 1.2, ease: TOKENS.ease.soft, stagger: 0.14
      });
    });
  }

  /* ---------- words light up while scrolling ---------- */
  function setupWords(root) {
    var gsap = global.gsap;
    all(root, '[data-words]').forEach(function (el) {
      var words = splitWords(el);
      gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: el.getAttribute('data-start') || 'top 85%',
          end: el.getAttribute('data-end') || 'top 30%',
          scrub: TOKENS.scrub.base
        }
      }).fromTo(words, { opacity: num(el.getAttribute('data-words-dim'), 0.12) }, {
        opacity: 1, duration: 1, stagger: TOKENS.stagger.base, ease: TOKENS.ease.linear
      });
    });
  }

  /* ---------- layered parallax ---------- */
  function setupParallax(root) {
    var gsap = global.gsap;
    all(root, '[data-parallax]').forEach(function (el) {
      var range = (el.getAttribute('data-parallax') || '-10,10').split(',').map(function (v) { return num(v, 0); });
      var scope = el.closest('[data-parallax-scope]') || el.parentElement;
      gsap.fromTo(el, { yPercent: range[0] }, {
        yPercent: range[1], ease: TOKENS.ease.linear,
        scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: TOKENS.scrub.tight }
      });
    });
    all(root, '[data-drift]').forEach(function (el, i) {
      var px = num(el.getAttribute('data-drift'), 6);
      var dir = i % 2 ? 1 : -1;
      var scope = el.closest('[data-parallax-scope]') || el.parentElement;
      gsap.fromTo(el, { y: -px * dir }, {
        y: px * dir, ease: TOKENS.ease.drift,
        scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: TOKENS.scrub.loose }
      });
    });
  }

  /* ---------- counters ---------- */
  function writeCount(el, value) {
    var target = el.querySelector('[data-count-value]') || el;
    target.textContent = String(Math.round(value));
  }

  function setupCounters(root) {
    var gsap = global.gsap;
    var ScrollTrigger = global.ScrollTrigger;
    var groups = new Map();
    all(root, '[data-count]').forEach(function (el) {
      var scope = el.closest('[data-count-scope]') || el;
      if (!groups.has(scope)) groups.set(scope, []);
      groups.get(scope).push(el);
    });
    groups.forEach(function (els, scope) {
      var tweens = [];
      var reset = function () {
        tweens.splice(0).forEach(function (t) { t.kill(); });
        els.forEach(function (el) { writeCount(el, 0); });
      };
      var play = function () {
        reset();
        els.forEach(function (el, i) {
          var state = { v: 0 };
          tweens.push(gsap.to(state, {
            v: num(el.getAttribute('data-count'), 0),
            duration: TOKENS.dur.count, delay: i * TOKENS.stagger.tight, ease: TOKENS.ease.count,
            onUpdate: function () { writeCount(el, state.v); }
          }));
        });
      };
      reset();
      ScrollTrigger.create({ trigger: scope, start: 'top 82%', onEnter: play, onLeaveBack: reset });
    });
  }

  /* ---------- pinned section that draws a path and lights steps ---------- */
  function setupPinPaths(root) {
    var gsap = global.gsap;
    all(root, '[data-pin-path]').forEach(function (section) {
      var mm = gsap.matchMedia();
      mm.add({ mobile: '(max-width: 760px)', desktop: '(min-width: 761px)' }, function (c) {
        // pick the path that is actually rendered at this breakpoint
        var path = all(section, '[data-path]').filter(function (p) {
          return p.getBoundingClientRect().width > 0 || p.getBoundingClientRect().height > 0;
        })[0];
        var steps = all(section, '[data-step]');
        if (!path || steps.length < 2) return;
        var len = path.getTotalLength();
        var factor = num(section.getAttribute(c.conditions.mobile ? 'data-pin-length-mobile' : 'data-pin-length'),
          c.conditions.mobile ? 2.4 : 3.2);
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.set(steps.slice(1), { opacity: 0.28 });
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: section, start: 'top top',
            end: function () { return '+=' + Math.round(global.innerHeight * factor); },
            pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        // Each step lights up when the line actually reaches it: measure the point on the
        // path closest to the step's anchor (its number badge) instead of assuming even spacing.
        var fractions = steps.map(function (step, i) {
          if (step.hasAttribute('data-at')) return num(step.getAttribute('data-at'), 0);
          var f = nearestFraction(path, len, step.querySelector('[data-step-anchor]') || step);
          return f == null ? i / (steps.length - 1) : f;
        });
        var seg = 1 / (steps.length - 1);
        tl.to(path, { strokeDashoffset: 0, duration: 1, ease: TOKENS.ease.linear }, 0);
        steps.forEach(function (step, i) {
          if (i === 0) return;
          var dur = seg * 0.5;
          // never let a step finish after the line does (the last one would end half-lit)
          tl.to(step, { opacity: 1, duration: dur, ease: TOKENS.ease.linear },
            Math.min(Math.max(0, fractions[i] - seg * 0.35), 1 - dur));
        });
      });
    });
  }

  // fraction (0..1) of the path length closest to the centre of `anchor`
  function nearestFraction(path, len, anchor) {
    var ctm = path.getScreenCTM();
    if (!ctm || !anchor) return null;
    var r = anchor.getBoundingClientRect();
    var svg = path.ownerSVGElement;
    var pt = svg.createSVGPoint();
    var best = null, bestD = Infinity, SAMPLES = 240;
    // compare in screen space so preserveAspectRatio="none" stretching is respected
    var ax = r.left + r.width / 2, ay = r.top + r.height / 2;
    for (var s = 0; s <= SAMPLES; s++) {
      var p = path.getPointAtLength(len * s / SAMPLES);
      pt.x = p.x; pt.y = p.y;
      var q = pt.matrixTransform(ctm);
      var d = (q.x - ax) * (q.x - ax) + (q.y - ay) * (q.y - ay);
      if (d < bestD) { bestD = d; best = s / SAMPLES; }
    }
    return best;
  }

  /* ---------- floating CTA with contrast switch ---------- */
  function setupFloatingCta(root, reduced) {
    var bar = (root === document ? document : root).querySelector('[data-floating-cta]');
    if (!bar) return null;
    var ScrollTrigger = global.ScrollTrigger;
    var show = document.querySelector('[data-floating-show]');
    var hide = document.querySelector('[data-floating-hide]');
    var visible = false;
    var setVisible = function (v) {
      visible = v;
      bar.classList.toggle('is-visible', v);
      bar.setAttribute('aria-hidden', v ? 'false' : 'true');
      bar.querySelectorAll('a,button').forEach(function (n) { n.tabIndex = v ? 0 : -1; });
    };
    setVisible(false);
    var triggers = [];
    if (show) triggers.push(ScrollTrigger.create({ trigger: show, start: 'top 70%',
      onEnter: function () { setVisible(true); }, onLeaveBack: function () { setVisible(false); } }));
    if (hide) triggers.push(ScrollTrigger.create({ trigger: hide, start: 'top 85%',
      onEnter: function () { setVisible(false); }, onLeaveBack: function () { setVisible(true); } }));

    // light sections underneath → switch the bar to its light variant
    var lightSections = Array.prototype.slice.call(document.querySelectorAll('[data-surface="light"]'));
    var frame = 0;
    var check = function () {
      frame = 0;
      if (!visible) return;
      var r = bar.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var onLight = lightSections.some(function (s) {
        var b = s.getBoundingClientRect();
        return cx > b.left && cx < b.right && cy > b.top && cy < b.bottom;
      });
      bar.classList.toggle('is-on-light', onLight);
    };
    var onScroll = function () { if (!frame) frame = requestAnimationFrame(check); };
    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', onScroll);
    return function () {
      triggers.forEach(function (t) { t.kill(); });
      global.removeEventListener('scroll', onScroll);
      global.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }

  /* ---------- loading: boot cover, progress preloader, staged preloader ---------- */

  function nextPaint() {
    return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
  }

  // What the first screen needs: marked images, first-section/header images, fonts.
  // Lazy images further down are deliberately NOT forced to load.
  function trackAssets(onProgress) {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('[data-preload], main > section:first-of-type img, header img'));
    var tasks = imgs.map(function (img) {
      return new Promise(function (res) {
        if (img.complete) return res();
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      });
    });
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready.catch(function () {}));
    var done = 0, total = tasks.length || 1;
    tasks.forEach(function (t) { t.then(function () { done++; if (onProgress) onProgress(done / total); }); });
    return Promise.all(tasks);
  }

  function setThemeColor(phase) {
    var meta = document.querySelector('meta[name="theme-color"][data-loading-color]');
    if (!meta) return;
    meta.setAttribute('content', meta.getAttribute(phase === 'loading' ? 'data-loading-color' : 'data-ready-color') || meta.getAttribute('content'));
  }

  function lockScroll(lenis, on) {
    document.documentElement.classList.toggle('is-preloading', on);
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }

  /* Resolves when the hero intro should START (it may overlap the loader's exit);
     the loader removes itself when its own exit finishes. */
  function runPreloader(root, reduced, opts, lenis) {
    var el = document.querySelector('[data-preloader]');
    var cover = document.querySelector('[data-boot-cover]');
    var host = el || cover;
    if (!host) return Promise.resolve();
    var minMs = num(host.getAttribute('data-min'), el ? 900 : 0);
    var maxMs = num(host.getAttribute('data-max'), el ? 3000 : 8000);
    setThemeColor('loading');
    lockScroll(lenis, true);
    var release = function () { lockScroll(lenis, false); setThemeColor('ready'); };
    if (!el) return runBootCover(cover, reduced, maxMs, release);
    var mode = el.getAttribute('data-preloader') || 'progress';
    return mode === 'staged'
      ? runStaged(el, reduced, minMs, maxMs, release)
      : runProgress(el, reduced, minMs, maxMs, release);
  }

  // Cheapest option: a solid cover that hides the unstyled first paint and fades once
  // load + fonts are done and two frames have painted (so nothing pops in under it).
  function runBootCover(cover, reduced, maxMs, release) {
    var gsap = global.gsap;
    return new Promise(function (resolve) {
      var gone = false;
      var finish = function () {
        if (gone) return; gone = true;
        release();
        if (reduced) { cover.remove(); return resolve(); }
        resolve();
        gsap.to(cover, { autoAlpha: 0, duration: 0.45, ease: 'power2.out', onComplete: function () { cover.remove(); } });
      };
      var loaded = document.readyState === 'complete' ? Promise.resolve()
        : new Promise(function (r) { global.addEventListener('load', r, { once: true }); });
      Promise.all([loaded, trackAssets()]).then(nextPaint).then(finish);
      setTimeout(finish, maxMs);
    });
  }

  // Mode "progress": the number follows real asset loading, then a curtain lifts.
  function runProgress(el, reduced, minMs, maxMs, release) {
    var gsap = global.gsap;
    var bar = el.querySelector('[data-preloader-bar]');
    var count = el.querySelector('[data-preloader-count]');
    var fadeOut = el.querySelectorAll('[data-preloader-fade]');
    var started = performance.now();
    var shown = { v: 0 };
    var target = 0;
    var render = function () {
      if (count) count.textContent = Math.round(shown.v) + '%';
      if (bar) bar.style.transform = 'scaleX(' + shown.v / 100 + ')';
    };
    // ease the displayed number toward the real progress (no jumps); hold at 96 until done
    var chase = function () { shown.v += (target - shown.v) * 0.18; if (target - shown.v < 0.5) shown.v = target; render(); };
    gsap.ticker.add(chase);
    var assets = trackAssets(function (f) { target = Math.max(target, f * 96); });

    return new Promise(function (resolve) {
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        target = 100;
        gsap.ticker.remove(chase);
        if (reduced) { el.remove(); release(); return resolve(); }
        var exit = num(el.getAttribute('data-exit-duration'), TOKENS.dur.curtain);
        gsap.timeline({ onComplete: function () { el.remove(); } })
          .to(shown, { v: 100, duration: TOKENS.dur.micro, ease: TOKENS.ease.count, onUpdate: render })
          .to(fadeOut, { opacity: 0, filter: 'blur(2px)', duration: 0.15 })
          .add(function () {
            release();
            // the intro starts while the curtain is still leaving
            gsap.delayedCall(num(el.getAttribute('data-intro-delay'), exit * 0.35), resolve);
          })
          .to(el, { yPercent: -100, duration: exit, ease: TOKENS.ease.curtain }, '<');
      };
      setTimeout(finish, maxMs);
      assets.then(function () {
        setTimeout(finish, Math.max(0, minMs - (performance.now() - started)));
      });
    });
  }

  /* Mode "staged": a choreographed brand intro, not a progress report. It starts only
     once the page is ready (so it never fakes loading), runs through scripted stops with
     holds, overshoots past the edge, then splits: panel down, title up. */
  function runStaged(el, reduced, minMs, maxMs, release) {
    var gsap = global.gsap;
    var count = el.querySelector('[data-preloader-count]');
    var rider = el.querySelector('[data-preloader-rider]');
    var split = el.querySelectorAll('[data-preloader-split]');
    var stops = (el.getAttribute('data-stops') || '30,60').split(',').map(function (v) { return num(v, 0) / 100; });
    var holds = (el.getAttribute('data-holds') || '0.16,0.2').split(',').map(function (v) { return num(v, 0); });
    var durs = (el.getAttribute('data-durations') || '0.65,0.72,1.46').split(',').map(function (v) { return num(v, 1); });
    var over = 1 + num(el.getAttribute('data-overshoot'), 0.28);
    var edges = stops.concat([over]);           // where the curtain edge travels (fraction of width)
    var marks = stops.map(function (s) { return s * 100; }).concat([100]); // what the counter shows
    var state = { p: 0 };

    var display = function (p) {                 // piecewise map edge position → percent shown
      var prevE = 0, prevM = 0;
      for (var i = 0; i < edges.length; i++) {
        if (p <= edges[i]) return prevM + (p - prevE) / (edges[i] - prevE) * (marks[i] - prevM);
        prevE = edges[i]; prevM = marks[i];
      }
      return 100;
    };
    var render = function () {
      el.style.setProperty('--lm-progress', state.p);
      if (count) {
        count.textContent = String(Math.round(display(state.p)));
        // the receding curtain edge pushes the counter off-screen when it reaches it
        var w = global.innerWidth;
        var edgePx = Math.min(state.p, over) * w;
        var r = count.getBoundingClientRect();
        var restLeft = r.left - (count.__lmPush || 0);
        var push = Math.max(0, edgePx - restLeft);
        count.__lmPush = push;
        count.style.transform = 'translate3d(' + push + 'px, -50%, 0)';
      }
    };
    render();
    var started = performance.now();

    return new Promise(function (resolve) {
      var finished = false;
      var go = function () {
        if (finished) return;
        finished = true;
        if (reduced) { el.remove(); release(); return resolve(); }
        var tl = gsap.timeline({ onUpdate: render });
        edges.forEach(function (edge, i) {
          var last = i === edges.length - 1;
          tl.to(state, { p: edge, duration: durs[i] || 1, ease: last ? 'power3.in' : 'power2.inOut', onUpdate: render });
          if (!last && holds[i]) tl.to({}, { duration: holds[i] });
        });
        tl.to({}, { duration: num(el.getAttribute('data-hold-end'), 0.5) });
        tl.add(function () {
          var exit = num(el.getAttribute('data-exit-duration'), 1.2);
          var delay = num(el.getAttribute('data-exit-delay'), 0.3);
          gsap.delayedCall(num(el.getAttribute('data-intro-delay'), delay + 0.24), function () { release(); resolve(); });
          var out = gsap.timeline({ delay: delay, onComplete: function () { el.remove(); } });
          out.to(el, { yPercent: 100, duration: exit, ease: 'power2.inOut', force3D: true }, 0);
          if (split.length) out.to(split, { yPercent: -100 * 1.6, duration: exit, ease: 'power2.inOut', force3D: true }, 0);
        });
      };
      var loaded = document.readyState === 'complete' ? Promise.resolve()
        : new Promise(function (r) { global.addEventListener('load', r, { once: true }); });
      Promise.all([loaded, trackAssets()]).then(nextPaint).then(function () {
        setTimeout(go, Math.max(0, minMs - (performance.now() - started)));
      });
      setTimeout(go, maxMs);
    });
  }

  /* ---------- page transitions between documents ---------- */
  // Out: a panel rises over the current page, then the browser navigates.
  // In:  the next page is born covered (head snippet), shows the destination's name,
  //      then the panel collapses toward the bottom while the label is wiped away.
  var TRANSITION_KEY = 'lm:transition';
  var easePanelOut = cubicBezier(0.42, 0, 0.1, 1);   // rise: gentle start, long soft landing
  var easePanelIn = cubicBezier(0.9, 0, 0.58, 1);    // collapse: holds, then drops

  function transitionLayer() {
    var layer = document.querySelector('.lm-transition');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'lm-transition';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<div class="lm-transition-panel"></div><div class="lm-transition-label"></div>';
    document.body.appendChild(layer);
    return layer;
  }

  function readIncoming() {
    try {
      var raw = sessionStorage.getItem(TRANSITION_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(TRANSITION_KEY);
      var data = JSON.parse(raw);
      return data && Date.now() - data.t < 15000 ? data : null;   // stale flags are ignored
    } catch (e) { return null; }
  }

  function isTransitionLink(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    // same page anchors keep normal (smooth) scrolling
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
    return true;
  }

  function setupTransitions(reduced) {
    var onClick = function (e) {
      var a = e.target.closest && e.target.closest('a[data-transition]');
      if (!isTransitionLink(a, e)) return;
      var label = a.getAttribute('data-transition') || a.textContent.trim();
      var href = a.href;
      e.preventDefault();
      if (reduced) { location.assign(href); return; }
      try { sessionStorage.setItem(TRANSITION_KEY, JSON.stringify({ label: label, t: Date.now() })); } catch (err) {}
      var layer = transitionLayer();
      var panel = layer.querySelector('.lm-transition-panel');
      layer.querySelector('.lm-transition-label').textContent = '';
      layer.classList.add('is-active');
      global.gsap.fromTo(panel, { y: 0, yPercent: 100, scaleY: 1 }, {
        y: 0, yPercent: 0, duration: 1, ease: easePanelOut, force3D: true,
        onComplete: function () { location.assign(href); }
      });
    };
    // back/forward cache restores the page exactly as it was left: covered. Uncover it.
    var onShow = function (e) {
      if (!e.persisted) return;
      var layer = document.querySelector('.lm-transition');
      if (layer) layer.classList.remove('is-active');
      document.documentElement.classList.remove('lm-incoming');
    };
    document.addEventListener('click', onClick);
    global.addEventListener('pageshow', onShow);
    return function () {
      document.removeEventListener('click', onClick);
      global.removeEventListener('pageshow', onShow);
    };
  }

  function runIncoming(data, lenis) {
    var gsap = global.gsap;
    // the transition replaces the first-visit loader
    document.querySelectorAll('[data-preloader],[data-boot-cover]').forEach(function (n) { n.remove(); });
    var layer = transitionLayer();
    var panel = layer.querySelector('.lm-transition-panel');
    var label = layer.querySelector('.lm-transition-label');
    label.textContent = data.label || '';
    layer.classList.add('is-active');
    gsap.set(panel, { y: 0, yPercent: 0, scaleY: 1, transformOrigin: '50% 100%' });
    gsap.set(label, { opacity: 0, clipPath: 'inset(0% 0% 0% 0%)' });
    document.documentElement.classList.remove('lm-incoming');   // head cover → our panel, same colour
    lockScroll(lenis, true);

    // wait (briefly) for the label's font so it never swaps mid-animation
    var fontReady = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      var cs = getComputedStyle(label);
      fontReady = Promise.race([
        document.fonts.load(cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, label.textContent || 'A').catch(function () {}),
        new Promise(function (r) { setTimeout(r, 2500); })
      ]);
    }
    return fontReady.then(function () {
      return new Promise(function (resolve) {
        var COLLAPSE = 1.3;
        gsap.timeline({ onComplete: function () { layer.classList.remove('is-active'); } })
          .to(label, { opacity: 1, duration: 0.8, ease: 'none' }, 0)
          .to(panel, { scaleY: 0, duration: 1.1, ease: easePanelIn, force3D: true }, COLLAPSE)
          .to(label, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.1, ease: easePanelIn }, COLLAPSE)
          .add(function () { lockScroll(lenis, false); setThemeColor('ready'); resolve(); }, COLLAPSE + 0.35);
      });
    });
  }

  /* ---------- hero entrance after preloader ---------- */
  function playIntro(root) {
    var gsap = global.gsap;
    var items = all(root, '[data-intro]');
    if (!items.length) return;
    var tl = gsap.timeline({ defaults: { ease: TOKENS.ease.out } });
    items.forEach(function (el, i) {
      var kind = el.getAttribute('data-intro') || 'up';
      var from = (FROM[kind] || FROM.up)(kind === 'pop' ? TOKENS.dist.lg / 1.6 : TOKENS.dist.sm);
      tl.fromTo(el, from, toFor(kind, {
        duration: kind === 'pop' ? TOKENS.dur.hero : kind === 'blur' ? 0.7 : TOKENS.dur.base
      }), i === 0 ? 0 : '<' + (kind === 'blur' ? 0.08 : TOKENS.stagger.base));
    });
  }

  /* ---------- synced UI: event bus with replay ---------- */
  // One component announces ("project:change", {index}); counters, captions and lists
  // listen. The last detail per event is kept, so a listener that mounts late catches up.
  var bus = {
    last: {},
    emit: function (name, detail) {
      bus.last[name] = detail;
      document.dispatchEvent(new CustomEvent(name, { detail: detail }));
    },
    on: function (name, fn, options) {
      var handler = function (e) { fn(e.detail); };
      document.addEventListener(name, handler);
      if ((!options || options.replay !== false) && Object.prototype.hasOwnProperty.call(bus.last, name)) fn(bus.last[name]);
      return function () { document.removeEventListener(name, handler); };
    }
  };

  /* ---------- content swap with motion blur ---------- */
  // Blur out fast, swap immediately, and only refocus once changes stop for `settle` ms.
  // Rapid changes (fast scrolling through items) stay as one continuous blur.
  function blurSwap(el, update, options) {
    var gsap = global.gsap;
    var o = options || {};
    var apply = function () {
      if (typeof update === 'function') update(el);
      else if (update != null) el.textContent = update;
    };
    if (!gsap || prefersReducedMotion()) { apply(); return; }
    var st = el.__lmSwap || (el.__lmSwap = {});
    if (!st.primed) { st.primed = true; apply(); return; }   // first value: no blur
    if (st.tween) st.tween.kill();
    st.tween = gsap.to(el, { filter: 'blur(' + (o.blur || 8) + 'px)', duration: 0.2, ease: 'power2.out' });
    apply();
    clearTimeout(st.timer);
    st.timer = setTimeout(function () {
      if (st.tween) st.tween.kill();
      st.tween = gsap.to(el, { filter: 'blur(0px)', duration: o.refocus || 0.85, ease: 'power2.out' });
    }, o.settle || 140);
  }

  /* ---------- focus list: centred item sharp, neighbours faded ---------- */
  // <div data-focus-list><div data-focus-track><div data-focus-item>…</div>…</div></div>
  // The track slides so the active item is centred. Duration grows with the distance
  // travelled (clamped), so a one-step move is quick and a long jump does not crawl.
  function focusList(container, options) {
    var gsap = global.gsap;
    var o = options || {};
    var track = container.querySelector('[data-focus-track]') || container;
    var items = Array.prototype.slice.call(track.querySelectorAll('[data-focus-item]'));
    var dim = o.dim != null ? o.dim : 0.24;
    var current = -1;
    var offsetFor = function (i) {
      var item = items[i];
      return -(item.offsetTop + item.offsetHeight / 2) + container.clientHeight / 2;
    };
    var paint = function (i, animate) {
      items.forEach(function (it, k) {
        it.setAttribute('aria-current', k === i ? 'true' : 'false');
        var to = { opacity: k === i ? 1 : dim, duration: animate ? 0.4 : 0, ease: 'power2.out' };
        gsap ? gsap.to(it, to) : (it.style.opacity = to.opacity);
      });
    };
    var api = {
      set: function (i) {
        if (!items.length) return;
        i = ((i % items.length) + items.length) % items.length;
        if (i === current) return;
        var reduced = prefersReducedMotion() || !gsap;
        var first = current === -1;
        var dist = first ? 0 : Math.abs(i - current);
        current = i;
        if (reduced || first) {
          if (gsap) gsap.set(track, { y: offsetFor(i) }); else track.style.transform = 'translateY(' + offsetFor(i) + 'px)';
          paint(i, false);
          if (first && !reduced && o.intro !== false) api.intro();
          return;
        }
        gsap.to(track, { y: offsetFor(i), duration: Math.max(0.26, Math.min(0.46, 0.22 + dist * 0.06)), ease: 'power2.out', overwrite: true });
        paint(i, true);
      },
      // entrance: neighbours appear outward from the centre
      intro: function () {
        if (!gsap) return;
        gsap.fromTo(items, { opacity: 0 }, {
          opacity: function (k) { return k === current ? 1 : dim; },
          duration: 0.44, ease: 'power2.out', stagger: { each: 0.07, from: current }
        });
      },
      get index() { return current; }
    };
    return api;
  }

  global.LandingMotion = {
    init: init, tokens: TOKENS, splitWords: splitWords,
    bus: bus, blurSwap: blurSwap, focusList: focusList, cubicBezier: cubicBezier
  };
})(typeof window !== 'undefined' ? window : this);
