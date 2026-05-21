/*
 * Funzioni condivise per costruire le card delle ricette.
 * Esposte come window.RicettacoloCards.
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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

  // Macro-categoria: Salato vs Dolce
  function macroCategory(recipe) {
    const cat = (recipe.categoria || '').toLowerCase();
    return cat === 'dolce' ? 'dolce' : 'salato';
  }

  global.RicettacoloCards = {
    buildCard: buildCard,
    difficultyDots: difficultyDots,
    escapeHtml: escapeHtml,
    macroCategory: macroCategory
  };
})(window);
