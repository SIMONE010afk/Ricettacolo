/*
 * Pagina di dettaglio: legge ?id=<filename-senza-.txt>, scarica il .txt,
 * lo parsa e lo renderizza. Include lo scaler delle porzioni.
 */

(function () {
  'use strict';

  const container = document.getElementById('recipe-content');
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function difficultyDots(level) {
    let html = '<span class="difficulty-dots">';
    for (let i = 1; i <= 3; i++) {
      html += '<span class="dot' + (i <= level ? ' filled' : '') + '"></span>';
    }
    html += '</span>';
    return html;
  }

  function getParam(name) {
    const p = new URLSearchParams(window.location.search);
    return p.get(name);
  }

  function showError(msg) {
    container.innerHTML = `<div class="error-box">${escapeHtml(msg)}</div>`;
  }

  function renderRecipe(recipe) {
    document.title = recipe.titolo + ' — Ricettacolo';

    const imgSrc = recipe.immagine ? 'Immagini/' + recipe.immagine : '';
    const initial = (recipe.titolo || '?').charAt(0).toUpperCase();

    container.innerHTML = `
      <div class="recipe-hero">
        <div class="recipe-hero-image">
          ${imgSrc
            ? `<img src="${imgSrc}" alt="${escapeHtml(recipe.titolo)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'recipe-card-placeholder',textContent:'${initial}'}))">`
            : `<span class="recipe-card-placeholder">${initial}</span>`}
        </div>
        <div class="recipe-hero-info">
          ${recipe.cucina ? `<span class="cuisine-tag">${escapeHtml(recipe.cucina)}</span>` : ''}
          <h1 class="recipe-title">${escapeHtml(recipe.titolo)}</h1>
          <p class="muted">${escapeHtml(recipe.categoria || '')}</p>
          <div class="recipe-meta-grid">
            <div>
              <div class="meta-label">Preparazione</div>
              <div class="meta-value">${escapeHtml(recipe.tempoPrep || '—')}</div>
            </div>
            <div>
              <div class="meta-label">Cottura</div>
              <div class="meta-value">${escapeHtml(recipe.tempoCottura || '—')}</div>
            </div>
            <div>
              <div class="meta-label">Difficoltà</div>
              <div class="meta-value">${difficultyDots(recipe.difficolta)}</div>
            </div>
            <div>
              <div class="meta-label">Porzioni base</div>
              <div class="meta-value">${recipe.porzioni}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="recipe-body">
        <aside class="ingredients-block">
          <h3>Ingredienti</h3>
          <div class="porzioni-scaler">
            <label>Porzioni</label>
            <div class="porzioni-controls">
              <button type="button" class="porzioni-btn" id="por-down" aria-label="Diminuisci porzioni">−</button>
              <span id="porzioni-value">${recipe.porzioni}</span>
              <button type="button" class="porzioni-btn" id="por-up" aria-label="Aumenta porzioni">+</button>
            </div>
          </div>
          <ul class="ingredients-list" id="ingredients-list"></ul>
        </aside>

        <section class="procedure-block">
          <h3>Procedimento</h3>
          <ol class="procedure-list">
            ${recipe.procedimento.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ol>

          ${recipe.note ? `
            <div class="notes-block">
              <h3>Note personali</h3>
              <p>${escapeHtml(recipe.note)}</p>
            </div>
          ` : ''}

          ${recipe.tag.length ? `
            <div class="tags-block">
              <span class="tags-label">Tag:</span>
              ${recipe.tag.map(t => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}
        </section>
      </div>
    `;

    // scaler porzioni
    const basePorzioni = recipe.porzioni;
    let currentPorzioni = basePorzioni;
    const valueEl = document.getElementById('porzioni-value');
    const listEl = document.getElementById('ingredients-list');

    function renderIngredients() {
      const ratio = currentPorzioni / basePorzioni;
      listEl.innerHTML = recipe.ingredienti.map(ing => {
        const qty = window.RicettacoloParser.scaleIngredient(ing, ratio);
        return `
          <li>
            <span class="ingredient-name">${escapeHtml(ing.name)}</span>
            <span class="ingredient-qty">${escapeHtml(qty || '')}</span>
          </li>
        `;
      }).join('');
      valueEl.textContent = currentPorzioni;
    }

    document.getElementById('por-down').addEventListener('click', () => {
      if (currentPorzioni > 1) { currentPorzioni--; renderIngredients(); }
    });
    document.getElementById('por-up').addEventListener('click', () => {
      if (currentPorzioni < 99) { currentPorzioni++; renderIngredients(); }
    });

    renderIngredients();
  }

  async function load() {
    const id = getParam('id');
    if (!id) {
      showError('Nessuna ricetta specificata.');
      return;
    }
    try {
      const res = await fetch('Ricette/' + id + '.txt', { cache: 'no-cache' });
      if (!res.ok) throw new Error('File non trovato');
      const text = await res.text();
      const recipe = window.RicettacoloParser.parseRecipe(text, id);
      renderRecipe(recipe);
    } catch (err) {
      console.error(err);
      showError('Impossibile caricare questa ricetta. Verifica che il file Ricette/' + id + '.txt esista. Se stai aprendo il sito con doppio click, usa un server locale (es. python -m http.server).');
    }
  }

  load();
})();
