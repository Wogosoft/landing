// WOGO landing — vanilla JS. Single file, runs after DOMContentLoaded.
//   1. language toggle (ES/EN)
//   2. accordion open/close (services + diff)
//   3. hero typed-text rotator
//   4. scroll-reveal via IntersectionObserver
//   5. WOGO Invaders easter-egg game (canvas)
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 1. Language toggle ----------------------------------------
  var STORAGE_KEY = 'wogo:lang';

  function getInitialLang() {
    var url = new URL(window.location.href);
    var fromUrl = url.searchParams.get('lang');
    if (fromUrl === 'en' || fromUrl === 'es') return fromUrl;
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
    if (stored === 'en' || stored === 'es') return stored;
    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('es') === 0) return 'es';
    if (nav.indexOf('en') === 0) return 'en';
    return 'es';
  }

  var typedReset = null;

  function setLang(lang) {
    if (lang !== 'es' && lang !== 'en') return;
    html.setAttribute('lang', lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    var opts = doc.querySelectorAll('[data-lang-option]');
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-lang-option') === lang;
      opts[i].classList.toggle('nav__lang-option--active', on);
      opts[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (typedReset) typedReset();
  }

  setLang(getInitialLang());

  doc.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action="lang-toggle"]');
    if (!t) return;
    setLang(html.getAttribute('lang') === 'es' ? 'en' : 'es');
  });

  // ---------- 2. Accordion (services + diff) ----------------------------
  function toggleAccordion(item, button, openClass) {
    var open = item.classList.toggle(openClass);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action="services-toggle"], [data-action="diff-toggle"]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'services-toggle') {
      var item = btn.closest('.services__item');
      if (item) toggleAccordion(item, btn, 'services__item--open');
    } else {
      var ditem = btn.closest('.diff__item');
      if (ditem) toggleAccordion(ditem, btn, 'diff__item--open');
    }
  });

  // ---------- 3. Hero typed-text rotator --------------------------------
  // Cycles strings with a typewriter effect. The list lives on
  // data-typed-es / data-typed-en attrs so language changes pick the right
  // one without any reflow; honors prefers-reduced-motion.
  (function () {
    var typed = doc.querySelector('.hero__typed');
    if (!typed) return;
    var textEl = typed.querySelector('.hero__typed-text');
    if (!textEl) return;

    var reduced = reducedMotion;

    function getList() {
      var key = html.getAttribute('lang') === 'en' ? 'typedEn' : 'typedEs';
      try { return JSON.parse(typed.dataset[key] || '[]'); }
      catch (e) { return []; }
    }

    var list = getList();
    var i = 0, j = 0, deleting = false, timer = null;

    function clear() { if (timer) { clearTimeout(timer); timer = null; } }

    function step() {
      if (!list.length) return;
      var current = list[i % list.length];
      if (reduced) {
        textEl.textContent = current;
        timer = setTimeout(function () { i = (i + 1) % list.length; step(); }, 2400);
        return;
      }
      if (!deleting) {
        j++;
        textEl.textContent = current.slice(0, j);
        if (j >= current.length) {
          deleting = true;
          timer = setTimeout(step, 1400);
          return;
        }
        timer = setTimeout(step, 60 + Math.random() * 40);
      } else {
        j--;
        textEl.textContent = current.slice(0, j);
        if (j <= 0) {
          deleting = false;
          i = (i + 1) % list.length;
          timer = setTimeout(step, 220);
          return;
        }
        timer = setTimeout(step, 28);
      }
    }

    typedReset = function () {
      clear();
      list = getList();
      i = 0; j = 0; deleting = false;
      textEl.textContent = list.length ? list[0].slice(0, 1) : '';
      step();
    };

    typedReset();
  })();

  // ---------- 4. Scroll-reveal -----------------------------------------
  // Sections fade/slide in as they enter the viewport. Above-fold targets
  // are revealed immediately on load (with animation). A safety timeout
  // also reveals everything unconditionally — content must never be stuck
  // invisible if IO is delayed.
  (function () {
    var targets = doc.querySelectorAll('[data-reveal]');
    if (!targets.length) return;
    function revealAll() {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-revealed');
    }
    if (reducedMotion || !('IntersectionObserver' in window)) { revealAll(); return; }

    var vh = window.innerHeight || 800;
    var deferred = [];
    requestAnimationFrame(function () {
      for (var i = 0; i < targets.length; i++) {
        var rect = targets[i].getBoundingClientRect();
        if (rect.top < vh * 1.1) targets[i].classList.add('is-revealed');
        else deferred.push(targets[i]);
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      deferred.forEach(function (el) { io.observe(el); });
    });
    setTimeout(revealAll, 1500);
  })();

  // ---------- 5. WOGO Invaders -----------------------------------------
  // Canvas easter-egg game, vanilla port of the original. Trigger:
  // .footer__game-trigger button. Esc closes; SPACE starts/restarts.
  (function () {
    var root = doc.querySelector('[data-invaders]');
    var canvas = root && root.querySelector('[data-invaders-canvas]');
    if (!root || !canvas) return;

    var W = 720, H = 480;
    var T = {
      pino: '#1f3a32', pinoDark: '#0e1e1a',
      aguamarina: '#7df9e1', ciruela: '#680039',
      rosa: '#f7dfeb', blanco: '#fbf9f4'
    };
    var COPY = {
      es: { title: 'WOGO INVADERS', controls: '← → mover    SPACE disparar    P pausa    ESC salir',
            ready: 'PRESS SPACE', paused: 'PAUSED', over: 'GAME OVER', won: 'WAVE CLEARED',
            restart: 'SPACE para reiniciar', score: 'SCORE', high: 'HIGH', wave: 'WAVE',
            credits: 'Si es Wogo, es Weno' },
      en: { title: 'WOGO INVADERS', controls: '← → move    SPACE shoot    P pause    ESC exit',
            ready: 'PRESS SPACE', paused: 'PAUSED', over: 'GAME OVER', won: 'WAVE CLEARED',
            restart: 'SPACE to restart', score: 'SCORE', high: 'HIGH', wave: 'WAVE',
            credits: 'Si es Wogo, es Weno' }
    };

    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    var state = null;
    var status = 'ready';
    var score = 0;
    var wave = 1;
    var highScore = 0;
    var raf = null;
    var open = false;
    try { var hs = parseInt(localStorage.getItem('wogo-invaders-hs') || '0', 10); if (!isNaN(hs)) highScore = hs; } catch (e) {}

    function lang() { return html.getAttribute('lang') === 'en' ? 'en' : 'es'; }
    function txt() { return COPY[lang()]; }

    function initState(startWave) {
      var cols = 8, rows = 4, enemies = [];
      var cellW = 60, cellH = 44;
      var offsetX = (W - cols * cellW) / 2 + cellW / 2;
      var offsetY = 70;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          enemies.push({ x: offsetX + c * cellW, y: offsetY + r * cellH, alive: true,
                         type: r < 2 ? 'diamond' : 'square' });
        }
      }
      return {
        player: { x: W / 2, y: H - 50, cooldown: 0 },
        bullets: [],
        enemies: enemies,
        enemyDir: 1,
        enemySpeed: 0.35 + (startWave - 1) * 0.12,
        enemyShootTimer: 0,
        enemyShootRate: Math.max(40, 90 - (startWave - 1) * 8),
        keys: { left: false, right: false, fire: false },
        lives: 3,
        score: 0,
        wave: startWave,
        tick: 0,
        flashTill: 0
      };
    }

    function start() { state = initState(1); score = 0; wave = 1; status = 'playing'; }
    function nextWave() {
      var prev = state;
      state = initState(prev.wave + 1);
      state.score = prev.score;
      state.lives = prev.lives;
      score = state.score; wave = state.wave; status = 'playing';
    }

    function drawShip(cx, cy, scale, color) {
      ctx.fillStyle = color;
      var u = 3 * scale;
      function px(x, y, w, h) { ctx.fillRect(cx + x * u, cy + y * u, (w || 1) * u, (h || 1) * u); }
      px(-5, 1, 10, 1); px(-3, 0, 6, 1); px(-1, -1, 2, 1); px(0, -2, 1, 1);
    }
    function drawDiamond(cx, cy, frame, primary, accent) {
      ctx.fillStyle = primary;
      var u = 3;
      function px(x, y, w, h) { ctx.fillRect(cx + x * u, cy + y * u, (w || 1) * u, (h || 1) * u); }
      px(-1, -3, 2, 1); px(-2, -2, 4, 1); px(-3, -1, 6, 1);
      px(-3, 0, 6, 1);  px(-2, 1, 4, 1);  px(-1, 2, 2, 1);
      ctx.fillStyle = accent;
      if (frame === 0) { px(-2, -1); px(1, -1); } else { px(-2, 0); px(1, 0); }
      ctx.fillStyle = primary;
      if (frame === 0) { px(-3, 3); px(2, 3); } else { px(-2, 3); px(1, 3); }
    }
    function drawSquare(cx, cy, frame, primary, accent) {
      ctx.fillStyle = primary;
      var u = 3;
      function px(x, y, w, h) { ctx.fillRect(cx + x * u, cy + y * u, (w || 1) * u, (h || 1) * u); }
      px(-3, -2, 6, 1); px(-3, -1, 6, 1); px(-3, 0, 6, 1); px(-3, 1, 6, 1);
      ctx.fillStyle = accent;
      px(-2, -1); px(1, -1);
      ctx.fillStyle = primary;
      if (frame === 0) { px(-3, 2); px(2, 2); px(-2, -3); px(1, -3); }
      else { px(-2, 2); px(1, 2); px(-3, -3); px(2, -3); }
    }

    function draw() {
      var L = txt();
      ctx.fillStyle = T.pinoDark; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(125, 249, 225, 0.06)'; ctx.lineWidth = 1;
      for (var y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = T.aguamarina; ctx.lineWidth = 1.5;
      ctx.strokeRect(8, 8, W - 16, H - 16);
      var ck = 16; ctx.lineWidth = 2;
      [[8,8,1,1],[W-8,8,-1,1],[8,H-8,1,-1],[W-8,H-8,-1,-1]].forEach(function (a) {
        ctx.beginPath();
        ctx.moveTo(a[0] + a[2] * ck, a[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(a[0], a[1] + a[3] * ck);
        ctx.stroke();
      });

      ctx.font = "12px ui-monospace, 'SF Mono', monospace";
      ctx.fillStyle = T.aguamarina;
      ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillText('> ' + L.score + ' ' + String(score).padStart(5, '0'), 24, 22);
      ctx.fillText('> ' + L.high + ' ' + String(highScore).padStart(5, '0'), 200, 22);
      ctx.textAlign = 'right';
      ctx.fillText(L.wave + ' ' + String(wave).padStart(2, '0') + ' <', W - 24, 22);

      if (state) {
        ctx.textAlign = 'left';
        for (var i = 0; i < state.lives; i++) drawShip(24 + i * 22, H - 30, 0.5, T.aguamarina);

        var visible = Date.now() < state.flashTill ? Math.floor(Date.now() / 60) % 2 === 0 : true;
        if (visible) drawShip(state.player.x, state.player.y, 1, T.aguamarina);

        var breath = Math.floor(state.tick / 30) % 2;
        state.enemies.forEach(function (e) {
          if (!e.alive) return;
          if (e.type === 'diamond') drawDiamond(e.x, e.y, breath, T.ciruela, T.rosa);
          else drawSquare(e.x, e.y, breath, T.rosa, T.ciruela);
        });

        state.bullets.forEach(function (b) {
          ctx.fillStyle = b.from === 'p' ? T.aguamarina : T.rosa;
          ctx.fillRect(b.x - 1.5, b.y - 8, 3, 12);
        });
      }

      if (status !== 'playing') {
        ctx.fillStyle = 'rgba(14, 30, 26, 0.75)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = T.aguamarina;
        ctx.font = "11px ui-monospace, 'SF Mono', monospace";
        ctx.fillText('// WOGO INVADERS  v0.1', W / 2, H / 2 - 86);
        ctx.font = "32px ui-monospace, 'SF Mono', monospace";
        ctx.fillStyle = T.blanco;
        var big = status === 'ready' ? L.title
                : status === 'paused' ? L.paused
                : status === 'gameover' ? L.over
                : L.won;
        ctx.fillText(big, W / 2, H / 2 - 20);
        ctx.font = "12px ui-monospace, 'SF Mono', monospace";
        ctx.fillStyle = T.rosa;
        var small = status === 'ready' ? L.ready
                  : status === 'paused' ? 'P / SPACE'
                  : L.restart;
        ctx.fillText(small, W / 2, H / 2 + 16);
        ctx.fillStyle = 'rgba(125, 249, 225, 0.6)';
        ctx.font = "10px ui-monospace, 'SF Mono', monospace";
        ctx.fillText(L.controls, W / 2, H / 2 + 56);
        if (status === 'ready') {
          ctx.fillStyle = 'rgba(247, 223, 235, 0.5)';
          ctx.fillText(L.credits, W / 2, H - 32);
        }
      }
    }

    function persistHigh() {
      if (state && state.score > highScore) {
        highScore = state.score;
        try { localStorage.setItem('wogo-invaders-hs', String(highScore)); } catch (e) {}
      }
    }

    function update() {
      if (status !== 'playing' || !state) return;
      state.tick++;

      var speed = 4.2;
      if (state.keys.left) state.player.x -= speed;
      if (state.keys.right) state.player.x += speed;
      state.player.x = Math.max(28, Math.min(W - 28, state.player.x));

      if (state.player.cooldown > 0) state.player.cooldown--;
      if (state.keys.fire && state.player.cooldown === 0) {
        state.bullets.push({ x: state.player.x, y: state.player.y - 10, vy: -7, from: 'p' });
        state.player.cooldown = 14;
      }

      var alive = state.enemies.filter(function (e) { return e.alive; });
      if (alive.length) {
        var minX = Infinity, maxX = -Infinity;
        alive.forEach(function (e) { if (e.x < minX) minX = e.x; if (e.x > maxX) maxX = e.x; });
        var drop = false;
        if (state.enemyDir === 1 && maxX + state.enemySpeed > W - 28) { drop = true; state.enemyDir = -1; }
        else if (state.enemyDir === -1 && minX - state.enemySpeed < 28) { drop = true; state.enemyDir = 1; }
        state.enemies.forEach(function (e) {
          if (drop) e.y += 18; else e.x += state.enemyDir * state.enemySpeed;
        });
        state.enemySpeed = (0.35 + (state.wave - 1) * 0.12) +
                           (1 - alive.length / state.enemies.length) * 1.4;
      }

      state.enemyShootTimer++;
      if (state.enemyShootTimer >= state.enemyShootRate && alive.length) {
        state.enemyShootTimer = 0;
        var shooter = alive[Math.floor(Math.random() * alive.length)];
        state.bullets.push({ x: shooter.x, y: shooter.y + 14, vy: 4 + state.wave * 0.2, from: 'e' });
      }

      state.bullets.forEach(function (b) { b.y += b.vy; });
      state.bullets = state.bullets.filter(function (b) { return b.y > -20 && b.y < H + 20; });

      state.bullets.forEach(function (b) {
        if (b.from === 'p') {
          for (var k = 0; k < state.enemies.length; k++) {
            var e = state.enemies[k];
            if (!e.alive) continue;
            if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 14) {
              e.alive = false;
              b.y = -100;
              state.score += e.type === 'diamond' ? 30 : 10;
              score = state.score;
              break;
            }
          }
        } else {
          if (Math.abs(b.x - state.player.x) < 18 && Math.abs(b.y - state.player.y) < 10 && Date.now() > state.flashTill) {
            b.y = H + 100;
            state.lives--;
            state.flashTill = Date.now() + 900;
            if (state.lives <= 0) { status = 'gameover'; persistHigh(); }
          }
        }
      });
      state.bullets = state.bullets.filter(function (b) { return b.y > -20 && b.y < H + 20; });

      if (state.enemies.every(function (e) { return !e.alive; })) {
        status = 'won'; persistHigh();
      }
      if (alive.some(function (e) { return e.y > H - 80; })) {
        status = 'gameover'; persistHigh();
      }
    }

    function loop() {
      update(); draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      if (!open) return;
      if (e.key === 'Escape') { closeGame(); return; }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (status === 'ready' || status === 'gameover') { start(); return; }
        if (status === 'won') { nextWave(); return; }
        if (status === 'paused') { status = 'playing'; return; }
        if (state) state.keys.fire = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') { if (state) state.keys.left = true; }
      if (e.key === 'ArrowRight' || e.key === 'd') { if (state) state.keys.right = true; }
      if (e.key === 'p' || e.key === 'P') {
        if (status === 'playing') status = 'paused';
        else if (status === 'paused') status = 'playing';
      }
    }
    function onKeyUp(e) {
      if (!open || !state) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
      if (e.key === ' ' || e.code === 'Space') state.keys.fire = false;
    }

    var lastFocus = null;
    function openGame() {
      if (open) return;
      open = true;
      lastFocus = doc.activeElement;
      root.hidden = false;
      root.removeAttribute('inert');
      root.removeAttribute('aria-hidden');
      state = initState(1);
      status = 'ready';
      score = 0; wave = 1;
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKeyUp);
      raf = requestAnimationFrame(loop);
      var closeBtn = root.querySelector('[data-action="invaders-close"]');
      if (closeBtn) closeBtn.focus();
    }
    function closeGame() {
      if (!open) return;
      open = false;
      root.hidden = true;
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      state = null;
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
    }

    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="invaders-open"]')) { openGame(); return; }
      if (e.target.closest('[data-action="invaders-close"]')) { closeGame(); return; }
      if (open && e.target === root) closeGame();
    });
  })();
})();
