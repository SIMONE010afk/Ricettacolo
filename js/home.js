/*
 * Logica della homepage (versione semplificata):
 * - carica tutte le ricette dal manifest
 * - sceglie 6 ricette casuali (mix salato + dolce per varietà)
 * - le mostra in una griglia
 * Niente filtri qui: stanno nelle pagine salato.html / dolce.html.
 */
(function () {
  'use strict';

  const PREVIEW_COUNT = 6;

  const grid = document.getElementById('home-recipe-grid');
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function pickPreview(recipes) {
    // Cerco di mostrare un mix Salato / Dolce: max 2 dolci tra le 6
    // se ce ne sono a sufficienza. Altrimenti riempo con quel che c'è.
    const dolci = [];
    const salati = [];
    recipes.forEach(r => {
      if (window.RicettacoloCards.macroCategory(r) === 'dolce') dolci.push(r);
      else salati.push(r);
    });

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const shuffledDolci = shuffle(dolci);
    const shuffledSalati = shuffle(salati);

    // target: fino a 2 dolci + il resto salati
    const dolciTake = Math.min(2, shuffledDolci.length, PREVIEW_COUNT);
    const salatiTake = Math.min(PREVIEW_COUNT - dolciTake, shuffledSalati.length);

    const selection = [
      ...shuffledSalati.slice(0, salatiTake),
      ...shuffledDolci.slice(0, dolciTake)
    ];

    // se non sono ancora 6 (poche ricette in totale), completo con quel che resta
    if (selection.length < PREVIEW_COUNT) {
      const remaining = recipes.filter(r => !selection.includes(r));
      const more = shuffle(remaining).slice(0, PREVIEW_COUNT - selection.length);
      selection.push(...more);
    }

    // mescolo l'ordine finale così salati e dolci non sono prevedibili
    return shuffle(selection);
  }

  async function loadRecipes() {
    try {
      const manifestRes = await fetch('Ricette/index.json', { cache: 'no-cache' });
      if (!manifestRes.ok) throw new Error('Manifest non trovato');
      const manifest = await manifestRes.json();
      const files = Array.isArray(manifest) ? manifest : manifest.files || [];

      const results = await Promise.all(files.map(async (filename) => {
        try {
          const res = await fetch('Ricette/' + filename, { cache: 'no-cache' });
          if (!res.ok) return null;
          const text = await res.text();
          const id = filename.replace(/\.txt$/i, '');
          return window.RicettacoloParser.parseRecipe(text, id);
        } catch (err) {
          console.warn('Errore caricando', filename, err);
          return null;
        }
      }));

      const recipes = results.filter(Boolean);
      const preview = pickPreview(recipes);

      grid.innerHTML = '';
      preview.forEach(r => grid.appendChild(window.RicettacoloCards.buildCard(r)));
    } catch (err) {
      console.error(err);
      grid.innerHTML = `
        <div class="error-box">
          <strong>Impossibile caricare le ricette.</strong><br>
          Se stai aprendo il sito con doppio click (file://) i browser bloccano fetch().
          Avvia un server locale, ad esempio: <code>python -m http.server</code>
        </div>`;
    }
  }

  loadRecipes();
})();
