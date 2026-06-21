/* profiles.js — Root Me + HackTheBox, layout côte à côte */

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
      const [rmResp, htbBasicResp, htbActResp] = await Promise.all([
        fetch('profile_rootme.json'),
        fetch('profile_htb_basic.json'),
        fetch('profile_htb_activity.json'),
      ]);
  
      const rm       = rmResp.ok       ? await rmResp.json()       : null;
      const htbBasic = htbBasicResp.ok ? await htbBasicResp.json() : null;
      const htbAct   = htbActResp.ok   ? await htbActResp.json()   : null;
  
      // Root Me
      if (rm) {
        const validations = Array.isArray(rm.validations) ? rm.validations : [];
        const counts = {};
        for (const v of validations) {
          const name = RUBRIQUES[v.id_rubrique] || `Cat. ${v.id_rubrique}`;
          counts[name] = (counts[name] || 0) + 1;
        }
        profilesData.rootme = {
          name: rm.nom ?? 'ZeroZ',
          score: rm.score ?? '—',
          rank: rm.position ? `#${rm.position}` : '—',
          label: rm.rang ?? '',
          challenges: validations.length,
          categories: Object.entries(counts).sort((a, b) => b[1] - a[1]),
          total: validations.length,
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
        profilesData.htb = {
          name: p.name ?? 'ZeroZ',
          score: p.points ?? '—',
          rank: p.ranking ? `#${p.ranking}` : '—',
          label: p.rank ?? '',
          challenges: (p.user_owns ?? 0) + (p.system_owns ?? 0),
          categories: Object.entries(htbCats).sort((a, b) => b[1] - a[1]),
          total: activity.length || 1,
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
    const bars = d.categories.slice(0, 8).map(([name, count]) => {
      const pct = Math.round((count / d.total) * 100);
      return `
        <div class="rm-cat">
          <div class="rm-cat-header">
            <span>${name}</span>
            <span>${count} (${pct}%)</span>
          </div>
          <div class="rm-bar-bg">
            <div class="rm-bar-fill" style="width:${pct}%; background:${d.color};"></div>
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
          <p class="rm-cat-title">Progression · ${d.platform}</p>
          ${bars || '<p style="color:#666;font-size:.85em;">Aucune donnée</p>'}
        </div>
      </div>`;
  }
  
  function nextProfile() {
    current = (current + 1) % PLATFORMS.length;
    renderProfile();
  }
  
  function prevProfile() {
    current = (current - 1 + PLATFORMS.length) % PLATFORMS.length;
    renderProfile();
  }
  
  document.addEventListener('DOMContentLoaded', loadProfiles);