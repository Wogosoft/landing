// WOGO landing — vanilla JS for the only three things that need scripting:
// 1. language toggle (ES/EN) via document.documentElement.lang
// 2. accordion open/close on services + diff sections
// 3. hero typed-text rotator
//
// No framework. Single file. Runs after DOMContentLoaded (script is deferred).
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;

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

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
})();
