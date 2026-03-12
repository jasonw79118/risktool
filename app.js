
let domains = [];
let events = [];
let mitigations = [];
let roles = [];
let products = [];
let institutions = [];
let lastRun = null;

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
function currency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}
function triangular(min, mode, max) {
  min = Number(min); mode = Number(mode); max = Number(max);
  if (max <= min) return min;
  if (mode < min) mode = min;
  if (mode > max) mode = max;
  const u = Math.random();
  const c = (mode - min) / (max - min);
  if (u < c) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}
function poisson(lambda) {
  lambda = Math.max(0, Number(lambda));
  if (lambda === 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function sampleFrequency(observed, min, likely, max) {
  const estimate = triangular(min, likely, max);
  const lambda = observed > 0 ? (observed * 0.5 + estimate * 0.5) : estimate;
  return poisson(lambda);
}
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}
function populateSelect(id, items, mapper) {
  const select = document.getElementById(id);
  select.innerHTML = items.map(item => {
    const mapped = mapper(item);
    return `<option value="${mapped.value}">${mapped.label}</option>`;
  }).join('');
}
function renderDomains() {
  const grid = document.getElementById('domainsGrid');
  grid.innerHTML = domains.map(domain => {
    const domainEvents = events.filter(e => e.domain_id === domain.id).slice(0, 4);
    return `<div class="domain-card"><h3>${domain.name}</h3><div class="tags">${domainEvents.map(evt => `<span class="tag">${evt.event_name}</span>`).join('')}</div></div>`;
  }).join('');
}
function updateRecommendationOptions() {
  const category = document.getElementById('mitigationCategory').value;
  const match = mitigations.find(m => m.category === category);
  const select = document.getElementById('mitigationRecommendation');
  select.innerHTML = (match ? match.recommendations : []).map(r => `<option value="${r}">${r}</option>`).join('');
}
function getInputs() {
  return {
    scenarioName: document.getElementById('scenarioName').value || 'Unnamed Scenario',
    institutionType: document.getElementById('institutionType').value,
    productService: document.getElementById('productService').value,
    riskEventId: document.getElementById('riskEvent').value,
    riskEventName: document.getElementById('riskEvent').selectedOptions[0].textContent,
    decisionRole: document.getElementById('decisionRole').value,
    iterations: Number(document.getElementById('iterations').value || 5000),
    observedEvents: Number(document.getElementById('observedEvents').value || 0),
    probableMin: Number(document.getElementById('probableMin').value || 0),
    probableLikely: Number(document.getElementById('probableLikely').value || 0),
    probableMax: Number(document.getElementById('probableMax').value || 0),
    directMin: Number(document.getElementById('directMin').value || 0),
    directLikely: Number(document.getElementById('directLikely').value || 0),
    directMax: Number(document.getElementById('directMax').value || 0),
    fineMin: Number(document.getElementById('fineMin').value || 0),
    fineLikely: Number(document.getElementById('fineLikely').value || 0),
    fineMax: Number(document.getElementById('fineMax').value || 0),
    legalMin: Number(document.getElementById('legalMin').value || 0),
    legalLikely: Number(document.getElementById('legalLikely').value || 0),
    legalMax: Number(document.getElementById('legalMax').value || 0),
    secondaryMin: Number(document.getElementById('secondaryMin').value || 0),
    secondaryLikely: Number(document.getElementById('secondaryLikely').value || 0),
    secondaryMax: Number(document.getElementById('secondaryMax').value || 0),
    severityReduction: Number(document.getElementById('severityReduction').value || 0) / 100,
    mitigationCost: Number(document.getElementById('mitigationCost').value || 0),
    insuranceLimit: Number(document.getElementById('insuranceLimit').value || 0),
    insuranceDeductible: Number(document.getElementById('insuranceDeductible').value || 0),
    mitigationCategory: document.getElementById('mitigationCategory').value,
    mitigationRecommendation: document.getElementById('mitigationRecommendation').value
  };
}
function runSimulation() {
  const input = getInputs();
  const results = [];
  for (let i = 0; i < input.iterations; i++) {
    const eventCount = sampleFrequency(input.observedEvents, input.probableMin, input.probableLikely, input.probableMax);
    let annualLoss = 0;
    for (let j = 0; j < eventCount; j++) {
      const direct = triangular(input.directMin, input.directLikely, input.directMax);
      const fine = triangular(input.fineMin, input.fineLikely, input.fineMax);
      const legal = triangular(input.legalMin, input.legalLikely, input.legalMax);
      const secondary = triangular(input.secondaryMin, input.secondaryLikely, input.secondaryMax);
      let gross = direct + fine + legal + secondary;
      gross = gross * (1 - input.severityReduction);
      if (input.insuranceLimit > 0 && gross > input.insuranceDeductible) {
        const recoverable = Math.min(input.insuranceLimit, Math.max(0, gross - input.insuranceDeductible));
        gross -= recoverable;
      }
      annualLoss += gross;
    }
    annualLoss += input.mitigationCost;
    results.push(annualLoss);
  }
  results.sort((a, b) => a - b);
  const expected = results.reduce((a, b) => a + b, 0) / results.length;
  const p50 = percentile(results, 0.50);
  const p95 = percentile(results, 0.95);
  const p99 = percentile(results, 0.99);
  lastRun = { input, expected, p50, p95, p99, results };
  updateOutputs();
  drawLossChart(results);
  activateView('dashboard');
}
function histogram(data, bins = 12) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const width = max === min ? 1 : (max - min) / bins;
  const counts = new Array(bins).fill(0);
  data.forEach(v => {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  });
  return counts;
}
function drawLossChart(data = []) {
  const canvas = document.getElementById('lossChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#dfe6f1';
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 55;
    ctx.beginPath();
    ctx.moveTo(42, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
  const chartData = data.length ? histogram(data, 12) : [4, 8, 15, 23, 34, 48, 42, 30, 21, 10, 7, 4];
  const max = Math.max(...chartData, 1);
  const barWidth = 42, gap = 14, startX = 48;
  chartData.forEach((value, index) => {
    const x = startX + index * (barWidth + gap);
    const h = (value / max) * 180;
    const y = height - h - 36;
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, '#d96b1f');
    gradient.addColorStop(1, '#173a8c');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, h, 10);
    ctx.fill();
  });
  ctx.fillStyle = '#6b778c';
  ctx.font = '12px Arial';
  ctx.fillText('Annual loss distribution', 42, 18);
}
function updateOutputs() {
  if (!lastRun) return;
  document.getElementById('expectedLoss').textContent = currency(lastRun.expected);
  document.getElementById('p50Loss').textContent = currency(lastRun.p50);
  document.getElementById('p95Loss').textContent = currency(lastRun.p95);
  document.getElementById('p99Loss').textContent = currency(lastRun.p99);
  document.getElementById('mitigationAnnual').textContent = currency(lastRun.input.mitigationCost);
  document.getElementById('netExpectedLoss').textContent = currency(lastRun.expected);
  const narrative = `${lastRun.input.scenarioName} for ${lastRun.input.institutionType} / ${lastRun.input.productService} using ${lastRun.input.riskEventName}. Decision role: ${lastRun.input.decisionRole}. Selected mitigation: ${lastRun.input.mitigationCategory} - ${lastRun.input.mitigationRecommendation}.`;
  document.getElementById('scenarioNarrative').textContent = narrative;
  document.getElementById('reportSnapshot').innerHTML = `
    <li><strong>Scenario:</strong> ${lastRun.input.scenarioName}</li>
    <li><strong>Institution Type:</strong> ${lastRun.input.institutionType}</li>
    <li><strong>Product / Service:</strong> ${lastRun.input.productService}</li>
    <li><strong>Risk Event:</strong> ${lastRun.input.riskEventName}</li>
    <li><strong>Expected Annual Loss:</strong> ${currency(lastRun.expected)}</li>
    <li><strong>P95 Loss:</strong> ${currency(lastRun.p95)}</li>
    <li><strong>P99 Loss:</strong> ${currency(lastRun.p99)}</li>
    <li><strong>Decision Role:</strong> ${lastRun.input.decisionRole}</li>
  `;
}
function loadSampleScenario() {
  document.getElementById('scenarioName').value = 'Mobile Banking Fraud + Reg E';
  document.getElementById('institutionType').value = 'Fintech';
  document.getElementById('productService').value = 'Mobile Banking';
  document.getElementById('riskEvent').value = 'EVT-002';
  document.getElementById('decisionRole').value = 'Chief Risk Officer';
  document.getElementById('observedEvents').value = 0.35;
  document.getElementById('probableMin').value = 0.10;
  document.getElementById('probableLikely').value = 0.60;
  document.getElementById('probableMax').value = 1.40;
  document.getElementById('directMin').value = 50000;
  document.getElementById('directLikely').value = 250000;
  document.getElementById('directMax').value = 1250000;
  document.getElementById('fineMin').value = 0;
  document.getElementById('fineLikely').value = 75000;
  document.getElementById('fineMax').value = 900000;
  document.getElementById('legalMin').value = 15000;
  document.getElementById('legalLikely').value = 125000;
  document.getElementById('legalMax').value = 600000;
  document.getElementById('secondaryMin').value = 10000;
  document.getElementById('secondaryLikely').value = 100000;
  document.getElementById('secondaryMax').value = 700000;
  document.getElementById('severityReduction').value = 25;
  document.getElementById('mitigationCost').value = 175000;
  document.getElementById('insuranceLimit').value = 350000;
  document.getElementById('insuranceDeductible').value = 50000;
  document.getElementById('mitigationCategory').value = 'Technology';
  updateRecommendationOptions();
}
async function init() {
  [domains, events, mitigations, roles, products, institutions] = await Promise.all([
    loadJson('./data/risk_domains.json'),
    loadJson('./data/risk_events.json'),
    loadJson('./data/mitigation_library.json'),
    loadJson('./data/decision_roles.json'),
    loadJson('./data/products_services.json'),
    loadJson('./data/institution_types.json')
  ]);
  document.getElementById('domain-count').textContent = domains.length;
  document.getElementById('event-count').textContent = events.length;
  document.getElementById('mitigation-count').textContent = mitigations.length;
  document.getElementById('role-count').textContent = roles.length;
  populateSelect('institutionType', institutions, item => ({ value: item, label: item }));
  populateSelect('productService', products, item => ({ value: item, label: item }));
  populateSelect('riskEvent', events, item => ({ value: item.event_id, label: `${item.domain_name} - ${item.event_name}` }));
  populateSelect('decisionRole', roles, item => ({ value: item, label: item }));
  populateSelect('mitigationCategory', mitigations, item => ({ value: item.category, label: item.category }));
  updateRecommendationOptions();
  renderDomains();
  drawLossChart();
  document.getElementById('mitigationCategory').addEventListener('change', updateRecommendationOptions);
  document.getElementById('runBuilderBtn').addEventListener('click', runSimulation);
  document.getElementById('runTopBtn').addEventListener('click', runSimulation);
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleScenario);
  document.getElementById('loadSampleBuilderBtn').addEventListener('click', loadSampleScenario);
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => activateView(button.dataset.view)));
}
document.addEventListener('DOMContentLoaded', init);
