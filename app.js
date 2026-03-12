const BASE_EVALUATION_TYPES = [{"id": "single_risk", "name": "Single Risk Evaluation", "description": "One focused scenario or issue."}, {"id": "complex_risk", "name": "Complex Risk Evaluation", "description": "One broader project, area, or product family with multiple risk items."}];
const BASE_PRODUCTS = ["Deposits", "Checking", "Savings", "Certificates of Deposit", "IRA / Retirement Deposits", "Mobile Banking", "Internet Banking", "Online Account Opening", "ACH Processing", "Wire Transfers", "Debit Card Program", "ATM / EFT Network", "Consumer Lending", "Mortgage / HELOC", "Merchant Services", "API Banking / BaaS", "BSA / AML Monitoring", "Core Deposit Platform"];
const BASE_REGULATIONS = ["Reg D", "Reg E", "Reg O", "Reg P", "Reg X", "Reg Z", "Reg BB", "Reg CC", "Reg DD", "Reg GG", "FCRA / Reg V", "UDAAP", "BSA/AML", "CIP", "CTR", "SAR", "FinCEN Watchlist", "OFAC", "ID Theft Red Flags", "IRS Violations", "TIN Certification", "Escheatment", "FDIC Deposit Insurance", "Brokered Deposits", "Government Securities", "Public Funds", "ESIGN", "SCRA", "MLA", "CECL", "FASB 91", "NACHA", "FRB Clearing", "Basel III", "HIPAA", "Visa", "Mastercard", "FFIEC IT", "Record Retention", "GAAP", "Privacy", "Patriot Act", "California Consumer Privacy", "European Consumer Privacy", "SEC", "FINRA"];
const BASE_RISK_DOMAINS = ["Physical & Environmental Risk", "Business Continuity & Resilience", "Operational Process Risk", "Technology & Application Risk", "Cybersecurity Risk", "Information Security & Privacy Risk", "External Fraud Risk", "Internal Fraud & Conduct Risk", "Third-Party & Vendor Risk", "Model, Analytics & AI Risk", "Payments & Network Rule Risk", "Consumer Compliance Risk", "BSA/AML, Sanctions & Financial Crimes Risk", "Securities, FINRA & Public Company Risk", "Financial Reporting & Accounting Risk", "Credit & Counterparty Risk", "Liquidity, Treasury & Funding Risk", "Capital, Interest Rate & Market Risk", "Legal, Litigation & Judgement Risk", "Strategic & Business Model Risk", "Reputation & Brand Risk", "Human Capital & Workforce Risk", "Governance, Board & Oversight Risk", "Audit, Assurance & Exam Risk", "Records, Documentation & Retention Risk", "Tax, IRS & Escheatment Risk", "Identity, Authentication & Access Risk", "Customer Fairness, Conduct & UDAAP Risk", "Global, Cross-Border & Geopolitical Risk", "Insurance & Risk Transfer Risk"];
const BASE_ROTATION_RULES = [{"tier": "Very High", "min_score": 85, "max_score": 100, "review_frequency": "Quarterly"}, {"tier": "High", "min_score": 70, "max_score": 84, "review_frequency": "Semiannual"}, {"tier": "Moderate", "min_score": 50, "max_score": 69, "review_frequency": "Annual"}, {"tier": "Low", "min_score": 0, "max_score": 49, "review_frequency": "18-24 Months"}];

const STORAGE_KEY = 'risk_manager_saved_evaluations_v2';
const CAT_EVAL_KEY = 'risk_manager_eval_types_custom';
const CAT_PRODUCT_KEY = 'risk_manager_products_custom';
const CAT_REG_KEY = 'risk_manager_regulations_custom';

