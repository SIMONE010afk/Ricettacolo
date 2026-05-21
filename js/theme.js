/*
 * Gestione del toggle dark/light.
 * Nota: l'applicazione iniziale del tema avviene inline nell'<head>
 * di index.html / ricetta.html per evitare il "flash" iniziale.
 * Qui gestiamo solo il click sul bottone.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'ricettacolo-theme';
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // localStorage può essere bloccato (modalità privata su alcuni browser)
    }
  });
})();
