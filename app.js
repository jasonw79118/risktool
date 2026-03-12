
async function loadJson(path) {
  const response = await fetch(path);
  return response.json();
}
function activateView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.querySelector(`.nav-item[data-view="${viewName}"]`).classList.add('active');
}
function drawLossChart() {
  const canvas = document.getElementById('lossChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = [4, 8, 15, 23, 34, 48, 42, 30, 21, 10];
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#dfe6f1';
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 50;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }
  const max = Math.max(...data);
  const barWidth = 42;
  const gap = 16;
  const startX = 54;
  data.forEach((value, index) => {
    const x = startX + index * (barWidth + gap);
    const h = (value / max) * 180;
    const y = height - h - 34;
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, '#d96b1f');
    gradient.addColorStop(1, '#173a8c');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, h);
  });
  ctx.fillStyle = '#6b778c';
  ctx.font = '12px Arial';
  ctx.fillText('Illustrative annual loss frequency distribution', 40, 18);
}
function renderDomains(domains) {
  const grid = document.getElementById('domainsGrid');
  grid.innerHTML = domains.map(domain => `
    <div class="domain-card">
      <h3>${domain.name}</h3>
      <p>${domain.description}</p>
      <div class="tags">
        ${domain.sample_events.map(evt => `<span class="tag">${evt}</span>`).join('')}
      </div>
    </div>
  `).join('');
}
function renderEvents(events) {
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = events.slice(0, 80).map(evt => `
    <tr>
      <td>${evt.event_id}</td>
      <td>${evt.domain_name}</td>
      <td>${evt.event_name}</td>
      <td>${evt.event_type}</td>
    </tr>
  `).join('');
}
function renderMitigations(items) {
  const grid = document.getElementById('mitigationGrid');
  grid.innerHTML = items.map(item => `
    <div class="mitigation-card">
      <h3>${item.category}</h3>
      <ul>
        ${item.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}
function renderRoles(roles) {
  const list = document.getElementById('roleList');
  list.innerHTML = roles.map(role => `<li>${role}</li>`).join('');
}
async function init() {
  const [domains, events, mitigations, roles] = await Promise.all([
    loadJson('./data/risk_domains.json'),
    loadJson('./data/risk_events.json'),
    loadJson('./data/mitigation_library.json'),
    loadJson('./data/decision_roles.json')
  ]);
  document.getElementById('domain-count').textContent = domains.length;
  document.getElementById('event-count').textContent = events.length;
  document.getElementById('mitigation-count').textContent = mitigations.length;
  document.getElementById('role-count').textContent = roles.length;
  renderDomains(domains);
  renderEvents(events);
  renderMitigations(mitigations);
  renderRoles(roles);
  drawLossChart();
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => activateView(button.dataset.view));
  });
}
document.addEventListener('DOMContentLoaded', init);
