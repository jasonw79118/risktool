const DEFAULT_PRODUCT_GROUPS = ["Digital","Document Services","Education Services","Interfaces and Bridge Integrations","LOS","DOS","Managed Services","Core","Payment Services","Regulatory Compliance","Risk","Marketing","Legal","Executive Management","Physical Locations","Customer X","Relationship Management","CRC","Human Resources","Implementations","State Issues","Deployment","Internal","Vendor Due Diligence","Audit","3rd Party","Partnership","Vendors"];
const DEFAULT_PRODUCTS = ["Deposits", "Checking", "Savings", "Certificates of Deposit", "IRA / Retirement Deposits", "Mobile Banking", "Internet Banking", "Online Account Opening", "ACH Processing", "Wire Transfers", "Debit Card Program", "ATM / EFT Network", "Consumer Lending", "Mortgage / HELOC", "Merchant Services", "API Banking / BaaS", "BSA / AML Monitoring", "Core Deposit Platform"];
const DEFAULT_REGULATIONS = ["Reg D", "Reg E", "Reg O", "Reg P", "Reg X", "Reg Z", "Reg BB", "Reg CC", "Reg DD", "Reg GG", "FCRA / Reg V", "UDAAP", "BSA/AML", "CIP", "CTR", "SAR", "FinCEN Watchlist", "OFAC", "ID Theft Red Flags", "IRS Violations", "TIN Certification", "Escheatment", "FDIC Deposit Insurance", "Brokered Deposits", "Government Securities", "Public Funds", "ESIGN", "SCRA", "MLA", "CECL", "FASB 91", "NACHA", "FRB Clearing", "Basel III", "HIPAA", "Visa", "Mastercard", "FFIEC IT", "Record Retention", "GAAP", "Privacy", "Patriot Act", "California Consumer Privacy", "European Consumer Privacy", "SEC", "FINRA"];
const DEFAULT_RISK_DOMAINS = ["Audit, Assurance & Exam Risk","BSA/AML, Sanctions & Financial Crimes Risk","Business Continuity & Resilience","Capital, Interest Rate & Market Risk","Consumer Compliance Risk","Credit & Counterparty Risk","Customer Fairness, Conduct & UDAAP Risk","Cybersecurity Risk","External Fraud Risk","Financial Reporting & Accounting Risk","Global, Cross-Border & Geopolitical Risk","Governance, Board & Oversight Risk","Human Capital & Workforce Risk","Identity, Authentication & Access Risk","Information Security & Privacy Risk","Insurance & Risk Transfer Risk","Internal Fraud & Conduct Risk","Legal, Litigation & Judgement Risk","Liquidity, Treasury & Funding Risk","Model, Analytics & AI Risk","Operational Process Risk","Payments & Network Rule Risk","Physical & Environmental Risk","Records, Documentation & Retention Risk","Reputation & Brand Risk","Securities, FINRA & Public Company Risk","Strategic & Business Model Risk","Tax, IRS & Escheatment Risk","Technology & Application Risk","Third-Party & Vendor Risk"];
const DEFAULT_SCENARIO_STATUSES = ["Closed","Open","Pending","Referred to Committee"];
const DEFAULT_SCENARIO_SOURCES = ["Audit","Exam Finding","Industry News","New Regulation","Risk"];
const DEFAULT_ACCEPTANCE_AUTHORITIES = ["Board","CEO","CRO","CTO","Risk Governance Committee"];
const DEFAULT_ROTATION_RULES = [
  {"tier":"Very High","min_score":85,"max_score":100,"review_frequency":"Quarterly"},
  {"tier":"High","min_score":70,"max_score":84,"review_frequency":"Semiannual"},
  {"tier":"Moderate","min_score":50,"max_score":69,"review_frequency":"Annual"},
  {"tier":"Low","min_score":0,"max_score":49,"review_frequency":"18-24 Months"}
];

const STORAGE_KEY = "risk_manager_scenarios_v431";
const LEGACY_STORAGE_KEY = "risk_manager_saved_evaluations_v2";
const CAT_KEYS = {
  productGroups: "risk_manager_product_groups_v431",
  products: "risk_manager_products_v431",
  regulations: "risk_manager_regulations_v431",
  riskDomains: "risk_manager_risk_domains_v431",
  scenarioStatuses: "risk_manager_scenario_statuses_v431",
  scenarioSources: "risk_manager_scenario_sources_v431",
  acceptanceAuthorities: "risk_manager_acceptance_authorities_v431",
  monteCarloConfig: "risk_manager_monte_carlo_config_v431"
};

let productGroups = [];
let products = [];
let regulations = [];
let riskDomains = [];
let scenarioStatuses = [];
let scenarioSources = [];
let acceptanceAuthorities = [];
let rotationRules = structuredClone(DEFAULT_ROTATION_RULES);

let currentComplexItems = [];
let singleMitigations = [];
let complexMitigations = [];
let activeMode = "single";
let lastSummary = null;

