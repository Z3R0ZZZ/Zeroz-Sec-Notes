/* profiles.js — Root Me + HackTheBox */

const PLATFORMS = ['rootme', 'htb'];
let current = 0;
let profilesData = {};

async function loadProfiles() {
  const container = document.getElementById('rootme-widget');
  if (!container) return;

  try {
    const [rmResp, rmScoreResp, htbBasicResp, htbActResp] = await Promise.all([
      fetch('profile_rootme.json'),
      fetch('profile_rootme_score.json'),
      fetch('profile_htb_basic.json'),
      fetch('profile_htb_activity.json'),
    ]);

    const rm        = rmResp.ok       ? await rmResp.json()       : null;
    const rmScore   = rmScoreResp.ok  ? await rmScoreResp.json()  : null;
    const htbBasic  = htbBasicResp.ok ? await htbBasicResp.json() : null;
    const htbAct    = htbActResp.ok   ? await htbActResp.json()   : null;

    // Root Me — catégories depuis /auteurs?nom=ZeroZ
    if (rm) {
      const validations = Array.isArray(rm.validations) ? rm.validations : [];

      // Cherche l'entrée ZeroZ dans le tableau retourné par ?nom=
      let categoryData = [];
      if (Array.isArray(rmScore)) {
        const entry = rmScore.find(u => u.nom === 'ZeroZ' || u.id_auteur === '893032');
        categoryData = entry?.score?.category ?? [];
      } else if (rmScore?.score?.category) {
        categoryData = rmScore.score.category;
      }

      const categories = categoryData
        .map(cat => ({
          name: cat.name,
          pct: parseInt(cat.progression) || 0,
        }))
        .filter(c => c.pct > 0)
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
        catTitle: 'Completion by category',
        showPct: true,
      };
    }

    // HTB
    if (htbBasic?.profile) {
      const p = htbBasic.profile;
      const activity = htbAct?.data ?? [];

      const catCounts = {};
      for (const a of activity) {
        let label;
        if (a.type === 'challenge')   label = a.categoryName ?? 'Challenge';
        else if (a.type === 'root')   label = 'Machine (Root)';
        else if (a.type === 'user')   label = 'Machine (User)';
        else if (a.type === 'sherlock') label = 'Sherlock';
        else label = a.type ?? 'Other';
        catCounts[label] = (catCounts[label] || 0) + 1;
      }

      const total = activity.length || 1;
      const categories = Object.entries(catCounts)
        .map(([name, count]) => ({
          name,
          pct: Math.round((count / total) * 100),
          count,
        }))
        .sort((a, b) => b.count - a.count);

      profilesData.htb = {
        name: p.name ?? 'Z3R05',
        score: p.points ?? '—',
        rank: p.ranking ? `#${p.ranking}` : '—',
        label: p.rank ?? '',
        challenges: (p.user_owns ?? 0) + (p.system_owns ?? 0),
        categories,
        profileUrl: 'https://app.hackthebox.com/users/2084386',
        color: '#9fef00',
        platform: 'HackTheBox',
        catTitle: 'Activity breakdown',
        showPct: false,
      };
    }

    renderProfile();
  } catch (e) {
    document.getElementById('rootme-widget').innerHTML =
      `<p style="color:#888;font-size:.9em;">Profiles unavailable.</p>`;
  }
}

function renderProfile() {
  const container = document.getElementById('rootme-widget');
  const key = PLATFORMS[current];
  const d = profilesData[key];
  if (!d) { current = (current + 1) % PLATFORMS.length; renderProfile(); return; }

  const initials = d.name.slice(0, 2).toUpperCase();

  const bars = d.categories.slice(0, 9).map(c => {
    const label = d.showPct
      ? `${c.pct}%`
      : `${c.count} (${c.pct}%)`;
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
          <a class="rm-link" href="${d.profileUrl}" target="_blank">View ↗</a>
        </div>

        <div class="rm-stats">
          <div class="rm-stat">
            <span class="rm-stat-label">Score</span>
            <span class="rm-stat-value">${d.score}</span>
          </div>
          <div class="rm-stat">
            <span class="rm-stat-label">Ranking</span>
            <span class="rm-stat-value">${d.rank}</span>
          </div>
          <div class="rm-stat">
            <span class="rm-stat-label">Challenges</span>
            <span class="rm-stat-value">${d.challenges}</span>
          </div>
        </div>

        <div class="rm-nav">
          <button class="rm-btn" onclick="prevProfile()">← Prev</button>
          <div class="rm-dots">${dots}</div>
          <button class="rm-btn" onclick="nextProfile()">Next →</button>
        </div>
      </div>

      <div class="rm-categories-box">
        <p class="rm-cat-title">${d.catTitle}</p>
        ${bars || '<p style="color:#666;font-size:.85em;">No data available</p>'}
      </div>
    </div>`;
}

function nextProfile() { current = (current + 1) % PLATFORMS.length; renderProfile(); }
function prevProfile() { current = (current - 1 + PLATFORMS.length) % PLATFORMS.length; renderProfile(); }

document.addEventListener('DOMContentLoaded', loadProfiles);