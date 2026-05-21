/*
 * Logica della homepage:
 * - carica il manifest delle ricette da Ricette/index.json
 * - carica e parsa ogni .txt
 * - gestisce ricerca testuale + filtro cucina
 */

(function () {
  'use strict';

  const grid = document.getElementById('recipe-grid');
  const searchInput = document.getElementById('search-input');
  const filtersBox = document.getElementById('cuisine-filters');
  const noResults = document.getElementById('no-results');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const CATEGORIES = ['Pranzo', 'Cena', 'Dolce', 'Sfizioso'];

  let allRecipes = [];
  let activeCuisine = 'all';
  let query = '';

  function difficultyDots(level) {
    let html = '<span class="difficulty-dots" aria-label="Difficoltà ' + level + ' su 3">';
    for (let i = 1; i <= 3; i++) {
      html += '<span class="dot' + (i <= level ? ' filled' : '') + '"></span>';
    }
    html += '</span>';
    return html;
  }

  function buildCard(recipe) {
    const card = document.createElement('a');
    card.className = 'recipe-card';
    card.href = 'ricetta.html?id=' + encodeURIComponent(recipe.id);

    const imgSrc = recipe.immagine ? 'Immagini/' + recipe.immagine : '';
    const initial = (recipe.titolo || '?').charAt(0).toUpperCase();
    const tempo = [recipe.tempoPrep, recipe.tempoCottura].filter(Boolean).join(' + ') || '—';

    card.innerHTML = `
      <div class="recipe-card-image">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${escapeHtml(recipe.titolo)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'recipe-card-placeholder',textContent:'${initial}'}))">`
          : `<span class="recipe-card-placeholder">${initial}</span>`}
        ${recipe.cucina ? `<span class="recipe-card-cuisine">${escapeHtml(recipe.cucina)}</span>` : ''}
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${escapeHtml(recipe.titolo)}</h3>
        <p class="muted" style="margin:0;font-size:0.9rem;">${escapeHtml(recipe.categoria || '')}</p>
        <div class="recipe-card-meta">
          <span class="meta-item" title="Tempo totale">⏱ ${escapeHtml(tempo)}</span>
          <span class="meta-item" title="Difficoltà">${difficultyDots(recipe.difficolta)}</span>
          <span class="meta-item" title="Porzioni">🍽 ${recipe.porzioni}</span>
        </div>
      </div>
    `;
    return card;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function matchesFilters(recipe) {
    if (activeCuisine !== 'all') {
      if ((recipe.cucina || '').toLowerCase() !== activeCuisine) return false;
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

  function buildCategorySection(catName, recipes) {
    const section = document.createElement('section');
    section.className = 'category-section';
    const label = recipes.length === 1 ? 'ricetta' : 'ricette';
    section.innerHTML = `
      <div class="category-title">
        <h3>${escapeHtml(catName)}</h3>
        <span class="category-count">${recipes.length} ${label}</span>
      </div>
      <div class="recipe-row"></div>
    `;
    const row = section.querySelector('.recipe-row');
    recipes.forEach(r => row.appendChild(buildCard(r)));
    return section;
  }

  function render() {
    grid.innerHTML = '';
    const visible = allRecipes.filter(matchesFilters);

    if (visible.length === 0) {
      noResults.classList.remove('hidden');
      return;
    }
    noResults.classList.add('hidden');

    // raggruppa per categoria, rispettando l'ordine canonico
    const buckets = {};
    CATEGORIES.forEach(c => { buckets[c] = []; });
    const altro = [];

    visible.forEach(r => {
      const cat = (r.categoria || '').trim();
      const match = CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase());
      if (match) buckets[match].push(r);
      else altro.push(r);
    });

    CATEGORIES.forEach(cat => {
      if (buckets[cat].length > 0) grid.appendChild(buildCategorySection(cat, buckets[cat]));
    });
    if (altro.length > 0) grid.appendChild(buildCategorySection('Altre ricette', altro));
  }

  function setupFilters() {
    filtersBox.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filtersBox.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCuisine = btn.dataset.cuisine;
      render();
    });
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
          dentro la cartella del progetto, e apri <code>http://localhost:8000</code>.
        </div>`;
    }
  }

  setupFilters();
  setupSearch();
  loadRecipes();
})();
