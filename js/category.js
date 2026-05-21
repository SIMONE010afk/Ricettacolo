/*
 * Logica delle pagine "Salato" e "Dolce".
 * Legge la macro-categoria da `body[data-category]` ("salato" o "dolce").
 * Carica TUTTE le ricette dal manifest e mostra solo quelle della macro-categoria,
 * applicando i filtri (ricerca, cucina, difficoltà, tempo, tag da URL).
 */
(function () {
  'use strict';

  const macroCategory = (document.body.dataset.category || 'salato').toLowerCase();

  const grid = document.getElementById('recipe-grid');
  const searchInput = document.getElementById('search-input');
  const cuisineFilters = document.getElementById('cuisine-filters');
  const difficultyFilters = document.getElementById('difficulty-filters');
  const timeFilters = document.getElementById('time-filters');
  const noResults = document.getElementById('no-results');
  const yearEl = document.getElementById('year');
  const activeFilterBar = document.getElementById('active-filter-bar');
  const activeFilterLabel = document.getElementById('active-filter-label');
  const activeFilterClear = document.getElementById('active-filter-clear');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  let allRecipes = [];
  let activeCuisine = 'all';
  let activeDifficulty = 'all';
  let activeTime = 'all';
  let query = '';
  let activeTagFilter = null;

  function parseMinutes(str) {
    const m = String(str || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  function totalMinutes(recipe) {
    return parseMinutes(recipe.tempoPrep) + parseMinutes(recipe.tempoCottura);
  }

  function matchesFilters(recipe) {
    // macro-categoria
    if (window.RicettacoloCards.macroCategory(recipe) !== macroCategory) return false;

    if (activeCuisine !== 'all') {
      if ((recipe.cucina || '').toLowerCase() !== activeCuisine) return false;
    }
    if (activeDifficulty !== 'all') {
      if (recipe.difficolta !== parseInt(activeDifficulty, 10)) return false;
    }
    if (activeTime !== 'all') {
      const total = totalMinutes(recipe);
      if (activeTime === 'short' && total > 30) return false;
      if (activeTime === 'medium' && (total < 30 || total > 60)) return false;
      if (activeTime === 'long' && total <= 60) return false;
    }
    if (activeTagFilter) {
      const lower = activeTagFilter.toLowerCase();
      const has = (recipe.tag || []).some(t => t.toLowerCase() === lower);
      if (!has) return false;
    }
    if (query) {
      const hay = window.RicettacoloParser.searchHaystack(recipe);
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      for (const t of terms) {
        if (!hay.includes(t)) return false;
      }
    }
    return true;
  }

  function render() {
    grid.innerHTML = '';
    const visible = allRecipes.filter(matchesFilters);

    if (visible.length === 0) {
      noResults.classList.remove('hidden');
    } else {
      noResults.classList.add('hidden');
      visible.forEach(r => grid.appendChild(window.RicettacoloCards.buildCard(r)));
    }
  }

  function activateInGroup(group, btn) {
    group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function setupFilters() {
    if (cuisineFilters) {
      cuisineFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        activateInGroup(cuisineFilters, btn);
        activeCuisine = btn.dataset.cuisine;
        render();
      });
    }
    if (difficultyFilters) {
      difficultyFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        activateInGroup(difficultyFilters, btn);
        activeDifficulty = btn.dataset.difficulty;
        render();
      });
    }
    if (timeFilters) {
      timeFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        activateInGroup(timeFilters, btn);
        activeTime = btn.dataset.time;
        render();
      });
    }
  }

  function setupSearch() {
    let t;
    searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        query = searchInput.value.trim();
        render();
      }, 120);
    });
  }

  function updateTagChip() {
    if (!activeFilterBar) return;
    if (activeTagFilter) {
      activeFilterLabel.textContent = '#' + activeTagFilter;
      activeFilterBar.classList.remove('hidden');
    } else {
      activeFilterBar.classList.add('hidden');
    }
  }

  function clearTagFilter() {
    activeTagFilter = null;
    updateTagChip();
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('tag');
      window.history.replaceState({}, '', url.toString());
    }
    render();
  }

  function setupActiveFilter() {
    if (!activeFilterClear) return;
    activeFilterClear.addEventListener('click', clearTagFilter);
  }

  function readUrlTag() {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    if (tag) {
      activeTagFilter = tag.trim();
      updateTagChip();
    }
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

      allRecipes = results.filter(Boolean);
      render();
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

  readUrlTag();
  setupFilters();
  setupSearch();
  setupActiveFilter();
  loadRecipes();
})();
