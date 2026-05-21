/*
 * Parser per i file .txt delle ricette.
 *
 * Formato atteso (campi su una riga + sezioni multi-riga):
 *
 *   titolo: Nome della ricetta
 *   categoria: Primo
 *   cucina: Italiana
 *   tempo preparazione: 15 minuti
 *   tempo cottura: 20 minuti
 *   difficolta: 2
 *   porzioni: 4
 *   immagine: nomefile.jpg
 *   tag: pasta, classico, veloce
 *
 *   ingredienti:
 *   - 320 g | Spaghetti
 *   - 4 | Tuorli d'uovo
 *   - q.b. | Pepe nero
 *
 *   procedimento:
 *   1. Primo passaggio.
 *   2. Secondo passaggio.
 *
 *   note:
 *   Testo libero su una o piu' righe.
 *
 * Sono accettati anche alias: "cucina di origine", "tempo di preparazione",
 * "tempo di cottura", "difficoltà", "note personali".
 */

(function (global) {
  'use strict';

  const SECTION_KEYS = new Set([
    'titolo', 'categoria', 'cucina', 'tempo preparazione', 'tempo cottura',
    'difficolta', 'porzioni', 'immagine', 'tag',
    'ingredienti', 'procedimento', 'note'
  ]);

  function normalizeKey(rawKey) {
    const k = rawKey.toLowerCase().trim().replace(/\s+/g, ' ');
    const aliases = {
      'cucina di origine': 'cucina',
      'tempo di preparazione': 'tempo preparazione',
      'tempo di cottura': 'tempo cottura',
      'tempo preparazione / cottura': 'tempo preparazione',
      'difficoltà': 'difficolta',
      'note personali': 'note'
    };
    if (aliases[k]) return aliases[k];
    return SECTION_KEYS.has(k) ? k : null;
  }

  function detectHeader(line) {
    const m = line.match(/^([A-Za-zàèéìòùÀÈÉÌÒÙ /]+):\s*(.*)$/);
    if (!m) return null;
    const key = normalizeKey(m[1]);
    if (!key) return null;
    return { key: key, value: m[2].trim() };
  }

  function parseIngredient(rawLine) {
    // rimuove il "- " iniziale
    const line = rawLine.replace(/^\s*-\s*/, '').trim();
    if (!line) return null;

    if (line.includes('|')) {
      const parts = line.split('|').map(s => s.trim());
      const qtyPart = parts[0];
      const name = parts.slice(1).join('|').trim();

      const qtyMatch = qtyPart.match(/^([\d]+(?:[.,]\d+)?)\s*(.*)$/);
      if (qtyMatch) {
        return {
          qty: parseFloat(qtyMatch[1].replace(',', '.')),
          unit: qtyMatch[2].trim(),
          name: name,
          scalable: true
        };
      }
      // niente numero: es. "q.b." o "qb"
      return {
        qty: null,
        unit: qtyPart,
        name: name,
        scalable: false
      };
    }

    // fallback: nessun separatore
    return { qty: null, unit: '', name: line, scalable: false };
  }

  function parseStep(rawLine) {
    const m = rawLine.match(/^\s*\d+[.)]\s*(.+)$/);
    return m ? m[1].trim() : null;
  }

  function parseRecipe(text, id) {
    const lines = text.split(/\r?\n/);
    const recipe = {
      id: id || '',
      titolo: '',
      categoria: '',
      cucina: '',
      tempoPrep: '',
      tempoCottura: '',
      difficolta: 1,
      porzioni: 1,
      immagine: '',
      tag: [],
      ingredienti: [],
      procedimento: [],
      note: ''
    };

    let currentSection = null;
    let noteBuffer = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      const header = detectHeader(trimmed);

      // se troviamo un header conosciuto, cambiamo sezione
      if (header) {
        currentSection = header.key;
        const value = header.value;

        switch (header.key) {
          case 'titolo': recipe.titolo = value; break;
          case 'categoria': recipe.categoria = value; break;
          case 'cucina': recipe.cucina = value; break;
          case 'tempo preparazione': recipe.tempoPrep = value; break;
          case 'tempo cottura': recipe.tempoCottura = value; break;
          case 'difficolta': recipe.difficolta = Math.max(1, Math.min(3, parseInt(value, 10) || 1)); break;
          case 'porzioni': recipe.porzioni = Math.max(1, parseInt(value, 10) || 1); break;
          case 'immagine': recipe.immagine = value; break;
          case 'tag':
            recipe.tag = value.split(',').map(s => s.trim()).filter(Boolean);
            break;
          case 'note':
            if (value) noteBuffer.push(value);
            break;
          case 'ingredienti':
          case 'procedimento':
            // contenuto sui righi successivi
            break;
        }
        continue;
      }

      // contenuto della sezione corrente
      if (!currentSection) continue;

      if (currentSection === 'ingredienti') {
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const ing = parseIngredient(trimmed);
          if (ing) recipe.ingredienti.push(ing);
        } else if (trimmed.length > 0) {
          // riga libera: trattala come ingrediente non scalabile
          const ing = parseIngredient('- ' + trimmed);
          if (ing) recipe.ingredienti.push(ing);
        }
      } else if (currentSection === 'procedimento') {
        const step = parseStep(trimmed);
        if (step) {
          recipe.procedimento.push(step);
        } else if (trimmed.length > 0 && recipe.procedimento.length > 0) {
          // continuazione del passo precedente
          recipe.procedimento[recipe.procedimento.length - 1] += ' ' + trimmed;
        }
      } else if (currentSection === 'note') {
        noteBuffer.push(rawLine);
      }
    }

    recipe.note = noteBuffer.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return recipe;
  }

  function scaleIngredient(ing, ratio) {
    if (!ing.scalable || ing.qty == null) return ing.unit;
    const scaled = ing.qty * ratio;
    // formattazione: niente decimali per numeri interi, max 2 decimali altrimenti
    let formatted;
    if (Math.abs(scaled - Math.round(scaled)) < 0.01) {
      formatted = String(Math.round(scaled));
    } else {
      formatted = scaled.toFixed(2).replace(/\.?0+$/, '');
    }
    return ing.unit ? `${formatted} ${ing.unit}` : formatted;
  }

  function searchHaystack(recipe) {
    const parts = [
      recipe.titolo,
      recipe.categoria,
      recipe.cucina,
      recipe.note,
      recipe.tag.join(' '),
      recipe.ingredienti.map(i => i.name).join(' ')
    ];
    return parts.join(' ').toLowerCase();
  }

  global.RicettacoloParser = {
    parseRecipe: parseRecipe,
    scaleIngredient: scaleIngredient,
    searchHaystack: searchHaystack
  };
})(window);
