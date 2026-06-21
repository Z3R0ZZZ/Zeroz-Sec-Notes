/* rootme.js — charge profile.json généré par GitHub Actions */
async function loadRootMeProfile() {
    const container = document.getElementById('rootme-widget');
    if (!container) return;
  
    try {
      const resp = await fetch('profile.json');
      if (!resp.ok) throw new Error('profile.json introuvable');
      const data = await resp.json();
  
      const score      = data.score ?? '—';
      const position   = data.position ? `#${data.position}` : '—';
      const challenges = Array.isArray(data.challenges)
        ? data.challenges.length
        : Object.keys(data.challenges ?? {}).length;
      const categories = (data.score?.category ?? []).slice(0, 6);
  
      const bars = categories.map(cat => {
        const pct = parseInt(cat.progression) || 0;
        return `
          <div class="rm-cat">
            <div class="rm-cat-header">
              <span>${cat.name}</span>
              <span>${cat.progression}</span>
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
              <span class="rm-stat-value">${challenges}</span>
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