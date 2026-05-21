/*
 * Gestione del menu a tendina della nav (dropdown Ricette).
 * - Click sul toggle: apre/chiude
 * - Click fuori: chiude tutti i dropdown aperti
 * - Tasto Escape: chiude
 */
(function () {
  'use strict';

  const dropdowns = document.querySelectorAll('.nav-dropdown');
  if (!dropdowns.length) return;

  dropdowns.forEach(dd => {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dd.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  });

  document.addEventListener('click', (e) => {
    dropdowns.forEach(dd => {
      if (dd.classList.contains('open') && !dd.contains(e.target)) {
        dd.classList.remove('open');
        const t = dd.querySelector('.nav-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdowns.forEach(dd => {
        dd.classList.remove('open');
        const t = dd.querySelector('.nav-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });
})();
