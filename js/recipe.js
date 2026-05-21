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
              ${recipe.tag.map(t => `<a class="tag-chip" href="index.html?tag=${encodeURIComponent(t)}#ricette">#${escapeHtml(t)}</a>`).join('')}
            </div>
          ` : ''}
        </section>
      </div>

      <section class="related-block hidden" id="related-block">
        <h3>Potrebbe piacervi anche</h3>
        <div class="related-grid" id="related-grid"></div>
      </section>
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

  function difficultyDotsHtml(level) {
    let html = '<span class="difficulty-dots">';
    for (let i = 1; i <= 3; i++) {
      html += '<span class="dot' + (i <= level ? ' filled' : '') + '"></span>';
    }
    html += '</span>';
    return html;
  }

  function buildRelatedCard(r) {
    const card = document.createElement('a');
    card.className = 'recipe-card';
    card.href = 'ricetta.html?id=' + encodeURIComponent(r.id);

    const imgSrc = r.immagine ? 'Immagini/' + r.immagine : '';
    const initial = (r.titolo || '?').charAt(0).toUpperCase();
    const tempo = [r.tempoPrep, r.tempoCottura].filter(Boolean).join(' + ') || '—';

    card.innerHTML = `
      <div class="recipe-card-image">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${escapeHtml(r.titolo)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'recipe-card-placeholder',textContent:'${initial}'}))">`
          : `<span class="recipe-card-placeholder">${initial}</span>`}
        ${r.cucina ? `<span class="recipe-card-cuisine">${escapeHtml(r.cucina)}</span>` : ''}
      </div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${escapeHtml(r.titolo)}</h3>
        <p class="muted" style="margin:0;font-size:0.9rem;">${escapeHtml(r.categoria || '')}</p>
        <div class="recipe-card-meta">
          <span class="meta-item" title="Tempo totale">⏱ ${escapeHtml(tempo)}</span>
          <span class="meta-item" title="Difficoltà">${difficultyDotsHtml(r.difficolta)}</span>
        </div>
      </div>
    `;
    return card;
  }

  function scoreRelated(current, other) {
    if (other.id === current.id) return -1;
    let s = 0;
    if (other.cucina && current.cucina &&
        other.cucina.toLowerCase() === current.cucina.toLowerCase()) s += 3;
    if (other.categoria && current.categoria &&
        other.categoria.toLowerCase() === current.categoria.toLowerCase()) s += 2;
    const myTags = new Set((current.tag || []).map(t => t.toLowerCase()));
    for (const t of (other.tag || [])) {
      if (myTags.has(t.toLowerCase())) s += 1;
    }
    return s;
  }

  async function loadRelated(currentRecipe) {
    try {
      const manifestRes = await fetch('Ricette/index.json', { cache: 'no-cache' });
      if (!manifestRes.ok) return;
      const manifest = await manifestRes.json();
      const files = Array.isArray(manifest) ? manifest : manifest.files || [];

      const others = await Promise.all(files.map(async (filename) => {
        const id = filename.replace(/\.txt$/i, '');
        if (id === currentRecipe.id) return null;
        try {
          const res = await fetch('Ricette/' + filename, { cache: 'no-cache' });
          if (!res.ok) return null;
          const text = await res.text();
          return window.RicettacoloParser.parseRecipe(text, id);
        } catch (e) {
          return null;
        }
      }));

      const scored = others
        .filter(Boolean)
        .map(r => ({ r: r, s: scoreRelated(currentRecipe, r) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 3)
        .map(x => x.r);

      if (scored.length === 0) return;
      const block = document.getElementById('related-block');
      const grid = document.getElementById('related-grid');
      if (!block || !grid) return;
      scored.forEach(r => grid.appendChild(buildRelatedCard(r)));
      block.classList.remove('hidden');
    } catch (err) {
      console.warn('Related recipes:', err);
    }
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
      // Carica e mostra ricette correlate in modo asincrono (non blocca il render principale)
      loadRelated(recipe);
    } catch (err) {
      console.error(err);
      showError('Impossibile caricare questa ricetta. Verifica che il file Ricette/' + id + '.txt esista. Se stai aprendo il sito con doppio click, usa un server locale (es. python -m http.server).');
    }
  }

  load();
})();
