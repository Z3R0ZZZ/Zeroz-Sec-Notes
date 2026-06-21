/* profiles.js — Root Me + HackTheBox */

const RUBRIQUES = {
    "16": "Web - Client", "17": "Programmation", "18": "Cryptanalyse",
    "67": "Stéganographie", "68": "Web - Serveur", "69": "Cracking",
    "70": "Réaliste", "182": "Réseau", "189": "App - Script",
    "203": "App - Système", "208": "Forensic",
  };
  
  const PLATFORMS = ['rootme', 'htb'];
  let current = 0;
  let profilesData = {};
  
  async function loadProfiles() {
    const container = document.getElementById('rootme-widget');
    if (!container) return;
  
    try {
      const [rmResp, rmTotalsResp, htbBasicResp, htbActResp] = await Promise.all([
        fetch('profile_rootme.json'),
        fetch('profile_rootme_totals.json'),
        fetch('profile_htb_basic.json'),
        fetch('profile_htb_activity.json'),
      ]);
  
      const rm       = rmResp.ok       ? await rmResp.json()       : null;
      const totals   = rmTotalsResp.ok ? await rmTotalsResp.json() : null;
      const htbBasic = htbBasicResp.ok ? await htbBasicResp.json() : null;
      const htbAct   = htbActResp.ok   ? await htbActResp.json()   : null;
  
      // Root Me — vrai taux de complétion par catégorie
      if (rm) {
        const validations = Array.isArray(rm.validations) ? rm.validations : [];
        const solved = {};
        for (const v of validations) {
          solved[v.id_rubrique] = (solved[v.id_rubrique] || 0) + 1;
        }
  
        // Construit les catégories avec le vrai pourcentage
        const categories = Object.entries(RUBRIQUES).map(([rid, name]) => {
          const s = solved[rid] || 0;
          const t = totals?.[rid]?.total || 0;
          const pct = t > 0 ? Math.round((s / t) * 100) : 0;
          return { name, solved: s, total: t, pct };
        })
        .filter(c => c.solved > 0)
        .sort((a, b) => b.pct - a.pct);
  
        profilesData.rootme = {
          name: rm.nom ?? 'ZeroZ',
          score: rm.score ?? '—',
          rank: rm.position ? `#${rm.position}` : '—',
          label: rm.rang ?? '',
          challenges: validations.length,
          categories,
          profileUrl: 'https://www.root-me.org/ZeroZ?lang=fr',
          color: '#534AB7',
          platform: 'Root Me',
        };
      }
  
      // HTB
      if (htbBasic?.profile) {
        const p = htbBasic.profile;
        const activity = htbAct?.profile?.activity ?? [];
        const htbCats = {};
        for (const a of activity) {
          if (a.object_type) {
            htbCats[a.object_type] = (htbCats[a.object_type] || 0) + 1;
          }
        }
        const total = activity.length || 1;
        const categories = Object.entries(htbCats)
          .map(([name, count]) => ({ name, solved: count, total, pct: Math.round((count / total) * 100) }))
          .sort((a, b) => b.pct - a.pct);
  
        profilesData.htb = {
          name: p.name ?? 'ZeroZ',
          score: p.points ?? '—',
          rank: p.ranking ? `#${p.ranking}` : '—',
          label: p.rank ?? '',
          challenges: (p.user_owns ?? 0) + (p.system_owns ?? 0),
          categories,
          profileUrl: 'https://app.hackthebox.com/users/2084386',
          color: '#9fef00',
          platform: 'HackTheBox',
        };
      }
  
      renderProfile();
    } catch (e) {
      document.getElementById('rootme-widget').innerHTML =
        `<p style="color:#888;font-size:.9em;">Profils indisponibles.</p>`;
    }
  }
  
  function renderProfile() {
    const container = document.getElementById('rootme-widget');
    const key = PLATFORMS[current];
    const d = profilesData[key];
    if (!d) { current = (current + 1) % PLATFORMS.length; renderProfile(); return; }
  
    const initials = d.name.slice(0, 2).toUpperCase();
  
    const bars = d.categories.slice(0, 8).map(c => {
      const label = key === 'rootme' && c.total > 0
        ? `${c.solved}/${c.total} (${c.pct}%)`
        : `${c.solved} (${c.pct}%)`;
      return `
        <div class="rm-cat">
          <div class="rm-cat-header">
            <span>${c.name}</span>
            <span>${label}</span>
          </div>
          <div class="rm-bar-bg">
            <div class="rm-bar-fill" style="width:${c.pct}%; background:${d.color};"></div>
          </div>
        </div>`;
    }).join('');
  
    const dots = PLATFORMS.map((p, i) =>
      `<span class="rm-dot ${i === current ? 'rm-dot-active' : ''}" style="${i === current ? `background:${d.color};` : ''}"></span>`
    ).join('');
  
    container.innerHTML = `
      <div class="rm-layout">
        <div class="rm-card">
          <div class="rm-header">
            <div class="rm-avatar" style="border-color:${d.color}; color:${d.color};">${initials}</div>
            <div>
              <p class="rm-name">${d.name}</p>
              <p class="rm-sub">${d.platform}${d.label ? ' · ' + d.label : ''}</p>
            </div>
            <a class="rm-link" href="${d.profileUrl}" target="_blank">Voir ↗</a>
          </div>
  
          <div class="rm-stats">
            <div class="rm-stat">
              <span class="rm-stat-label">Score</span>
              <span class="rm-stat-value">${d.score}</span>
            </div>
            <div class="rm-stat">
              <span class="rm-stat-label">Classement</span>
              <span class="rm-stat-value">${d.rank}</span>
            </div>
            <div class="rm-stat">
              <span class="rm-stat-label">Challenges</span>
              <span class="rm-stat-value">${d.challenges}</span>
            </div>
          </div>
  
          <div class="rm-nav">
            <button class="rm-btn" onclick="prevProfile()">← Préc.</button>
            <div class="rm-dots">${dots}</div>
            <button class="rm-btn" onclick="nextProfile()">Suiv. →</button>
          </div>
        </div>
  
        <div class="rm-categories-box">
          <p class="rm-cat-title">${key === 'rootme' ? 'Complétion par catégorie' : 'Répartition activité'}</p>
          ${bars || '<p style="color:#666;font-size:.85em;">Aucune donnée</p>'}
        </div>
      </div>`;
  }
  
  function nextProfile() { current = (current + 1) % PLATFORMS.length; renderProfile(); }
  function prevProfile() { current = (current - 1 + PLATFORMS.length) % PLATFORMS.length; renderProfile(); }
  
  document.addEventListener('DOMContentLoaded', loadProfiles);