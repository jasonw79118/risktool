const BASE_PRODUCTS = ["Deposits", "Checking", "Savings", "Certificates of Deposit", "IRA / Retirement Deposits", "Mobile Banking", "Internet Banking", "Online Account Opening", "ACH Processing", "Wire Transfers", "Debit Card Program", "ATM / EFT Network", "Consumer Lending", "Mortgage / HELOC", "Merchant Services", "API Banking / BaaS", "BSA / AML Monitoring", "Core Deposit Platform"];
const BASE_REGULATIONS = ["Reg D", "Reg E", "Reg O", "Reg P", "Reg X", "Reg Z", "Reg BB", "Reg CC", "Reg DD", "Reg GG", "FCRA / Reg V", "UDAAP", "BSA/AML", "CIP", "CTR", "SAR", "FinCEN Watchlist", "OFAC", "ID Theft Red Flags", "IRS Violations", "TIN Certification", "Escheatment", "FDIC Deposit Insurance", "Brokered Deposits", "Government Securities", "Public Funds", "ESIGN", "SCRA", "MLA", "CECL", "FASB 91", "NACHA", "FRB Clearing", "Basel III", "HIPAA", "Visa", "Mastercard", "FFIEC IT", "Record Retention", "GAAP", "Privacy", "Patriot Act", "California Consumer Privacy", "European Consumer Privacy", "SEC", "FINRA"];
const BASE_PRODUCT_GROUPS = ["Digital", "Document Services", "Education Services", "Interfaces and Bridge Integrations", "LOS", "DOS", "Managed Services", "Core", "Payment Services", "Regulatory Compliance", "Risk", "Marketing", "Legal", "Executive Management", "Physical Locations", "Customer X", "Relationship Management", "CRC", "Human Resources", "Implementations", "State Issues", "Deployment", "Internal", "Vendor Due Diligence", "Audit", "3rd Party", "Partnership", "Vendors"];
const BASE_RISK_DOMAINS = ["Physical & Environmental Risk", "Business Continuity & Resilience", "Operational Process Risk", "Technology & Application Risk", "Cybersecurity Risk", "Information Security & Privacy Risk", "External Fraud Risk", "Internal Fraud & Conduct Risk", "Third-Party & Vendor Risk", "Model, Analytics & AI Risk", "Payments & Network Rule Risk", "Consumer Compliance Risk", "BSA/AML, Sanctions & Financial Crimes Risk", "Securities, FINRA & Public Company Risk", "Financial Reporting & Accounting Risk", "Credit & Counterparty Risk", "Liquidity, Treasury & Funding Risk", "Capital, Interest Rate & Market Risk", "Legal, Litigation & Judgement Risk", "Strategic & Business Model Risk", "Reputation & Brand Risk", "Human Capital & Workforce Risk", "Governance, Board & Oversight Risk", "Audit, Assurance & Exam Risk", "Records, Documentation & Retention Risk", "Tax, IRS & Escheatment Risk", "Identity, Authentication & Access Risk", "Customer Fairness, Conduct & UDAAP Risk", "Global, Cross-Border & Geopolitical Risk", "Insurance & Risk Transfer Risk"];
const BASE_SCENARIO_STATUSES = ["Open", "Pending", "Closed", "Referred to Committee"];
const BASE_SCENARIO_SOURCES = ["Audit", "Exam Finding", "Risk", "New Regulation", "Industry News"];
const BASE_ACCEPTANCE_AUTHORITIES = ["Risk Governance Committee", "CEO", "CRO", "CTO", "Board"];
const BASE_ROTATION_RULES = [{"tier": "Very High", "min_score": 85, "max_score": 100, "review_frequency": "Quarterly"}, {"tier": "High", "min_score": 70, "max_score": 84, "review_frequency": "Semiannual"}, {"tier": "Moderate", "min_score": 50, "max_score": 69, "review_frequency": "Annual"}, {"tier": "Low", "min_score": 0, "max_score": 49, "review_frequency": "18-24 Months"}];

const STORAGE_KEY = "risk_manager_saved_evaluations_v43";
const LEGACY_STORAGE_KEY = "risk_manager_saved_evaluations_v2";
const CAT_PRODUCT_KEY = "risk_manager_products_custom";
const CAT_REG_KEY = "risk_manager_regulations_custom";
const CAT_GROUP_KEY = "risk_manager_product_groups_custom";
const CAT_DOMAIN_KEY = "risk_manager_risk_domains_custom";
const CAT_STATUS_KEY = "risk_manager_scenario_statuses_custom";
const CAT_SOURCE_KEY = "risk_manager_scenario_sources_custom";
const CAT_AUTH_KEY = "risk_manager_acceptance_authorities_custom";