function sortedUnique(items) {
  return [...new Set(items.map(x => String(x || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getStoredArray(key) {
  return Array.isArray(readJSON(key, [])) ? readJSON(key, []) : [];
}
function setStoredArray(key, value) {
  writeJSON(key, sortedUnique(value));
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function currentDateStamp() {
  return todayIso().replaceAll("-", "");
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function normalizeScenario(saved) {
  return {
    id: saved.id || saved.scenarioId || "",
    name: saved.name || saved.title || "Unnamed Scenario",
    mode: saved.mode || saved.scenarioType || "single",
    productGroup: saved.productGroup || saved.primaryProduct || "",
    riskDomain: saved.riskDomain || "",
    scenarioStatus: saved.scenarioStatus || "Open",
    scenarioSource: saved.scenarioSource || "Risk",
    primaryProduct: saved.primaryProduct || "",
    primaryRegulation: saved.primaryRegulation || "",
    scenarioOwner: saved.scenarioOwner || "",
    identifiedDate: saved.identifiedDate || "",
    description: saved.description || "",
    likelihood: Number(saved.likelihood || 0),
    impact: Number(saved.impact || 0),
    inherent: Number(saved.inherent || 0),
    control: Number(saved.control || 0),
    total: Number(saved.total || saved.inherent || 0),
    residual: Number(saved.residual || 0),
    tier: saved.tier || getRiskTier(Number(saved.residual || 0)),
    frequency: saved.frequency || getReviewFrequency(Number(saved.residual || 0)),
    itemCount: Number(saved.itemCount || (Array.isArray(saved.items) && saved.items.length) || 1),
    items: Array.isArray(saved.items) ? saved.items : [],
    mitigations: Array.isArray(saved.mitigations) ? saved.mitigations : [],
    acceptedRisk: saved.acceptedRisk || {
      isAccepted: false,
      authority: "",
      acceptedBy: "",
      acceptanceDate: "",
      reviewDate: "",
      decisionLogic: ""
    },
    generatedSummary: saved.generatedSummary || ""
  };
}
function getSavedScenarios() {
  const direct = readJSON(STORAGE_KEY, null);
  if (Array.isArray(direct)) return direct.map(normalizeScenario);
  const legacy = readJSON(LEGACY_STORAGE_KEY, []);
  const migrated = Array.isArray(legacy) ? legacy.map(x => {
    const scenario = normalizeScenario(x);
    if (!scenario.id) scenario.id = generateScenarioId([]);
    return scenario;
  }) : [];
  if (migrated.length) writeJSON(STORAGE_KEY, migrated);
  return migrated;
}
function setSavedScenarios(items) {
  writeJSON(STORAGE_KEY, items);
}
function generateScenarioId(existingScenarios) {
  const stamp = currentDateStamp();
  const matching = existingScenarios
    .map(x => String(x.id || ""))
    .filter(x => x.startsWith(stamp + "-"))
    .map(x => Number(x.split("-")[1]))
    .filter(Number.isFinite);
  const next = (matching.length ? Math.max(...matching) : 0) + 1;
  return `${stamp}-${String(next).padStart(5, "0")}`;
}
function refreshLibraries() {
  productGroups = sortedUnique([...DEFAULT_PRODUCT_GROUPS, ...getStoredArray(CAT_KEYS.productGroups)]);
  products = sortedUnique([...DEFAULT_PRODUCTS, ...getStoredArray(CAT_KEYS.products)]);
  regulations = sortedUnique([...DEFAULT_REGULATIONS, ...getStoredArray(CAT_KEYS.regulations)]);
  riskDomains = sortedUnique([...DEFAULT_RISK_DOMAINS, ...getStoredArray(CAT_KEYS.riskDomains)]);
  scenarioStatuses = sortedUnique([...DEFAULT_SCENARIO_STATUSES, ...getStoredArray(CAT_KEYS.scenarioStatuses)]);
  scenarioSources = sortedUnique([...DEFAULT_SCENARIO_SOURCES, ...getStoredArray(CAT_KEYS.scenarioSources)]);
  acceptanceAuthorities = sortedUnique([...DEFAULT_ACCEPTANCE_AUTHORITIES, ...getStoredArray(CAT_KEYS.acceptanceAuthorities)]);

  const saved = getSavedScenarios();
  document.getElementById("productGroupCount").textContent = productGroups.length;
  document.getElementById("regCount").textContent = regulations.length;
  document.getElementById("domainCount").textContent = riskDomains.length;
  document.getElementById("savedCount").textContent = saved.length;

  populateSelect("singleProductGroup", productGroups);
  populateSelect("complexProductGroup", productGroups);
  populateSelect("singleRiskDomain", riskDomains);
  populateSelect("complexRiskDomain", riskDomains);
  populateSelect("singleScenarioStatus", scenarioStatuses);
  populateSelect("complexScenarioStatus", scenarioStatuses);
  populateSelect("singleScenarioSource", scenarioSources);
  populateSelect("complexScenarioSource", scenarioSources);
  populateSelect("singlePrimaryProduct", products);
  populateSelect("complexPrimaryProduct", products);
  populateSelect("singlePrimaryRegulation", regulations);
  populateSelect("complexPrimaryRegulation", regulations);
  populateSelect("riskItemDomain", riskDomains);
  populateSelect("riskItemProduct", products);
  populateSelect("riskItemReg", regulations);
  populateSelect("singleAcceptanceAuthority", acceptanceAuthorities);
  populateSelect("complexAcceptanceAuthority", acceptanceAuthorities);

  renderCategoryAdmin();
  renderSavedScenarios();
  renderDashboardOpenTable();
  updateInherentScores();
  updateMonteCarloStatus();
}
function populateSelect(id, items) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.innerHTML = items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  if (items.includes(current)) select.value = current;
}
function activateView(viewName) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  const view = document.getElementById(`view-${viewName}`);
  const btn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (view) view.classList.add("active");
  if (btn) btn.classList.add("active");
  if (viewName === "single") activeMode = "single";
  if (viewName === "complex") activeMode = "complex";
}
function getRiskTier(score) {
  const rule = rotationRules.find(r => score >= r.min_score && score <= r.max_score);
  return rule ? rule.tier : "Unmapped";
}
function getReviewFrequency(score) {
  const rule = rotationRules.find(r => score >= r.min_score && score <= r.max_score);
  return rule ? rule.review_frequency : "Needs Review";
}
function buildSummary(name, mode, product, reg, total, residual, tier, frequency, itemCount) {
  const modeText = mode === "single" ? "single focused scenario" : "complex multi-item scenario";
  const significance = residual >= 85 ? "very high" : residual >= 70 ? "high" : residual >= 50 ? "moderate" : "lower";
  return `${name} was evaluated as a ${modeText} tied primarily to ${product}${reg ? ` and ${reg}` : ""}. The model produced an inherent risk score of ${total} and a residual risk score of ${residual}, placing it in the ${tier} tier with a recommended ${frequency} review cycle. ${itemCount > 1 ? `This scenario includes ${itemCount} weighted risk items, so the result should be interpreted as an aggregate view across several components. ` : ""}Overall, the remaining exposure appears ${significance} after control effectiveness is applied.`;
}
function calculateSingleInherent() {
  const likelihood = Number(document.getElementById("singleLikelihood").value || 0);
  const impact = Number(document.getElementById("singleImpact").value || 0);
  return Math.max(0, Math.min(100, Math.round(((likelihood + impact) / 20) * 100)));
}
function calculateComplexInherent() {
  if (!currentComplexItems.length) return 0;
  let weighted = 0;
  let totalWeight = 0;
  currentComplexItems.forEach(item => {
    weighted += Number(item.score || 0) * Number(item.weight || 0);
    totalWeight += Number(item.weight || 0);
  });
  return Math.round(weighted / Math.max(totalWeight, 1));
}
function updateInherentScores() {
  const single = calculateSingleInherent();
  const complex = calculateComplexInherent();
  document.getElementById("singleInherentRiskScore").value = single;
  document.getElementById("complexInherentRiskScore").value = complex;
}
function renderComplexItems() {
  const tbody = document.getElementById("riskItemsTableBody");
  if (!tbody) return;
  if (!currentComplexItems.length) {
    tbody.innerHTML = '<tr><td colspan="6">No risk items added yet.</td></tr>';
  } else {
    tbody.innerHTML = currentComplexItems.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.domain)}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.regulation)}</td><td>${item.score}</td><td>${item.weight}</td></tr>`).join("");
  }
  updateInherentScores();
}
function addRiskItem() {
  currentComplexItems.push({
    name: document.getElementById("riskItemName").value || "Unnamed Risk Item",
    domain: document.getElementById("riskItemDomain").value,
    product: document.getElementById("riskItemProduct").value,
    regulation: document.getElementById("riskItemReg").value,
    score: Number(document.getElementById("riskItemScore").value || 0),
    weight: Number(document.getElementById("riskItemWeight").value || 1)
  });
  renderComplexItems();
}
function renderMitigationTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="4">No mitigation factors added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(x => `<tr><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.owner)}</td><td>${escapeHtml(x.status)}</td><td>${escapeHtml(x.attachment)}</td></tr>`).join("");
}
function addMitigation(mode) {
  const prefix = mode === "single" ? "single" : "complex";
  const list = mode === "single" ? singleMitigations : complexMitigations;
  list.push({
    title: document.getElementById(`${prefix}MitTitle`).value || "Untitled Mitigation",
    owner: document.getElementById(`${prefix}MitOwner`).value || "",
    status: document.getElementById(`${prefix}MitStatus`).value || "",
    attachment: document.getElementById(`${prefix}MitAttachment`).value || ""
  });
  renderMitigationTable(`${prefix}MitigationBody`, list);
}
function getAcceptedRisk(prefix) {
  return {
    isAccepted: document.getElementById(`${prefix}AcceptedRiskFlag`).checked,
    authority: document.getElementById(`${prefix}AcceptanceAuthority`).value,
    acceptedBy: document.getElementById(`${prefix}AcceptedBy`).value,
    acceptanceDate: document.getElementById(`${prefix}AcceptanceDate`).value,
    reviewDate: document.getElementById(`${prefix}ReviewDate`).value,
    decisionLogic: document.getElementById(`${prefix}DecisionLogic`).value
  };
}
function getSinglePayload() {
  return {
    mode: "single",
    id: document.getElementById("singleScenarioId").value,
    name: document.getElementById("singleScenarioName").value || "Unnamed Single Scenario",
    productGroup: document.getElementById("singleProductGroup").value,
    riskDomain: document.getElementById("singleRiskDomain").value,
    scenarioStatus: document.getElementById("singleScenarioStatus").value,
    scenarioSource: document.getElementById("singleScenarioSource").value,
    primaryProduct: document.getElementById("singlePrimaryProduct").value,
    primaryRegulation: document.getElementById("singlePrimaryRegulation").value,
    scenarioOwner: document.getElementById("singleScenarioOwner").value,
    identifiedDate: document.getElementById("singleIdentifiedDate").value,
    description: document.getElementById("singleScenarioDescription").value,
    likelihood: Number(document.getElementById("singleLikelihood").value || 0),
    impact: Number(document.getElementById("singleImpact").value || 0),
    inherent: calculateSingleInherent(),
    control: Number(document.getElementById("singleControlEffectiveness").value || 0),
    items: [],
    mitigations: singleMitigations.slice(),
    acceptedRisk: getAcceptedRisk("single")
  };
}
function getComplexPayload() {
  return {
    mode: "complex",
    id: document.getElementById("complexScenarioId").value,
    name: document.getElementById("complexScenarioName").value || "Unnamed Complex Scenario",
    productGroup: document.getElementById("complexProductGroup").value,
    riskDomain: document.getElementById("complexRiskDomain").value,
    scenarioStatus: document.getElementById("complexScenarioStatus").value,
    scenarioSource: document.getElementById("complexScenarioSource").value,
    primaryProduct: document.getElementById("complexPrimaryProduct").value,
    primaryRegulation: document.getElementById("complexPrimaryRegulation").value,
    scenarioOwner: document.getElementById("complexScenarioOwner").value,
    identifiedDate: document.getElementById("complexIdentifiedDate").value,
    description: document.getElementById("complexScenarioDescription").value,
    likelihood: 0,
    impact: 0,
    inherent: calculateComplexInherent(),
    control: Number(document.getElementById("complexControlEffectiveness").value || 0),
    items: currentComplexItems.slice(),
    mitigations: complexMitigations.slice(),
    acceptedRisk: getAcceptedRisk("complex")
  };
}
function summarizePayload(payload) {
  const total = payload.inherent;
  const itemCount = payload.mode === "complex" ? Math.max(payload.items.length, 1) : 1;
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const monteCarloRows = [
    ["Scenario ID", payload.id || "Generated on save"],
    ["Inherent Risk Score", payload.inherent],
    ["Control Effectiveness %", payload.control],
    ["Residual Risk Score", residual],
    ["Risk Tier", tier],
    ["Review Frequency", frequency],
    ["Included Risk Items", itemCount],
    ["Scenario Status", payload.scenarioStatus],
    ["Identified Date", payload.identifiedDate || ""]
  ];
  return {
    ...payload,
    total,
    residual,
    tier,
    frequency,
    itemCount,
    generatedSummary: buildSummary(payload.name, payload.mode, payload.primaryProduct, payload.primaryRegulation, total, residual, tier, frequency, itemCount),
    monteCarloRows
  };
}
function renderScenarioSummary(summary) {
  document.getElementById("scenarioIdDisplay").textContent = summary.id || "Not Saved";
  document.getElementById("inherentRiskScoreDisplay").textContent = summary.inherent;
  document.getElementById("residualRiskScore").textContent = summary.residual;
  document.getElementById("riskTier").textContent = summary.tier;
  document.getElementById("reviewFrequency").textContent = summary.frequency;
  document.getElementById("itemCount").textContent = summary.itemCount;
  document.getElementById("dashboardNarrative").textContent = `${summary.name} was run as a ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"} for ${summary.primaryProduct}. Product Group: ${summary.productGroup}. Primary regulation: ${summary.primaryRegulation}. Inherent risk score: ${summary.inherent}. Residual risk score: ${summary.residual}. Recommended review frequency: ${summary.frequency}.`;
  document.getElementById("aiSummaryBox").textContent = summary.generatedSummary;
  document.getElementById("reportSummary").innerHTML = `
    <li><strong>Scenario ID:</strong> ${escapeHtml(summary.id || "Not Saved")}</li>
    <li><strong>Scenario:</strong> ${escapeHtml(summary.name)}</li>
    <li><strong>Builder:</strong> ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"}</li>
    <li><strong>Product Group:</strong> ${escapeHtml(summary.productGroup)}</li>
    <li><strong>Primary Product:</strong> ${escapeHtml(summary.primaryProduct)}</li>
    <li><strong>Primary Regulation:</strong> ${escapeHtml(summary.primaryRegulation)}</li>
    <li><strong>Inherent Risk Score:</strong> ${summary.inherent}</li>
    <li><strong>Residual Risk Score:</strong> ${summary.residual}</li>
    <li><strong>Risk Tier:</strong> ${escapeHtml(summary.tier)}</li>
    <li><strong>Review Frequency:</strong> ${escapeHtml(summary.frequency)}</li>
  `;
}
function drawSimpleBarChart(canvasId, summary) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !summary) return;
  const ctx = canvas.getContext("2d");
  const data = [summary.inherent, summary.residual];
  const labels = ["Inherent", "Residual"];
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#dfe6f1";
  for (let i = 0; i < 5; i++) {
    const y = 25 + i * 45;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 20, y); ctx.stroke();
  }
  const max = Math.max(...data, 100);
  const barWidth = 110, gap = 90, startX = 140;
  data.forEach((v, i) => {
    const bh = (v / max) * 160;
    const x = startX + i * (barWidth + gap);
    const y = h - bh - 40;
    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
    grad.addColorStop(0, "#d96b1f");
    grad.addColorStop(1, "#173a8c");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, bh);
    ctx.fillStyle = "#172033";
    ctx.font = "12px Arial";
    ctx.fillText(labels[i], x + 30, h - 18);
    ctx.fillText(String(v), x + 42, y - 8);
  });
}
function renderCharts(summary) {
  const showDash = document.getElementById("showDashboardGraphToggle").checked;
  const showReport = document.getElementById("includeGraphInReport").checked;
  document.getElementById("dashboardChartCard").classList.toggle("hidden", !showDash);
  document.getElementById("reportGraphCard").classList.toggle("hidden", !showReport);
  if (showDash) drawSimpleBarChart("dashboardChart", summary);
  if (showReport) drawSimpleBarChart("reportChart", summary);
}
function renderMonteCarloTable(summary) {
  const showTable = document.getElementById("includeMonteCarloTable").checked;
  const showExplain = document.getElementById("includeMonteCarloExplanation").checked;
  const card = document.getElementById("monteCarloTableCard");
  const tbody = document.getElementById("monteCarloTableBody");
  const explain = document.getElementById("monteCarloExplanationBox");
  card.classList.toggle("hidden", !showTable);
  if (!showTable || !summary) return;
  tbody.innerHTML = summary.monteCarloRows.map(r => `<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join("");
  explain.classList.toggle("hidden", !showExplain);
  if (showExplain) {
    explain.textContent = "This table shows the key values used to derive the current evaluation output. In this version, the default model uses risk-band thresholds and review-frequency rules. You can optionally load a custom JSON model in Reports to override the default tiering and review logic.";
  }
}
function runScenario() {
  const payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  const summary = summarizePayload(payload);
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderMonteCarloTable(summary);
  renderCharts(summary);
  activateView("dashboard");
}
function saveScenario() {
  const payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  const saved = getSavedScenarios();
  if (!payload.id) {
    payload.id = generateScenarioId(saved);
    if (payload.mode === "single") document.getElementById("singleScenarioId").value = payload.id;
    if (payload.mode === "complex") document.getElementById("complexScenarioId").value = payload.id;
  }
  const summary = summarizePayload(payload);
  const existingIndex = saved.findIndex(x => x.id === summary.id);
  if (existingIndex >= 0) saved[existingIndex] = summary; else saved.unshift(summary);
  setSavedScenarios(saved);
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderMonteCarloTable(summary);
  renderCharts(summary);
  renderSavedScenarios();
  renderDashboardOpenTable();
  refreshLibraries();
  activateView("saved");
}
function renderSavedScenarios() {
  const tbody = document.getElementById("savedEvaluationsBody");
  const saved = getSavedScenarios();
  document.getElementById("savedCount").textContent = saved.length;
  if (!saved.length) {
    tbody.innerHTML = '<tr><td colspan="9">No saved scenarios yet.</td></tr>';
    return;
  }
  tbody.innerHTML = saved.map(s => `<tr>
    <td>${escapeHtml(s.id)}</td>
    <td>${escapeHtml(s.name)}</td>
    <td>${s.mode === "single" ? "Single" : "Complex"}</td>
    <td>${escapeHtml(s.productGroup)}</td>
    <td>${escapeHtml(s.scenarioStatus)}</td>
    <td>${s.inherent}</td>
    <td>${s.residual}</td>
    <td>${escapeHtml(s.identifiedDate)}</td>
    <td>
      <button class="btn btn-secondary small-btn" data-action="open" data-id="${escapeHtml(s.id)}">Open</button>
      <button class="btn btn-secondary small-btn" data-action="delete" data-id="${escapeHtml(s.id)}">Delete</button>
    </td>
  </tr>`).join("");
  tbody.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    if (btn.dataset.action === "open") openScenario(id);
    if (btn.dataset.action === "delete") deleteScenario(id);
  }));
}
function renderDashboardOpenTable() {
  const tbody = document.getElementById("dashboardOpenScenarioBody");
  const rows = getSavedScenarios()
    .filter(x => String(x.scenarioStatus).toLowerCase() !== "closed")
    .sort((a, b) => (b.inherent - a.inherent) || String(a.identifiedDate || "").localeCompare(String(b.identifiedDate || "")));
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7">No open scenarios available.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(s => `<tr>
    <td>${escapeHtml(s.id)}</td>
    <td>${escapeHtml(s.name)}</td>
    <td>${escapeHtml(s.scenarioStatus)}</td>
    <td>${s.inherent}</td>
    <td>${escapeHtml(s.identifiedDate)}</td>
    <td>${escapeHtml(s.productGroup)}</td>
    <td>${escapeHtml(s.riskDomain)}</td>
  </tr>`).join("");
}
function openScenario(id) {
  const s = getSavedScenarios().find(x => x.id === id);
  if (!s) return;
  if (s.mode === "single") {
    document.getElementById("singleScenarioId").value = s.id || "";
    document.getElementById("singleScenarioName").value = s.name || "";
    document.getElementById("singleProductGroup").value = s.productGroup || productGroups[0] || "";
    document.getElementById("singleRiskDomain").value = s.riskDomain || riskDomains[0] || "";
    document.getElementById("singleScenarioStatus").value = s.scenarioStatus || "Open";
    document.getElementById("singleScenarioSource").value = s.scenarioSource || scenarioSources[0] || "";
    document.getElementById("singlePrimaryProduct").value = s.primaryProduct || products[0] || "";
    document.getElementById("singlePrimaryRegulation").value = s.primaryRegulation || regulations[0] || "";
    document.getElementById("singleScenarioOwner").value = s.scenarioOwner || "";
    document.getElementById("singleIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("singleScenarioDescription").value = s.description || "";
    document.getElementById("singleLikelihood").value = s.likelihood || 0;
    document.getElementById("singleImpact").value = s.impact || 0;
    document.getElementById("singleControlEffectiveness").value = s.control || 0;
    singleMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    renderMitigationTable("singleMitigationBody", singleMitigations);
    document.getElementById("singleAcceptedRiskFlag").checked = !!s.acceptedRisk?.isAccepted;
    document.getElementById("singleAcceptanceAuthority").value = s.acceptedRisk?.authority || acceptanceAuthorities[0] || "";
    document.getElementById("singleAcceptedBy").value = s.acceptedRisk?.acceptedBy || "";
    document.getElementById("singleAcceptanceDate").value = s.acceptedRisk?.acceptanceDate || "";
    document.getElementById("singleReviewDate").value = s.acceptedRisk?.reviewDate || "";
    document.getElementById("singleDecisionLogic").value = s.acceptedRisk?.decisionLogic || "";
    activeMode = "single";
    updateInherentScores();
    activateView("single");
  } else {
    document.getElementById("complexScenarioId").value = s.id || "";
    document.getElementById("complexScenarioName").value = s.name || "";
    document.getElementById("complexProductGroup").value = s.productGroup || productGroups[0] || "";
    document.getElementById("complexRiskDomain").value = s.riskDomain || riskDomains[0] || "";
    document.getElementById("complexScenarioStatus").value = s.scenarioStatus || "Open";
    document.getElementById("complexScenarioSource").value = s.scenarioSource || scenarioSources[0] || "";
    document.getElementById("complexPrimaryProduct").value = s.primaryProduct || products[0] || "";
    document.getElementById("complexPrimaryRegulation").value = s.primaryRegulation || regulations[0] || "";
    document.getElementById("complexScenarioOwner").value = s.scenarioOwner || "";
    document.getElementById("complexIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("complexScenarioDescription").value = s.description || "";
    document.getElementById("complexControlEffectiveness").value = s.control || 0;
    currentComplexItems = Array.isArray(s.items) ? s.items.slice() : [];
    renderComplexItems();
    complexMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    renderMitigationTable("complexMitigationBody", complexMitigations);
    document.getElementById("complexAcceptedRiskFlag").checked = !!s.acceptedRisk?.isAccepted;
    document.getElementById("complexAcceptanceAuthority").value = s.acceptedRisk?.authority || acceptanceAuthorities[0] || "";
    document.getElementById("complexAcceptedBy").value = s.acceptedRisk?.acceptedBy || "";
    document.getElementById("complexAcceptanceDate").value = s.acceptedRisk?.acceptanceDate || "";
    document.getElementById("complexReviewDate").value = s.acceptedRisk?.reviewDate || "";
    document.getElementById("complexDecisionLogic").value = s.acceptedRisk?.decisionLogic || "";
    activeMode = "complex";
    updateInherentScores();
    activateView("complex");
  }
}
function deleteScenario(id) {
  setSavedScenarios(getSavedScenarios().filter(x => x.id !== id));
  renderSavedScenarios();
  renderDashboardOpenTable();
  refreshLibraries();
}
function addCategory(inputId, key) {
  const value = document.getElementById(inputId).value.trim();
  if (!value) return;
  const existing = getStoredArray(CAT_KEYS[key]);
  existing.push(value);
  setStoredArray(CAT_KEYS[key], existing);
  document.getElementById(inputId).value = "";
  refreshLibraries();
}
function renameCategory(key, value) {
  const next = prompt("Edit value:", value);
  if (!next || !next.trim()) return;
  const defaults = getDefaultCategoryValues(key);
  const customOnly = sortedUnique([...getStoredArray(CAT_KEYS[key]), next.trim()]);
  const filtered = customOnly.filter(v => v.toLowerCase() !== value.toLowerCase() || defaults.map(x => x.toLowerCase()).includes(value.toLowerCase()));
  setStoredArray(CAT_KEYS[key], filtered);
  replaceCategoryUsage(key, value, next.trim());
  refreshLibraries();
}
function removeCategory(key, value) {
  const next = getStoredArray(CAT_KEYS[key]).filter(v => v.toLowerCase() !== value.toLowerCase());
  setStoredArray(CAT_KEYS[key], next);
  refreshLibraries();
}
function getDefaultCategoryValues(key) {
  const map = {
    productGroups: DEFAULT_PRODUCT_GROUPS,
    products: DEFAULT_PRODUCTS,
    regulations: DEFAULT_REGULATIONS,
    riskDomains: DEFAULT_RISK_DOMAINS,
    scenarioStatuses: DEFAULT_SCENARIO_STATUSES,
    scenarioSources: DEFAULT_SCENARIO_SOURCES,
    acceptanceAuthorities: DEFAULT_ACCEPTANCE_AUTHORITIES
  };
  return map[key] || [];
}
function replaceCategoryUsage(key, oldValue, newValue) {
  const saved = getSavedScenarios().map(s => {
    if (key === "productGroups" && s.productGroup === oldValue) s.productGroup = newValue;
    if (key === "products" && s.primaryProduct === oldValue) s.primaryProduct = newValue;
    if (key === "products" && Array.isArray(s.items)) s.items = s.items.map(i => i.product === oldValue ? {...i, product:newValue} : i);
    if (key === "regulations" && s.primaryRegulation === oldValue) s.primaryRegulation = newValue;
    if (key === "regulations" && Array.isArray(s.items)) s.items = s.items.map(i => i.regulation === oldValue ? {...i, regulation:newValue} : i);
    if (key === "riskDomains" && s.riskDomain === oldValue) s.riskDomain = newValue;
    if (key === "riskDomains" && Array.isArray(s.items)) s.items = s.items.map(i => i.domain === oldValue ? {...i, domain:newValue} : i);
    if (key === "scenarioStatuses" && s.scenarioStatus === oldValue) s.scenarioStatus = newValue;
    if (key === "scenarioSources" && s.scenarioSource === oldValue) s.scenarioSource = newValue;
    if (key === "acceptanceAuthorities" && s.acceptedRisk?.authority === oldValue) s.acceptedRisk.authority = newValue;
    return s;
  });
  setSavedScenarios(saved);
}
function renderEditableList(targetId, key, values) {
  const container = document.getElementById(targetId);
  container.innerHTML = values.map(value => `
    <div class="edit-row">
      <span>${escapeHtml(value)}</span>
      <button class="btn btn-secondary small-btn" data-edit="${escapeHtml(value)}">Edit</button>
      <button class="btn btn-danger small-btn" data-delete="${escapeHtml(value)}">Remove</button>
    </div>
  `).join("");
  container.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => renameCategory(key, btn.dataset.edit)));
  container.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => removeCategory(key, btn.dataset.delete)));
}
function renderCategoryAdmin() {
  renderEditableList("productGroupsList", "productGroups", productGroups);
  renderEditableList("productsList", "products", products);
  renderEditableList("regulationsList", "regulations", regulations);
  renderEditableList("riskDomainsList", "riskDomains", riskDomains);
  renderEditableList("scenarioStatusesList", "scenarioStatuses", scenarioStatuses);
  renderEditableList("scenarioSourcesList", "scenarioSources", scenarioSources);
  renderEditableList("acceptanceAuthoritiesList", "acceptanceAuthorities", acceptanceAuthorities);
}
function loadSingleTestScenario() {
  document.getElementById("singleScenarioId").value = "";
  document.getElementById("singleScenarioName").value = "Payment Services Change in Error Resolution Workflow";
  document.getElementById("singleProductGroup").value = "Payment Services";
  document.getElementById("singleRiskDomain").value = "Consumer Compliance Risk";
  document.getElementById("singleScenarioStatus").value = "Open";
  document.getElementById("singleScenarioSource").value = "New Regulation";
  document.getElementById("singlePrimaryProduct").value = "Debit Card Program";
  document.getElementById("singlePrimaryRegulation").value = "Reg E";
  document.getElementById("singleScenarioOwner").value = "Compliance";
  document.getElementById("singleIdentifiedDate").value = todayIso();
  document.getElementById("singleLikelihood").value = 8;
  document.getElementById("singleImpact").value = 9;
  document.getElementById("singleControlEffectiveness").value = 32;
  document.getElementById("singleScenarioDescription").value = "The card-services team changed the consumer dispute workflow and may have shortened key timing checkpoints. The scenario evaluates disclosure and procedural risk under Reg E.";
  singleMitigations = [
    { title: "Workflow validation", owner: "Operations", status: "In Progress", attachment: "workflow_review.xlsx" },
    { title: "Procedure rewrite", owner: "Compliance", status: "Planned", attachment: "reg_e_procedure.docx" }
  ];
  renderMitigationTable("singleMitigationBody", singleMitigations);
  document.getElementById("singleAcceptedRiskFlag").checked = false;
  document.getElementById("singleAcceptanceAuthority").value = acceptanceAuthorities[0] || "";
  document.getElementById("singleAcceptedBy").value = "";
  document.getElementById("singleAcceptanceDate").value = "";
  document.getElementById("singleReviewDate").value = "";
  document.getElementById("singleDecisionLogic").value = "";
  updateInherentScores();
  activateView("single");
}
function loadComplexTestScenario() {
  document.getElementById("complexScenarioId").value = "";
  document.getElementById("complexScenarioName").value = "Enterprise Deposit Modernization Program";
  document.getElementById("complexProductGroup").value = "Core";
  document.getElementById("complexRiskDomain").value = "Operational Process Risk";
  document.getElementById("complexScenarioStatus").value = "Referred to Committee";
  document.getElementById("complexScenarioSource").value = "Risk";
  document.getElementById("complexPrimaryProduct").value = "Deposits";
  document.getElementById("complexPrimaryRegulation").value = "Reg DD";
  document.getElementById("complexScenarioOwner").value = "Enterprise Risk";
  document.getElementById("complexIdentifiedDate").value = todayIso();
  document.getElementById("complexControlEffectiveness").value = 28;
  document.getElementById("complexScenarioDescription").value = "This scenario covers a cross-functional modernization effort touching deposit operations, dispute servicing, disclosures, and third-party integrations.";
  currentComplexItems = [
    {name:"Overdraft fee disclosure risk", domain:"Consumer Compliance Risk", product:"Deposits", regulation:"Reg DD", score:82, weight:4},
    {name:"ACH fraud exposure", domain:"External Fraud Risk", product:"ACH Processing", regulation:"NACHA", score:76, weight:3},
    {name:"Vendor outage affecting deposit processing", domain:"Third-Party & Vendor Risk", product:"Core Deposit Platform", regulation:"FFIEC IT", score:68, weight:3},
    {name:"Complaint trend from account servicing", domain:"Reputation & Brand Risk", product:"Deposits", regulation:"UDAAP", score:71, weight:2}
  ];
  renderComplexItems();
  complexMitigations = [
    { title: "Committee escalation", owner: "ERM", status: "Complete", attachment: "committee_packet.pdf" },
    { title: "Third-party resiliency review", owner: "Vendor Management", status: "In Progress", attachment: "vendor_resiliency.docx" }
  ];
  renderMitigationTable("complexMitigationBody", complexMitigations);
  document.getElementById("complexAcceptedRiskFlag").checked = true;
  document.getElementById("complexAcceptanceAuthority").value = "Risk Governance Committee";
  document.getElementById("complexAcceptedBy").value = "Risk Governance Committee";
  document.getElementById("complexAcceptanceDate").value = todayIso();
  document.getElementById("complexReviewDate").value = todayIso();
  document.getElementById("complexDecisionLogic").value = "The committee accepted temporary residual risk while core conversion milestones and vendor resiliency controls are completed.";
  updateInherentScores();
  activateView("complex");
}
function validateMonteCarloConfig(config) {
  return !!config && Array.isArray(config.tiers) && config.tiers.every(t =>
    typeof t.tier === "string" &&
    Number.isFinite(Number(t.min_score)) &&
    Number.isFinite(Number(t.max_score)) &&
    typeof t.review_frequency === "string"
  );
}
function applyMonteCarloConfig(config) {
  rotationRules = config.tiers.map(t => ({
    tier: t.tier,
    min_score: Number(t.min_score),
    max_score: Number(t.max_score),
    review_frequency: t.review_frequency
  }));
  writeJSON(CAT_KEYS.monteCarloConfig, rotationRules);
  updateMonteCarloStatus();
}
function resetMonteCarloConfig() {
  rotationRules = structuredClone(DEFAULT_ROTATION_RULES);
  localStorage.removeItem(CAT_KEYS.monteCarloConfig);
  updateMonteCarloStatus();
}
function updateMonteCarloStatus() {
  const stored = readJSON(CAT_KEYS.monteCarloConfig, null);
  const el = document.getElementById("monteCarloConfigStatus");
  if (stored && Array.isArray(stored) && stored.length) {
    el.textContent = `Using custom Monte Carlo model with ${stored.length} tier rule(s).`;
  } else {
    el.textContent = "Using default Monte Carlo model.";
  }
}
function loadStoredMonteCarloConfig() {
  const stored = readJSON(CAT_KEYS.monteCarloConfig, null);
  if (stored && Array.isArray(stored) && stored.length) {
    rotationRules = stored.map(t => ({
      tier: t.tier,
      min_score: Number(t.min_score),
      max_score: Number(t.max_score),
      review_frequency: t.review_frequency
    }));
  } else {
    rotationRules = structuredClone(DEFAULT_ROTATION_RULES);
  }
}
function wireInputs() {
  ["singleLikelihood","singleImpact"].forEach(id => document.getElementById(id).addEventListener("input", updateInherentScores));
  document.getElementById("addRiskItemBtn").addEventListener("click", addRiskItem);
  document.getElementById("addSingleMitigationBtn").addEventListener("click", () => addMitigation("single"));
  document.getElementById("addComplexMitigationBtn").addEventListener("click", () => addMitigation("complex"));
  document.getElementById("saveScenarioBtn").addEventListener("click", saveScenario);
  document.getElementById("runScenarioBtn").addEventListener("click", runScenario);
  document.getElementById("loadSingleTestBtn").addEventListener("click", loadSingleTestScenario);
  document.getElementById("loadComplexTestBtn").addEventListener("click", loadComplexTestScenario);

  document.getElementById("addProductGroupBtn").addEventListener("click", () => addCategory("newProductGroupName", "productGroups"));
  document.getElementById("addProductBtn").addEventListener("click", () => addCategory("newProductName", "products"));
  document.getElementById("addRegulationBtn").addEventListener("click", () => addCategory("newRegulationName", "regulations"));
  document.getElementById("addRiskDomainBtn").addEventListener("click", () => addCategory("newRiskDomainName", "riskDomains"));
  document.getElementById("addScenarioStatusBtn").addEventListener("click", () => addCategory("newScenarioStatusName", "scenarioStatuses"));
  document.getElementById("addScenarioSourceBtn").addEventListener("click", () => addCategory("newScenarioSourceName", "scenarioSources"));
  document.getElementById("addAcceptanceAuthorityBtn").addEventListener("click", () => addCategory("newAcceptanceAuthorityName", "acceptanceAuthorities"));

  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => activateView(btn.dataset.view)));
  document.getElementById("showDashboardGraphToggle").addEventListener("change", () => renderCharts(lastSummary));
  document.getElementById("includeGraphInReport").addEventListener("change", () => renderCharts(lastSummary));
  document.getElementById("includeMonteCarloTable").addEventListener("change", () => renderMonteCarloTable(lastSummary));
  document.getElementById("includeMonteCarloExplanation").addEventListener("change", () => renderMonteCarloTable(lastSummary));
  document.getElementById("resetMonteCarloBtn").addEventListener("click", resetMonteCarloConfig);
  document.getElementById("customMonteCarloFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!validateMonteCarloConfig(json)) {
        alert("Invalid Monte Carlo configuration. Expected { tiers: [{ tier, min_score, max_score, review_frequency }] }");
        return;
      }
      applyMonteCarloConfig(json);
      if (lastSummary) {
        const rerun = summarizePayload(lastSummary);
        lastSummary = rerun;
        renderScenarioSummary(rerun);
        renderMonteCarloTable(rerun);
        renderCharts(rerun);
      }
    } catch (err) {
      alert("Unable to read Monte Carlo JSON file.");
    }
  });
}
function renderManual() {
  document.getElementById("userManualCopy").innerHTML = `
    <h4>Purpose</h4>
    <p>Risk Manager is used to evaluate single and complex risk scenarios, generate a narrative summary, and maintain a local record of saved scenarios for reopening and reprinting.</p>
    <h4>Single vs Complex</h4>
    <p>Use Single Scenario for one focused issue. Use Complex Scenario for a project, product family, department, or business area with multiple weighted risk items.</p>
    <h4>Scoring</h4>
    <p>Inherent risk is now calculated, not manually entered. Single Scenario uses likelihood and impact. Complex Scenario uses the weighted average of risk items. Residual risk applies control effectiveness to the inherent score.</p>
    <h4>Category Admin</h4>
    <p>Category-driven fields are alphabetized. Existing selections are shown in Category Admin where users can add, edit, or remove values.</p>
    <h4>Accepted Risk</h4>
    <p>Accepted Risk is a formal governance section that captures authority, who accepted the risk, the acceptance date, the review date, and decision logic.</p>
    <h4>Dashboard</h4>
    <p>The dashboard now includes a live open-scenario table for scenarios that are not closed, sorted by highest inherent risk first.</p>
    <h4>Monte Carlo Model</h4>
    <p>The Reports view supports the default model or a custom JSON configuration. This lets a user load alternative risk-band and review-frequency rules without changing code.</p>
    <h4>Storage Limitation</h4>
    <p>Saved scenarios still live in local browser storage today. A later phase should add export/import and then shared storage so scenarios can follow the user across different workstations.</p>
  `;
}
function init() {
  loadStoredMonteCarloConfig();
  wireInputs();
  renderManual();
  renderMitigationTable("singleMitigationBody", singleMitigations);
  renderMitigationTable("complexMitigationBody", complexMitigations);
  renderComplexItems();
  refreshLibraries();
  updateInherentScores();
}
document.addEventListener("DOMContentLoaded", init);
