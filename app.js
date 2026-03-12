let evaluationTypes = [];
let products = [];
let regulations = [];
let riskDomains = [];
let riskSeedItems = [];
let rotationRules = [];
let currentRiskItems = [];

const STORAGE_KEY = 'risk_manager_saved_evaluations_v1';

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}
function activateView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(`view-${viewName}`);
  const btn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (view) view.classList.add('active');
  if (btn) btn.classList.add('active');
}
function populateSelect(id, items, mapper) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = items.map(item => {
    const m = mapper(item);
    return `<option value="${m.value}">${m.label}</option>`;
  }).join('');
}
function renderEvaluationTypes() {
  const grid = document.getElementById('evaluationTypeGrid');
  if (!grid) return;
  grid.innerHTML = evaluationTypes.map(item => `<div class="eval-type-card"><h3>${item.name}</h3><p>${item.description}</p></div>`).join('');
}
function renderLibraries() {
  const productsList = document.getElementById('productsList');
  const regulationsList = document.getElementById('regulationsList');
  const seedItemsList = document.getElementById('seedItemsList');
  if (productsList) productsList.innerHTML = products.map(x => `<li>${x}</li>`).join('');
  if (regulationsList) regulationsList.innerHTML = regulations.map(x => `<li>${x}</li>`).join('');
  if (seedItemsList) seedItemsList.innerHTML = riskSeedItems.map(x => `<li>${x.name} (${x.domain})</li>`).join('');
}
function renderRotationRules() {
  const body = document.getElementById('rotationRulesBody');
  if (!body) return;
  body.innerHTML = rotationRules.map(r => `<tr><td>${r.tier}</td><td>${r.min_score}-${r.max_score}</td><td>${r.review_frequency}</td></tr>`).join('');
}
function renderRiskItemsTable() {
  const tbody = document.getElementById('riskItemsTableBody');
  if (!tbody) return;
  if (!currentRiskItems.length) {
    tbody.innerHTML = '<tr><td colspan="6">No risk items added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = currentRiskItems.map(item => `<tr><td>${item.name}</td><td>${item.domain}</td><td>${item.product}</td><td>${item.regulation}</td><td>${item.score}</td><td>${item.weight}</td></tr>`).join('');
}
function addRiskItem() {
  const item = {
    name: document.getElementById('riskItemName').value || 'Unnamed Risk Item',
    domain: document.getElementById('riskItemDomain').value,
    product: document.getElementById('riskItemProduct').value,
    regulation: document.getElementById('riskItemReg').value,
    score: Number(document.getElementById('riskItemScore').value || 0),
    weight: Number(document.getElementById('riskItemWeight').value || 1)
  };
  currentRiskItems.push(item);
  renderRiskItemsTable();
}
function getReviewFrequency(score) {
  const rule = rotationRules.find(r => score >= r.min_score && score <= r.max_score);
  return rule ? rule.review_frequency : 'Needs Review';
}
function getRiskTier(score) {
  const rule = rotationRules.find(r => score >= r.min_score && score <= r.max_score);
  return rule ? rule.tier : 'Unmapped';
}
function getCurrentEvaluationPayload() {
  return {
    evaluationName: document.getElementById('evaluationName').value || 'Unnamed Evaluation',
    evaluationType: document.getElementById('evaluationType').value,
    primaryProduct: document.getElementById('primaryProduct').value,
    primaryRegulation: document.getElementById('primaryRegulation').value,
    inherentRiskScore: Number(document.getElementById('inherentRiskScore').value || 0),
    controlEffectiveness: Number(document.getElementById('controlEffectiveness').value || 0),
    riskItems: currentRiskItems.slice()
  };
}
function buildInterpretiveSummary(evalName, evalType, primaryProduct, primaryReg, totalRisk, residual, tier, frequency, itemCount) {
  const modeText = evalType === 'single_risk' ? 'single focused scenario' : 'complex multi-item evaluation';
  let tone = 'moderate';
  if (residual >= 85) tone = 'very high';
  else if (residual >= 70) tone = 'high';
  else if (residual < 50) tone = 'lower';
  const priority = residual >= 70 ? 'Management should treat this as a priority item and confirm ownership, review timing, and mitigation plans.' : residual >= 50 ? 'This should stay in the active monitoring queue with scheduled review and documented follow-up.' : 'This can generally remain in a lower-frequency review cycle as long as controls stay stable.';
  return `${evalName} was evaluated as a ${modeText} tied primarily to ${primaryProduct}${primaryReg ? ` and ${primaryReg}` : ''}. The model produced a total risk score of ${totalRisk} and a residual risk score of ${residual}, which places it in the ${tier} tier with a recommended ${frequency} review cycle. ${itemCount > 1 ? `Because this evaluation includes ${itemCount} risk items, the result should be interpreted as an aggregate view rather than a single-event score. ` : ''}Overall, this result suggests ${tone} remaining exposure after control effectiveness is considered. ${priority}`;
}
function updateRunOutputs(summary) {
  document.getElementById('totalRiskScore').textContent = summary.totalRisk;
  document.getElementById('residualRiskScore').textContent = summary.residual;
  document.getElementById('riskTier').textContent = summary.tier;
  document.getElementById('reviewFrequency').textContent = summary.frequency;
  document.getElementById('itemCount').textContent = summary.itemCount;
  document.getElementById('dashboardNarrative').textContent = `${summary.evalName} was run as a ${summary.evalTypeLabel} for ${summary.primaryProduct}. Primary regulation: ${summary.primaryReg}. Total risk score: ${summary.totalRisk}. Residual risk score: ${summary.residual}. Recommended review frequency: ${summary.frequency}.`;
  document.getElementById('aiSummaryBox').textContent = summary.aiSummary;
  document.getElementById('reportSummary').innerHTML = `<li><strong>Evaluation:</strong> ${summary.evalName}</li><li><strong>Type:</strong> ${summary.evalTypeLabel}</li><li><strong>Primary Product:</strong> ${summary.primaryProduct}</li><li><strong>Primary Regulation:</strong> ${summary.primaryReg}</li><li><strong>Total Risk Score:</strong> ${summary.totalRisk}</li><li><strong>Residual Risk Score:</strong> ${summary.residual}</li><li><strong>Risk Tier:</strong> ${summary.tier}</li><li><strong>Review Frequency:</strong> ${summary.frequency}</li><li><strong>Risk Items Included:</strong> ${summary.itemCount}</li>`;
}
function runEvaluation() {
  const payload = getCurrentEvaluationPayload();
  let totalRisk = payload.inherentRiskScore;
  let itemCount = 1;
  if (payload.evaluationType === 'complex_risk' && payload.riskItems.length) {
    let weightedTotal = 0;
    let totalWeight = 0;
    payload.riskItems.forEach(item => { weightedTotal += item.score * item.weight; totalWeight += item.weight; });
    totalRisk = Math.round(weightedTotal / Math.max(totalWeight, 1));
    itemCount = payload.riskItems.length;
  }
  const residual = Math.max(0, Math.round(totalRisk * (1 - payload.controlEffectiveness / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const evalTypeLabel = payload.evaluationType === 'single_risk' ? 'Single Risk Evaluation' : 'Complex Risk Evaluation';
  const aiSummary = buildInterpretiveSummary(payload.evaluationName, payload.evaluationType, payload.primaryProduct, payload.primaryRegulation, totalRisk, residual, tier, frequency, itemCount);
  updateRunOutputs({ evalName: payload.evaluationName, evalTypeLabel, primaryProduct: payload.primaryProduct, primaryReg: payload.primaryRegulation, totalRisk, residual, tier, frequency, itemCount, aiSummary });
  activateView('dashboard');
}
function getSavedEvaluations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveEvaluation() {
  const payload = getCurrentEvaluationPayload();
  let totalRisk = payload.inherentRiskScore;
  let itemCount = 1;
  if (payload.evaluationType === 'complex_risk' && payload.riskItems.length) {
    let weightedTotal = 0;
    let totalWeight = 0;
    payload.riskItems.forEach(item => { weightedTotal += item.score * item.weight; totalWeight += item.weight; });
    totalRisk = Math.round(weightedTotal / Math.max(totalWeight, 1));
    itemCount = payload.riskItems.length;
  }
  const residual = Math.max(0, Math.round(totalRisk * (1 - payload.controlEffectiveness / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const aiSummary = buildInterpretiveSummary(payload.evaluationName, payload.evaluationType, payload.primaryProduct, payload.primaryRegulation, totalRisk, residual, tier, frequency, itemCount);
  const record = {
    id: payload.evaluationName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
    savedAt: new Date().toISOString(),
    ...payload,
    totalRisk, residual, tier, frequency, itemCount, aiSummary
  };
  const saved = getSavedEvaluations();
  const existingIndex = saved.findIndex(x => x.evaluationName === record.evaluationName);
  if (existingIndex >= 0) saved[existingIndex] = record; else saved.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  renderSavedEvaluations();
  activateView('saved');
}
function loadSavedEvaluation(id) {
  const record = getSavedEvaluations().find(x => x.id === id);
  if (!record) return;
  document.getElementById('evaluationName').value = record.evaluationName || '';
  document.getElementById('evaluationType').value = record.evaluationType || 'single_risk';
  document.getElementById('primaryProduct').value = record.primaryProduct || products[0];
  document.getElementById('primaryRegulation').value = record.primaryRegulation || regulations[0];
  document.getElementById('inherentRiskScore').value = record.inherentRiskScore ?? 0;
  document.getElementById('controlEffectiveness').value = record.controlEffectiveness ?? 0;
  currentRiskItems = Array.isArray(record.riskItems) ? record.riskItems.slice() : [];
  renderRiskItemsTable();
  activateView('builder');
}
function deleteSavedEvaluation(id) {
  const next = getSavedEvaluations().filter(x => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  renderSavedEvaluations();
}
function renderSavedEvaluations() {
  const tbody = document.getElementById('savedEvaluationsBody');
  if (!tbody) return;
  const saved = getSavedEvaluations();
  if (!saved.length) {
    tbody.innerHTML = '<tr><td colspan="6">No saved evaluations yet.</td></tr>';
    return;
  }
  tbody.innerHTML = saved.map(record => `<tr><td>${record.evaluationName}</td><td>${record.evaluationType === 'single_risk' ? 'Single' : 'Complex'}</td><td>${record.primaryProduct}</td><td>${record.residual}</td><td>${record.frequency}</td><td><button class="btn btn-secondary small-btn" data-action="load" data-id="${record.id}">Open</button><button class="btn btn-secondary small-btn" data-action="delete" data-id="${record.id}">Delete</button></td></tr>`).join('');
  tbody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === 'load') loadSavedEvaluation(id);
      if (btn.dataset.action === 'delete') deleteSavedEvaluation(id);
    });
  });
}
function loadDepositsExample() {
  document.getElementById('evaluationName').value = 'Deposits Risk Review';
  document.getElementById('evaluationType').value = 'complex_risk';
  document.getElementById('primaryProduct').value = 'Deposits';
  document.getElementById('primaryRegulation').value = 'Reg DD';
  document.getElementById('inherentRiskScore').value = 78;
  document.getElementById('controlEffectiveness').value = 28;
  currentRiskItems = [
    {name:'Overdraft fee disclosure risk', domain:'Consumer Compliance Risk', product:'Deposits', regulation:'Reg DD', score:82, weight:4},
    {name:'ACH fraud exposure', domain:'External Fraud Risk', product:'ACH Processing', regulation:'NACHA', score:76, weight:3},
    {name:'Vendor outage affecting deposit processing', domain:'Third-Party & Vendor Risk', product:'Core Deposit Platform', regulation:'FFIEC IT', score:68, weight:3},
    {name:'Complaint trend from account servicing', domain:'Reputation & Brand Risk', product:'Deposits', regulation:'UDAAP', score:71, weight:2}
  ];
  renderRiskItemsTable();
  activateView('builder');
}
async function init() {
  try {
    [evaluationTypes, products, regulations, riskDomains, riskSeedItems, rotationRules] = await Promise.all([
      loadJson('./data/evaluation_types.json'),
      loadJson('./data/products_services.json'),
      loadJson('./data/regulations.json'),
      loadJson('./data/risk_domains.json'),
      loadJson('./data/risk_items_seed.json'),
      loadJson('./data/review_frequency_rules.json')
    ]);
  } catch (err) {
    console.error(err);
    const n = document.getElementById('dashboardNarrative');
    if (n) n.textContent = 'Some data files did not load. Verify that the data folder was pushed to GitHub with all JSON files.';
  }
  document.getElementById('evalTypeCount').textContent = evaluationTypes.length;
  document.getElementById('domainCount').textContent = riskDomains.length;
  document.getElementById('productCount').textContent = products.length;
  document.getElementById('regCount').textContent = regulations.length;
  populateSelect('evaluationType', evaluationTypes, x => ({value:x.id, label:x.name}));
  populateSelect('primaryProduct', products, x => ({value:x, label:x}));
  populateSelect('primaryRegulation', regulations, x => ({value:x, label:x}));
  populateSelect('riskItemDomain', riskDomains, x => ({value:x, label:x}));
  populateSelect('riskItemProduct', products, x => ({value:x, label:x}));
  populateSelect('riskItemReg', regulations, x => ({value:x, label:x}));
  renderEvaluationTypes();
  renderLibraries();
  renderRotationRules();
  renderRiskItemsTable();
  renderSavedEvaluations();
  const addBtn = document.getElementById('addRiskItemBtn');
  const runBuilderBtn = document.getElementById('runBuilderEvaluationBtn');
  const runBtn = document.getElementById('runEvaluationBtn');
  const loadBtn = document.getElementById('loadDepositProjectBtn');
  const saveBtn = document.getElementById('saveEvaluationBtn');
  if (addBtn) addBtn.addEventListener('click', addRiskItem);
  if (runBuilderBtn) runBuilderBtn.addEventListener('click', runEvaluation);
  if (runBtn) runBtn.addEventListener('click', runEvaluation);
  if (loadBtn) loadBtn.addEventListener('click', loadDepositsExample);
  if (saveBtn) saveBtn.addEventListener('click', saveEvaluation);
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => activateView(button.dataset.view)));
}
document.addEventListener('DOMContentLoaded', init);