let products = [];
let regulations = [];
let productGroups = [];
let riskDomains = [];
let scenarioStatuses = [];
let scenarioSources = [];
let acceptanceAuthorities = [];
let rotationRules = BASE_ROTATION_RULES.slice();

let currentComplexItems = [];
let currentSingleMitigations = [];
let currentComplexMitigations = [];
let activeMode = "single";
let lastSummary = null;

function uniqueList(items) {
  return [...new Set((items || []).filter(Boolean).map(x => String(x).trim()).filter(Boolean))];
}
function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function getStoredArray(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function setStoredArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(uniqueList(arr)));
}
function fileMetaList(inputId) {
  const input = document.getElementById(inputId);
  return Array.from(input?.files || []).map(file => ({
    name: file.name,
    size: file.size,
    type: file.type || ""
  }));
}
function clearFileInput(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.value = "";
}
function nextScenarioId(existing) {
  const year = new Date().getFullYear();
  const prefix = `RSK-${year}-`;
  const seq = (existing || [])
    .map(x => x.scenarioId || x.id || "")
    .filter(x => x.startsWith(prefix))
    .map(x => Number(x.slice(prefix.length)))
    .filter(Number.isFinite);
  const next = (seq.length ? Math.max(...seq) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
function getSavedScenarios() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(current) && current.length) return current;
  } catch {}
  return migrateLegacyScenarios();
}
function setSavedScenarios(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function migrateLegacyScenarios() {
  let legacy = [];
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]"); } catch {}
  if (!Array.isArray(legacy) || !legacy.length) return [];
  const mapped = legacy.map((s, index) => ({
    scenarioId: s.scenarioId || `RSK-${new Date().getFullYear()}-${String(index + 1).padStart(4, "0")}`,
    id: s.id || "",
    name: s.name || "Scenario",
    mode: s.mode || "single",
    productGroup: s.productGroup || "",
    primaryProduct: s.primaryProduct || "",
    primaryRegulation: s.primaryRegulation || "",
    riskDomain: s.riskDomain || (s.items?.[0]?.domain || ""),
    scenarioStatus: s.scenarioStatus || "Open",
    scenarioSource: s.scenarioSource || "",
    scenarioOwner: s.scenarioOwner || "",
    disposition: s.disposition || "Mitigate",
    inherent: Number(s.inherent || 0),
    control: Number(s.control || 0),
    identifiedDate: s.identifiedDate || "",
    targetMitigationDate: s.targetMitigationDate || "",
    reviewDate: s.reviewDate || "",
    closedDate: s.closedDate || "",
    items: Array.isArray(s.items) ? s.items : [],
    mitigations: Array.isArray(s.mitigations) ? s.mitigations : [],
    acceptedRisk: s.acceptedRisk || {
      isAccepted: !!s.acceptedRiskFlag,
      authority: "",
      acceptedByName: "",
      acceptedDate: "",
      reviewDate: "",
      decisionLogic: "",
      attachments: []
    },
    total: Number(s.total || s.inherent || 0),
    residual: Number(s.residual || 0),
    tier: s.tier || "",
    frequency: s.frequency || "",
    itemCount: Number(s.itemCount || (s.items?.length || 1)),
    generatedSummary: s.generatedSummary || "",
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString()
  }));
  setSavedScenarios(mapped);
  return mapped;
}
function refreshLibraries() {
  products = uniqueList([...BASE_PRODUCTS, ...getStoredArray(CAT_PRODUCT_KEY)]);
  regulations = uniqueList([...BASE_REGULATIONS, ...getStoredArray(CAT_REG_KEY)]);
  productGroups = uniqueList([...BASE_PRODUCT_GROUPS, ...getStoredArray(CAT_GROUP_KEY)]);
  riskDomains = uniqueList([...BASE_RISK_DOMAINS, ...getStoredArray(CAT_DOMAIN_KEY)]);
  scenarioStatuses = uniqueList([...BASE_SCENARIO_STATUSES, ...getStoredArray(CAT_STATUS_KEY)]);
  scenarioSources = uniqueList([...BASE_SCENARIO_SOURCES, ...getStoredArray(CAT_SOURCE_KEY)]);
  acceptanceAuthorities = uniqueList([...BASE_ACCEPTANCE_AUTHORITIES, ...getStoredArray(CAT_AUTH_KEY)]);

  document.getElementById("productGroupCount").textContent = productGroups.length;
  document.getElementById("regCount").textContent = regulations.length;
  document.getElementById("domainCount").textContent = riskDomains.length;
  document.getElementById("savedCount").textContent = getSavedScenarios().length;

  populateSelect("singleProductGroup", productGroups);
  populateSelect("complexProductGroup", productGroups);
  populateSelect("singlePrimaryProduct", products);
  populateSelect("complexPrimaryProduct", products);
  populateSelect("singlePrimaryRegulation", regulations);
  populateSelect("complexPrimaryRegulation", regulations);
  populateSelect("singleRiskDomain", riskDomains);
  populateSelect("complexRiskDomain", riskDomains);
  populateSelect("riskItemDomain", riskDomains);
  populateSelect("riskItemProduct", products);
  populateSelect("riskItemReg", regulations);
  populateSelect("singleScenarioStatus", scenarioStatuses);
  populateSelect("complexScenarioStatus", scenarioStatuses);
  populateSelect("singleScenarioSource", scenarioSources);
  populateSelect("complexScenarioSource", scenarioSources);
  populateSelect("singleAcceptanceAuthority", acceptanceAuthorities);
  populateSelect("complexAcceptanceAuthority", acceptanceAuthorities);
  populateSelect("savedFilterStatus", ["", ...scenarioStatuses], x => ({ value: x, label: x || "All Statuses" }));
  populateSelect("savedFilterSource", ["", ...scenarioSources], x => ({ value: x, label: x || "All Sources" }));
}
function populateSelect(id, items, mapper) {
  const select = document.getElementById(id);
  if (!select) return;
  const currentValue = select.value;
  const mapFn = mapper || (x => ({ value: x, label: x }));
  select.innerHTML = (items || []).map(item => {
    const m = mapFn(item);
    return `<option value="${escapeHtml(m.value)}">${escapeHtml(m.label)}</option>`;
  }).join("");
  if ([...select.options].some(opt => opt.value === currentValue)) {
    select.value = currentValue;
  }
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
function renderComplexItems() {
  const tbody = document.getElementById("riskItemsTableBody");
  if (!tbody) return;
  if (!currentComplexItems.length) {
    tbody.innerHTML = '<tr><td colspan="6">No complex risk items added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = currentComplexItems.map(item => `<tr>
    <td>${escapeHtml(item.name)}</td>
    <td>${escapeHtml(item.domain)}</td>
    <td>${escapeHtml(item.product)}</td>
    <td>${escapeHtml(item.regulation)}</td>
    <td>${escapeHtml(item.score)}</td>
    <td>${escapeHtml(item.weight)}</td>
  </tr>`).join("");
}
function renderMitigations(mode) {
  const list = mode === "single" ? currentSingleMitigations : currentComplexMitigations;
  const tbody = document.getElementById(mode === "single" ? "singleMitigationsBody" : "complexMitigationsBody");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6">No mitigation factors added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((m, index) => `<tr>
    <td>${escapeHtml(m.title)}</td>
    <td>${escapeHtml(m.owner)}</td>
    <td>${escapeHtml(m.status)}</td>
    <td>${escapeHtml(m.targetDate || "")}</td>
    <td>${escapeHtml((m.attachments || []).map(x => x.name).join(", ") || "None")}</td>
    <td><button class="btn btn-secondary small-btn danger" data-mode="${mode}" data-index="${index}" data-role="remove-mitigation">Remove</button></td>
  </tr>`).join("");
  tbody.querySelectorAll('[data-role="remove-mitigation"]').forEach(btn => {
    btn.addEventListener("click", () => removeMitigation(btn.dataset.mode, Number(btn.dataset.index)));
  });
}
function addRiskItem() {
  const item = {
    name: document.getElementById("riskItemName").value.trim(),
    domain: document.getElementById("riskItemDomain").value,
    product: document.getElementById("riskItemProduct").value,
    regulation: document.getElementById("riskItemReg").value,
    score: Number(document.getElementById("riskItemScore").value || 0),
    weight: Number(document.getElementById("riskItemWeight").value || 1)
  };
  if (!item.name) {
    alert("Risk Item Name is required.");
    return;
  }
  currentComplexItems.push(item);
  renderComplexItems();
  document.getElementById("riskItemName").value = "";
}
function addMitigation(mode) {
  const prefix = mode === "single" ? "single" : "complex";
  const title = document.getElementById(`${prefix}MitigationTitle`).value.trim();
  if (!title) {
    alert("Mitigation Title is required.");
    return;
  }
  const mitigation = {
    title,
    owner: document.getElementById(`${prefix}MitigationOwner`).value.trim(),
    targetDate: document.getElementById(`${prefix}MitigationTargetDate`).value,
    status: document.getElementById(`${prefix}MitigationStatus`).value,
    notes: document.getElementById(`${prefix}MitigationNotes`).value.trim(),
    attachments: fileMetaList(`${prefix}MitigationFiles`)
  };
  const target = mode === "single" ? currentSingleMitigations : currentComplexMitigations;
  target.push(mitigation);
  ["Title", "Owner", "TargetDate", "Notes"].forEach(name => {
    const input = document.getElementById(`${prefix}Mitigation${name}`);
    if (input) input.value = "";
  });
  document.getElementById(`${prefix}MitigationStatus`).value = "Planned";
  clearFileInput(`${prefix}MitigationFiles`);
  renderMitigations(mode);
}
function removeMitigation(mode, index) {
  const target = mode === "single" ? currentSingleMitigations : currentComplexMitigations;
  target.splice(index, 1);
  renderMitigations(mode);
}
function getReviewFrequency(score) {
  const match = rotationRules.find(rule => score >= rule.min_score && score <= rule.max_score);
  return match ? match.review_frequency : "Annual";
}
function getRiskTier(score) {
  const match = rotationRules.find(rule => score >= rule.min_score && score <= rule.max_score);
  return match ? match.tier : "Low";
}
function acceptedRiskFromForm(mode) {
  const prefix = mode === "single" ? "single" : "complex";
  const isAccepted = document.getElementById(`${prefix}AcceptedRiskFlag`).checked;
  return {
    isAccepted,
    authority: document.getElementById(`${prefix}AcceptanceAuthority`).value,
    acceptedByName: document.getElementById(`${prefix}AcceptedByName`).value.trim(),
    acceptedDate: document.getElementById(`${prefix}AcceptedDate`).value,
    reviewDate: document.getElementById(`${prefix}AcceptedReviewDate`).value,
    decisionLogic: document.getElementById(`${prefix}DecisionLogic`).value.trim(),
    attachments: fileMetaList(`${prefix}AcceptedRiskFiles`)
  };
}
function buildSummary(payload, total, residual, tier, frequency, itemCount) {
  const acceptanceText = payload.acceptedRisk?.isAccepted
    ? `Risk was accepted by ${payload.acceptedRisk.authority || payload.acceptedRisk.acceptedByName || "a designated authority"}`
    : "Risk has not been accepted and is expected to follow the selected disposition path";
  return `${payload.name} is a ${payload.mode} scenario tied to ${payload.productGroup || "an unspecified product group"} and ${payload.primaryProduct || "an unspecified product/service"}. The inherent score is ${payload.inherent}, control effectiveness is ${payload.control}%, and the resulting residual score is ${residual}, which places the scenario in the ${tier} tier with a ${frequency} review cadence. Status is ${payload.scenarioStatus || "Open"}, source is ${payload.scenarioSource || "not specified"}, and ${itemCount} risk item(s) were included. ${acceptanceText}.`;
}
function getSinglePayload() {
  const nameEl = document.getElementById("singleScenarioName");
  return {
    scenarioId: nameEl.dataset.scenarioId || "",
    mode: "single",
    name: nameEl.value.trim(),
    productGroup: document.getElementById("singleProductGroup").value,
    primaryProduct: document.getElementById("singlePrimaryProduct").value,
    primaryRegulation: document.getElementById("singlePrimaryRegulation").value,
    riskDomain: document.getElementById("singleRiskDomain").value,
    scenarioStatus: document.getElementById("singleScenarioStatus").value,
    scenarioSource: document.getElementById("singleScenarioSource").value,
    scenarioOwner: document.getElementById("singleScenarioOwner").value.trim(),
    disposition: document.getElementById("singleDisposition").value,
    inherent: Number(document.getElementById("singleInherentRiskScore").value || 0),
    control: Number(document.getElementById("singleControlEffectiveness").value || 0),
    identifiedDate: document.getElementById("singleIdentifiedDate").value,
    targetMitigationDate: document.getElementById("singleTargetMitigationDate").value,
    reviewDate: document.getElementById("singleReviewDate").value,
    closedDate: document.getElementById("singleClosedDate").value,
    items: [],
    mitigations: currentSingleMitigations.slice(),
    acceptedRisk: acceptedRiskFromForm("single")
  };
}
function getComplexPayload() {
  const nameEl = document.getElementById("complexScenarioName");
  return {
    scenarioId: nameEl.dataset.scenarioId || "",
    mode: "complex",
    name: nameEl.value.trim(),
    productGroup: document.getElementById("complexProductGroup").value,
    primaryProduct: document.getElementById("complexPrimaryProduct").value,
    primaryRegulation: document.getElementById("complexPrimaryRegulation").value,
    riskDomain: document.getElementById("complexRiskDomain").value,
    scenarioStatus: document.getElementById("complexScenarioStatus").value,
    scenarioSource: document.getElementById("complexScenarioSource").value,
    scenarioOwner: document.getElementById("complexScenarioOwner").value.trim(),
    disposition: document.getElementById("complexDisposition").value,
    inherent: Number(document.getElementById("complexInherentRiskScore").value || 0),
    control: Number(document.getElementById("complexControlEffectiveness").value || 0),
    identifiedDate: document.getElementById("complexIdentifiedDate").value,
    targetMitigationDate: document.getElementById("complexTargetMitigationDate").value,
    reviewDate: document.getElementById("complexReviewDate").value,
    closedDate: document.getElementById("complexClosedDate").value,
    items: currentComplexItems.slice(),
    mitigations: currentComplexMitigations.slice(),
    acceptedRisk: acceptedRiskFromForm("complex")
  };
}
function summarizePayload(payload) {
  let total = payload.inherent;
  let itemCount = 1;
  if (payload.mode === "complex" && payload.items.length) {
    let weightedTotal = 0;
    let totalWeight = 0;
    payload.items.forEach(item => {
      weightedTotal += item.score * item.weight;
      totalWeight += item.weight;
    });
    total = Math.round(weightedTotal / Math.max(totalWeight, 1));
    itemCount = payload.items.length;
  }
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  return {
    scenarioId: payload.scenarioId,
    ...payload,
    total,
    residual,
    tier,
    frequency,
    itemCount,
    acceptedRiskFlag: !!payload.acceptedRisk?.isAccepted,
    generatedSummary: buildSummary(payload, total, residual, tier, frequency, itemCount),
    updatedAt: new Date().toISOString()
  };
}
function renderScenarioSummary(summary) {
  if (!summary) return;
  document.getElementById("totalRiskScore").textContent = summary.total;
  document.getElementById("residualRiskScore").textContent = summary.residual;
  document.getElementById("riskTier").textContent = summary.tier;
  document.getElementById("reviewFrequency").textContent = summary.frequency;
  document.getElementById("itemCount").textContent = summary.itemCount;
  document.getElementById("dashboardNarrative").textContent = `${summary.name} | ${summary.productGroup || "No Product Group"} | ${summary.scenarioStatus || "Open"} | ${summary.scenarioSource || "No Source"}`;
  document.getElementById("aiSummaryBox").textContent = summary.generatedSummary;
  document.getElementById("reportSummary").innerHTML = `
    <li><strong>Scenario:</strong> ${escapeHtml(summary.name)}</li>
    <li><strong>Builder:</strong> ${summary.mode === "single" ? "Single" : "Complex"}</li>
    <li><strong>Product Group:</strong> ${escapeHtml(summary.productGroup || "Not selected")}</li>
    <li><strong>Status / Source:</strong> ${escapeHtml(summary.scenarioStatus || "Open")} / ${escapeHtml(summary.scenarioSource || "Not selected")}</li>
    <li><strong>Disposition:</strong> ${escapeHtml(summary.disposition || "Mitigate")}</li>
    <li><strong>Mitigations:</strong> ${(summary.mitigations || []).length}</li>
    <li><strong>Accepted Risk:</strong> ${summary.acceptedRiskFlag ? "Yes" : "No"}</li>
    <li><strong>Review Frequency:</strong> ${escapeHtml(summary.frequency)}</li>
  `;
}
function drawSimpleBarChart(canvasId, summary) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !summary) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const labels = ["Inherent", "Control %", "Residual"];
  const values = [summary.total, summary.control, summary.residual];
  const max = Math.max(...values, 100);
  const barWidth = 90;
  const gap = 60;
  const startX = 110;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#dfe6f1";
  ctx.beginPath();
  ctx.moveTo(70, 20);
  ctx.lineTo(70, h - 40);
  ctx.lineTo(w - 30, h - 40);
  ctx.stroke();

  values.forEach((v, i) => {
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
    ctx.fillText(labels[i], x + 12, h - 18);
    ctx.fillText(String(v), x + 22, y - 8);
  });
}
function renderCharts(summary) {
  const showDash = document.getElementById("showDashboardGraphToggle").checked;
  const showReport = document.getElementById("includeGraphInReport").checked;
  document.getElementById("dashboardChartCard").classList.toggle("hidden", !showDash);
  document.getElementById("reportGraphCard").classList.toggle("hidden", !showReport);
  if (!summary) return;
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
  explain.classList.toggle("hidden", !showExplain || !showTable);
  if (!showTable || !summary) return;
  const p10 = Math.max(0, summary.residual - 8);
  const p50 = summary.residual;
  const p90 = Math.min(100, summary.residual + 9);
  tbody.innerHTML = `
    <tr><td>P10 Residual Estimate</td><td>${p10}</td></tr>
    <tr><td>P50 Residual Estimate</td><td>${p50}</td></tr>
    <tr><td>P90 Residual Estimate</td><td>${p90}</td></tr>
    <tr><td>Review Frequency</td><td>${escapeHtml(summary.frequency)}</td></tr>
    <tr><td>Mitigation Count</td><td>${(summary.mitigations || []).length}</td></tr>
    <tr><td>Accepted Risk</td><td>${summary.acceptedRiskFlag ? "Yes" : "No"}</td></tr>
  `;
  explain.textContent = "This lightweight Monte Carlo-style table is a front-end estimate that shows a lower, midpoint, and upper residual range based on the current scenario scores. It is intended for prototype reporting, not statistical assurance.";
}
function filterSavedScenarios(saved) {
  const status = document.getElementById("savedFilterStatus").value;
  const source = document.getElementById("savedFilterSource").value;
  const accepted = document.getElementById("savedFilterAccepted").value;
  const q = document.getElementById("savedFilterSearch").value.trim().toLowerCase();
  return saved.filter(s => {
    if (status && s.scenarioStatus !== status) return false;
    if (source && s.scenarioSource !== source) return false;
    if (accepted === "yes" && !s.acceptedRiskFlag) return false;
    if (accepted === "no" && s.acceptedRiskFlag) return false;
    if (q) {
      const hay = [s.scenarioId, s.name, s.scenarioOwner, s.productGroup, s.primaryProduct].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function statusPill(status) {
  const slug = slugify(status || "open");
  return `<span class="pill status-${slug}">${escapeHtml(status || "Open")}</span>`;
}
function acceptedPill(flag) {
  return `<span class="pill accepted-${flag ? "yes" : "no"}">${flag ? "Accepted" : "Not Accepted"}</span>`;
}
function renderSavedScenarios() {
  const tbody = document.getElementById("savedEvaluationsBody");
  const snapshot = document.getElementById("dashboardScenarioSnapshot");
  const saved = filterSavedScenarios(getSavedScenarios());
  document.getElementById("savedCount").textContent = getSavedScenarios().length;

  if (!saved.length) {
    tbody.innerHTML = '<tr><td colspan="9">No saved scenarios match the current filters.</td></tr>';
    snapshot.innerHTML = '<tr><td colspan="5">No saved scenarios yet.</td></tr>';
    return;
  }
  tbody.innerHTML = saved.map(s => `<tr>
    <td>${escapeHtml(s.scenarioId || s.id || "")}</td>
    <td>
      <strong>${escapeHtml(s.name)}</strong>
      <div class="mini-note">${escapeHtml(s.scenarioOwner || "No owner")} | ${acceptedPill(!!s.acceptedRiskFlag)}</div>
    </td>
    <td>${s.mode === "single" ? "Single" : "Complex"}</td>
    <td>${escapeHtml(s.productGroup || "")}</td>
    <td>${statusPill(s.scenarioStatus)}</td>
    <td>${escapeHtml(s.scenarioSource || "")}</td>
    <td>${escapeHtml(s.residual)}</td>
    <td>${escapeHtml(s.frequency || "")}</td>
    <td>
      <button class="btn btn-secondary small-btn" data-action="open" data-id="${escapeHtml(s.scenarioId || s.id)}">Open</button>
      <button class="btn btn-secondary small-btn" data-action="run" data-id="${escapeHtml(s.scenarioId || s.id)}">Run</button>
      <button class="btn btn-secondary small-btn danger" data-action="delete" data-id="${escapeHtml(s.scenarioId || s.id)}">Delete</button>
    </td>
  </tr>`).join("");
  tbody.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    if (btn.dataset.action === "open") openScenario(id);
    if (btn.dataset.action === "run") { openScenario(id); runScenario(); }
    if (btn.dataset.action === "delete") deleteScenario(id);
  }));

  snapshot.innerHTML = saved.slice(0, 5).map(s => `<tr>
    <td>${escapeHtml(s.scenarioId || s.id || "")}</td>
    <td>${escapeHtml(s.name)}</td>
    <td>${statusPill(s.scenarioStatus)}</td>
    <td>${escapeHtml(s.scenarioSource || "")}</td>
    <td>${escapeHtml(s.residual)}</td>
  </tr>`).join("");
}
function scenarioIdMatches(s, id) {
  return s.scenarioId === id || s.id === id;
}
function openScenario(id) {
  const s = getSavedScenarios().find(x => scenarioIdMatches(x, id));
  if (!s) return;
  if (s.mode === "single") {
    const el = document.getElementById("singleScenarioName");
    el.value = s.name || "";
    el.dataset.scenarioId = s.scenarioId || s.id || "";
    document.getElementById("singleProductGroup").value = s.productGroup || productGroups[0] || "";
    document.getElementById("singlePrimaryProduct").value = s.primaryProduct || products[0] || "";
    document.getElementById("singlePrimaryRegulation").value = s.primaryRegulation || regulations[0] || "";
    document.getElementById("singleRiskDomain").value = s.riskDomain || riskDomains[0] || "";
    document.getElementById("singleScenarioStatus").value = s.scenarioStatus || "Open";
    document.getElementById("singleScenarioSource").value = s.scenarioSource || "";
    document.getElementById("singleScenarioOwner").value = s.scenarioOwner || "";
    document.getElementById("singleDisposition").value = s.disposition || "Mitigate";
    document.getElementById("singleInherentRiskScore").value = s.inherent || 0;
    document.getElementById("singleControlEffectiveness").value = s.control || 0;
    document.getElementById("singleIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("singleTargetMitigationDate").value = s.targetMitigationDate || "";
    document.getElementById("singleReviewDate").value = s.reviewDate || "";
    document.getElementById("singleClosedDate").value = s.closedDate || "";
    currentSingleMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    renderMitigations("single");
    const ar = s.acceptedRisk || {};
    document.getElementById("singleAcceptedRiskFlag").checked = !!ar.isAccepted;
    document.getElementById("singleAcceptanceAuthority").value = ar.authority || acceptanceAuthorities[0] || "";
    document.getElementById("singleAcceptedByName").value = ar.acceptedByName || "";
    document.getElementById("singleAcceptedDate").value = ar.acceptedDate || "";
    document.getElementById("singleAcceptedReviewDate").value = ar.reviewDate || "";
    document.getElementById("singleDecisionLogic").value = ar.decisionLogic || "";
    activeMode = "single";
    activateView("single");
  } else {
    const el = document.getElementById("complexScenarioName");
    el.value = s.name || "";
    el.dataset.scenarioId = s.scenarioId || s.id || "";
    document.getElementById("complexProductGroup").value = s.productGroup || productGroups[0] || "";
    document.getElementById("complexPrimaryProduct").value = s.primaryProduct || products[0] || "";
    document.getElementById("complexPrimaryRegulation").value = s.primaryRegulation || regulations[0] || "";
    document.getElementById("complexRiskDomain").value = s.riskDomain || riskDomains[0] || "";
    document.getElementById("complexScenarioStatus").value = s.scenarioStatus || "Open";
    document.getElementById("complexScenarioSource").value = s.scenarioSource || "";
    document.getElementById("complexScenarioOwner").value = s.scenarioOwner || "";
    document.getElementById("complexDisposition").value = s.disposition || "Mitigate";
    document.getElementById("complexInherentRiskScore").value = s.inherent || 0;
    document.getElementById("complexControlEffectiveness").value = s.control || 0;
    document.getElementById("complexIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("complexTargetMitigationDate").value = s.targetMitigationDate || "";
    document.getElementById("complexReviewDate").value = s.reviewDate || "";
    document.getElementById("complexClosedDate").value = s.closedDate || "";
    currentComplexItems = Array.isArray(s.items) ? s.items.slice() : [];
    currentComplexMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    renderComplexItems();
    renderMitigations("complex");
    const ar = s.acceptedRisk || {};
    document.getElementById("complexAcceptedRiskFlag").checked = !!ar.isAccepted;
    document.getElementById("complexAcceptanceAuthority").value = ar.authority || acceptanceAuthorities[0] || "";
    document.getElementById("complexAcceptedByName").value = ar.acceptedByName || "";
    document.getElementById("complexAcceptedDate").value = ar.acceptedDate || "";
    document.getElementById("complexAcceptedReviewDate").value = ar.reviewDate || "";
    document.getElementById("complexDecisionLogic").value = ar.decisionLogic || "";
    activeMode = "complex";
    activateView("complex");
  }
}
function deleteScenario(id) {
  const next = getSavedScenarios().filter(x => !scenarioIdMatches(x, id));
  setSavedScenarios(next);
  renderSavedScenarios();
  refreshLibraries();
}
function addCustomCategory(inputId, storageKey) {
  const el = document.getElementById(inputId);
  const value = (el.value || "").trim();
  if (!value) return;
  const arr = getStoredArray(storageKey);
  arr.push(value);
  setStoredArray(storageKey, arr);
  el.value = "";
  refreshLibraries();
  renderSavedScenarios();
}
function loadDepositsExample() {
  document.getElementById("complexScenarioName").value = "Deposits Risk Review";
  document.getElementById("complexProductGroup").value = "Payment Services";
  document.getElementById("complexPrimaryProduct").value = "Deposits";
  document.getElementById("complexPrimaryRegulation").value = "Reg DD";
  document.getElementById("complexRiskDomain").value = "Consumer Compliance Risk";
  document.getElementById("complexScenarioStatus").value = "Open";
  document.getElementById("complexScenarioSource").value = "Risk";
  document.getElementById("complexScenarioOwner").value = "Enterprise Risk";
  document.getElementById("complexDisposition").value = "Mitigate";
  document.getElementById("complexInherentRiskScore").value = 78;
  document.getElementById("complexControlEffectiveness").value = 28;
  currentComplexItems = [
    {name:"Overdraft fee disclosure risk", domain:"Consumer Compliance Risk", product:"Deposits", regulation:"Reg DD", score:82, weight:4},
    {name:"ACH fraud exposure", domain:"External Fraud Risk", product:"ACH Processing", regulation:"NACHA", score:76, weight:3},
    {name:"Vendor outage affecting deposit processing", domain:"Third-Party & Vendor Risk", product:"Core Deposit Platform", regulation:"FFIEC IT", score:68, weight:3},
    {name:"Complaint trend from account servicing", domain:"Reputation & Brand Risk", product:"Deposits", regulation:"UDAAP", score:71, weight:2}
  ];
  renderComplexItems();
  activeMode = "complex";
  activateView("complex");
}
function runScenario() {
  const payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  if (!payload.name) {
    alert("Scenario Name is required.");
    return;
  }
  const summary = summarizePayload(payload);
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderCharts(summary);
  renderMonteCarloTable(summary);
  activateView("dashboard");
}
function saveScenario() {
  const payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  if (!payload.name) {
    alert("Scenario Name is required.");
    return;
  }
  const saved = getSavedScenarios();
  const scenarioId = payload.scenarioId || nextScenarioId(saved);
  payload.scenarioId = scenarioId;
  const summary = summarizePayload(payload);
  summary.scenarioId = scenarioId;
  summary.id = scenarioId;
  summary.createdAt = saved.find(x => scenarioIdMatches(x, scenarioId))?.createdAt || new Date().toISOString();

  const existing = saved.findIndex(x => scenarioIdMatches(x, scenarioId) || x.name === summary.name);
  if (existing >= 0) saved[existing] = summary; else saved.unshift(summary);

  setSavedScenarios(saved);
  if (activeMode === "single") {
    document.getElementById("singleScenarioName").dataset.scenarioId = scenarioId;
  } else {
    document.getElementById("complexScenarioName").dataset.scenarioId = scenarioId;
  }
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderCharts(summary);
  renderMonteCarloTable(summary);
  renderSavedScenarios();
  refreshLibraries();
  activateView("saved");
}
function clearSavedFilters() {
  document.getElementById("savedFilterStatus").value = "";
  document.getElementById("savedFilterSource").value = "";
  document.getElementById("savedFilterAccepted").value = "";
  document.getElementById("savedFilterSearch").value = "";
  renderSavedScenarios();
}
function printReport() {
  window.print();
}
function init() {
  refreshLibraries();
  renderSavedScenarios();
  renderComplexItems();
  renderMitigations("single");
  renderMitigations("complex");

  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => activateView(btn.dataset.view)));
  document.getElementById("addRiskItemBtn").addEventListener("click", addRiskItem);
  document.getElementById("addSingleMitigationBtn").addEventListener("click", () => addMitigation("single"));
  document.getElementById("addComplexMitigationBtn").addEventListener("click", () => addMitigation("complex"));
  document.getElementById("saveScenarioBtn").addEventListener("click", saveScenario);
  document.getElementById("runScenarioBtn").addEventListener("click", runScenario);
  document.getElementById("loadDepositProjectBtn").addEventListener("click", loadDepositsExample);

  document.getElementById("addProductGroupBtn").addEventListener("click", () => addCustomCategory("newProductGroupName", CAT_GROUP_KEY));
  document.getElementById("addProductBtn").addEventListener("click", () => addCustomCategory("newProductName", CAT_PRODUCT_KEY));
  document.getElementById("addRegulationBtn").addEventListener("click", () => addCustomCategory("newRegulationName", CAT_REG_KEY));
  document.getElementById("addRiskDomainBtn").addEventListener("click", () => addCustomCategory("newRiskDomainName", CAT_DOMAIN_KEY));
  document.getElementById("addScenarioStatusBtn").addEventListener("click", () => addCustomCategory("newScenarioStatusName", CAT_STATUS_KEY));
  document.getElementById("addScenarioSourceBtn").addEventListener("click", () => addCustomCategory("newScenarioSourceName", CAT_SOURCE_KEY));
  document.getElementById("addAcceptanceAuthorityBtn").addEventListener("click", () => addCustomCategory("newAcceptanceAuthorityName", CAT_AUTH_KEY));

  document.getElementById("showDashboardGraphToggle").addEventListener("change", () => renderCharts(lastSummary));
  document.getElementById("includeGraphInReport").addEventListener("change", () => renderCharts(lastSummary));
  document.getElementById("includeMonteCarloTable").addEventListener("change", () => renderMonteCarloTable(lastSummary));
  document.getElementById("includeMonteCarloExplanation").addEventListener("change", () => renderMonteCarloTable(lastSummary));
  document.getElementById("savedFilterStatus").addEventListener("change", renderSavedScenarios);
  document.getElementById("savedFilterSource").addEventListener("change", renderSavedScenarios);
  document.getElementById("savedFilterAccepted").addEventListener("change", renderSavedScenarios);
  document.getElementById("savedFilterSearch").addEventListener("input", renderSavedScenarios);
  document.getElementById("clearSavedFiltersBtn").addEventListener("click", clearSavedFilters);
  document.getElementById("printReportBtn").addEventListener("click", printReport);
}
document.addEventListener("DOMContentLoaded", init);
