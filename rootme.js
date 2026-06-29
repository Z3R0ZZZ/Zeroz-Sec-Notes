const RUBRIQUES = {
  "16": "Web - Client", "17": "Programming", "18": "Cryptanalysis",
  "67": "Steganography", "68": "Web - Server", "69": "Cracking",
  "70": "Realistic", "182": "Network", "189": "App - Script",
  "203": "App - System", "208": "Forensic",
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
    const rmTotals = rmTotalsResp.ok ? await rmTotalsResp.json() : null;
    const htbBasic = htbBasicResp.ok ? await htbBasicResp.json() : null;
    const htbAct   = htbActResp.ok   ? await htbActResp.json()   : null;

    // Root Me
    if (rm) {
      const validations = Array.isArray(rm.validations) ? rm.validations : [];
      const solved = {};
      for (const v of validations) {
        solved[v.id_rubrique] = (solved[v.id_rubrique] || 0) + 1;
      }
      const categories = Object.entries(RUBRIQUES).map(([rid, name]) => {
        const s = solved[rid] || 0;
        const t = rmTotals?.[rid]?.total ?? 0;
        const pct = t > 0 ? Math.min(100, Math.round((s / t) * 100)) : 0;
        return { name, solved: s, total: t, pct };
      })
      .filter(c => c.solved > 0)
      .sort((a, b) => b.pct - a.pct);

      profilesData.rootme = {
        name: rm.nom ?? 'ZeroZ',
        label: rm.rang ?? '',
        challenges: validations.length,
        categories,
        profileUrl: 'https://www.root-me.org/ZeroZ?lang=fr',
        color: '#534AB7',
        platform: 'Root Me',
        catTitle: 'Completion by category',
        labelFn: c => `${c.solved}/${c.total} (${c.pct}%)`,
        stats: [
          { label: 'Score',     value: rm.score ?? '—' },
          { label: 'Ranking',   value: rm.position ? `#${rm.position}` : '—' },
          { label: 'Challenges',value: validations.length },
        ],
      };
    }

    // HTB
    if (htbBasic?.profile) {
      const p = htbBasic.profile;
      const activity = htbAct?.data ?? [];
      const totalItems = htbAct?.meta?.totalItems ?? activity.length;

      const counts = {};
      for (const a of activity) {
        let label;
        if (a.type === 'challenge')     label = a.categoryName ?? 'Challenge';
        else if (a.type === 'root')     label = 'Machine (Root)';
        else if (a.type === 'user')     label = 'Machine (User)';
        else if (a.type === 'sherlock') label = 'Sherlock';
        else                            label = a.type ?? 'Other';
        counts[label] = (counts[label] || 0) + 1;
      }
      const maxCount = Math.max(...Object.values(counts), 1);
      const categories = Object.entries(counts)
        .map(([name, count]) => ({ name, count, pct: Math.round((count / maxCount) * 100) }))
        .sort((a, b) => b.count - a.count);

      profilesData.htb = {
        name: p.name ?? 'Z3R05',
        label: p.rank ?? '',
        challenges: (p.user_owns ?? 0) + (p.system_owns ?? 0),
        categories,
        profileUrl: 'https://app.hackthebox.com/users/2084386',
        color: '#9fef00',
        platform: 'HackTheBox',
        catTitle: `Last ${totalItems} activities`,
        labelFn: c => `${c.count}`,
        stats: [
          { label: 'User Owns',  value: p.user_owns ?? '—' },
          { label: 'Sys Owns',   value: p.system_owns ?? '—' },
          { label: 'Ranking',    value: p.ranking ? `#${p.ranking}` : '—' },
        ],
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

  const bars = d.categories.slice(0, 9).map(c => `
    <div class="rm-cat">
      <div class="rm-cat-header">
        <span>${c.name}</span>
        <span>${d.labelFn(c)}</span>
      </div>
      <div class="rm-bar-bg">
        <div class="rm-bar-fill" style="width:${c.pct}%; background:${d.color};"></div>
      </div>
    </div>`).join('');

  const statsHTML = d.stats.map(s => `
    <div class="rm-stat">
      <span class="rm-stat-label">${s.label}</span>
      <span class="rm-stat-value">${s.value}</span>
    </div>`).join('');

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
        <div class="rm-stats">${statsHTML}</div>
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