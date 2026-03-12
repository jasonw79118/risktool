
let evaluationTypes = [];
let products = [];
let regulations = [];
let riskDomains = [];
let riskSeedItems = [];
let rotationRules = [];
let currentRiskItems = [];

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
function populateSelect(id, items, mapper) {
  const select = document.getElementById(id);
  select.innerHTML = items.map(item => {
    const m = mapper(item);
    return `<option value="${m.value}">${m.label}</option>`;
  }).join('');
}
function renderEvaluationTypes() {
  const grid = document.getElementById('evaluationTypeGrid');
  grid.innerHTML = evaluationTypes.map(item => `
    <div class="eval-type-card">
      <h3>${item.name}</h3>
      <p>${item.description}</p>
    </div>
  `).join('');
}
function renderLibraries() {
  document.getElementById('productsList').innerHTML = products.map(x => `<li>${x}</li>`).join('');
  document.getElementById('regulationsList').innerHTML = regulations.map(x => `<li>${x}</li>`).join('');
  document.getElementById('seedItemsList').innerHTML = riskSeedItems.map(x => `<li>${x.name} (${x.domain})</li>`).join('');
}
function renderRotationRules() {
  document.getElementById('rotationRulesBody').innerHTML = rotationRules.map(r => `
    <tr>
      <td>${r.tier}</td>
      <td>${r.min_score}-${r.max_score}</td>
      <td>${r.review_frequency}</td>
    </tr>
  `).join('');
}
function renderRiskItemsTable() {
  const tbody = document.getElementById('riskItemsTableBody');
  if (!currentRiskItems.length) {
    tbody.innerHTML = '<tr><td colspan="6">No risk items added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = currentRiskItems.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.domain}</td>
      <td>${item.product}</td>
      <td>${item.regulation}</td>
      <td>${item.score}</td>
      <td>${item.weight}</td>
    </tr>
  `).join('');
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
function runEvaluation() {
  const evalName = document.getElementById('evaluationName').value || 'Unnamed Evaluation';
  const evalType = document.getElementById('evaluationType').value;
  const primaryProduct = document.getElementById('primaryProduct').value;
  const primaryReg = document.getElementById('primaryRegulation').value;
  const inherent = Number(document.getElementById('inherentRiskScore').value || 0);
  const controlEffectiveness = Number(document.getElementById('controlEffectiveness').value || 0);

  let totalRisk = inherent;
  let itemCount = 1;

  if (evalType === 'complex_risk' && currentRiskItems.length) {
    let weightedTotal = 0;
    let totalWeight = 0;
    currentRiskItems.forEach(item => {
      weightedTotal += item.score * item.weight;
      totalWeight += item.weight;
    });
    totalRisk = Math.round(weightedTotal / Math.max(totalWeight, 1));
    itemCount = currentRiskItems.length;
  }

  const residual = Math.max(0, Math.round(totalRisk * (1 - controlEffectiveness / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);

  document.getElementById('totalRiskScore').textContent = totalRisk;
  document.getElementById('residualRiskScore').textContent = residual;
  document.getElementById('riskTier').textContent = tier;
  document.getElementById('reviewFrequency').textContent = frequency;
  document.getElementById('itemCount').textContent = itemCount;

  document.getElementById('dashboardNarrative').textContent =
    `${evalName} was run as a ${evalType === 'single_risk' ? 'Single Risk Evaluation' : 'Complex Risk Evaluation'} for ${primaryProduct}. Primary regulation: ${primaryReg}. Total risk score: ${totalRisk}. Residual risk score: ${residual}. Recommended review frequency: ${frequency}.`;

  document.getElementById('reportSummary').innerHTML = `
    <li><strong>Evaluation:</strong> ${evalName}</li>
    <li><strong>Type:</strong> ${evalType === 'single_risk' ? 'Single Risk Evaluation' : 'Complex Risk Evaluation'}</li>
    <li><strong>Primary Product:</strong> ${primaryProduct}</li>
    <li><strong>Primary Regulation:</strong> ${primaryReg}</li>
    <li><strong>Total Risk Score:</strong> ${totalRisk}</li>
    <li><strong>Residual Risk Score:</strong> ${residual}</li>
    <li><strong>Risk Tier:</strong> ${tier}</li>
    <li><strong>Review Frequency:</strong> ${frequency}</li>
    <li><strong>Risk Items Included:</strong> ${itemCount}</li>
  `;
  activateView('dashboard');
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
  [evaluationTypes, products, regulations, riskDomains, riskSeedItems, rotationRules] = await Promise.all([
    loadJson('./data/evaluation_types.json'),
    loadJson('./data/products_services.json'),
    loadJson('./data/regulations.json'),
    loadJson('./data/risk_domains.json'),
    loadJson('./data/risk_items_seed.json'),
    loadJson('./data/review_frequency_rules.json')
  ]);

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

  document.getElementById('addRiskItemBtn').addEventListener('click', addRiskItem);
  document.getElementById('runBuilderEvaluationBtn').addEventListener('click', runEvaluation);
  document.getElementById('runEvaluationBtn').addEventListener('click', runEvaluation);
  document.getElementById('loadDepositProjectBtn').addEventListener('click', loadDepositsExample);

  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => activateView(button.dataset.view));
  });
}
document.addEventListener('DOMContentLoaded', init);