let evaluationTypes = [];
let products = [];
let regulations = [];
let riskDomains = [];
let rotationRules = [];
let currentComplexItems = [];
let activeMode = 'single';
let lastSummary = null;

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}
function getStoredArray(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function setStoredArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}
function refreshLibraries() {
  evaluationTypes = [...BASE_EVALUATION_TYPES, ...getStoredArray(CAT_EVAL_KEY).map(x => ({id:x.toLowerCase().replace(/[^a-z0-9]+/g,'_'), name:x, description:'User-added evaluation type.'}))];
  products = uniqueList([...BASE_PRODUCTS, ...getStoredArray(CAT_PRODUCT_KEY)]);
  regulations = uniqueList([...BASE_REGULATIONS, ...getStoredArray(CAT_REG_KEY)]);
  riskDomains = BASE_RISK_DOMAINS.slice();
  rotationRules = BASE_ROTATION_RULES.slice();

  document.getElementById('productCount').textContent = products.length;
  document.getElementById('regCount').textContent = regulations.length;
  document.getElementById('domainCount').textContent = riskDomains.length;
  document.getElementById('savedCount').textContent = getSavedScenarios().length;

  populateSelect('singleEvaluationType', evaluationTypes, x => ({value:x.id, label:x.name}));
  populateSelect('complexEvaluationType', evaluationTypes, x => ({value:x.id, label:x.name}));
  populateSelect('singlePrimaryProduct', products, x => ({value:x, label:x}));
  populateSelect('complexPrimaryProduct', products, x => ({value:x, label:x}));
  populateSelect('singlePrimaryRegulation', regulations, x => ({value:x, label:x}));
  populateSelect('complexPrimaryRegulation', regulations, x => ({value:x, label:x}));
  populateSelect('riskItemDomain', riskDomains, x => ({value:x, label:x}));
  populateSelect('riskItemProduct', products, x => ({value:x, label:x}));
  populateSelect('riskItemReg', regulations, x => ({value:x, label:x}));
}
function populateSelect(id, items, mapper) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = items.map(item => {
    const m = mapper(item);
    return `<option value="${m.value}">${m.label}</option>`;
  }).join('');
}
function activateView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(`view-${viewName}`);
  const btn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (view) view.classList.add('active');
  if (btn) btn.classList.add('active');
  if (viewName === 'single') activeMode = 'single';
  if (viewName === 'complex') activeMode = 'complex';
}
function renderComplexItems() {
  const tbody = document.getElementById('riskItemsTableBody');
  if (!tbody) return;
  if (!currentComplexItems.length) {
    tbody.innerHTML = '<tr><td colspan="6">No risk items added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = currentComplexItems.map(item => `<tr><td>${item.name}</td><td>${item.domain}</td><td>${item.product}</td><td>${item.regulation}</td><td>${item.score}</td><td>${item.weight}</td></tr>`).join('');
}
function addRiskItem() {
  currentComplexItems.push({
    name: document.getElementById('riskItemName').value || 'Unnamed Risk Item',
    domain: document.getElementById('riskItemDomain').value,
    product: document.getElementById('riskItemProduct').value,
    regulation: document.getElementById('riskItemReg').value,
    score: Number(document.getElementById('riskItemScore').value || 0),
    weight: Number(document.getElementById('riskItemWeight').value || 1)
  });
  renderComplexItems();
}
function getReviewFrequency(score) {
  const rule = rotationRules.find(r => score >= r.min_score && score <= r.max_score);
  return rule ? rule.review_frequency : 'Needs Review';
}
function getRiskTier(score) {
  const rule = rotationRules.find(r => score >= r.min_score && score <= r.max_score);
  return rule ? rule.tier : 'Unmapped';
}
function buildSummary(name, mode, product, reg, total, residual, tier, frequency, itemCount) {
  const modeText = mode === 'single' ? 'single focused scenario' : 'complex multi-item scenario';
  const significance = residual >= 85 ? 'very high' : residual >= 70 ? 'high' : residual >= 50 ? 'moderate' : 'lower';
  return `${name} was evaluated as a ${modeText} tied primarily to ${product}${reg ? ` and ${reg}` : ''}. The model produced a total risk score of ${total} and a residual risk score of ${residual}, placing it in the ${tier} tier with a recommended ${frequency} review cycle. ${itemCount > 1 ? `This scenario includes ${itemCount} weighted risk items, so the result should be interpreted as an aggregate view across several components. ` : ''}Overall, the remaining exposure appears ${significance} after control effectiveness is applied.`;
}
function getSinglePayload() {
  return {
    mode: 'single',
    name: document.getElementById('singleScenarioName').value || 'Unnamed Single Scenario',
    evaluationType: document.getElementById('singleEvaluationType').value,
    primaryProduct: document.getElementById('singlePrimaryProduct').value,
    primaryRegulation: document.getElementById('singlePrimaryRegulation').value,
    inherent: Number(document.getElementById('singleInherentRiskScore').value || 0),
    control: Number(document.getElementById('singleControlEffectiveness').value || 0),
    items: []
  };
}
function getComplexPayload() {
  return {
    mode: 'complex',
    name: document.getElementById('complexScenarioName').value || 'Unnamed Complex Scenario',
    evaluationType: document.getElementById('complexEvaluationType').value,
    primaryProduct: document.getElementById('complexPrimaryProduct').value,
    primaryRegulation: document.getElementById('complexPrimaryRegulation').value,
    inherent: Number(document.getElementById('complexInherentRiskScore').value || 0),
    control: Number(document.getElementById('complexControlEffectiveness').value || 0),
    items: currentComplexItems.slice()
  };
}
function runScenario() {
  const payload = activeMode === 'single' ? getSinglePayload() : getComplexPayload();
  let total = payload.inherent;
  let itemCount = 1;
  if (payload.mode === 'complex' && payload.items.length) {
    let weightedTotal = 0;
    let totalWeight = 0;
    payload.items.forEach(item => { weightedTotal += item.score * item.weight; totalWeight += item.weight; });
    total = Math.round(weightedTotal / Math.max(totalWeight, 1));
    itemCount = payload.items.length;
  }
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const monteCarloRows = [
    ['Inherent Risk Score', payload.inherent],
    ['Control Effectiveness %', payload.control],
    ['Total Risk Score', total],
    ['Residual Risk Score', residual],
    ['Risk Tier', tier],
    ['Review Frequency', frequency],
    ['Included Risk Items', itemCount]
  ];
  const summary = { ...payload, total, residual, tier, frequency, itemCount,
    generatedSummary: buildSummary(payload.name, payload.mode, payload.primaryProduct, payload.primaryRegulation, total, residual, tier, frequency, itemCount),
    monteCarloRows
  };
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderMonteCarloTable(summary);
  renderCharts(summary);
  activateView('dashboard');
}
function renderScenarioSummary(summary) {
  document.getElementById('totalRiskScore').textContent = summary.total;
  document.getElementById('residualRiskScore').textContent = summary.residual;
  document.getElementById('riskTier').textContent = summary.tier;
  document.getElementById('reviewFrequency').textContent = summary.frequency;
  document.getElementById('itemCount').textContent = summary.itemCount;
  document.getElementById('dashboardNarrative').textContent = `${summary.name} was run as a ${summary.mode === 'single' ? 'Single Scenario' : 'Complex Scenario'} for ${summary.primaryProduct}. Primary regulation: ${summary.primaryRegulation}. Total risk score: ${summary.total}. Residual risk score: ${summary.residual}. Recommended review frequency: ${summary.frequency}.`;
  document.getElementById('aiSummaryBox').textContent = summary.generatedSummary;
  document.getElementById('reportSummary').innerHTML = `
    <li><strong>Scenario:</strong> ${summary.name}</li>
    <li><strong>Builder:</strong> ${summary.mode === 'single' ? 'Single Scenario' : 'Complex Scenario'}</li>
    <li><strong>Primary Product:</strong> ${summary.primaryProduct}</li>
    <li><strong>Primary Regulation:</strong> ${summary.primaryRegulation}</li>
    <li><strong>Total Risk Score:</strong> ${summary.total}</li>
    <li><strong>Residual Risk Score:</strong> ${summary.residual}</li>
    <li><strong>Risk Tier:</strong> ${summary.tier}</li>
    <li><strong>Review Frequency:</strong> ${summary.frequency}</li>
  `;
}
function drawSimpleBarChart(canvasId, summary) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !summary) return;
  const ctx = canvas.getContext('2d');
  const data = [summary.inherent, summary.total, summary.residual];
  const labels = ['Inherent', 'Total', 'Residual'];
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#dfe6f1';
  for (let i = 0; i < 5; i++) {
    const y = 25 + i * 45;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 20, y); ctx.stroke();
  }
  const max = Math.max(...data, 100);
  const barWidth = 80, gap = 60, startX = 90;
  data.forEach((v, i) => {
    const bh = (v / max) * 160;
    const x = startX + i * (barWidth + gap);
    const y = h - bh - 40;
    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
    grad.addColorStop(0, '#d96b1f');
    grad.addColorStop(1, '#173a8c');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, bh);
    ctx.fillStyle = '#172033';
    ctx.font = '12px Arial';
    ctx.fillText(labels[i], x + 12, h - 18);
    ctx.fillText(String(v), x + 22, y - 8);
  });
}
function renderCharts(summary) {
  const showDash = document.getElementById('showDashboardGraphToggle').checked;
  const showReport = document.getElementById('includeGraphInReport').checked;
  document.getElementById('dashboardChartCard').classList.toggle('hidden', !showDash);
  document.getElementById('reportGraphCard').classList.toggle('hidden', !showReport);
  if (showDash) drawSimpleBarChart('dashboardChart', summary);
  if (showReport) drawSimpleBarChart('reportChart', summary);
}
function renderMonteCarloTable(summary) {
  const showTable = document.getElementById('includeMonteCarloTable').checked;
  const showExplain = document.getElementById('includeMonteCarloExplanation').checked;
  const card = document.getElementById('monteCarloTableCard');
  const tbody = document.getElementById('monteCarloTableBody');
  const explain = document.getElementById('monteCarloExplanationBox');
  card.classList.toggle('hidden', !showTable);
  if (!showTable || !summary) return;
  tbody.innerHTML = summary.monteCarloRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  explain.classList.toggle('hidden', !showExplain);
  if (showExplain) {
    explain.textContent = 'This table shows the key values used to derive the current evaluation output. In this starter version, it summarizes the base score inputs, control impact, resulting residual risk, and review recommendation. In a later phase, this section can expand into a fuller Monte Carlo assumptions/output table for printable and export-ready reports.';
  }
}
function getSavedScenarios() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveScenario() {
  const payload = activeMode === 'single' ? getSinglePayload() : getComplexPayload();
  let total = payload.inherent;
  let itemCount = 1;
  if (payload.mode === 'complex' && payload.items.length) {
    let weightedTotal = 0, totalWeight = 0;
    payload.items.forEach(item => { weightedTotal += item.score * item.weight; totalWeight += item.weight; });
    total = Math.round(weightedTotal / Math.max(totalWeight, 1));
    itemCount = payload.items.length;
  }
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const summary = {
    id: payload.name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
    ...payload, total, residual, tier, frequency, itemCount,
    generatedSummary: buildSummary(payload.name, payload.mode, payload.primaryProduct, payload.primaryRegulation, total, residual, tier, frequency, itemCount)
  };
  const saved = getSavedScenarios();
  const existing = saved.findIndex(x => x.name === summary.name);
  if (existing >= 0) saved[existing] = summary; else saved.unshift(summary);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  renderSavedScenarios();
  refreshLibraries();
  activateView('saved');
}
function renderSavedScenarios() {
  const tbody = document.getElementById('savedEvaluationsBody');
  const saved = getSavedScenarios();
  document.getElementById('savedCount').textContent = saved.length;
  if (!saved.length) {
    tbody.innerHTML = '<tr><td colspan="6">No saved scenarios yet.</td></tr>';
    return;
  }
  tbody.innerHTML = saved.map(s => `<tr>
    <td>${s.name}</td>
    <td>${s.mode === 'single' ? 'Single' : 'Complex'}</td>
    <td>${s.primaryProduct}</td>
    <td>${s.residual}</td>
    <td>${s.frequency}</td>
    <td>
      <button class="btn btn-secondary small-btn" data-action="open" data-id="${s.id}">Open</button>
      <button class="btn btn-secondary small-btn" data-action="delete" data-id="${s.id}">Delete</button>
    </td>
  </tr>`).join('');
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    if (btn.dataset.action === 'open') openScenario(id);
    if (btn.dataset.action === 'delete') deleteScenario(id);
  }));
}
function openScenario(id) {
  const s = getSavedScenarios().find(x => x.id === id);
  if (!s) return;
  if (s.mode === 'single') {
    document.getElementById('singleScenarioName').value = s.name || '';
    document.getElementById('singleEvaluationType').value = s.evaluationType || evaluationTypes[0]?.id || '';
    document.getElementById('singlePrimaryProduct').value = s.primaryProduct || products[0] || '';
    document.getElementById('singlePrimaryRegulation').value = s.primaryRegulation || regulations[0] || '';
    document.getElementById('singleInherentRiskScore').value = s.inherent || 0;
    document.getElementById('singleControlEffectiveness').value = s.control || 0;
    activeMode = 'single';
    activateView('single');
  } else {
    document.getElementById('complexScenarioName').value = s.name || '';
    document.getElementById('complexEvaluationType').value = s.evaluationType || evaluationTypes[1]?.id || '';
    document.getElementById('complexPrimaryProduct').value = s.primaryProduct || products[0] || '';
    document.getElementById('complexPrimaryRegulation').value = s.primaryRegulation || regulations[0] || '';
    document.getElementById('complexInherentRiskScore').value = s.inherent || 0;
    document.getElementById('complexControlEffectiveness').value = s.control || 0;
    currentComplexItems = Array.isArray(s.items) ? s.items.slice() : [];
    renderComplexItems();
    activeMode = 'complex';
    activateView('complex');
  }
}
function deleteScenario(id) {
  const next = getSavedScenarios().filter(x => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  renderSavedScenarios();
  refreshLibraries();
}
function addCustomCategory(inputId, storageKey) {
  const el = document.getElementById(inputId);
  const value = (el.value || '').trim();
  if (!value) return;
  const arr = getStoredArray(storageKey);
  arr.push(value);
  setStoredArray(storageKey, uniqueList(arr));
  el.value = '';
  refreshLibraries();
}
function loadDepositsExample() {
  document.getElementById('complexScenarioName').value = 'Deposits Risk Review';
  document.getElementById('complexEvaluationType').value = 'complex_risk';
  document.getElementById('complexPrimaryProduct').value = 'Deposits';
  document.getElementById('complexPrimaryRegulation').value = 'Reg DD';
  document.getElementById('complexInherentRiskScore').value = 78;
  document.getElementById('complexControlEffectiveness').value = 28;
  currentComplexItems = [
    {name:'Overdraft fee disclosure risk', domain:'Consumer Compliance Risk', product:'Deposits', regulation:'Reg DD', score:82, weight:4},
    {name:'ACH fraud exposure', domain:'External Fraud Risk', product:'ACH Processing', regulation:'NACHA', score:76, weight:3},
    {name:'Vendor outage affecting deposit processing', domain:'Third-Party & Vendor Risk', product:'Core Deposit Platform', regulation:'FFIEC IT', score:68, weight:3},
    {name:'Complaint trend from account servicing', domain:'Reputation & Brand Risk', product:'Deposits', regulation:'UDAAP', score:71, weight:2}
  ];
  renderComplexItems();
  activeMode = 'complex';
  activateView('complex');
}
function init() {
  refreshLibraries();
  renderSavedScenarios();
  renderComplexItems();

  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => activateView(btn.dataset.view)));
  document.getElementById('addRiskItemBtn').addEventListener('click', addRiskItem);
  document.getElementById('saveScenarioBtn').addEventListener('click', saveScenario);
  document.getElementById('runScenarioBtn').addEventListener('click', runScenario);
  document.getElementById('loadDepositProjectBtn').addEventListener('click', loadDepositsExample);

  document.getElementById('addEvaluationTypeBtn').addEventListener('click', () => addCustomCategory('newEvaluationTypeName', CAT_EVAL_KEY));
  document.getElementById('addProductBtn').addEventListener('click', () => addCustomCategory('newProductName', CAT_PRODUCT_KEY));
  document.getElementById('addRegulationBtn').addEventListener('click', () => addCustomCategory('newRegulationName', CAT_REG_KEY));

  document.getElementById('showDashboardGraphToggle').addEventListener('change', () => renderCharts(lastSummary));
  document.getElementById('includeGraphInReport').addEventListener('change', () => renderCharts(lastSummary));
  document.getElementById('includeMonteCarloTable').addEventListener('change', () => renderMonteCarloTable(lastSummary));
  document.getElementById('includeMonteCarloExplanation').addEventListener('change', () => renderMonteCarloTable(lastSummary));
}
document.addEventListener('DOMContentLoaded', init);
