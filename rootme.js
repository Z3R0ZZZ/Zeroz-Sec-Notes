const RUBRIQUES = {
    "16":  "Web - Client",
    "17":  "Programmation",
    "18":  "Cryptanalyse",
    "67":  "Stéganographie",
    "68":  "Web - Serveur",
    "69":  "Cracking",
    "70":  "Réaliste",
    "182": "Réseau",
    "189": "App - Script",
    "203": "App - Système",
    "208": "Forensic",
  };
  
  async function loadRootMeProfile() {
    const container = document.getElementById('rootme-widget');
    if (!container) return;
  
    try {
      const resp = await fetch('profile.json');
      if (!resp.ok) throw new Error('profile.json introuvable');
      const data = await resp.json();
  
      const score    = data.score ?? '—';
      const position = data.position ? `#${data.position}` : '—';
      const validations = Array.isArray(data.validations) ? data.validations : [];
      const total = validations.length;
  
      const counts = {};
      for (const v of validations) {
        const name = RUBRIQUES[v.id_rubrique] || `Catégorie ${v.id_rubrique}`;
        counts[name] = (counts[name] || 0) + 1;
      }
  
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
      const bars = sorted.map(([name, count]) => {
        const pct = Math.round((count / total) * 100);
        return `
          <div class="rm-cat">
            <div class="rm-cat-header">
              <span>${name}</span>
              <span>${count} challenge${count > 1 ? 's' : ''} (${pct}%)</span>
            </div>
            <div class="rm-bar-bg">
              <div class="rm-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>`;
      }).join('');
  
      container.innerHTML = `
        <div class="rm-card">
          <div class="rm-header">
            <div class="rm-avatar">ZZ</div>
            <div>
              <p class="rm-name">ZeroZ</p>
              <p class="rm-sub">Root Me</p>
            </div>
            <a class="rm-link" href="https://www.root-me.org/ZeroZ?lang=fr" target="_blank">
              Voir le profil ↗
            </a>
          </div>
          <div class="rm-stats">
            <div class="rm-stat">
              <span class="rm-stat-label">Score</span>
              <span class="rm-stat-value">${score}</span>
            </div>
            <div class="rm-stat">
              <span class="rm-stat-label">Classement</span>
              <span class="rm-stat-value">${position}</span>
            </div>
            <div class="rm-stat">
              <span class="rm-stat-label">Challenges</span>
              <span class="rm-stat-value">${total}</span>
            </div>
          </div>
        </div>
  
        ${bars ? `
        <div class="rm-categories-box">
          <p class="rm-cat-title">Progression par catégorie</p>
          ${bars}
        </div>` : ''}`;
  
    } catch (e) {
      container.innerHTML = `<p style="color:#888;font-size:.9em;">Profil Root Me indisponible.</p>`;
    }
  }
  
  document.addEventListener('DOMContentLoaded', loadRootMeProfile);