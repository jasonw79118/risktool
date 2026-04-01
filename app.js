
function setSelectValueSafe(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const wanted = String(value ?? "");
  const hasOption = Array.from(el.options || []).some(opt => opt.value === wanted);
  if (!hasOption && wanted) {
    const opt = document.createElement("option");
    opt.value = wanted;
    opt.textContent = wanted;
    el.appendChild(opt);
  }
  el.value = wanted;
}



function betaRelativeMean(min, mode, max) {
  if (max <= min) return 0.5;
  return ((((mode - min) / (max - min)) * 4) + 1) / 6;
}
function betaShapeA(relativeMean) {
  return (relativeMean ** 2) * (1 - relativeMean) * (6 ** 2) - 1;
}
function betaShapeB(relativeMean, a) {
  if (relativeMean <= 0) return 1;
  return ((1 - relativeMean) / relativeMean) * a;
}
function normalSample() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function gammaSample(shape) {
  if (shape < 1) {
    const u = Math.random();
    return gammaSample(1 + shape) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v, u;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    u = Math.random();
    if (u < 1 - 0.0331 * (x ** 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function boundedBetaSample(min, mode, max) {
  if (max <= min) return min;
  const relMean = betaRelativeMean(min, mode, max);
  const aRaw = betaShapeA(relMean);
  const bRaw = betaShapeB(relMean, aRaw);

  // Keep shapes positive and stable for browser-side simulation
  const alpha = Math.max(0.5, Math.abs(aRaw));
  const beta = Math.max(0.5, Math.abs(bRaw));

  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  const beta01 = x / (x + y);

  return min + beta01 * (max - min);
}
function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor(sortedValues.length * p)));
  return sortedValues[index];
}
function runBetaScenarioSimulation(betaInputs, randomScenarioCount) {
  const allowed = [100, 500, 1000, 10000, 100000];
  const iterations = allowed.includes(Number(randomScenarioCount)) ? Number(randomScenarioCount) : 1000;

  const min = Number(betaInputs.min || 0);
  const mode = Number(betaInputs.mode || min);
  const max = Number(betaInputs.max || mode);

  const relativeMean = betaRelativeMean(min, mode, max);
  const a = betaShapeA(relativeMean);
  const b = betaShapeB(relativeMean, a);

  const rows = [];
  const values = [];
  for (let i = 0; i < iterations; i++) {
    const value = boundedBetaSample(min, mode, max);
    rows.push({
      scenarioNumber: i + 1,
      sampledValue: Math.round(value)
    });
    values.push(value);
  }

  values.sort((x, y) => x - y);
  const expectedValue = Math.round(values.reduce((acc, v) => acc + v, 0) / Math.max(values.length, 1));

  return {
    iterations,
    relativeMean,
    a,
    b,
    expectedValue,
    p10: Math.round(percentile(values, 0.10)),
    p50: Math.round(percentile(values, 0.50)),
    p90: Math.round(percentile(values, 0.90)),
    randomOutcomeRows: rows
  };
}


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
let complexProductSections = [];
let singleInsurance = [];
let complexInsurance = [];
let singleHardFacts = [];
let complexHardFacts = [];
let betaInsurance = [];
let betaHardFacts = [];
let singleMitigations = [];
let complexMitigations = [];
window.singleAcceptedRisks = window.singleAcceptedRisks || [];
window.complexAcceptedRisks = window.complexAcceptedRisks || [];
window.recordEditState = window.recordEditState || {};
let activeMode = "single";
let lastSummary = null;
let complexScenarioComponents = [];
let activeComplexComponentId = "";
let complexGroupCounter = 1;
let componentCounter = 1;

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

function setTextIfPresent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? "");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function currentDateStamp() {
  return todayIso().replaceAll("-", "");
}
function generateComplexGroupId() {
  const id = `CG-${currentDateStamp()}-${String(complexGroupCounter).padStart(3, "0")}`;
  complexGroupCounter += 1;
  return id;
}
function ensureComplexGroupId() {
  const el = document.getElementById("complexGroupId");
  if (!el) return "";
  if (!el.value) el.value = generateComplexGroupId();
  return el.value;
}
function generateComponentId() {
  const existing = new Set(complexScenarioComponents.map(x => String(x.componentId || "")));
  let id = "";
  do {
    id = `COMP-${String(componentCounter).padStart(6, "0")}`;
    componentCounter += 1;
  } while (existing.has(id));
  return id;
}

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
function parseCurrencyValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
function currency(value) {
  return USD_FORMATTER.format(Math.round(parseCurrencyValue(value)));
}
function formatCurrencyInputValue(value) {
  const parsed = parseCurrencyValue(value);
  return parsed ? currency(parsed) : "";
}
function unformatCurrencyInputValue(value) {
  const parsed = parseCurrencyValue(value);
  return parsed ? String(Math.round(parsed)) : "";
}
function setCurrencyFieldValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = formatCurrencyInputValue(value);
}
function wireCurrencyFields() {
  document.querySelectorAll('[data-currency="usd"]').forEach((input) => {
    if (input.dataset.currencyWired === "true") return;
    input.dataset.currencyWired = "true";
    input.addEventListener("focus", () => {
      input.value = unformatCurrencyInputValue(input.value);
    });
    input.addEventListener("change", () => {
      input.value = formatCurrencyInputValue(input.value);
    });
    input.addEventListener("blur", () => {
      input.value = formatCurrencyInputValue(input.value);
    });
    input.value = formatCurrencyInputValue(input.value);
  });
}
function formatAllCurrencyFields() {
  document.querySelectorAll('[data-currency="usd"]').forEach((input) => {
    input.value = formatCurrencyInputValue(input.value);
  });
}
function totalCurrencyField(items, key) {
  return (items || []).reduce((sum, item) => sum + parseCurrencyValue(item?.[key]), 0);
}


function buildComplexProductSectionOptions() {
  return complexProductSections.map(section => section.productServiceArea).filter(Boolean);
}
function refreshComplexProductSectionSelects() {
  const currentRiskItemValue = document.getElementById("riskItemProduct")?.value || "";
  const currentSectionValue = document.getElementById("complexSectionProduct")?.value || "";
  const sectionOptions = buildComplexProductSectionOptions();
  populateSelect("riskItemProduct", sectionOptions.length ? sectionOptions : [""]);
  setSelectValueSafe("riskItemProduct", currentRiskItemValue);
  populateSelect("complexSectionProduct", productGroups);
  setSelectValueSafe("complexSectionProduct", currentSectionValue || (productGroups[0] || ""));
}
function renderComplexProductSections() {
  const tbody = document.getElementById("complexProductSectionsBody");
  const status = document.getElementById("complexProductSectionStatus");
  if (!tbody) return;
  if (!complexProductSections.length) {
    tbody.innerHTML = '<tr><td colspan="4">No product sections added yet.</td></tr>';
    if (status) status.textContent = "Define one or more Product Sections before assigning risk items.";
    refreshComplexProductSectionSelects();
    return;
  }
  tbody.innerHTML = complexProductSections.map(section => `
    <tr>
      <td>${escapeHtml(section.productServiceArea)}</td>
      <td>${Number(section.weight || 0)}</td>
      <td>${escapeHtml(section.notes || "")}</td>
      <td><button class="btn btn-secondary" type="button" data-delete-product-section="${escapeHtml(section.sectionId)}">Delete</button></td>
    </tr>
  `).join("");
  if (status) status.textContent = `${complexProductSections.length} product section(s) defined for this complex scenario.`;
  refreshComplexProductSectionSelects();
}
function addComplexProductSection() {
  const productServiceArea = document.getElementById("complexSectionProduct")?.value || "";
  const weight = Number(document.getElementById("complexSectionWeight")?.value || 3);
  const notes = document.getElementById("complexSectionNotes")?.value || "";
  if (!productServiceArea) {
    alert("Select a Product/Service/Area first.");
    return;
  }
  if (complexProductSections.some(section => section.productServiceArea === productServiceArea)) {
    alert("That Product/Service/Area is already added to this complex scenario.");
    return;
  }
  complexProductSections.push({
    sectionId: `SEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productServiceArea,
    weight,
    notes
  });
  renderComplexProductSections();
}
function deleteComplexProductSection(sectionId) {
  const section = complexProductSections.find(x => x.sectionId === sectionId);
  if (!section) return;
  const inUse = currentComplexItems.some(item => String(item.product || "") === String(section.productServiceArea || ""));
  if (inUse) {
    alert("This Product/Service/Area is already used by one or more risk items. Remove or reassign those risk items first.");
    return;
  }
  complexProductSections = complexProductSections.filter(x => x.sectionId !== sectionId);
  renderComplexProductSections();
}

function renderInsuranceTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="10">No insurance entries added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(x => `<tr><td>${escapeHtml(x.policyName)}</td><td>${escapeHtml(x.policyNumber)}</td><td>${escapeHtml(x.carrier)}</td><td>${escapeHtml(x.coverageType)}</td><td>${currency(x.premium)}</td><td>${currency(x.deductible)}</td><td>${currency(x.coverageAmount)}</td><td>${escapeHtml(x.coverageDates)}</td><td>${escapeHtml(x.notes)}</td><td>${escapeHtml(x.sourceLink)}</td></tr>`).join("");
}
function renderHardFactsTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hard facts / evidence entries added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(x => `<tr><td>${escapeHtml(x.sourceType)}</td><td>${currency(x.amount)}</td><td>${escapeHtml(x.factDate)}</td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.sourceLink)}</td></tr>`).join("");
}
function addInsurance(mode) {
  const prefix = mode === "single" ? "single" : mode === "complex" ? "complex" : "beta";
  const list = mode === "single" ? singleInsurance : mode === "complex" ? complexInsurance : betaInsurance;
  list.push({
    policyName: document.getElementById(`${prefix}InsurancePolicyName`).value || "Untitled Policy",
    policyNumber: document.getElementById(`${prefix}InsurancePolicyNumber`)?.value || "",
    carrier: document.getElementById(`${prefix}InsuranceCarrier`).value || "",
    coverageType: document.getElementById(`${prefix}InsuranceCoverageType`).value || "",
    premium: parseCurrencyValue(document.getElementById(`${prefix}InsurancePremium`).value || 0),
    deductible: parseCurrencyValue(document.getElementById(`${prefix}InsuranceDeductible`).value || 0),
    coverageAmount: parseCurrencyValue(document.getElementById(`${prefix}InsuranceCoverageAmount`).value || 0),
    coverageDates: document.getElementById(`${prefix}InsuranceCoverageDates`).value || "",
    notes: document.getElementById(`${prefix}InsuranceNotes`).value || "",
    sourceLink: document.getElementById(`${prefix}InsuranceSourceLink`).value || ""
  });
  renderInsuranceTable(`${prefix}InsuranceBody`, list);
}
function addHardFact(mode) {
  const prefix = mode === "single" ? "single" : mode === "complex" ? "complex" : "beta";
  const list = mode === "single" ? singleHardFacts : mode === "complex" ? complexHardFacts : betaHardFacts;
  list.push({
    sourceType: document.getElementById(`${prefix}HardFactSourceType`).value || "Internal",
    amount: parseCurrencyValue(document.getElementById(`${prefix}HardFactAmount`).value || 0),
    factDate: document.getElementById(`${prefix}HardFactDate`).value || "",
    description: document.getElementById(`${prefix}HardFactDescription`).value || "",
    sourceLink: document.getElementById(`${prefix}HardFactSourceLink`).value || ""
  });
  renderHardFactsTable(`${prefix}HardFactsBody`, list);
}

function getCurrentComplexComponentSnapshot() {
  const scenarioName = document.getElementById("complexScenarioName")?.value || "Unnamed Complex Component";
  return {
    componentId: activeComplexComponentId || generateComponentId(),
    groupId: ensureComplexGroupId(),
    scenarioName,
    scenarioStatus: document.getElementById("complexScenarioStatus")?.value || "Open",
    productGroup: document.getElementById("complexProductGroup")?.value || "",
    riskDomain: document.getElementById("complexRiskDomain")?.value || "",
    primaryProduct: document.getElementById("complexPrimaryProduct")?.value || "",
    primaryRegulation: document.getElementById("complexPrimaryRegulation")?.value || "",
    scenarioOwner: document.getElementById("complexScenarioOwner")?.value || "",
    identifiedDate: document.getElementById("complexIdentifiedDate")?.value || "",
    description: document.getElementById("complexScenarioDescription")?.value || "",
    control: Number(document.getElementById("complexControlEffectiveness")?.value || 0),
    hardCostMin: parseCurrencyValue(document.getElementById("complexHardCostMin")?.value || 0),
    hardCostLikely: parseCurrencyValue(document.getElementById("complexHardCostLikely")?.value || 0),
    hardCostMax: parseCurrencyValue(document.getElementById("complexHardCostMax")?.value || 0),
    softCostMin: Number(document.getElementById("complexSoftCostMin")?.value || 0),
    softCostLikely: Number(document.getElementById("complexSoftCostLikely")?.value || 0),
    softCostMax: Number(document.getElementById("complexSoftCostMax")?.value || 0),
    mitigationCost: parseCurrencyValue(document.getElementById("complexMitigationCost")?.value || 0),
    randomScenarioCount: Number(document.getElementById("complexRandomScenarioCount")?.value || 1000),
    productSections: complexProductSections.map(section => ({ ...section })),
    items: currentComplexItems.map(item => ({ ...item })),
    insurance: complexInsurance.map(item => ({ ...item })),
    hardFacts: complexHardFacts.map(item => ({ ...item })),
    mitigations: complexMitigations.map(item => ({ ...item })),
    acceptedRisk: JSON.parse(JSON.stringify(getAcceptedRisk("complex"))),
    inherent: calculateComplexInherent()
  };
}
function applyComplexComponentSnapshot(component) {
  if (!component) return;
  ensureComplexGroupId();
  const groupEl = document.getElementById("complexGroupId");
  if (groupEl) groupEl.value = component.groupId || groupEl.value || generateComplexGroupId();
  activeComplexComponentId = component.componentId || "";
  syncComplexComponentIdField(false);
  syncComplexComponentIdField();
  document.getElementById("complexScenarioName").value = component.scenarioName || "";
  document.getElementById("complexScenarioStatus").value = component.scenarioStatus || scenarioStatuses[0] || "Open";
  document.getElementById("complexProductGroup").value = component.productGroup || products[0] || "";
  document.getElementById("complexRiskDomain").value = component.riskDomain || riskDomains[0] || "";
  document.getElementById("complexPrimaryProduct").value = component.primaryProduct || products[0] || "";
  document.getElementById("complexPrimaryRegulation").value = component.primaryRegulation || regulations[0] || "";
  document.getElementById("complexScenarioOwner").value = component.scenarioOwner || "";
  document.getElementById("complexIdentifiedDate").value = component.identifiedDate || "";
  document.getElementById("complexScenarioDescription").value = component.description || "";
  document.getElementById("complexControlEffectiveness").value = component.control || 0;
  setCurrencyFieldValue("complexHardCostMin", component.hardCostMin || 0);
  setCurrencyFieldValue("complexHardCostLikely", component.hardCostLikely || 0);
  setCurrencyFieldValue("complexHardCostMax", component.hardCostMax || 0);
  document.getElementById("complexSoftCostMin").value = component.softCostMin || 0;
  document.getElementById("complexSoftCostLikely").value = component.softCostLikely || 0;
  document.getElementById("complexSoftCostMax").value = component.softCostMax || 0;
  setCurrencyFieldValue("complexMitigationCost", component.mitigationCost || 0);
  const complexRandom = document.getElementById("complexRandomScenarioCount");
  if (complexRandom) complexRandom.value = String(component.randomScenarioCount || 1000);
  complexProductSections = Array.isArray(component.productSections) ? component.productSections.map(section => ({ ...section })) : [];
  if (!complexProductSections.length) {
    const inferred = [...new Set((Array.isArray(component.items) ? component.items : []).map(item => String(item.product || '').trim()).filter(Boolean))];
    complexProductSections = inferred.map((name, idx) => ({ sectionId: `INF-${idx + 1}`, productServiceArea: name, weight: 3, notes: 'Rebuilt from saved risk-item product values.' }));
  }
  renderComplexProductSections();
  currentComplexItems = Array.isArray(component.items) ? component.items.map(item => ({ ...item })) : [];
  complexInsurance = Array.isArray(component.insurance) ? component.insurance.map(item => ({ ...item })) : [];
  complexHardFacts = Array.isArray(component.hardFacts) ? component.hardFacts.map(item => ({ ...item })) : [];
  complexMitigations = Array.isArray(component.mitigations) ? component.mitigations.map(item => ({ ...item })) : [];
  renderComplexItems();
  renderInsuranceTable("complexInsuranceBody", complexInsurance);
  renderHardFactsTable("complexHardFactsBody", complexHardFacts);
  renderMitigationTable("complexMitigationBody", complexMitigations);
  document.getElementById("complexAcceptedRiskFlag").checked = !!component.acceptedRisk?.isAccepted;
  document.getElementById("complexAcceptanceAuthority").value = component.acceptedRisk?.authority || acceptanceAuthorities[0] || "";
  document.getElementById("complexAcceptedBy").value = component.acceptedRisk?.acceptedBy || "";
  document.getElementById("complexAcceptanceDate").value = component.acceptedRisk?.acceptanceDate || "";
  document.getElementById("complexReviewDate").value = component.acceptedRisk?.reviewDate || "";
  document.getElementById("complexDecisionLogic").value = component.acceptedRisk?.decisionLogic || "";
  updateInherentScores();
}
function renderComplexScenarioComponents() {
  const tbody = document.getElementById("complexScenarioComponentsBody");
  if (!tbody) return;
  if (!complexScenarioComponents.length) {
    tbody.innerHTML = '<tr><td colspan="7">No component scenarios added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = complexScenarioComponents.map((component, idx) => `
    <tr>
      <td><button class="scenario-link" data-open-complex-component="${escapeHtml(component.componentId || "")}">${escapeHtml(component.componentId || `COMP-${String(idx + 1).padStart(6, "0")}`)}</button></td>
      <td>${escapeHtml(component.scenarioName || "Unnamed Complex Component")}</td>
      <td>${escapeHtml(component.productGroup || "")}</td>
      <td>${escapeHtml(component.riskDomain || "")}</td>
      <td>${Number(component.inherent || 0)}</td>
      <td>${Array.isArray(component.items) ? component.items.length : 0}</td>
      <td>${escapeHtml(component.scenarioStatus || "Open")}</td>
    </tr>
  `).join("");
  tbody.querySelectorAll("[data-open-complex-component]").forEach(btn => btn.addEventListener("click", () => openComplexScenarioComponent(btn.dataset.openComplexComponent)));
}
function syncComplexComponentIdField(forceNew = false) {
  const field = document.getElementById("complexComponentId");
  if (forceNew || !activeComplexComponentId) activeComplexComponentId = generateComponentId();
  if (field) field.value = activeComplexComponentId || "";
  return activeComplexComponentId || "";
}
function addComplexScenarioComponent() {
  syncComplexComponentIdField();
  const component = getCurrentComplexComponentSnapshot();
  activeComplexComponentId = component.componentId;
  const existingIndex = complexScenarioComponents.findIndex(x => x.componentId === component.componentId);
  if (existingIndex >= 0) {
    complexScenarioComponents[existingIndex] = component;
  } else {
    complexScenarioComponents.push(component);
  }
  renderComplexScenarioComponents();
  activeComplexComponentId = "";
  syncComplexComponentIdField(true);
}
function openComplexScenarioComponent(componentId) {
  const component = complexScenarioComponents.find(x => x.componentId === componentId);
  if (!component) return;
  applyComplexComponentSnapshot(component);
  activateView("complex");
  const topCard = document.querySelector('#view-complex .card');
  if (topCard?.scrollIntoView) topCard.scrollIntoView({ behavior: "smooth", block: "start" });
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
    plannedDecisionDate: saved.plannedDecisionDate || "",
    plannedGoLiveDate: saved.plannedGoLiveDate || "",
    projectOrProductName: saved.projectOrProductName || "",
    betaMin: Number(saved.betaMin || 0),
    betaMode: Number(saved.betaMode || 0),
    betaMax: Number(saved.betaMax || 0),
    betaRelativeMean: Number(saved.betaRelativeMean || 0),
    betaShapeA: Number(saved.betaShapeA || 0),
    betaShapeB: Number(saved.betaShapeB || 0),
    betaExpectedValue: Number(saved.betaExpectedValue || 0),
    betaP10: Number(saved.betaP10 || 0),
    betaP50: Number(saved.betaP50 || 0),
    betaP90: Number(saved.betaP90 || 0),
    betaIterations: Number(saved.betaIterations || 0),
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
    productSections: Array.isArray(saved.productSections) ? saved.productSections : [],
    items: Array.isArray(saved.items) ? saved.items : [],
    insurance: Array.isArray(saved.insurance) ? saved.insurance : [],
    hardFacts: Array.isArray(saved.hardFacts) ? saved.hardFacts : [],
    mitigations: Array.isArray(saved.mitigations) ? saved.mitigations : [],
    acceptedRiskEntries: Array.isArray(saved.acceptedRiskEntries) ? saved.acceptedRiskEntries : (saved.acceptedRisk ? [saved.acceptedRisk] : []),
    acceptedRisk: saved.acceptedRisk || {
      isAccepted: false,
      authority: "",
      acceptedBy: "",
      acceptanceDate: "",
      reviewDate: "",
      decisionLogic: ""
    },
    generatedSummary: saved.generatedSummary || "",
    hardCostMin: Number(saved.hardCostMin || 0),
    hardCostLikely: Number(saved.hardCostLikely || 0),
    hardCostMax: Number(saved.hardCostMax || 0),
    softCostMin: Number(saved.softCostMin || 0),
    softCostLikely: Number(saved.softCostLikely || 0),
    softCostMax: Number(saved.softCostMax || 0),
    mitigationCost: Number(saved.mitigationCost || 0),
    monteCarloMethodRows: Array.isArray(saved.monteCarloMethodRows) ? saved.monteCarloMethodRows : [],
    monteCarloInputRows: Array.isArray(saved.monteCarloInputRows) ? saved.monteCarloInputRows : [],
    monteCarloOutputRows: Array.isArray(saved.monteCarloOutputRows) ? saved.monteCarloOutputRows : [],
    horizonRows: Array.isArray(saved.horizonRows) ? saved.horizonRows : [],
    randomScenarioCount: Number(saved.randomScenarioCount || 1000)
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
  setTextIfPresent("productGroupCount", productGroups.length);
  setTextIfPresent("regCount", regulations.length);
  setTextIfPresent("domainCount", riskDomains.length);
  setTextIfPresent("savedCount", saved.length);
  setTextIfPresent("betaCount", saved.filter(x => x.mode === "beta").length);

  populateSelect("singleProductGroup", products);
  populateSelect("complexProductGroup", products);
  populateSelect("betaProductGroup", products);
  populateSelect("singleRiskDomain", riskDomains);
  populateSelect("complexRiskDomain", riskDomains);
  populateSelect("betaRiskDomain", riskDomains);
  populateSelect("singleScenarioStatus", scenarioStatuses);
  populateSelect("complexScenarioStatus", scenarioStatuses);
  populateSelect("singleScenarioSource", scenarioSources);
  populateSelect("complexScenarioSource", scenarioSources);
  populateSelect("singlePrimaryProduct", products);
  populateSelect("complexPrimaryProduct", products);
  populateSelect("singlePrimaryRegulation", regulations);
  populateSelect("complexPrimaryRegulation", regulations);
  populateSelect("riskItemDomain", riskDomains);
  populateSelect("complexSectionProduct", productGroups);
  refreshComplexProductSectionSelects();
  populateSelect("riskItemReg", regulations);
  populateSelect("singleAcceptanceAuthority", acceptanceAuthorities);
  populateSelect("complexAcceptanceAuthority", acceptanceAuthorities);

  renderCategoryAdmin();
  renderSavedScenarios();
  renderDashboardOpenTable();
  renderComplexScenarioComponents();
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
  if (viewName === "complex") {
    activeMode = "complex";
    syncComplexComponentIdField(false);
  }
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
    tbody.innerHTML = currentComplexItems.map(item => `<tr data-issue-id="${escapeHtml(item.issueId || "")}"><td><button class="scenario-link" data-issue-open="${escapeHtml(item.issueId || "")}">${escapeHtml(item.name)}</button></td><td>${escapeHtml(item.domain)}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.regulation)}</td><td>${item.score}</td><td>${item.weight}</td></tr>`).join("");
    tbody.querySelectorAll("[data-issue-open]").forEach(btn => btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueOpen;
      highlightIssueRow(issueId);
    }));
  }
  refreshComplexProductSectionSelects();
  updateInherentScores();
}
function addRiskItem() {
  if (!complexProductSections.length) {
    alert("Add a Product Section first.");
    return;
  }
  currentComplexItems.push({
    issueId: `ISS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    parentScenarioMode: "complex",
    name: document.getElementById("riskItemName").value || "Unnamed Risk Item",
    domain: document.getElementById("riskItemDomain").value,
    product: document.getElementById("riskItemProduct").value,
    regulation: document.getElementById("riskItemReg").value,
    description: "",
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
    hardCostMin: parseCurrencyValue(document.getElementById("singleHardCostMin").value || 0),
    hardCostLikely: parseCurrencyValue(document.getElementById("singleHardCostLikely").value || 0),
    hardCostMax: parseCurrencyValue(document.getElementById("singleHardCostMax").value || 0),
    softCostMin: Number(document.getElementById("singleSoftCostMin").value || 0),
    softCostLikely: Number(document.getElementById("singleSoftCostLikely").value || 0),
    softCostMax: Number(document.getElementById("singleSoftCostMax").value || 0),
    mitigationCost: parseCurrencyValue(document.getElementById("singleMitigationCost").value || 0),
    randomScenarioCount: Number(document.getElementById("singleRandomScenarioCount").value || 1000),
    items: [],
    insurance: singleInsurance.slice(),
    hardFacts: singleHardFacts.slice(),
    mitigations: singleMitigations.slice(),
    acceptedRiskEntries: (window.singleAcceptedRisks || []).map(item => ({ ...item })),
    acceptedRisk: getAcceptedRisk("single")
  };
}
function getComplexPayload() {
  const currentComponent = getCurrentComplexComponentSnapshot();
  const existingIndex = complexScenarioComponents.findIndex(x => x.componentId === currentComponent.componentId);
  const allComponents = existingIndex >= 0
    ? complexScenarioComponents.map((component, idx) => idx === existingIndex ? currentComponent : component)
    : [...complexScenarioComponents, currentComponent];
  const allItems = allComponents.flatMap(component => Array.isArray(component.items) ? component.items : []);
  const allInsurance = allComponents.flatMap(component => Array.isArray(component.insurance) ? component.insurance : []);
  const allHardFacts = allComponents.flatMap(component => Array.isArray(component.hardFacts) ? component.hardFacts : []);
  const allMitigations = allComponents.flatMap(component => Array.isArray(component.mitigations) ? component.mitigations : []);
  const avgInherent = allComponents.length
    ? Math.round(allComponents.reduce((sum, component) => sum + Number(component.inherent || 0), 0) / allComponents.length)
    : calculateComplexInherent();
  return {
    mode: "complex",
    id: document.getElementById("complexScenarioId").value,
    complexGroupId: ensureComplexGroupId(),
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
    inherent: avgInherent,
    control: Number(document.getElementById("complexControlEffectiveness").value || 0),
    hardCostMin: parseCurrencyValue(document.getElementById("complexHardCostMin").value || 0),
    hardCostLikely: parseCurrencyValue(document.getElementById("complexHardCostLikely").value || 0),
    hardCostMax: parseCurrencyValue(document.getElementById("complexHardCostMax").value || 0),
    softCostMin: Number(document.getElementById("complexSoftCostMin").value || 0),
    softCostLikely: Number(document.getElementById("complexSoftCostLikely").value || 0),
    softCostMax: Number(document.getElementById("complexSoftCostMax").value || 0),
    mitigationCost: parseCurrencyValue(document.getElementById("complexMitigationCost").value || 0),
    randomScenarioCount: Number(document.getElementById("complexRandomScenarioCount").value || 1000),
    productSections: complexProductSections.map(section => ({ ...section })),
    items: allItems,
    insurance: allInsurance,
    hardFacts: allHardFacts,
    components: allComponents.map(component => ({ ...component })),
    mitigations: allMitigations,
    acceptedRiskEntries: (window.complexAcceptedRisks || []).map(item => ({ ...item })),
    acceptedRisk: getAcceptedRisk("complex")
  };
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}
function triangularSample(min, mode, max) {
  min = Number(min || 0);
  mode = Number(mode || min);
  max = Number(max || mode);
  if (max <= min) return min;
  mode = Math.min(max, Math.max(min, mode));
  const u = Math.random();
  const c = (mode - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}
function runFinancialMonteCarlo(payload) {
  const allowedIterations = [100, 500, 1000, 10000, 100000];
  const requestedIterations = Number(payload.randomScenarioCount || 1000);
  const iterations = allowedIterations.includes(requestedIterations) ? requestedIterations : 1000;
  const hardMin = Math.max(0, Number(payload.hardCostMin || 0));
  const hardLikely = Math.max(hardMin, Number(payload.hardCostLikely || hardMin));
  const hardMax = Math.max(hardLikely, Number(payload.hardCostMax || hardLikely));
  const softMin = Math.max(0, Number(payload.softCostMin || 0));
  const softLikely = Math.max(softMin, Number(payload.softCostLikely || softMin));
  const softMax = Math.max(softLikely, Number(payload.softCostMax || softLikely));
  const effectiveness = clampNumber(payload.control || 0, 0, 100, 0) / 100;
  const mitigationCost = Math.max(0, Number(payload.mitigationCost || 0));

  const totalSamples = [];
  const residualSamples = [];
  const hardSamples = [];
  const softSamples = [];
  const randomOutcomeRows = [];
  for (let i = 0; i < iterations; i++) {
    const hard = triangularSample(hardMin, hardLikely, hardMax);
    const softMultiplier = triangularSample(softMin, softLikely, softMax);
    const soft = hard * softMultiplier;
    const total = hard + soft;
    const residual = total * (1 - effectiveness);
    hardSamples.push(hard);
    softSamples.push(soft);
    totalSamples.push(total);
    residualSamples.push(residual);
    randomOutcomeRows.push({
      scenarioNumber: i + 1,
      hardCost: Math.round(hard),
      softCost: Math.round(soft),
      totalCost: Math.round(total),
      residualCost: Math.round(residual),
      breakevenMet: residual <= mitigationCost ? 'Yes' : 'No'
    });
  }
  totalSamples.sort((a,b) => a-b);
  residualSamples.sort((a,b) => a-b);

  const avg = arr => arr.reduce((a,b)=>a+b,0) / Math.max(arr.length,1);
  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))];

  const expectedLoss = Math.round(avg(totalSamples));
  const residualExpectedLoss = Math.round(avg(residualSamples));
  const hardCostExpected = Math.round(avg(hardSamples));
  const softCostExpected = Math.round(avg(softSamples));
  const riskReductionValue = Math.max(0, expectedLoss - residualExpectedLoss);
  const mitigationROI = riskReductionValue - mitigationCost;

  const horizons = [1,3,5,10,15,20,25,30];
  const horizonRows = horizons.map(years => {
    const withoutMitigation = expectedLoss * years;
    const withMitigation = residualExpectedLoss * years + mitigationCost;
    return {
      horizonLabel: years === 30 ? '30+ Years' : `${years} Year${years > 1 ? 's' : ''}`,
      years,
      withoutMitigation: Math.round(withoutMitigation),
      withMitigation: Math.round(withMitigation),
      riskReduction: Math.round(withoutMitigation - withMitigation)
    };
  });

  return {
    iterations,
    hardCostExpected,
    softCostExpected,
    expectedLoss,
    residualExpectedLoss,
    riskReductionValue,
    mitigationCost,
    mitigationROI,
    rangeLow: Math.round(pct(totalSamples, 0.10)),
    rangeMedian: Math.round(pct(totalSamples, 0.50)),
    rangeHigh: Math.round(pct(totalSamples, 0.90)),
    horizonRows,
    randomOutcomeRows
  };
}
function summarizePayload(payload) {
  const total = payload.inherent;
  const itemCount = payload.mode === "complex" ? Math.max(payload.items.length, 1) : 1;
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const mc = runFinancialMonteCarlo(payload);

  const monteCarloMethodRows = [
    ["Method", "Triangular Monte Carlo with bounded sampling"],
    ["Iterations", mc.iterations],
    ["Randomization Basis", "Triangular draws for hard cost and soft-cost multipliers"],
    ["Control Effectiveness Applied", `${payload.control}% reduction to expected simulated cost`],
    ["Output Range Basis", "P10 / P50 / P90 of simulated annual total cost"],
    ["Model Purpose", "Estimate hard cost, soft cost, residual loss, and mitigation economics"]
  ];
  const monteCarloInputRows = [
    ["Hard Cost Min", currency(payload.hardCostMin)],
    ["Hard Cost Most Likely", currency(payload.hardCostLikely)],
    ["Hard Cost Max", currency(payload.hardCostMax)],
    ["Soft Cost Multiplier Min", payload.softCostMin],
    ["Soft Cost Multiplier Most Likely", payload.softCostLikely],
    ["Soft Cost Multiplier Max", payload.softCostMax],
    ["Mitigation Cost", currency(payload.mitigationCost)],
    ["Control Effectiveness", `${payload.control}%`]
  ];
  const monteCarloOutputRows = [
    ["Expected Annual Hard Cost", currency(mc.hardCostExpected)],
    ["Expected Annual Soft Cost", currency(mc.softCostExpected)],
    ["Expected Annual Loss", currency(mc.expectedLoss)],
    ["Residual Annual Loss", currency(mc.residualExpectedLoss)],
    ["Annual Risk Reduction Value", currency(mc.riskReductionValue)],
    ["Mitigation Cost", currency(mc.mitigationCost)],
    ["Net Benefit / ROI", currency(mc.mitigationROI)],
    ["P10 Annual Loss", currency(mc.rangeLow)],
    ["P50 Annual Loss", currency(mc.rangeMedian)],
    ["P90 Annual Loss", currency(mc.rangeHigh)]
  ];
  const decisionText = mc.mitigationROI >= 0
    ? `Mitigation appears cost effective. Estimated annual risk reduction of ${currency(mc.riskReductionValue)} exceeds the direct mitigation cost of ${currency(mc.mitigationCost)} by approximately ${currency(mc.mitigationROI)}.`
    : `Direct mitigation cost appears to exceed the estimated annual reduction in loss by approximately ${currency(Math.abs(mc.mitigationROI))}. Leadership should consider partial controls, transfer options, or alternative mitigating factors.`;

  return {
    ...payload,
    total,
    residual,
    tier,
    frequency,
    itemCount,
    generatedSummary: `${buildSummary(payload.name, payload.mode, payload.primaryProduct, payload.primaryRegulation, total, residual, tier, frequency, itemCount)} Estimated annual exposure ranges from ${currency(mc.rangeLow)} to ${currency(mc.rangeHigh)} with a most likely annual impact of ${currency(mc.rangeMedian)}. ${decisionText}`,
    monteCarloRows: [],
    monteCarloMethodRows,
    monteCarloInputRows,
    monteCarloOutputRows,
    horizonRows: mc.horizonRows,
    randomScenarioCount: mc.iterations,
    randomOutcomeRows: mc.randomOutcomeRows,
    expectedLoss: mc.expectedLoss,
    residualExpectedLoss: mc.residualExpectedLoss,
    hardCostExpected: mc.hardCostExpected,
    softCostExpected: mc.softCostExpected,
    riskReductionValue: mc.riskReductionValue,
    mitigationROI: mc.mitigationROI,
    rangeLow: mc.rangeLow,
    rangeMedian: mc.rangeMedian,
    rangeHigh: mc.rangeHigh,
    decisionText
  };
}
function renderReportSupplements(summary) {
  const insuranceBody = document.getElementById("reportInsuranceBody");
  const hardFactsBody = document.getElementById("reportHardFactsBody");
  const insuranceTotalEl = document.getElementById("reportInsuranceTotals");
  const hardFactsTotalEl = document.getElementById("reportHardFactsTotals");
  if (!insuranceBody || !hardFactsBody || !insuranceTotalEl || !hardFactsTotalEl) return;
  const insurance = Array.isArray(summary?.insurance) ? summary.insurance : [];
  const hardFacts = Array.isArray(summary?.hardFacts) ? summary.hardFacts : [];

  if (!insurance.length) {
    insuranceBody.innerHTML = '<tr><td colspan="10">No insurance data loaded for this scenario.</td></tr>';
    insuranceTotalEl.textContent = 'Insurance totals: Premium $0 | Deductible $0 | Coverage $0';
  } else {
    insuranceBody.innerHTML = insurance.map(item => `
      <tr>
        <td>${escapeHtml(item.policyName)}</td>
        <td>${escapeHtml(item.policyNumber)}</td>
        <td>${escapeHtml(item.carrier)}</td>
        <td>${escapeHtml(item.coverageType)}</td>
        <td>${currency(item.premium)}</td>
        <td>${currency(item.deductible)}</td>
        <td>${currency(item.coverageAmount)}</td>
        <td>${escapeHtml(item.coverageDates)}</td>
        <td>${escapeHtml(item.notes)}</td>
        <td>${escapeHtml(item.sourceLink)}</td>
      </tr>
    `).join("");
    insuranceTotalEl.textContent = `Insurance totals: Premium ${currency(totalCurrencyField(insurance, "premium"))} | Deductible ${currency(totalCurrencyField(insurance, "deductible"))} | Coverage ${currency(totalCurrencyField(insurance, "coverageAmount"))}`;
  }

  if (!hardFacts.length) {
    hardFactsBody.innerHTML = '<tr><td colspan="5">No hard facts / evidence loaded for this scenario.</td></tr>';
    hardFactsTotalEl.textContent = 'Hard facts total documented loss / cost: $0';
  } else {
    hardFactsBody.innerHTML = hardFacts.map(item => `
      <tr>
        <td>${escapeHtml(item.sourceType)}</td>
        <td>${currency(item.amount)}</td>
        <td>${escapeHtml(item.factDate)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${escapeHtml(item.sourceLink)}</td>
      </tr>
    `).join("");
    hardFactsTotalEl.textContent = `Hard facts total documented loss / cost: ${currency(totalCurrencyField(hardFacts, "amount"))}`;
  }
}

function renderScenarioSummary(summary) {
  setTextIfPresent("scenarioIdDisplay", summary.id || "Not Saved");
  setTextIfPresent("inherentRiskScoreDisplay", summary.inherent);
  setTextIfPresent("residualRiskScore", summary.residual);
  setTextIfPresent("riskTier", summary.tier);
  setTextIfPresent("reviewFrequency", summary.frequency);
  setTextIfPresent("itemCount", summary.itemCount);
  setTextIfPresent("dashboardNarrative", `${summary.name} was run as a ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"} for ${summary.primaryProduct}. Reporting Lines: ${summary.productGroup}. Primary regulation: ${summary.primaryRegulation}. Inherent risk score: ${summary.inherent}. Residual risk score: ${summary.residual}. Estimated annual exposure range: ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}. Recommended review frequency: ${summary.frequency}.`);
  setTextIfPresent("aiSummaryBox", summary.generatedSummary);
  const reportSummaryEl = document.getElementById("reportSummary");
  if (reportSummaryEl) reportSummaryEl.innerHTML = `
    <li><span class="help-label" data-help="Auto-generated scenario identifier used for tracking and reporting."><strong>Scenario ID:</strong></span> ${escapeHtml(summary.id || "Not Saved")}</li>
    <li><span class="help-label" data-help="The scenario currently being evaluated or reported."><strong>Scenario:</strong></span> ${escapeHtml(summary.name)}</li>
    <li><span class="help-label" data-help="Shows whether the report is based on a single or complex scenario builder."><strong>Builder:</strong></span> ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"}</li>
    <li><span class="help-label" data-help="Overall business or organizational group associated with the scenario."><strong>Reporting Lines:</strong></span> ${escapeHtml(summary.productGroup)}</li>
    <li><span class="help-label" data-help="Primary product or service most directly connected to the scenario."><strong>Primary Product:</strong></span> ${escapeHtml(summary.primaryProduct)}</li>
    <li><span class="help-label" data-help="Primary regulation or standard used to frame the scenario."><strong>Primary Regulation:</strong></span> ${escapeHtml(summary.primaryRegulation)}</li>
    <li><span class="help-label" data-help="Calculated starting risk before current control-effectiveness is applied."><strong>Inherent Risk Score:</strong></span> ${summary.inherent} (${escapeHtml(summary.tier)})</li>
    <li><span class="help-label" data-help="Remaining risk after the stated control-effectiveness percentage is applied."><strong>Residual Risk Score:</strong></span> ${summary.residual}</li>
    <li><span class="help-label" data-help="P10 to P90 annual loss range estimated by the financial model."><strong>Annual Exposure Range:</strong></span> ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}</li>
    <li><span class="help-label" data-help="P50 annual loss estimate from the model; this is the most likely annual impact used for executive framing."><strong>Most Likely Annual Impact:</strong></span> ${currency(summary.rangeMedian)}</li>
    <li><span class="help-label" data-help="Expected direct measurable cost of the risk before secondary impacts."><strong>Expected Annual Hard Cost:</strong></span> ${currency(summary.hardCostExpected)}</li>
    <li><span class="help-label" data-help="Expected secondary or incidental cost added to hard cost, such as reputation, complaint, or disruption impacts."><strong>Expected Annual Soft Cost:</strong></span> ${currency(summary.softCostExpected)}</li>
    <li><span class="help-label" data-help="Expected total annual cost, combining hard and soft cost."><strong>Expected Annual Loss:</strong></span> ${currency(summary.expectedLoss)}</li>
    <li><span class="help-label" data-help="Expected annual cost remaining after the planned controls and mitigation assumptions are applied."><strong>Residual Annual Loss:</strong></span> ${currency(summary.residualExpectedLoss)}</li>
    <li><span class="help-label" data-help="Estimated direct cost to implement the planned full mitigation approach."><strong>Mitigation Cost:</strong></span> ${currency(summary.mitigationCost)}</li>
    <li><span class="help-label" data-help="Estimated annual reduction in loss from mitigation, before subtracting mitigation cost."><strong>Annual Risk Reduction Value:</strong></span> ${currency(summary.riskReductionValue)}</li>
    <li><span class="help-label" data-help="Risk-reduction value minus mitigation cost; used as a cost-effectiveness screen."><strong>Net Benefit / ROI:</strong></span> ${currency(summary.mitigationROI)}</li>
    <li><span class="help-label" data-help="Suggested review cadence based on the mapped residual-risk tier."><strong>Review Frequency:</strong></span> ${escapeHtml(summary.frequency)}</li>
    <li><span class="help-label" data-help="Count of insurance records loaded into the scenario and available for reporting."><strong>Insurance Records:</strong></span> ${(summary.insurance || []).length}</li>
    <li><span class="help-label" data-help="Documented insurance premium total across all listed policies."><strong>Insurance Premium Total:</strong></span> ${currency(totalCurrencyField(summary.insurance, "premium"))}</li>
    <li><span class="help-label" data-help="Documented factual loss or cost evidence total across all listed hard facts."><strong>Hard Facts Total:</strong></span> ${currency(totalCurrencyField(summary.hardFacts, "amount"))}</li>
  `;
  renderReportSupplements(summary);
  const executiveDecisionEl = document.getElementById("executiveDecisionBox");
  if (executiveDecisionEl) executiveDecisionEl.innerHTML = `
    <strong>Executive Decision Summary</strong><br>
    There is a ${escapeHtml(summary.tier.toLowerCase())} risk tied to <strong>${escapeHtml(summary.name)}</strong> that could cost the organization approximately <strong>${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}</strong> over a one-year period, with a most likely annual outcome near <strong>${currency(summary.rangeMedian)}</strong>.<br><br>
    Direct hard cost is modeled at approximately <strong>${currency(summary.hardCostExpected)}</strong> annually, while secondary or incidental soft cost is modeled at approximately <strong>${currency(summary.softCostExpected)}</strong> annually.<br><br>
    The estimated direct cost to mitigate the full risk is <strong>${currency(summary.mitigationCost)}</strong>, and the modeled annual reduction in loss is approximately <strong>${currency(summary.riskReductionValue)}</strong>.<br><br>
    ${escapeHtml(summary.decisionText)} Suggested next steps include validating assumptions, considering staged controls, and documenting whether alternative mitigating factors can reduce residual exposure at a lower cost.
  `;

  const decisionMetricsEl = document.getElementById("decisionMetricsBody");
  if (decisionMetricsEl) decisionMetricsEl.innerHTML = `
    <tr><td>Expected Annual Loss</td><td>${currency(summary.expectedLoss)}</td></tr>
    <tr><td>Residual Annual Loss</td><td>${currency(summary.residualExpectedLoss)}</td></tr>
    <tr><td>Total Insurance Premium</td><td>${currency(totalCurrencyField(summary.insurance, "premium"))}</td></tr>
    <tr><td>Total Hard Facts / Evidence Cost</td><td>${currency(totalCurrencyField(summary.hardFacts, "amount"))}</td></tr>
    <tr><td>Mitigation Cost</td><td>${currency(summary.mitigationCost)}</td></tr>
    <tr><td>Annual Risk Reduction Value</td><td>${currency(summary.riskReductionValue)}</td></tr>
    <tr><td>Net Benefit / ROI</td><td>${currency(summary.mitigationROI)}</td></tr>
    <tr><td>Decision View</td><td>${summary.mitigationROI >= 0 ? "Cost effective to mitigate" : "Consider alternatives or partial controls"}</td></tr>
  `;

  const horizonExposureEl = document.getElementById("horizonExposureBody");
  if (horizonExposureEl) horizonExposureEl.innerHTML = summary.horizonRows.map(row => `
    <tr>
      <td>${escapeHtml(row.horizonLabel)}</td>
      <td>${currency(row.withoutMitigation)}</td>
      <td>${currency(row.withMitigation)}</td>
      <td>${currency(row.riskReduction)}</td>
    </tr>
  `).join("");
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
  const dashCard = document.getElementById("dashboardChartCard");
  const reportCard = document.getElementById("reportGraphCard");
  if (dashCard) dashCard.classList.toggle("hidden", !showDash);
  if (reportCard) reportCard.classList.toggle("hidden", !showReport);
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
  const rows = []
    .concat([["--- Monte Carlo Method ---",""]])
    .concat(summary.monteCarloMethodRows || [])
    .concat([["--- Monte Carlo Inputs ---",""]])
    .concat(summary.monteCarloInputRows || [])
    .concat([["--- Monte Carlo Outputs ---",""]])
    .concat(summary.monteCarloOutputRows || []);
  tbody.innerHTML = rows.map(r => `<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join("");
  explain.classList.toggle("hidden", !showExplain);
  if (showExplain) {
    explain.textContent = "This report section documents the Monte Carlo method, inputs, and outputs used in the current scenario. The model uses bounded triangular sampling for hard cost and soft-cost multipliers, applies the stated control-effectiveness assumption, and estimates a distribution of annual loss outcomes. This structure is intended to support transparency, reproducibility, and examiner review.";
  }
}
function setBetaOutputs(result) {
  const safe = result || {};
  document.getElementById("betaRelativeMean").value = safe.relativeMean ? Number(safe.relativeMean).toFixed(4) : "";
  document.getElementById("betaShapeA").value = safe.a ? Number(safe.a).toFixed(4) : "";
  document.getElementById("betaShapeB").value = safe.b ? Number(safe.b).toFixed(4) : "";
  document.getElementById("betaExpectedValue").value = safe.expectedValue || 0;
  document.getElementById("betaP10").value = safe.p10 || 0;
  document.getElementById("betaP50").value = safe.p50 || 0;
  document.getElementById("betaP90").value = safe.p90 || 0;
  document.getElementById("betaExpectedValueDisplay").textContent = currency(safe.expectedValue || 0);
  document.getElementById("betaP10Display").textContent = currency(safe.p10 || 0);
  document.getElementById("betaP50Display").textContent = currency(safe.p50 || 0);
  document.getElementById("betaP90Display").textContent = currency(safe.p90 || 0);
  document.getElementById("betaIterationsDisplay").textContent = String(safe.iterations || 0);
  document.getElementById("betaNarrative").textContent = safe.narrative || "Run a beta scenario to populate projected future-state outcomes.";
}
function getBetaPayload() {
  const result = runBetaScenarioSimulation({
    min: parseCurrencyValue(document.getElementById("betaMin").value || 0),
    mode: parseCurrencyValue(document.getElementById("betaMode").value || 0),
    max: parseCurrencyValue(document.getElementById("betaMax").value || 0)
  }, Number(document.getElementById("betaRandomScenarioCount").value || 1000));
  return {
    mode: "beta",
    id: document.getElementById("betaScenarioId").value,
    name: document.getElementById("betaScenarioName").value || "Unnamed Beta Scenario",
    productGroup: document.getElementById("betaProductGroup").value || "",
    riskDomain: document.getElementById("betaRiskDomain").value || "",
    scenarioStatus: document.getElementById("betaScenarioStatus").value || "Draft",
    primaryProduct: document.getElementById("betaProjectOrProductName").value || "",
    projectOrProductName: document.getElementById("betaProjectOrProductName").value || "",
    scenarioOwner: document.getElementById("betaScenarioOwner").value || "",
    identifiedDate: document.getElementById("betaIdentifiedDate").value || "",
    plannedDecisionDate: document.getElementById("betaPlannedDecisionDate").value || "",
    plannedGoLiveDate: document.getElementById("betaPlannedGoLiveDate").value || "",
    description: document.getElementById("betaScenarioDescription").value || "",
    randomScenarioCount: Number(document.getElementById("betaRandomScenarioCount").value || 1000),
    betaMin: parseCurrencyValue(document.getElementById("betaMin").value || 0),
    betaMode: parseCurrencyValue(document.getElementById("betaMode").value || 0),
    betaMax: parseCurrencyValue(document.getElementById("betaMax").value || 0),
    betaRelativeMean: Number(result.relativeMean || 0),
    betaShapeA: Number(result.a || 0),
    betaShapeB: Number(result.b || 0),
    betaExpectedValue: Number(result.expectedValue || 0),
    betaP10: Number(result.p10 || 0),
    betaP50: Number(result.p50 || 0),
    betaP90: Number(result.p90 || 0),
    betaIterations: Number(result.iterations || 0),
    randomOutcomeRows: Array.isArray(result.randomOutcomeRows) ? result.randomOutcomeRows : [],
    insurance: betaInsurance.slice(),
    hardFacts: betaHardFacts.slice(),
    inherent: 0,
    residual: 0,
    itemCount: 1,
    tier: "Projected",
    frequency: "As Needed",
    generatedSummary: `Beta scenario projection for ${document.getElementById("betaProjectOrProductName").value || document.getElementById("betaScenarioName").value || "the proposal"} shows an expected value of ${currency(result.expectedValue || 0)}, with a P10 of ${currency(result.p10 || 0)} and a P90 of ${currency(result.p90 || 0)} across ${result.iterations || 0} randomized draws.`
  };
}
function runBetaScenario() {
  const payload = getBetaPayload();
  setBetaOutputs({
    relativeMean: payload.betaRelativeMean,
    a: payload.betaShapeA,
    b: payload.betaShapeB,
    expectedValue: payload.betaExpectedValue,
    p10: payload.betaP10,
    p50: payload.betaP50,
    p90: payload.betaP90,
    iterations: payload.betaIterations,
    narrative: payload.generatedSummary
  });
}
function saveBetaScenario(event) {
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  const payload = getBetaPayload();
  const saved = getSavedScenarios();
  if (!payload.id) {
    payload.id = generateScenarioId(saved);
    document.getElementById("betaScenarioId").value = payload.id;
  }
  const existingIndex = saved.findIndex(x => x.id === payload.id);
  if (existingIndex >= 0) saved[existingIndex] = normalizeScenario(payload); else saved.unshift(normalizeScenario(payload));
  setSavedScenarios(saved);
  setBetaOutputs({
    relativeMean: payload.betaRelativeMean,
    a: payload.betaShapeA,
    b: payload.betaShapeB,
    expectedValue: payload.betaExpectedValue,
    p10: payload.betaP10,
    p50: payload.betaP50,
    p90: payload.betaP90,
    iterations: payload.betaIterations,
    narrative: payload.generatedSummary
  });
  renderSavedScenarios();
  renderDashboardOpenTable();
  refreshLibraries();
  formatAllCurrencyFields();
  activateView("beta");
}
function loadBetaTestScenario() {
  document.getElementById("betaScenarioId").value = "";
  document.getElementById("betaScenarioName").value = "Embedded Payments Launch Readiness";
  setSelectValueSafe("betaProductGroup", "Payment Services");
  setSelectValueSafe("betaRiskDomain", "Strategic & Business Model Risk");
  document.getElementById("betaScenarioStatus").value = "Under Review";
  document.getElementById("betaProjectOrProductName").value = "Embedded Payments Launch";
  document.getElementById("betaScenarioOwner").value = "Product Management";
  document.getElementById("betaIdentifiedDate").value = todayIso();
  document.getElementById("betaPlannedDecisionDate").value = todayIso();
  document.getElementById("betaPlannedGoLiveDate").value = todayIso();
  setCurrencyFieldValue("betaMin", 150000);
  setCurrencyFieldValue("betaMode", 325000);
  setCurrencyFieldValue("betaMax", 900000);
  const betaRandom = document.getElementById("betaRandomScenarioCount");
  if (betaRandom) betaRandom.value = "1000";
  document.getElementById("betaScenarioDescription").value = "This beta scenario models projected launch economics and uncertainty for an embedded payments offering while documenting insurance coverage and factual planning evidence.";
  betaInsurance = [
    { policyName: "Launch Liability Program", policyNumber: "BETA-PL-1001", carrier: "Acme Specialty", coverageType: "Technology E&O", premium: "42000", deductible: "50000", coverageAmount: "2000000", coverageDates: "2026-01-01 to 2026-12-31", notes: "Quoted launch coverage tower", sourceLink: "internal://insurance/embedded-payments" }
  ];
  betaHardFacts = [
    { sourceType: "Internal", amount: "175000", factDate: todayIso(), description: "Quoted implementation cost from delivery and vendor teams", sourceLink: "internal://planning/embedded-payments-costing" }
  ];
  renderInsuranceTable("betaInsuranceBody", betaInsurance);
  renderHardFactsTable("betaHardFactsBody", betaHardFacts);
  runBetaScenario();
  activateView("beta");
}
function promoteBetaScenario() {
  const payload = getBetaPayload();
  document.getElementById("singleScenarioName").value = payload.name || "";
  setSelectValueSafe("singleProductGroup", payload.productGroup || productGroups[0] || "");
  setSelectValueSafe("singleRiskDomain", payload.riskDomain || riskDomains[0] || "");
  document.getElementById("singleScenarioOwner").value = payload.scenarioOwner || "";
  document.getElementById("singleIdentifiedDate").value = payload.identifiedDate || "";
  document.getElementById("singleScenarioDescription").value = payload.description || "";
  singleInsurance = Array.isArray(payload.insurance) ? payload.insurance.slice() : [];
  singleHardFacts = Array.isArray(payload.hardFacts) ? payload.hardFacts.slice() : [];
  renderInsuranceTable("singleInsuranceBody", singleInsurance);
  renderHardFactsTable("singleHardFactsBody", singleHardFacts);
  activateView("single");
}

function runScenario() {
  const payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  const summary = summarizePayload(payload);
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderMonteCarloTable(summary);
  renderCharts(summary);
  activateView("reports");
}
function saveScenario(event) {
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  const activeViewEl = document.querySelector(".view.active");
  const currentViewName = activeViewEl?.id?.replace(/^view-/, "") || (activeMode === "complex" ? "complex" : "single");
  if (currentViewName === "beta") {
    saveBetaScenario(event);
    return;
  }
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
  activateView(currentViewName);
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
    <td>${s.mode === "single" ? "Single" : s.mode === "complex" ? "Complex" : s.mode === "beta" ? "Beta" : "Unknown"}</td>
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
  renderHeatMap();
}
function renderDashboardOpenTable() {
  const tbody = document.getElementById("dashboardOpenScenarioBody");
  const rows = getSavedScenarios()
    .filter(x => String(x.scenarioStatus).toLowerCase() !== "closed")
    .sort((a, b) => (b.inherent - a.inherent) || String(a.identifiedDate || "").localeCompare(String(b.identifiedDate || "")));
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9">No open scenarios available.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(s => `<tr>
    <td><button class="scenario-link" data-open-id="${escapeHtml(s.id)}">${escapeHtml(s.id)}</button></td>
    <td>${s.mode === "single" ? "Single Scenario" : s.mode === "complex" ? "Complex Scenario" : s.mode === "beta" ? "Beta Scenario" : "Unknown"}</td>
    <td>${escapeHtml(s.name)}</td>
    <td>${escapeHtml(s.scenarioStatus)}</td>
    <td>${s.inherent}</td>
    <td>${escapeHtml(s.identifiedDate)}</td>
    <td>${escapeHtml(s.productGroup)}</td>
    <td>${escapeHtml(s.riskDomain)}</td>
    <td><button class="btn btn-secondary small-btn" data-report-id="${escapeHtml(s.id)}">Open Report</button></td>
  </tr>`).join("");
  tbody.querySelectorAll("[data-report-id]").forEach(btn => btn.addEventListener("click", () => openScenarioReport(btn.dataset.reportId)));
  tbody.querySelectorAll("[data-open-id]").forEach(btn => btn.addEventListener("click", () => openScenario(btn.dataset.openId)));
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
    setCurrencyFieldValue("singleHardCostMin", s.hardCostMin || 0);
    setCurrencyFieldValue("singleHardCostLikely", s.hardCostLikely || 0);
    setCurrencyFieldValue("singleHardCostMax", s.hardCostMax || 0);
    document.getElementById("singleSoftCostMin").value = s.softCostMin || 0;
    document.getElementById("singleSoftCostLikely").value = s.softCostLikely || 0;
    document.getElementById("singleSoftCostMax").value = s.softCostMax || 0;
    setCurrencyFieldValue("singleMitigationCost", s.mitigationCost || 0);
    const singleRandom = document.getElementById("singleRandomScenarioCount");
    if (singleRandom) singleRandom.value = String(s.randomScenarioCount || 1000);
    singleInsurance = Array.isArray(s.insurance) ? s.insurance.slice() : [];
    singleHardFacts = Array.isArray(s.hardFacts) ? s.hardFacts.slice() : [];
    singleMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    window.singleAcceptedRisks = Array.isArray(s.acceptedRiskEntries) && s.acceptedRiskEntries.length ? s.acceptedRiskEntries.slice() : (s.acceptedRisk ? [s.acceptedRisk] : []);
    renderInsuranceTable("singleInsuranceBody", singleInsurance);
    renderHardFactsTable("singleHardFactsBody", singleHardFacts);
    renderMitigationTable("singleMitigationBody", singleMitigations);
    renderAcceptedRiskTable("singleAcceptedRiskBody", window.singleAcceptedRisks, "single");
    document.getElementById("singleAcceptedRiskFlag").checked = !!s.acceptedRisk?.isAccepted;
    document.getElementById("singleAcceptanceAuthority").value = s.acceptedRisk?.authority || acceptanceAuthorities[0] || "";
    document.getElementById("singleAcceptedBy").value = s.acceptedRisk?.acceptedBy || "";
    document.getElementById("singleAcceptanceDate").value = s.acceptedRisk?.acceptanceDate || "";
    document.getElementById("singleReviewDate").value = s.acceptedRisk?.reviewDate || "";
    document.getElementById("singleDecisionLogic").value = s.acceptedRisk?.decisionLogic || "";
    activeMode = "single";
    updateInherentScores();
    formatAllCurrencyFields();
    activateView("single");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (s.mode === "beta") {
    document.getElementById("betaScenarioId").value = s.id || "";
    document.getElementById("betaScenarioName").value = s.name || "";
    setSelectValueSafe("betaProductGroup", s.productGroup || productGroups[0] || "");
    setSelectValueSafe("betaRiskDomain", s.riskDomain || riskDomains[0] || "");
    setSelectValueSafe("betaScenarioStatus", s.scenarioStatus || "Draft");
    document.getElementById("betaProjectOrProductName").value = s.projectOrProductName || s.primaryProduct || "";
    document.getElementById("betaScenarioOwner").value = s.scenarioOwner || "";
    document.getElementById("betaIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("betaPlannedDecisionDate").value = s.plannedDecisionDate || "";
    document.getElementById("betaPlannedGoLiveDate").value = s.plannedGoLiveDate || "";
    setCurrencyFieldValue("betaMin", s.betaMin || 0);
    setCurrencyFieldValue("betaMode", s.betaMode || 0);
    setCurrencyFieldValue("betaMax", s.betaMax || 0);
    const betaRandom = document.getElementById("betaRandomScenarioCount");
    if (betaRandom) betaRandom.value = String(s.randomScenarioCount || 1000);
    document.getElementById("betaScenarioDescription").value = s.description || "";
    betaInsurance = Array.isArray(s.insurance) ? s.insurance.slice() : [];
    betaHardFacts = Array.isArray(s.hardFacts) ? s.hardFacts.slice() : [];
    renderInsuranceTable("betaInsuranceBody", betaInsurance);
    renderHardFactsTable("betaHardFactsBody", betaHardFacts);
    setBetaOutputs({ relativeMean: s.betaRelativeMean, a: s.betaShapeA, b: s.betaShapeB, expectedValue: s.betaExpectedValue, p10: s.betaP10, p50: s.betaP50, p90: s.betaP90, iterations: s.betaIterations, narrative: s.generatedSummary });
    formatAllCurrencyFields();
    activateView("beta");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    const firstComponent = Array.isArray(s.components) && s.components.length ? s.components[0] : null;
    complexScenarioComponents = Array.isArray(s.components) ? s.components.map(component => ({ ...component })) : [];
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
    setCurrencyFieldValue("complexHardCostMin", s.hardCostMin || 0);
    setCurrencyFieldValue("complexHardCostLikely", s.hardCostLikely || 0);
    setCurrencyFieldValue("complexHardCostMax", s.hardCostMax || 0);
    document.getElementById("complexSoftCostMin").value = s.softCostMin || 0;
    document.getElementById("complexSoftCostLikely").value = s.softCostLikely || 0;
    document.getElementById("complexSoftCostMax").value = s.softCostMax || 0;
    setCurrencyFieldValue("complexMitigationCost", s.mitigationCost || 0);
    const complexRandom = document.getElementById("complexRandomScenarioCount");
    if (complexRandom) complexRandom.value = String(s.randomScenarioCount || 1000);
    currentComplexItems = (firstComponent && Array.isArray(firstComponent.items) ? firstComponent.items : Array.isArray(s.items) ? s.items : []).slice().map(item => ({
      issueId: item.issueId || `ISS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      parentScenarioMode: "complex",
      description: item.description || "",
      ...item
    }));
    renderComplexItems();
    const groupEl = document.getElementById("complexGroupId");
    if (groupEl) groupEl.value = firstComponent?.groupId || s.complexGroupId || ensureComplexGroupId();
    complexInsurance = firstComponent && Array.isArray(firstComponent.insurance) ? firstComponent.insurance.slice() : Array.isArray(s.insurance) ? s.insurance.slice() : [];
    complexHardFacts = firstComponent && Array.isArray(firstComponent.hardFacts) ? firstComponent.hardFacts.slice() : Array.isArray(s.hardFacts) ? s.hardFacts.slice() : [];
    complexMitigations = firstComponent && Array.isArray(firstComponent.mitigations) ? firstComponent.mitigations.slice() : Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    activeComplexComponentId = firstComponent?.componentId || "";
    syncComplexComponentIdField(!activeComplexComponentId);
    window.complexAcceptedRisks = Array.isArray(s.acceptedRiskEntries) && s.acceptedRiskEntries.length ? s.acceptedRiskEntries.slice() : (s.acceptedRisk ? [s.acceptedRisk] : []);
    renderInsuranceTable("complexInsuranceBody", complexInsurance);
    renderHardFactsTable("complexHardFactsBody", complexHardFacts);
    renderMitigationTable("complexMitigationBody", complexMitigations);
    renderAcceptedRiskTable("complexAcceptedRiskBody", window.complexAcceptedRisks, "complex");
    renderComplexScenarioComponents();
    formatAllCurrencyFields();
    document.getElementById("complexAcceptedRiskFlag").checked = !!s.acceptedRisk?.isAccepted;
    document.getElementById("complexAcceptanceAuthority").value = s.acceptedRisk?.authority || acceptanceAuthorities[0] || "";
    document.getElementById("complexAcceptedBy").value = s.acceptedRisk?.acceptedBy || "";
    document.getElementById("complexAcceptanceDate").value = s.acceptedRisk?.acceptanceDate || "";
    document.getElementById("complexReviewDate").value = s.acceptedRisk?.reviewDate || "";
    document.getElementById("complexDecisionLogic").value = s.acceptedRisk?.decisionLogic || "";
    activeMode = "complex";
    updateInherentScores();
    activateView("complex");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  setCurrencyFieldValue("singleHardCostMin", 40000);
  setCurrencyFieldValue("singleHardCostLikely", 135000);
  setCurrencyFieldValue("singleHardCostMax", 325000);
  document.getElementById("singleSoftCostMin").value = 0.15;
  document.getElementById("singleSoftCostLikely").value = 0.35;
  document.getElementById("singleSoftCostMax").value = 0.65;
  setCurrencyFieldValue("singleMitigationCost", 60000);
  const singleRandom = document.getElementById("singleRandomScenarioCount");
  if (singleRandom) singleRandom.value = "1000";
  document.getElementById("singleScenarioDescription").value = "The card-services team changed the consumer dispute workflow and may have shortened key timing checkpoints. The scenario evaluates disclosure and procedural risk under Reg E.";
  singleInsurance = [
    { policyName: "Card Services E&O", policyNumber: "PL-100245", carrier: "Acme Specialty", coverageType: "Errors & Omissions", premium: "18000", deductible: "25000", coverageAmount: "500000", coverageDates: "2026-01-01 to 2026-12-31", notes: "Workflow and servicing coverage", sourceLink: "internal://insurance/card-services-eo" }
  ];
  renderInsuranceTable("singleInsuranceBody", singleInsurance);
  singleHardFacts = [
    { sourceType: "Internal", amount: "42000", factDate: todayIso(), description: "Prior error-resolution remediation spend", sourceLink: "internal://evidence/reg-e-remediation" }
  ];
  renderHardFactsTable("singleHardFactsBody", singleHardFacts);
  singleMitigations = [
    { title: "Workflow validation", owner: "Operations", status: "In Progress", attachment: "workflow_review.xlsx" },
    { title: "Procedure rewrite", owner: "Compliance", status: "Planned", attachment: "reg_e_procedure.docx" }
  ];
  renderMitigationTable("singleMitigationBody", singleMitigations);
  window.singleAcceptedRisks = [];
  renderAcceptedRiskTable("singleAcceptedRiskBody", window.singleAcceptedRisks, "single");
  document.getElementById("singleAcceptedRiskFlag").checked = false;
  document.getElementById("singleAcceptanceAuthority").value = acceptanceAuthorities[0] || "";
  document.getElementById("singleAcceptedBy").value = "";
  document.getElementById("singleAcceptanceDate").value = "";
  document.getElementById("singleReviewDate").value = "";
  document.getElementById("singleDecisionLogic").value = "";
  updateInherentScores();
  formatAllCurrencyFields();
  activateView("single");
}
function loadComplexTestScenario() {
  document.getElementById("complexScenarioId").value = "";
  const complexGroupEl = document.getElementById("complexGroupId");
  if (complexGroupEl) complexGroupEl.value = generateComplexGroupId();
  complexScenarioComponents = [];
  activeComplexComponentId = "";
  syncComplexComponentIdField(true);
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
  setCurrencyFieldValue("complexHardCostMin", 125000);
  setCurrencyFieldValue("complexHardCostLikely", 475000);
  setCurrencyFieldValue("complexHardCostMax", 1200000);
  document.getElementById("complexSoftCostMin").value = 0.20;
  document.getElementById("complexSoftCostLikely").value = 0.45;
  document.getElementById("complexSoftCostMax").value = 0.90;
  setCurrencyFieldValue("complexMitigationCost", 210000);
  const complexRandom = document.getElementById("complexRandomScenarioCount");
  if (complexRandom) complexRandom.value = "1000";
  document.getElementById("complexScenarioDescription").value = "This scenario covers a cross-functional modernization effort touching deposit operations, dispute servicing, disclosures, and third-party integrations.";
  complexProductSections = [
    { sectionId: "SEC-1", productServiceArea: "Deposits", weight: 4, notes: "Primary deposit servicing and disclosures." },
    { sectionId: "SEC-2", productServiceArea: "ACH Processing", weight: 3, notes: "Payment processing and fraud exposure." },
    { sectionId: "SEC-3", productServiceArea: "Core Deposit Platform", weight: 3, notes: "Core platform and vendor dependency." }
  ];
  renderComplexProductSections();
  currentComplexItems = [
    {name:"Overdraft fee disclosure risk", domain:"Consumer Compliance Risk", product:"Deposits", regulation:"Reg DD", score:82, weight:4},
    {name:"ACH fraud exposure", domain:"External Fraud Risk", product:"ACH Processing", regulation:"NACHA", score:76, weight:3},
    {name:"Vendor outage affecting deposit processing", domain:"Third-Party & Vendor Risk", product:"Core Deposit Platform", regulation:"FFIEC IT", score:68, weight:3},
    {name:"Complaint trend from account servicing", domain:"Reputation & Brand Risk", product:"Deposits", regulation:"UDAAP", score:71, weight:2}
  ];
  renderComplexItems();
  complexInsurance = [
    { policyName: "Program Cyber / Tech E&O", policyNumber: "CX-440018", carrier: "National Mutual", coverageType: "Cyber / Technology E&O", premium: "95000", deductible: "100000", coverageAmount: "3000000", coverageDates: "2026-01-01 to 2026-12-31", notes: "Shared modernization program tower", sourceLink: "internal://insurance/modernization-program" }
  ];
  renderInsuranceTable("complexInsuranceBody", complexInsurance);
  complexHardFacts = [
    { sourceType: "External", amount: "275000", factDate: todayIso(), description: "Comparable industry modernization loss event benchmark", sourceLink: "https://example.com/industry-loss-benchmark" }
  ];
  renderHardFactsTable("complexHardFactsBody", complexHardFacts);
  complexMitigations = [
    { title: "Committee escalation", owner: "ERM", status: "Complete", attachment: "committee_packet.pdf" },
    { title: "Third-party resiliency review", owner: "Vendor Management", status: "In Progress", attachment: "vendor_resiliency.docx" }
  ];
  renderMitigationTable("complexMitigationBody", complexMitigations);
  window.complexAcceptedRisks = [{ isAccepted: true, authority: "Risk Governance Committee", acceptedBy: "Risk Governance Committee", acceptanceDate: todayIso(), reviewDate: todayIso(), decisionLogic: "The committee accepted temporary residual risk while core conversion milestones and vendor resiliency controls are completed." }];
  renderAcceptedRiskTable("complexAcceptedRiskBody", window.complexAcceptedRisks, "complex");
  document.getElementById("complexAcceptedRiskFlag").checked = true;
  document.getElementById("complexAcceptanceAuthority").value = "Risk Governance Committee";
  document.getElementById("complexAcceptedBy").value = "Risk Governance Committee";
  document.getElementById("complexAcceptanceDate").value = todayIso();
  document.getElementById("complexReviewDate").value = todayIso();
  document.getElementById("complexDecisionLogic").value = "The committee accepted temporary residual risk while core conversion milestones and vendor resiliency controls are completed.";
  updateInherentScores();
  addComplexScenarioComponent();
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
  document.getElementById("addComplexProductSectionBtn")?.addEventListener("click", addComplexProductSection);
  document.getElementById("addRiskItemBtn").addEventListener("click", addRiskItem);
  document.getElementById("addComplexScenarioBtn")?.addEventListener("click", handleAddComplexScenario);
  document.getElementById("addSingleMitigationBtn").addEventListener("click", () => addMitigation("single"));
  document.getElementById("addComplexMitigationBtn").addEventListener("click", () => addMitigation("complex"));
  document.getElementById("addSingleInsuranceBtn")?.addEventListener("click", () => addInsurance("single"));
  document.getElementById("addComplexInsuranceBtn")?.addEventListener("click", () => addInsurance("complex"));
  document.getElementById("addSingleHardFactBtn")?.addEventListener("click", () => addHardFact("single"));
  document.getElementById("addComplexHardFactBtn")?.addEventListener("click", () => addHardFact("complex"));
  document.getElementById("saveScenarioBtn").addEventListener("click", (event) => saveScenario(event));
  document.getElementById("runScenarioBtn").addEventListener("click", runScenario);
  document.getElementById("loadSingleTestBtn").addEventListener("click", loadSingleTestScenario);
  document.getElementById("loadComplexTestBtn").addEventListener("click", loadComplexTestScenario);
  document.getElementById("loadBetaTestBtn")?.addEventListener("click", loadBetaTestScenario);
  document.getElementById("runBetaScenarioBtn")?.addEventListener("click", runBetaScenario);
  document.getElementById("saveBetaScenarioBtn")?.addEventListener("click", (event) => saveBetaScenario(event));
  document.getElementById("promoteBetaScenarioBtn")?.addEventListener("click", promoteBetaScenario);
  document.getElementById("addBetaInsuranceBtn")?.addEventListener("click", () => addInsurance("beta"));
  document.getElementById("addBetaHardFactBtn")?.addEventListener("click", () => addHardFact("beta"));
  document.getElementById("addSingleAcceptedRiskBtn")?.addEventListener("click", () => addAcceptedRisk("single"));
  document.getElementById("addComplexAcceptedRiskBtn")?.addEventListener("click", () => addAcceptedRisk("complex"));

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
  const exportBtn = document.getElementById("exportScenariosBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportScenarioLibrary);
  const importFile = document.getElementById("importScenariosFile");
  if (importFile) importFile.addEventListener("change", (event) => importScenarioLibrary(event.target.files?.[0]));
  const boardBtn = document.getElementById("downloadBoardPacketBtn");
  if (boardBtn) boardBtn.addEventListener("click", downloadBoardPacketDocx);
  const aiBtn = document.getElementById("downloadAIPacketBtn");
  if (aiBtn) aiBtn.addEventListener("click", () => textDownload(`ai_packet_${(lastSummary?.id || currentDateStamp())}.txt`, buildAIPacketText(lastSummary)));
  const outcomesBtn = document.getElementById("downloadOutcomesTableBtn");
  if (outcomesBtn) outcomesBtn.addEventListener("click", handleRandomOutcomesDownload);
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
  const manual = document.getElementById("userManualCopy");
  if (!manual) return;
  manual.innerHTML = getPolishedManualHtml();
}



function daysSince(dateValue) {
  if (!dateValue) return 999999;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return 999999;
  return Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
}
function getBoardPacketScenarios() {
  return getSavedScenarios()
    .filter(s => {
      const status = String(s.scenarioStatus || "").toLowerCase();
      return status !== "closed" || daysSince(s.identifiedDate || s.lastUpdated || s.createdAt) <= 90;
    })
    .map(s => summarizePayload(s));
}
function buildOutcomesTableText(summary) {
  if (!summary) return "";
  const rows = summary.randomOutcomeRows || [];
  const header = ["Scenario Number","Hard Cost","Soft Cost","Total Cost","Residual Cost","Breakeven Met?"];
  const xmlEscape = (value) => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
  const rowXml = (cells) => "<Row>" + cells.map(cell => {
    const isNum = typeof cell === "number" || /^[0-9]+(\.[0-9]+)?$/.test(String(cell));
    const type = isNum ? "Number" : "String";
    return `<Cell><Data ss:Type="${type}">${xmlEscape(cell)}</Data></Cell>`;
  }).join("") + "</Row>";
  const allRows = [header].concat(rows.map(r => [
    r.scenarioNumber,
    r.hardCost,
    r.softCost,
    r.totalCost,
    r.residualCost,
    r.breakevenMet
  ]));
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Random Outcomes">
  <Table>
   ${allRows.map(rowXml).join("")}
  </Table>
 </Worksheet>
</Workbook>`;
}
async function downloadBoardPacketDocx() {
  const scenarios = getBoardPacketScenarios();
  if (!scenarios.length) {
    alert("No eligible scenarios are available for the board packet.");
    return;
  }
  const docxLib = window.docx;
  if (!docxLib) {
    alert("The DOCX library did not load. Please try again after the page fully loads.");
    return;
  }
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle
  } = docxLib;

  const children = [];
  const addSpacer = () => children.push(new Paragraph({ text: "" }));
  const cell = (text, widthPct=25, bold=false) => new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D9E1F2" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9E1F2" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D9E1F2" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D9E1F2" },
    },
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), bold })] })]
  });

  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Board Risk Packet", bold: true })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun(`Included scenarios: ${scenarios.length} | Scope: open scenarios plus closed scenarios from the past 90 days`)]
  }));
  addSpacer();

  scenarios.forEach((s, idx) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`${idx + 1}. ${s.name}`)] }));
    children.push(new Paragraph(`Scenario ID: ${s.id || "Not Saved"}`));
    children.push(new Paragraph(`Builder: ${s.mode === "single" ? "Single Scenario" : "Complex Scenario"}`));
    children.push(new Paragraph(`Reporting Lines: ${s.productGroup} | Risk Domain: ${s.riskDomain} | Status: ${s.scenarioStatus}`));
    children.push(new Paragraph(`Annual exposure range: ${currency(s.rangeLow)} to ${currency(s.rangeHigh)} | Most likely annual impact: ${currency(s.rangeMedian)}`));
    children.push(new Paragraph(`Expected annual loss: ${currency(s.expectedLoss)} | Residual annual loss: ${currency(s.residualExpectedLoss)} | Mitigation cost: ${currency(s.mitigationCost)} | Net benefit / ROI: ${currency(s.mitigationROI)}`));
    children.push(new Paragraph({ text: "Executive Decision Summary", heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph(s.decisionText || ""));
    children.push(new Paragraph({ text: "Scenario Description", heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph(s.description || "No description provided."));

    children.push(new Paragraph({ text: "Financial Outcome Summary", heading: HeadingLevel.HEADING_2 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("Measure", 45, true), cell("Value", 55, true)] }),
        new TableRow({ children: [cell("Expected Annual Hard Cost", 45), cell(currency(s.hardCostExpected), 55)] }),
        new TableRow({ children: [cell("Expected Annual Soft Cost", 45), cell(currency(s.softCostExpected), 55)] }),
        new TableRow({ children: [cell("Expected Annual Loss", 45), cell(currency(s.expectedLoss), 55)] }),
        new TableRow({ children: [cell("Residual Annual Loss", 45), cell(currency(s.residualExpectedLoss), 55)] }),
        new TableRow({ children: [cell("Annual Risk Reduction Value", 45), cell(currency(s.riskReductionValue), 55)] }),
        new TableRow({ children: [cell("Mitigation Cost", 45), cell(currency(s.mitigationCost), 55)] }),
        new TableRow({ children: [cell("Net Benefit / ROI", 45), cell(currency(s.mitigationROI), 55)] }),
      ]
    }));
    addSpacer();

    if (s.mode === "complex" && Array.isArray(s.items) && s.items.length) {
      children.push(new Paragraph({ text: "Complex Scenario Risk Items", heading: HeadingLevel.HEADING_2 }));
      s.items.forEach((item, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${item.name}`, heading: HeadingLevel.HEADING_3 }));
        children.push(new Paragraph(`Risk Domain: ${item.domain || ""} | Product / Service: ${item.product || ""} | Regulation: ${item.regulation || ""}`));
        children.push(new Paragraph(`Score: ${item.score || ""} | Weight: ${item.weight || ""}`));
        children.push(new Paragraph(`Explanation: ${item.description || "This line item is a weighted contributor to the broader complex scenario and should be read as one component of the overall result."}`));
      });
      addSpacer();
    }

    if (Array.isArray(s.insurance) && s.insurance.length) {
      children.push(new Paragraph({ text: "Insurance", heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph(`Insurance totals: Premium ${currency(totalCurrencyField(s.insurance, "premium"))} | Deductible ${currency(totalCurrencyField(s.insurance, "deductible"))} | Coverage ${currency(totalCurrencyField(s.insurance, "coverageAmount"))}`));
      s.insurance.forEach((ins, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${ins.policyName || "Policy"}`, heading: HeadingLevel.HEADING_3 }));
        children.push(new Paragraph(`Policy Number: ${ins.policyNumber || ""} | Carrier: ${ins.carrier || ""} | Coverage Type: ${ins.coverageType || ""}`));
        children.push(new Paragraph(`Premium: ${currency(ins.premium)} | Deductible: ${currency(ins.deductible)} | Coverage Amount: ${currency(ins.coverageAmount)} | Dates: ${ins.coverageDates || ""}`));
        children.push(new Paragraph(`Notes: ${ins.notes || ""} | Source: ${ins.sourceLink || ""}`));
      });
      addSpacer();
    }

    if (Array.isArray(s.hardFacts) && s.hardFacts.length) {
      children.push(new Paragraph({ text: "Hard Facts / Evidence", heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph(`Total documented loss / cost: ${currency(totalCurrencyField(s.hardFacts, "amount"))}`));
      s.hardFacts.forEach((fact, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${fact.description || "Hard Fact"}`, heading: HeadingLevel.HEADING_3 }));
        children.push(new Paragraph(`Source Type: ${fact.sourceType || ""} | Amount: ${currency(fact.amount)} | Date: ${fact.factDate || ""}`));
        children.push(new Paragraph(`Source: ${fact.sourceLink || ""}`));
      });
      addSpacer();
    }

    if (Array.isArray(s.mitigations) && s.mitigations.length) {
      children.push(new Paragraph({ text: "Mitigation Factors", heading: HeadingLevel.HEADING_2 }));
      s.mitigations.forEach((m, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${m.title || m.name || "Mitigation"}`, heading: HeadingLevel.HEADING_3 }));
        children.push(new Paragraph(`Owner: ${m.owner || ""} | Status: ${m.status || ""} | Attachment: ${m.attachment || ""}`));
        children.push(new Paragraph(`Explanation: ${m.description || "This mitigation factor is intended to reduce direct hard cost, secondary soft cost, or overall residual exposure."}`));
      });
      addSpacer();
    }

    children.push(new Paragraph({ text: "Time Horizon Outlook", heading: HeadingLevel.HEADING_2 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("Horizon", 20, true), cell("Without Mitigation", 27, true), cell("With Mitigation", 27, true), cell("Reduction", 26, true)] }),
        ...((s.horizonRows || []).map(r => new TableRow({
          children: [cell(r.horizonLabel, 20), cell(currency(r.withoutMitigation), 27), cell(currency(r.withMitigation), 27), cell(currency(r.riskReduction), 26)]
        })))
      ]
    }));
    addSpacer();
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `board_packet_${currentDateStamp()}.docx`;
  link.click();
}

function exportScenarioLibrary() {
  const payload = {
    exportVersion: "4.5",
    exportedAt: new Date().toISOString(),
    categories: {
      productGroups,
      products,
      regulations,
      riskDomains,
      scenarioStatuses,
      scenarioSources,
      acceptanceAuthorities
    },
    scenarios: getSavedScenarios()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `risk_manager_scenario_library_${currentDateStamp()}.json`;
  link.click();
}
function importScenarioLibrary(file) {
  if (!file) return;
  file.text().then(text => {
    const payload = JSON.parse(text);
    if (!payload || !Array.isArray(payload.scenarios)) {
      alert("Invalid scenario library JSON.");
      return;
    }
    if (payload.categories) {
      if (Array.isArray(payload.categories.productGroups)) setStoredArray(CAT_KEYS.productGroups, [...getStoredArray(CAT_KEYS.productGroups), ...payload.categories.productGroups]);
      if (Array.isArray(payload.categories.products)) setStoredArray(CAT_KEYS.products, [...getStoredArray(CAT_KEYS.products), ...payload.categories.products]);
      if (Array.isArray(payload.categories.regulations)) setStoredArray(CAT_KEYS.regulations, [...getStoredArray(CAT_KEYS.regulations), ...payload.categories.regulations]);
      if (Array.isArray(payload.categories.riskDomains)) setStoredArray(CAT_KEYS.riskDomains, [...getStoredArray(CAT_KEYS.riskDomains), ...payload.categories.riskDomains]);
      if (Array.isArray(payload.categories.scenarioStatuses)) setStoredArray(CAT_KEYS.scenarioStatuses, [...getStoredArray(CAT_KEYS.scenarioStatuses), ...payload.categories.scenarioStatuses]);
      if (Array.isArray(payload.categories.scenarioSources)) setStoredArray(CAT_KEYS.scenarioSources, [...getStoredArray(CAT_KEYS.scenarioSources), ...payload.categories.scenarioSources]);
      if (Array.isArray(payload.categories.acceptanceAuthorities)) setStoredArray(CAT_KEYS.acceptanceAuthorities, [...getStoredArray(CAT_KEYS.acceptanceAuthorities), ...payload.categories.acceptanceAuthorities]);
    }
    const existing = getSavedScenarios();
    const mergedMap = new Map(existing.map(s => [s.id, s]));
    payload.scenarios.map(normalizeScenario).forEach(s => {
      if (!s.id) s.id = generateScenarioId(Array.from(mergedMap.values()));
      mergedMap.set(s.id, s);
    });
    setSavedScenarios(Array.from(mergedMap.values()));
    refreshLibraries();
    renderSavedScenarios();
    renderDashboardOpenTable();
    renderHeatMap();
    alert("Scenario library imported.");
  }).catch(() => {
    alert("Unable to import scenario library JSON.");
  });
}
function openScenarioReport(id) {
  const s = getSavedScenarios().find(x => x.id === id);
  if (!s) return;
  const summary = summarizePayload(s);
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderMonteCarloTable(summary);
  renderCharts(summary);
  activateView("reports");
}

function triggerDownload(filename, blob) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    link.remove();
  }, 0);
}

function fileDownload(filename, content, mimeType = "text/plain") {
  triggerDownload(filename, new Blob([content], { type: mimeType }));
}

function textDownload(filename, content) {
  triggerDownload(filename, new Blob([content], { type: "text/plain" }));
}
function buildBoardPacketText(summary) {
  if (!summary) return "No scenario has been run or selected.";
  const lines = [];
  lines.push("BOARD RISK BRIEF");
  lines.push(`Scenario: ${summary.name}`);
  lines.push(`Scenario ID: ${summary.id || "Not Saved"}`);
  lines.push(`Builder: ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"}`);
  lines.push(`Reporting Lines: ${summary.productGroup}`);
  lines.push(`Risk Domain: ${summary.riskDomain}`);
  lines.push(`Primary Product: ${summary.primaryProduct}`);
  lines.push(`Primary Regulation: ${summary.primaryRegulation}`);
  lines.push("");
  lines.push("EXECUTIVE SUMMARY");
  lines.push(`Annual exposure range: ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}`);
  lines.push(`Most likely annual impact: ${currency(summary.rangeMedian)}`);
  lines.push(`Expected annual hard cost: ${currency(summary.hardCostExpected)}`);
  lines.push(`Expected annual soft cost: ${currency(summary.softCostExpected)}`);
  lines.push(`Expected annual loss: ${currency(summary.expectedLoss)}`);
  lines.push(`Residual annual loss: ${currency(summary.residualExpectedLoss)}`);
  lines.push(`Mitigation cost: ${currency(summary.mitigationCost)}`);
  lines.push(`Annual risk reduction value: ${currency(summary.riskReductionValue)}`);
  lines.push(`Net benefit / ROI: ${currency(summary.mitigationROI)}`);
  lines.push(`Decision view: ${summary.mitigationROI >= 0 ? "Cost effective to mitigate" : "Consider alternatives or partial controls"}`);
  lines.push("");
  lines.push("SCENARIO DESCRIPTION");
  lines.push(summary.description || "No description provided.");
  lines.push("");
  if (summary.mode === "complex" && Array.isArray(summary.items) && summary.items.length) {
    lines.push("COMPLEX SCENARIO RISK ITEMS");
    summary.items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   Risk Domain: ${item.domain}`);
      lines.push(`   Product / Service: ${item.product}`);
      lines.push(`   Regulation: ${item.regulation}`);
      lines.push(`   Score: ${item.score}`);
      lines.push(`   Weight: ${item.weight}`);
      lines.push(`   Explanation: ${item.description || "This line item represents an individual weighted contributor to the overall complex-scenario risk result."}`);
      lines.push("");
    });
  }
  if (Array.isArray(summary.insurance) && summary.insurance.length) {
    lines.push("INSURANCE");
    lines.push(`Insurance totals: Premium ${currency(totalCurrencyField(summary.insurance, "premium"))} | Deductible ${currency(totalCurrencyField(summary.insurance, "deductible"))} | Coverage ${currency(totalCurrencyField(summary.insurance, "coverageAmount"))}`);
    summary.insurance.forEach((ins, i) => {
      lines.push(`${i + 1}. ${ins.policyName || "Policy"}`);
      lines.push(`   Policy Number: ${ins.policyNumber || ""}`);
      lines.push(`   Carrier: ${ins.carrier || ""} | Coverage Type: ${ins.coverageType || ""}`);
      lines.push(`   Premium: ${currency(ins.premium)} | Deductible: ${currency(ins.deductible)} | Coverage Amount: ${currency(ins.coverageAmount)}`);
      lines.push(`   Dates: ${ins.coverageDates || ""} | Source: ${ins.sourceLink || ""}`);
      lines.push(`   Notes: ${ins.notes || ""}`);
      lines.push("");
    });
  }
  if (Array.isArray(summary.hardFacts) && summary.hardFacts.length) {
    lines.push("HARD FACTS / EVIDENCE");
    lines.push(`Total documented loss / cost: ${currency(totalCurrencyField(summary.hardFacts, "amount"))}`);
    summary.hardFacts.forEach((fact, i) => {
      lines.push(`${i + 1}. ${fact.description || "Hard Fact"}`);
      lines.push(`   Source Type: ${fact.sourceType || ""} | Amount: ${currency(fact.amount)} | Date: ${fact.factDate || ""}`);
      lines.push(`   Source: ${fact.sourceLink || ""}`);
      lines.push("");
    });
  }
  if (Array.isArray(summary.insurance) && summary.insurance.length) {
    lines.push("INSURANCE");
    lines.push(`Insurance totals: Premium ${currency(totalCurrencyField(summary.insurance, "premium"))} | Deductible ${currency(totalCurrencyField(summary.insurance, "deductible"))} | Coverage ${currency(totalCurrencyField(summary.insurance, "coverageAmount"))}`);
    summary.insurance.forEach((ins, i) => {
      lines.push(`${i + 1}. ${ins.policyName || "Policy"} | ${ins.carrier || ""} | ${ins.coverageType || ""}`);
      lines.push(`Policy Number: ${ins.policyNumber || ""} | Premium: ${currency(ins.premium)} | Deductible: ${currency(ins.deductible)} | Coverage Amount: ${currency(ins.coverageAmount)}`);
      lines.push(`Dates: ${ins.coverageDates || ""} | Source: ${ins.sourceLink || ""}`);
    });
    lines.push("");
  }
  if (Array.isArray(summary.hardFacts) && summary.hardFacts.length) {
    lines.push("HARD FACTS / EVIDENCE");
    lines.push(`Total documented loss / cost: ${currency(totalCurrencyField(summary.hardFacts, "amount"))}`);
    summary.hardFacts.forEach((fact, i) => {
      lines.push(`${i + 1}. ${fact.description || "Hard Fact"} | ${currency(fact.amount)} | ${fact.factDate || ""}`);
      lines.push(`Source Type: ${fact.sourceType || ""} | Source: ${fact.sourceLink || ""}`);
    });
    lines.push("");
  }
  if (Array.isArray(summary.mitigations) && summary.mitigations.length) {
    lines.push("MITIGATION FACTORS");
    summary.mitigations.forEach((m, i) => {
      lines.push(`${i + 1}. ${m.title || m.name || "Mitigation"}`);
      lines.push(`   Owner: ${m.owner || ""}`);
      lines.push(`   Status: ${m.status || ""}`);
      lines.push(`   Attachment: ${m.attachment || ""}`);
      lines.push(`   Explanation: ${m.description || "This mitigation factor is included as a control or treatment intended to reduce hard cost, soft cost, or overall residual exposure."}`);
      lines.push("");
    });
  }
  lines.push("TIME HORIZON OUTLOOK");
  (summary.horizonRows || []).forEach(row => {
    lines.push(`${row.horizonLabel}: Without mitigation ${currency(row.withoutMitigation)} | With mitigation ${currency(row.withMitigation)} | Reduction ${currency(row.riskReduction)}`);
  });
  lines.push("");
  lines.push("MONTE CARLO METHOD");
  lines.push("The model uses bounded triangular sampling for hard cost and soft-cost multipliers. It estimates annual loss ranges and applies the stated control-effectiveness percentage to calculate residual loss.");
  return lines.join("\\n");
}
function buildAIPacketText(summary) {
  if (!summary) return "No scenario has been run or selected.";
  const lines = [];
  lines.push("TITLE");
  lines.push(summary.name);
  lines.push("");
  lines.push("EXECUTIVE SUMMARY");
  lines.push(`Annual exposure range: ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}`);
  lines.push(`Most likely annual impact: ${currency(summary.rangeMedian)}`);
  lines.push(`Mitigation cost: ${currency(summary.mitigationCost)}`);
  lines.push(`Risk reduction value: ${currency(summary.riskReductionValue)}`);
  lines.push(`Decision: ${summary.mitigationROI >= 0 ? "Mitigate" : "Review alternatives"}`);
  lines.push("");
  lines.push("SCENARIO DESCRIPTION");
  lines.push(summary.description || "No description provided.");
  lines.push("");
  lines.push("FINANCIAL MODEL");
  lines.push(`Hard Cost: ${currency(summary.hardCostExpected)}`);
  lines.push(`Soft Cost: ${currency(summary.softCostExpected)}`);
  lines.push(`Expected Annual Loss: ${currency(summary.expectedLoss)}`);
  lines.push(`Residual Annual Loss: ${currency(summary.residualExpectedLoss)}`);
  lines.push(`Net Benefit / ROI: ${currency(summary.mitigationROI)}`);
  lines.push("");
  if (summary.mode === "complex" && Array.isArray(summary.items) && summary.items.length) {
    lines.push("COMPLEX RISK ITEMS");
    summary.items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name} | Domain: ${item.domain} | Score: ${item.score} | Weight: ${item.weight}`);
      lines.push(`Explanation: ${item.description || "Weighted contributor to the overall complex scenario."}`);
    });
    lines.push("");
  }
  if (Array.isArray(summary.mitigations) && summary.mitigations.length) {
    lines.push("MITIGATION FACTORS");
    summary.mitigations.forEach((m, i) => {
      lines.push(`${i + 1}. ${m.title || m.name || "Mitigation"} | Owner: ${m.owner || ""} | Status: ${m.status || ""}`);
      lines.push(`Explanation: ${m.description || "Control intended to reduce expected loss and residual exposure."}`);
    });
    lines.push("");
  }
  lines.push("TIME HORIZON OUTLOOK");
  (summary.horizonRows || []).forEach(row => {
    lines.push(`${row.horizonLabel}: ${currency(row.withoutMitigation)} without mitigation; ${currency(row.withMitigation)} with mitigation`);
  });
  lines.push("");
  lines.push("INSTRUCTION");
  lines.push("Create a board-level PowerPoint presentation with executive summary, financial analysis, complex risk item breakdown, mitigation analysis, time horizon outlook, and recommendation slides.");
  return lines.join("\\n");
}
function renderHeatMap() {
  const canvas = document.getElementById("riskHeatMap");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const margin = 48;
  const gridW = w - margin * 2;
  const gridH = h - margin * 2;
  const cellW = gridW / 5;
  const cellH = gridH / 5;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = margin + col * cellW;
      const y = margin + row * cellH;
      const score = (5 - row) + (col + 1);
      ctx.fillStyle = score >= 8 ? "#f8d7da" : score >= 6 ? "#fff3cd" : "#d1e7dd";
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = "#c8d2e3";
      ctx.strokeRect(x, y, cellW, cellH);
    }
  }
  ctx.fillStyle = "#172033";
  ctx.font = "12px Arial";
  for (let i = 1; i <= 5; i++) {
    ctx.fillText(String(i), margin + (i - 0.5) * cellW - 3, h - 16);
    ctx.fillText(String(i), 18, h - (margin + (i - 0.5) * cellH) + 4);
  }
  ctx.fillText("Likelihood", w / 2 - 24, h - 4);
  ctx.save();
  ctx.translate(10, h / 2 + 24);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Impact", 0, 0);
  ctx.restore();

  const scenarios = getSavedScenarios().filter(s => String(s.scenarioStatus || "").toLowerCase() !== "closed");
  scenarios.forEach((s, idx) => {
    const likelihood = Math.min(5, Math.max(1, Number(s.likelihood || Math.round((Number(s.inherent || 0) / 100) * 4) + 1 || 3)));
    const impact = Math.min(5, Math.max(1, Number(s.impact || Math.round((Number(s.residual || s.inherent || 0) / 100) * 4) + 1 || 3)));
    const x = margin + (likelihood - 0.5) * cellW;
    const y = h - margin - (impact - 0.5) * cellH;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#d96b1f";
    ctx.fill();
    ctx.strokeStyle = "#173a8c";
    ctx.stroke();
    if (idx < 12) {
      ctx.fillStyle = "#172033";
      ctx.fillText((s.id || "").slice(-5), x + 8, y - 6);
    }
  });
}


function highlightIssueRow(issueId) {
  const row = document.querySelector(`[data-issue-id="${issueId}"]`);
  if (!row) return;
  row.classList.remove("issue-highlight");
  void row.offsetWidth;
  row.classList.add("issue-highlight");
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function restoreAllDefaultLibraries() {
  setStoredArray(CAT_KEYS.productGroups, DEFAULT_PRODUCT_GROUPS);
  setStoredArray(CAT_KEYS.products, DEFAULT_PRODUCTS);
  setStoredArray(CAT_KEYS.regulations, DEFAULT_REGULATIONS);
  setStoredArray(CAT_KEYS.riskDomains, DEFAULT_RISK_DOMAINS);
  setStoredArray(CAT_KEYS.scenarioStatuses, DEFAULT_SCENARIO_STATUSES);
  setStoredArray(CAT_KEYS.scenarioSources, DEFAULT_SCENARIO_SOURCES);
  setStoredArray(CAT_KEYS.acceptanceAuthorities, DEFAULT_ACCEPTANCE_AUTHORITIES);
  refreshLibraries();
}
function forceManualContent() {
  const manual = document.getElementById("userManualCopy");
  if (!manual) return;
  manual.innerHTML = getPolishedManualHtml();
}


function getModeCollection(kind, mode) {
  const map = {
    insurance: { single: singleInsurance, complex: complexInsurance, beta: betaInsurance },
    hardFact: { single: singleHardFacts, complex: complexHardFacts, beta: betaHardFacts },
    mitigation: { single: singleMitigations, complex: complexMitigations },
    acceptedRisk: { single: window.singleAcceptedRisks, complex: window.complexAcceptedRisks }
  };
  return map[kind]?.[mode] || [];
}
function getRecordStateKey(kind, mode) { return `${kind}:${mode}`; }
function setEditState(kind, mode, value) { window.recordEditState[getRecordStateKey(kind, mode)] = value || null; }
function getEditState(kind, mode) { return window.recordEditState[getRecordStateKey(kind, mode)] || null; }
function nextRecordId(prefix) { return `${prefix}-${Date.now()}-${Math.floor(Math.random()*100000)}`; }
function setButtonLabel(id, label) { const el = document.getElementById(id); if (el) el.textContent = label; }
function setStatusText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function resetInsuranceForm(mode) {
  const prefix = mode;
  ["PolicyName","PolicyNumber","Carrier","CoverageType","Premium","Deductible","CoverageAmount","CoverageDates","Notes","SourceLink"].forEach(s => { const el=document.getElementById(`${prefix}Insurance${s}`); if (el) el.value=''; });
  setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}InsuranceBtn`, 'Add Insurance');
  setStatusText(`${mode}InsuranceEditStatus`, 'No insurance item selected for editing.');
  setEditState('insurance', mode, null);
  formatAllCurrencyFields();
}
function resetHardFactForm(mode) {
  const prefix = mode;
  setSelectValueSafe(`${prefix}HardFactSourceType`, 'Internal');
  ["Amount","Date","Description","SourceLink"].forEach(s => { const el=document.getElementById(`${prefix}HardFact${s}`); if (el) el.value=''; });
  setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}HardFactBtn`, 'Add Hard Fact');
  setStatusText(`${mode}HardFactEditStatus`, 'No hard fact selected for editing.');
  setEditState('hardFact', mode, null);
  formatAllCurrencyFields();
}
function resetMitigationForm(mode) {
  const prefix = mode;
  ["Title","Owner","Status","Attachment"].forEach(s => { const el=document.getElementById(`${prefix}Mit${s}`); if (el) el.value=''; });
  setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}MitigationBtn`, 'Add Mitigation');
  setStatusText(`${mode}MitigationEditStatus`, 'No mitigation selected for editing.');
  setEditState('mitigation', mode, null);
}
function resetAcceptedRiskForm(mode) {
  document.getElementById(`${mode}AcceptedRiskFlag`).checked = false;
  setSelectValueSafe(`${mode}AcceptanceAuthority`, acceptanceAuthorities[0] || '');
  ["AcceptedBy","AcceptanceDate","ReviewDate","DecisionLogic"].forEach(s => { const el=document.getElementById(`${mode}${s}`); if (el) el.value=''; });
  setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}AcceptedRiskBtn`, 'Add Accepted Risk');
  setStatusText(`${mode}AcceptedRiskEditStatus`, 'No accepted-risk item selected for editing.');
  setEditState('acceptedRisk', mode, null);
}
function renderActionButtons(kind, mode, id) {
  return `<button type="button" class="btn btn-secondary small-btn" data-edit-kind="${kind}" data-edit-mode="${mode}" data-edit-id="${id}">Edit</button> <button type="button" class="btn btn-danger small-btn" data-delete-kind="${kind}" data-delete-mode="${mode}" data-delete-id="${id}">Delete</button>`;
}
function renderInsuranceTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  const mode = targetId.replace('InsuranceBody','');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="11">No insurance entries added yet.</td></tr>'; return; }
  tbody.innerHTML = items.map(x => `<tr><td>${escapeHtml(x.policyName)}</td><td>${escapeHtml(x.policyNumber)}</td><td>${escapeHtml(x.carrier)}</td><td>${escapeHtml(x.coverageType)}</td><td>${currency(x.premium)}</td><td>${currency(x.deductible)}</td><td>${currency(x.coverageAmount)}</td><td>${escapeHtml(x.coverageDates)}</td><td>${escapeHtml(x.notes)}</td><td>${escapeHtml(x.sourceLink)}</td><td>${renderActionButtons('insurance', mode, escapeHtml(x.insuranceId || ''))}</td></tr>`).join('');
}
function renderHardFactsTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  const mode = targetId.replace('HardFactsBody','');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="6">No hard facts / evidence entries added yet.</td></tr>'; return; }
  tbody.innerHTML = items.map(x => `<tr><td>${escapeHtml(x.sourceType)}</td><td>${currency(x.amount)}</td><td>${escapeHtml(x.factDate)}</td><td>${escapeHtml(x.description)}</td><td>${escapeHtml(x.sourceLink)}</td><td>${renderActionButtons('hardFact', mode, escapeHtml(x.hardFactId || ''))}</td></tr>`).join('');
}
function renderMitigationTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  const mode = targetId.replace('MitigationBody','');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="5">No mitigation factors added yet.</td></tr>'; return; }
  tbody.innerHTML = items.map(x => `<tr><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.owner)}</td><td>${escapeHtml(x.status)}</td><td>${escapeHtml(x.attachment)}</td><td>${renderActionButtons('mitigation', mode, escapeHtml(x.mitigationId || ''))}</td></tr>`).join('');
}
function renderAcceptedRiskTable(targetId, items, mode) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="7">No accepted-risk records added yet.</td></tr>'; return; }
  tbody.innerHTML = items.map(x => `<tr><td>${x.isAccepted ? 'Yes' : 'No'}</td><td>${escapeHtml(x.authority)}</td><td>${escapeHtml(x.acceptedBy)}</td><td>${escapeHtml(x.acceptanceDate)}</td><td>${escapeHtml(x.reviewDate)}</td><td>${escapeHtml(x.decisionLogic)}</td><td>${renderActionButtons('acceptedRisk', mode, escapeHtml(x.acceptedRiskId || ''))}</td></tr>`).join('');
}
function addInsurance(mode) {
  const list = getModeCollection('insurance', mode);
  const editId = getEditState('insurance', mode);
  const record = {
    insuranceId: editId || nextRecordId('INS'),
    policyName: document.getElementById(`${mode}InsurancePolicyName`).value || 'Untitled Policy',
    policyNumber: document.getElementById(`${mode}InsurancePolicyNumber`)?.value || '',
    carrier: document.getElementById(`${mode}InsuranceCarrier`).value || '',
    coverageType: document.getElementById(`${mode}InsuranceCoverageType`).value || '',
    premium: parseCurrencyValue(document.getElementById(`${mode}InsurancePremium`).value || 0),
    deductible: parseCurrencyValue(document.getElementById(`${mode}InsuranceDeductible`).value || 0),
    coverageAmount: parseCurrencyValue(document.getElementById(`${mode}InsuranceCoverageAmount`).value || 0),
    coverageDates: document.getElementById(`${mode}InsuranceCoverageDates`).value || '',
    notes: document.getElementById(`${mode}InsuranceNotes`).value || '',
    sourceLink: document.getElementById(`${mode}InsuranceSourceLink`).value || ''
  };
  const idx = list.findIndex(x => x.insuranceId === record.insuranceId);
  if (idx >= 0) list[idx] = record; else list.push(record);
  renderInsuranceTable(`${mode}InsuranceBody`, list);
  resetInsuranceForm(mode);
}
function addHardFact(mode) {
  const list = getModeCollection('hardFact', mode);
  const editId = getEditState('hardFact', mode);
  const record = {
    hardFactId: editId || nextRecordId('HF'),
    sourceType: document.getElementById(`${mode}HardFactSourceType`).value || 'Internal',
    amount: parseCurrencyValue(document.getElementById(`${mode}HardFactAmount`).value || 0),
    factDate: document.getElementById(`${mode}HardFactDate`).value || '',
    description: document.getElementById(`${mode}HardFactDescription`).value || '',
    sourceLink: document.getElementById(`${mode}HardFactSourceLink`).value || ''
  };
  const idx = list.findIndex(x => x.hardFactId === record.hardFactId);
  if (idx >= 0) list[idx] = record; else list.push(record);
  renderHardFactsTable(`${mode}HardFactsBody`, list);
  resetHardFactForm(mode);
}
function addMitigation(mode) {
  const list = getModeCollection('mitigation', mode);
  const editId = getEditState('mitigation', mode);
  const record = {
    mitigationId: editId || nextRecordId('MIT'),
    title: document.getElementById(`${mode}MitTitle`).value || 'Untitled Mitigation',
    owner: document.getElementById(`${mode}MitOwner`).value || '',
    status: document.getElementById(`${mode}MitStatus`).value || '',
    attachment: document.getElementById(`${mode}MitAttachment`).value || ''
  };
  const idx = list.findIndex(x => x.mitigationId === record.mitigationId);
  if (idx >= 0) list[idx] = record; else list.push(record);
  renderMitigationTable(`${mode}MitigationBody`, list);
  resetMitigationForm(mode);
}
function getAcceptedRisk(prefix) {
  return {
    acceptedRiskId: getEditState('acceptedRisk', prefix) || nextRecordId('AR'),
    isAccepted: document.getElementById(`${prefix}AcceptedRiskFlag`).checked,
    authority: document.getElementById(`${prefix}AcceptanceAuthority`).value,
    acceptedBy: document.getElementById(`${prefix}AcceptedBy`).value,
    acceptanceDate: document.getElementById(`${prefix}AcceptanceDate`).value,
    reviewDate: document.getElementById(`${prefix}ReviewDate`).value,
    decisionLogic: document.getElementById(`${prefix}DecisionLogic`).value
  };
}
function addAcceptedRisk(mode) {
  const list = getModeCollection('acceptedRisk', mode);
  const record = getAcceptedRisk(mode);
  const idx = list.findIndex(x => x.acceptedRiskId === record.acceptedRiskId);
  if (idx >= 0) list[idx] = record; else list.push(record);
  renderAcceptedRiskTable(`${mode}AcceptedRiskBody`, list, mode);
  resetAcceptedRiskForm(mode);
}
function editRecord(kind, mode, id) {
  const list = getModeCollection(kind, mode);
  const keyMap = { insurance: 'insuranceId', hardFact: 'hardFactId', mitigation: 'mitigationId', acceptedRisk: 'acceptedRiskId' };
  const item = list.find(x => String(x[keyMap[kind]]) === String(id));
  if (!item) return;
  setEditState(kind, mode, id);
  if (kind === 'insurance') {
    document.getElementById(`${mode}InsurancePolicyName`).value = item.policyName || '';
    document.getElementById(`${mode}InsurancePolicyNumber`).value = item.policyNumber || '';
    document.getElementById(`${mode}InsuranceCarrier`).value = item.carrier || '';
    document.getElementById(`${mode}InsuranceCoverageType`).value = item.coverageType || '';
    setCurrencyFieldValue(`${mode}InsurancePremium`, item.premium || 0);
    setCurrencyFieldValue(`${mode}InsuranceDeductible`, item.deductible || 0);
    setCurrencyFieldValue(`${mode}InsuranceCoverageAmount`, item.coverageAmount || 0);
    document.getElementById(`${mode}InsuranceCoverageDates`).value = item.coverageDates || '';
    document.getElementById(`${mode}InsuranceNotes`).value = item.notes || '';
    document.getElementById(`${mode}InsuranceSourceLink`).value = item.sourceLink || '';
    setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}InsuranceBtn`, 'Update Insurance');
    setStatusText(`${mode}InsuranceEditStatus`, `Editing insurance: ${item.policyName || 'Untitled Policy'}`);
    formatAllCurrencyFields();
  } else if (kind === 'hardFact') {
    setSelectValueSafe(`${mode}HardFactSourceType`, item.sourceType || 'Internal');
    setCurrencyFieldValue(`${mode}HardFactAmount`, item.amount || 0);
    document.getElementById(`${mode}HardFactDate`).value = item.factDate || '';
    document.getElementById(`${mode}HardFactDescription`).value = item.description || '';
    document.getElementById(`${mode}HardFactSourceLink`).value = item.sourceLink || '';
    setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}HardFactBtn`, 'Update Hard Fact');
    setStatusText(`${mode}HardFactEditStatus`, `Editing hard fact dated ${item.factDate || 'undated'}`);
    formatAllCurrencyFields();
  } else if (kind === 'mitigation') {
    document.getElementById(`${mode}MitTitle`).value = item.title || '';
    document.getElementById(`${mode}MitOwner`).value = item.owner || '';
    document.getElementById(`${mode}MitStatus`).value = item.status || '';
    document.getElementById(`${mode}MitAttachment`).value = item.attachment || '';
    setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}MitigationBtn`, 'Update Mitigation');
    setStatusText(`${mode}MitigationEditStatus`, `Editing mitigation: ${item.title || 'Untitled Mitigation'}`);
  } else if (kind === 'acceptedRisk') {
    document.getElementById(`${mode}AcceptedRiskFlag`).checked = !!item.isAccepted;
    setSelectValueSafe(`${mode}AcceptanceAuthority`, item.authority || acceptanceAuthorities[0] || '');
    document.getElementById(`${mode}AcceptedBy`).value = item.acceptedBy || '';
    document.getElementById(`${mode}AcceptanceDate`).value = item.acceptanceDate || '';
    document.getElementById(`${mode}ReviewDate`).value = item.reviewDate || '';
    document.getElementById(`${mode}DecisionLogic`).value = item.decisionLogic || '';
    setButtonLabel(`add${mode[0].toUpperCase()+mode.slice(1)}AcceptedRiskBtn`, 'Update Accepted Risk');
    setStatusText(`${mode}AcceptedRiskEditStatus`, `Editing accepted-risk record for ${item.acceptedBy || item.authority || 'governance record'}`);
  }
}
function deleteRecord(kind, mode, id) {
  const list = getModeCollection(kind, mode);
  const keyMap = { insurance: 'insuranceId', hardFact: 'hardFactId', mitigation: 'mitigationId', acceptedRisk: 'acceptedRiskId' };
  const next = list.filter(x => String(x[keyMap[kind]]) !== String(id));
  if (kind === 'insurance') { if (mode === 'single') singleInsurance = next; else if (mode === 'complex') complexInsurance = next; else betaInsurance = next; renderInsuranceTable(`${mode}InsuranceBody`, next); resetInsuranceForm(mode); }
  if (kind === 'hardFact') { if (mode === 'single') singleHardFacts = next; else if (mode === 'complex') complexHardFacts = next; else betaHardFacts = next; renderHardFactsTable(`${mode}HardFactsBody`, next); resetHardFactForm(mode); }
  if (kind === 'mitigation') { if (mode === 'single') singleMitigations = next; else complexMitigations = next; renderMitigationTable(`${mode}MitigationBody`, next); resetMitigationForm(mode); }
  if (kind === 'acceptedRisk') { if (mode === 'single') window.singleAcceptedRisks = next; else window.complexAcceptedRisks = next; renderAcceptedRiskTable(`${mode}AcceptedRiskBody`, next, mode); resetAcceptedRiskForm(mode); }
}
function wireRecordMaintenanceEnhancements() {
  [['single','Insurance'],['complex','Insurance'],['beta','Insurance'],['single','HardFact'],['complex','HardFact'],['beta','HardFact'],['single','Mitigation'],['complex','Mitigation'],['single','AcceptedRisk'],['complex','AcceptedRisk']].forEach(([mode,kind]) => {
    const btn = document.getElementById(`cancel${mode[0].toUpperCase()+mode.slice(1)}${kind}EditBtn`);
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = 'true';
      btn.addEventListener('click', () => {
        if (kind === 'Insurance') resetInsuranceForm(mode);
        if (kind === 'HardFact') resetHardFactForm(mode);
        if (kind === 'Mitigation') resetMitigationForm(mode);
        if (kind === 'AcceptedRisk') resetAcceptedRiskForm(mode);
      });
    }
  });
  if (!document.body.dataset.recordActionsWired) {
    document.body.dataset.recordActionsWired = 'true';
    document.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-edit-kind][data-edit-mode][data-edit-id]');
      if (editBtn) { event.preventDefault(); editRecord(editBtn.dataset.editKind, editBtn.dataset.editMode, editBtn.dataset.editId); return; }
      const deleteBtn = event.target.closest('[data-delete-kind][data-delete-mode][data-delete-id]');
      if (deleteBtn) { event.preventDefault(); deleteRecord(deleteBtn.dataset.deleteKind, deleteBtn.dataset.deleteMode, deleteBtn.dataset.deleteId); return; }
    });
  }
}

function init() {
  loadStoredMonteCarloConfig();
  wireInputs();
  wireCurrencyFields();
  renderManual();
  forceManualContent();
  renderInsuranceTable("singleInsuranceBody", singleInsurance);
  renderInsuranceTable("complexInsuranceBody", complexInsurance);
  renderInsuranceTable("betaInsuranceBody", betaInsurance);
  renderHardFactsTable("singleHardFactsBody", singleHardFacts);
  renderHardFactsTable("complexHardFactsBody", complexHardFacts);
  renderHardFactsTable("betaHardFactsBody", betaHardFacts);
  renderMitigationTable("singleMitigationBody", singleMitigations);
  renderMitigationTable("complexMitigationBody", complexMitigations);
  renderAcceptedRiskTable("singleAcceptedRiskBody", window.singleAcceptedRisks, "single");
  renderAcceptedRiskTable("complexAcceptedRiskBody", window.complexAcceptedRisks, "complex");
  renderComplexProductSections();
  renderComplexItems();
  refreshLibraries();
  updateInherentScores();
  renderHeatMap();
  const restoreBtn = document.getElementById("restoreDefaultLibrariesBtn");
  if (restoreBtn) restoreBtn.addEventListener("click", restoreAllDefaultLibraries);
  setupRandomOutcomesCsvButton();
  wireStabilityHandlers();
  wireDelegatedActionHandlers();
  wireRecordMaintenanceEnhancements();
  syncComplexComponentIdField(true);
}
document.addEventListener("DOMContentLoaded", init);



function getRandomOutcomesExportSummary() {
  if (!lastSummary) return null;
  const exportSummary = (!Array.isArray(lastSummary.randomOutcomeRows) || !lastSummary.randomOutcomeRows.length)
    ? summarizePayload(lastSummary)
    : lastSummary;
  if (!Array.isArray(exportSummary.randomOutcomeRows) || !exportSummary.randomOutcomeRows.length) return null;
  return exportSummary;
}

function handleRandomOutcomesDownload(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const exportSummary = getRandomOutcomesExportSummary();
  if (!lastSummary) {
    alert("Run or open a scenario first.");
    return;
  }
  if (!exportSummary) {
    alert("No randomized outcome rows were generated. Run the scenario again and try once more.");
    return;
  }
  const csv = buildRandomOutcomesCsv(exportSummary);
  fileDownload(`random_outcomes_${(exportSummary?.id || currentDateStamp())}.csv`, csv, "text/csv;charset=utf-8");
}

function handleAddComplexScenario(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  addComplexScenarioComponent();
}

function wireStabilityHandlers() {
  const addBtn = document.getElementById("addComplexScenarioBtn");
  if (addBtn) {
    addBtn.type = "button";
    addBtn.textContent = "Add Scenario";
    addBtn.onclick = handleAddComplexScenario;
  }
  const outcomesBtn = document.getElementById("downloadOutcomesTableBtn");
  if (outcomesBtn) {
    outcomesBtn.type = "button";
    outcomesBtn.textContent = "Download Random Outcomes CSV";
    outcomesBtn.onclick = handleRandomOutcomesDownload;
  }
}


function wireDelegatedActionHandlers() {
  document.addEventListener("click", (event) => {
    const deleteProductSectionBtn = event.target.closest('[data-delete-product-section]');
    if (deleteProductSectionBtn) {
      deleteComplexProductSection(deleteProductSectionBtn.dataset.deleteProductSection);
      return;
    }
    const addScenarioBtn = event.target.closest("#addComplexScenarioBtn");
    if (addScenarioBtn) {
      handleAddComplexScenario(event);
      return;
    }
    const outcomesBtn = event.target.closest("#downloadOutcomesTableBtn");
    if (outcomesBtn) {
      handleRandomOutcomesDownload(event);
      return;
    }
    const savedOpenBtn = event.target.closest('[data-action="open"][data-id]');
    if (savedOpenBtn) {
      event.preventDefault();
      event.stopPropagation();
      openScenario(savedOpenBtn.dataset.id || "");
      return;
    }
    const dashboardOpenBtn = event.target.closest('[data-open-id]');
    if (dashboardOpenBtn) {
      event.preventDefault();
      event.stopPropagation();
      openScenario(dashboardOpenBtn.dataset.openId || "");
    }
  }, true);
}

function buildRandomOutcomesWorkbookXml(summary) {
  if (!summary) return "";
  const rows = Array.isArray(summary.randomOutcomeRows) ? summary.randomOutcomeRows : [];
  const header = ["Scenario Number","Hard Cost","Soft Cost","Total Cost","Residual Cost","Breakeven Met?"];

  const xmlEscape = (value) => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&apos;");

  const rowXml = (cells) => "<Row>" + cells.map(cell => {
    const asString = String(cell ?? "");
    const isNum = /^-?\d+(\.\d+)?$/.test(asString);
    const type = isNum ? "Number" : "String";
    return `<Cell><Data ss:Type="${type}">${xmlEscape(asString)}</Data></Cell>`;
  }).join("") + "</Row>";

  const allRows = [header].concat(rows.map(r => [
    r.scenarioNumber,
    r.hardCost,
    r.softCost,
    r.totalCost,
    r.residualCost,
    r.breakevenMet
  ]));

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Random Outcomes">
  <Table>
   ${allRows.map(rowXml).join("")}
  </Table>
 </Worksheet>
</Workbook>`;
}

function setupRandomOutcomesXlsButton() {
  const oldBtn = document.getElementById("downloadOutcomesTableBtn");
  if (!oldBtn) return;
  oldBtn.textContent = "Download Random Outcomes XLS";

  // Replace the node to remove any previously-bound TXT click handlers.
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);

  newBtn.addEventListener("click", () => {
    if (!lastSummary) {
      alert("Run or open a scenario first.");
      return;
    }
    const xml = buildRandomOutcomesWorkbookXml(lastSummary);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `random_outcomes_${(lastSummary?.id || currentDateStamp())}.xls`;
    link.click();
  });
}




function buildRandomOutcomesCsv(summary) {
  if (!summary) return "";
  const rows = Array.isArray(summary.randomOutcomeRows) ? summary.randomOutcomeRows : [];
  const escapeCsv = (value) => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const header = ["Scenario Number","Hard Cost","Soft Cost","Total Cost","Residual Cost","Breakeven Met?"];
  const body = rows.map(r => [
    r.scenarioNumber,
    r.hardCost,
    r.softCost,
    r.totalCost,
    r.residualCost,
    r.breakevenMet
  ]);
  return [header].concat(body).map(row => row.map(escapeCsv).join(",")).join("\n");
}

function setupRandomOutcomesCsvButton() {
  const btn = document.getElementById("downloadOutcomesTableBtn");
  if (!btn) return;
  btn.type = "button";
  btn.textContent = "Download Random Outcomes CSV";
  btn.onclick = handleRandomOutcomesDownload;
}







/* =========================
   PHASE 20.1.07 ADDITIONS
   Decision + Insurance Engine
========================= */

function evaluateInsuranceEffectiveness(simResults, insuranceList) {
  if (!insuranceList || insuranceList.length === 0) return [];

  return insuranceList.map(ins => {
    const premium = Number(ins.premium || 0);
    const deductible = Number(ins.deductible || 0);

    const avgLoss = simResults.meanLoss || 0;
    const adjustedLoss = Math.max(avgLoss - (avgLoss - deductible), deductible);

    const riskReduction = avgLoss - adjustedLoss;
    const totalCost = premium + deductible;

    let rating = "No Material Impact";

    if (riskReduction > totalCost * 1.25) rating = "Effective Risk Transfer";
    else if (riskReduction > totalCost * 0.75) rating = "Marginal Value";
    else if (riskReduction > 0) rating = "Limited Benefit";
    else rating = "Inefficient / Overpriced";

    return {
      title: ins.title || "Insurance",
      premium,
      deductible,
      riskReduction,
      totalCost,
      rating
    };
  });
}

function generateDecisionRecommendation(simResults, insuranceEval, scenario) {
  const mean = simResults.meanLoss || 0;
  const p95 = simResults.p95 || 0;
  const frequency = scenario.frequency || "Unknown";

  let recommendation = "";

  if (mean < 10000) {
    recommendation += "The scenario reflects a relatively low financial exposure. ";
  } else if (mean < 100000) {
    recommendation += "The scenario presents moderate financial risk requiring oversight. ";
  } else {
    recommendation += "The scenario reflects material financial exposure that warrants executive attention. ";
  }

  recommendation += `Estimated occurrence frequency: ${frequency}. `;
  recommendation += `Severe-case exposure (P95) is approximately ${p95.toLocaleString()}. `;

  if (insuranceEval.length > 0) {
    const best = [...insuranceEval].sort((a,b) => b.riskReduction - a.riskReduction)[0];

    if (best.rating === "Effective Risk Transfer") {
      recommendation += "Insurance contributes meaningful financial protection and supports the overall mitigation posture. ";
    } else if (best.rating === "Marginal Value") {
      recommendation += "Insurance provides partial value but should be reviewed for efficiency against retained exposure. ";
    } else if (best.rating === "Limited Benefit") {
      recommendation += "Insurance provides limited financial relief relative to retained loss exposure. ";
    } else {
      recommendation += "Insurance is not currently producing strong economic value relative to its cost structure. ";
    }
  } else {
    recommendation += "No insurance mitigation is currently applied. ";
  }

  recommendation += "Management should balance mitigation investment against quantified exposure and risk tolerance.";

  return recommendation;
}

function renderInsuranceEvaluationTable(evalList) {
  if (!evalList || evalList.length === 0) return "<p>No insurance evaluated.</p>";

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Policy</th>
          <th>Premium</th>
          <th>Deductible</th>
          <th>Risk Reduction</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        ${evalList.map(e => `
          <tr>
            <td>${e.title}</td>
            <td>${e.premium}</td>
            <td>${e.deductible}</td>
            <td>${Math.round(e.riskReduction)}</td>
            <td>${e.rating}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* Hook helper (safe call pattern) */
function applyDecisionEngine(simResults, scenario) {
  const insuranceEval = evaluateInsuranceEffectiveness(simResults, scenario.insurance || []);
  const recommendation = generateDecisionRecommendation(simResults, insuranceEval, scenario);

  scenario.insuranceEvaluation = insuranceEval;
  scenario.decisionRecommendation = recommendation;

  return scenario;
}



/* =========================
   PHASE 20.1.08 ADDITIONS
   Evidence + Distribution Modeling
========================= */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function quantileInterpolated(sortedValues, p) {
  if (!Array.isArray(sortedValues) || !sortedValues.length) return 0;
  const clamped = Math.max(0, Math.min(1, Number(p || 0)));
  const index = (sortedValues.length - 1) * clamped;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function summarizeEvidence(hardFacts) {
  const facts = Array.isArray(hardFacts) ? hardFacts : [];
  const amounts = facts
    .map(item => Math.max(0, safeNumber(item.amount || 0, 0)))
    .filter(v => v > 0)
    .sort((a, b) => a - b);

  const total = amounts.reduce((acc, value) => acc + value, 0);
  const count = amounts.length;
  const mean = count ? total / count : 0;
  const median = count ? quantileInterpolated(amounts, 0.50) : 0;
  const p75 = count ? quantileInterpolated(amounts, 0.75) : 0;
  const p90 = count ? quantileInterpolated(amounts, 0.90) : 0;
  const max = count ? amounts[amounts.length - 1] : 0;

  return {
    count,
    total,
    mean,
    median,
    p75,
    p90,
    max,
    amounts
  };
}

function buildEvidenceAnchoredCostBounds(payload, evidenceSummary) {
  const hardMinBase = Math.max(0, safeNumber(payload.hardCostMin || 0, 0));
  const hardLikelyBase = Math.max(hardMinBase, safeNumber(payload.hardCostLikely || hardMinBase, hardMinBase));
  const hardMaxBase = Math.max(hardLikelyBase, safeNumber(payload.hardCostMax || hardLikelyBase, hardLikelyBase));

  if (!evidenceSummary || !evidenceSummary.count) {
    return {
      hardMin: hardMinBase,
      hardLikely: hardLikelyBase,
      hardMax: hardMaxBase,
      evidenceWeight: 0,
      evidenceNarrative: "No hard-fact evidence loaded; simulation is based on stated management assumptions."
    };
  }

  const evidenceWeight = Math.min(0.60, 0.20 + (evidenceSummary.count * 0.10));
  const anchoredMin = Math.max(hardMinBase, evidenceSummary.median * 0.70);
  const anchoredLikely = Math.max(hardLikelyBase, evidenceSummary.median);
  const anchoredMax = Math.max(hardMaxBase, evidenceSummary.p90 || evidenceSummary.max || anchoredLikely);

  const hardMin = Math.round((hardMinBase * (1 - evidenceWeight)) + (anchoredMin * evidenceWeight));
  const hardLikely = Math.round((hardLikelyBase * (1 - evidenceWeight)) + (anchoredLikely * evidenceWeight));
  const hardMax = Math.round((hardMaxBase * (1 - evidenceWeight)) + (anchoredMax * evidenceWeight));

  return {
    hardMin: Math.max(0, hardMin),
    hardLikely: Math.max(Math.max(0, hardMin), hardLikely),
    hardMax: Math.max(Math.max(0, hardLikely), hardMax),
    evidenceWeight,
    evidenceNarrative: `${evidenceSummary.count} hard-fact item(s) were used to anchor severity assumptions. Evidence median ${currency(Math.round(evidenceSummary.median))}, evidence upper band ${currency(Math.round(evidenceSummary.p90 || evidenceSummary.max || 0))}.`
  };
}

function runFinancialMonteCarlo(payload) {
  const allowedIterations = [100, 500, 1000, 10000, 100000];
  const requestedIterations = Number(payload.randomScenarioCount || 1000);
  const iterations = allowedIterations.includes(requestedIterations) ? requestedIterations : 1000;

  const evidenceSummary = summarizeEvidence(payload.hardFacts || []);
  const anchored = buildEvidenceAnchoredCostBounds(payload, evidenceSummary);

  const softMin = Math.max(0, safeNumber(payload.softCostMin || 0, 0));
  const softLikely = Math.max(softMin, safeNumber(payload.softCostLikely || softMin, softMin));
  const softMax = Math.max(softLikely, safeNumber(payload.softCostMax || softLikely, softLikely));

  const effectiveness = clampNumber(payload.control || 0, 0, 100, 0) / 100;
  const mitigationCost = Math.max(0, safeNumber(payload.mitigationCost || 0, 0));

  const totalSamples = [];
  const residualSamples = [];
  const hardSamples = [];
  const softSamples = [];
  const randomOutcomeRows = [];

  for (let i = 0; i < iterations; i++) {
    const hard = boundedBetaSample(anchored.hardMin, anchored.hardLikely, anchored.hardMax);
    const softMultiplier = boundedBetaSample(softMin, softLikely, softMax);
    const soft = hard * softMultiplier;
    const total = hard + soft;
    const residual = total * (1 - effectiveness);

    hardSamples.push(hard);
    softSamples.push(soft);
    totalSamples.push(total);
    residualSamples.push(residual);

    randomOutcomeRows.push({
      scenarioNumber: i + 1,
      hardCost: Math.round(hard),
      softCost: Math.round(soft),
      totalCost: Math.round(total),
      residualCost: Math.round(residual),
      breakevenMet: residual <= mitigationCost ? "Yes" : "No"
    });
  }

  totalSamples.sort((a, b) => a - b);
  residualSamples.sort((a, b) => a - b);
  hardSamples.sort((a, b) => a - b);
  softSamples.sort((a, b) => a - b);

  const avg = arr => arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);

  const expectedLoss = Math.round(avg(totalSamples));
  const residualExpectedLoss = Math.round(avg(residualSamples));
  const hardCostExpected = Math.round(avg(hardSamples));
  const softCostExpected = Math.round(avg(softSamples));
  const riskReductionValue = Math.max(0, expectedLoss - residualExpectedLoss);
  const mitigationROI = riskReductionValue - mitigationCost;

  const confidenceLow = Math.round(quantileInterpolated(totalSamples, 0.05));
  const confidenceHigh = Math.round(quantileInterpolated(totalSamples, 0.95));
  const residualConfidenceLow = Math.round(quantileInterpolated(residualSamples, 0.05));
  const residualConfidenceHigh = Math.round(quantileInterpolated(residualSamples, 0.95));

  const horizons = [1, 3, 5, 10, 15, 20, 25, 30];
  const horizonRows = horizons.map(years => {
    const withoutMitigation = expectedLoss * years;
    const withMitigation = residualExpectedLoss * years + mitigationCost;
    return {
      horizonLabel: years === 30 ? "30+ Years" : `${years} Year${years > 1 ? "s" : ""}`,
      years,
      withoutMitigation: Math.round(withoutMitigation),
      withMitigation: Math.round(withMitigation),
      riskReduction: Math.round(withoutMitigation - withMitigation)
    };
  });

  return {
    iterations,
    hardCostExpected,
    softCostExpected,
    expectedLoss,
    residualExpectedLoss,
    riskReductionValue,
    mitigationCost,
    mitigationROI,
    rangeLow: Math.round(quantileInterpolated(totalSamples, 0.10)),
    rangeMedian: Math.round(quantileInterpolated(totalSamples, 0.50)),
    rangeHigh: Math.round(quantileInterpolated(totalSamples, 0.90)),
    confidenceLow,
    confidenceHigh,
    residualConfidenceLow,
    residualConfidenceHigh,
    uncertaintySpread: Math.max(0, confidenceHigh - confidenceLow),
    evidenceSummary,
    evidenceWeight: anchored.evidenceWeight,
    evidenceAnchoredHardMin: anchored.hardMin,
    evidenceAnchoredHardLikely: anchored.hardLikely,
    evidenceAnchoredHardMax: anchored.hardMax,
    evidenceNarrative: anchored.evidenceNarrative,
    horizonRows,
    randomOutcomeRows
  };
}

function summarizePayload(payload) {
  const total = payload.inherent;
  const itemCount = payload.mode === "complex" ? Math.max((payload.items || []).length, 1) : 1;
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const mc = runFinancialMonteCarlo(payload);
  const insuranceEvaluation = evaluateInsuranceEffectiveness({
    meanLoss: mc.expectedLoss,
    p95: mc.confidenceHigh
  }, payload.insurance || []);
  const decisionRecommendation = generateDecisionRecommendation({
    meanLoss: mc.expectedLoss,
    p95: mc.confidenceHigh
  }, insuranceEvaluation, { ...payload, frequency });

  const monteCarloMethodRows = [
    ["Method", "Bounded beta / PERT-style Monte Carlo with evidence anchoring"],
    ["Iterations", mc.iterations],
    ["Randomization Basis", "Bounded beta draws for hard cost and soft-cost multipliers"],
    ["Evidence Anchoring", mc.evidenceSummary.count ? `Yes (${mc.evidenceSummary.count} hard-fact items)` : "No"],
    ["Control Effectiveness Applied", `${payload.control}% reduction to expected simulated cost`],
    ["Output Range Basis", "P10 / P50 / P90 plus 90% confidence band of annual total cost"],
    ["Model Purpose", "Estimate annual loss, uncertainty, insurance value, and mitigation economics"]
  ];
  const monteCarloInputRows = [
    ["Hard Cost Min (User)", currency(payload.hardCostMin)],
    ["Hard Cost Most Likely (User)", currency(payload.hardCostLikely)],
    ["Hard Cost Max (User)", currency(payload.hardCostMax)],
    ["Hard Cost Min (Evidence Anchored)", currency(mc.evidenceAnchoredHardMin)],
    ["Hard Cost Most Likely (Evidence Anchored)", currency(mc.evidenceAnchoredHardLikely)],
    ["Hard Cost Max (Evidence Anchored)", currency(mc.evidenceAnchoredHardMax)],
    ["Soft Cost Multiplier Min", payload.softCostMin],
    ["Soft Cost Multiplier Most Likely", payload.softCostLikely],
    ["Soft Cost Multiplier Max", payload.softCostMax],
    ["Mitigation Cost", currency(payload.mitigationCost)],
    ["Control Effectiveness", `${payload.control}%`]
  ];
  const monteCarloOutputRows = [
    ["Expected Annual Hard Cost", currency(mc.hardCostExpected)],
    ["Expected Annual Soft Cost", currency(mc.softCostExpected)],
    ["Expected Annual Loss", currency(mc.expectedLoss)],
    ["Residual Annual Loss", currency(mc.residualExpectedLoss)],
    ["Annual Risk Reduction Value", currency(mc.riskReductionValue)],
    ["Mitigation Cost", currency(mc.mitigationCost)],
    ["Net Benefit / ROI", currency(mc.mitigationROI)],
    ["P10 Annual Loss", currency(mc.rangeLow)],
    ["P50 Annual Loss", currency(mc.rangeMedian)],
    ["P90 Annual Loss", currency(mc.rangeHigh)],
    ["90% Confidence Band", `${currency(mc.confidenceLow)} to ${currency(mc.confidenceHigh)}`],
    ["Residual 90% Confidence Band", `${currency(mc.residualConfidenceLow)} to ${currency(mc.residualConfidenceHigh)}`]
  ];

  const decisionText = mc.mitigationROI >= 0
    ? `Mitigation appears cost effective. Estimated annual risk reduction of ${currency(mc.riskReductionValue)} exceeds the direct mitigation cost of ${currency(mc.mitigationCost)} by approximately ${currency(mc.mitigationROI)}.`
    : `Direct mitigation cost appears to exceed the estimated annual reduction in loss by approximately ${currency(Math.abs(mc.mitigationROI))}. Leadership should consider partial controls, transfer options, or alternative mitigating factors.`;

  const evidenceText = mc.evidenceSummary.count
    ? ` Hard-fact evidence is influencing the severity model with an evidence-weight factor of ${Math.round(mc.evidenceWeight * 100)}% and a 90% confidence band of ${currency(mc.confidenceLow)} to ${currency(mc.confidenceHigh)}.`
    : " No hard-fact evidence is currently loaded, so confidence relies on management-estimated ranges only.";

  return {
    ...payload,
    total,
    residual,
    tier,
    frequency,
    itemCount,
    generatedSummary: `${buildSummary(payload.name, payload.mode, payload.primaryProduct, payload.primaryRegulation, total, residual, tier, frequency, itemCount)} Estimated annual exposure ranges from ${currency(mc.rangeLow)} to ${currency(mc.rangeHigh)} with a most likely annual impact of ${currency(mc.rangeMedian)}.${evidenceText} ${decisionRecommendation}`,
    monteCarloRows: [],
    monteCarloMethodRows,
    monteCarloInputRows,
    monteCarloOutputRows,
    horizonRows: mc.horizonRows,
    randomScenarioCount: mc.iterations,
    randomOutcomeRows: mc.randomOutcomeRows,
    expectedLoss: mc.expectedLoss,
    residualExpectedLoss: mc.residualExpectedLoss,
    hardCostExpected: mc.hardCostExpected,
    softCostExpected: mc.softCostExpected,
    riskReductionValue: mc.riskReductionValue,
    mitigationROI: mc.mitigationROI,
    rangeLow: mc.rangeLow,
    rangeMedian: mc.rangeMedian,
    rangeHigh: mc.rangeHigh,
    confidenceLow: mc.confidenceLow,
    confidenceHigh: mc.confidenceHigh,
    residualConfidenceLow: mc.residualConfidenceLow,
    residualConfidenceHigh: mc.residualConfidenceHigh,
    uncertaintySpread: mc.uncertaintySpread,
    evidenceSummary: mc.evidenceSummary,
    evidenceWeight: mc.evidenceWeight,
    evidenceNarrative: mc.evidenceNarrative,
    insuranceEvaluation,
    decisionRecommendation,
    decisionText
  };
}

function renderScenarioSummary(summary) {
  setTextIfPresent("scenarioIdDisplay", summary.id || "Not Saved");
  setTextIfPresent("inherentRiskScoreDisplay", summary.inherent);
  setTextIfPresent("residualRiskScore", summary.residual);
  setTextIfPresent("riskTier", summary.tier);
  setTextIfPresent("reviewFrequency", summary.frequency);
  setTextIfPresent("itemCount", summary.itemCount);
  setTextIfPresent("dashboardNarrative", `${summary.name} was run as a ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"} for ${summary.primaryProduct}. Reporting Lines: ${summary.productGroup}. Primary regulation: ${summary.primaryRegulation}. Inherent risk score: ${summary.inherent}. Residual risk score: ${summary.residual}. Estimated annual exposure range: ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}. 90% confidence band: ${currency(summary.confidenceLow)} to ${currency(summary.confidenceHigh)}. Recommended review frequency: ${summary.frequency}.`);
  setTextIfPresent("aiSummaryBox", summary.generatedSummary);

  const reportSummaryEl = document.getElementById("reportSummary");
  if (reportSummaryEl) reportSummaryEl.innerHTML = `
    <li><span class="help-label" data-help="Auto-generated scenario identifier used for tracking and reporting."><strong>Scenario ID:</strong></span> ${escapeHtml(summary.id || "Not Saved")}</li>
    <li><span class="help-label" data-help="The scenario currently being evaluated or reported."><strong>Scenario:</strong></span> ${escapeHtml(summary.name)}</li>
    <li><span class="help-label" data-help="Shows whether the report is based on a single or complex scenario builder."><strong>Builder:</strong></span> ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"}</li>
    <li><span class="help-label" data-help="Overall business or organizational group associated with the scenario."><strong>Reporting Lines:</strong></span> ${escapeHtml(summary.productGroup)}</li>
    <li><span class="help-label" data-help="Primary product or service most directly connected to the scenario."><strong>Primary Product:</strong></span> ${escapeHtml(summary.primaryProduct)}</li>
    <li><span class="help-label" data-help="Primary regulation or standard used to frame the scenario."><strong>Primary Regulation:</strong></span> ${escapeHtml(summary.primaryRegulation)}</li>
    <li><span class="help-label" data-help="Calculated starting risk before current control-effectiveness is applied."><strong>Inherent Risk Score:</strong></span> ${summary.inherent} (${escapeHtml(summary.tier)})</li>
    <li><span class="help-label" data-help="Remaining risk after the stated control-effectiveness percentage is applied."><strong>Residual Risk Score:</strong></span> ${summary.residual}</li>
    <li><span class="help-label" data-help="P10 to P90 annual loss range estimated by the financial model."><strong>Annual Exposure Range:</strong></span> ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}</li>
    <li><span class="help-label" data-help="The broader 90% confidence band used for evidence-aware uncertainty framing."><strong>90% Confidence Band:</strong></span> ${currency(summary.confidenceLow)} to ${currency(summary.confidenceHigh)}</li>
    <li><span class="help-label" data-help="Amount of spread between the low and high ends of the confidence band."><strong>Uncertainty Spread:</strong></span> ${currency(summary.uncertaintySpread)}</li>
    <li><span class="help-label" data-help="P50 annual loss estimate from the model; this is the most likely annual impact used for executive framing."><strong>Most Likely Annual Impact:</strong></span> ${currency(summary.rangeMedian)}</li>
    <li><span class="help-label" data-help="Expected direct measurable cost of the risk before secondary impacts."><strong>Expected Annual Hard Cost:</strong></span> ${currency(summary.hardCostExpected)}</li>
    <li><span class="help-label" data-help="Expected secondary or incidental cost added to hard cost, such as reputation, complaint, or disruption impacts."><strong>Expected Annual Soft Cost:</strong></span> ${currency(summary.softCostExpected)}</li>
    <li><span class="help-label" data-help="Expected total annual cost, combining hard and soft cost."><strong>Expected Annual Loss:</strong></span> ${currency(summary.expectedLoss)}</li>
    <li><span class="help-label" data-help="Expected annual cost remaining after the planned controls and mitigation assumptions are applied."><strong>Residual Annual Loss:</strong></span> ${currency(summary.residualExpectedLoss)}</li>
    <li><span class="help-label" data-help="Estimated direct cost to implement the planned full mitigation approach."><strong>Mitigation Cost:</strong></span> ${currency(summary.mitigationCost)}</li>
    <li><span class="help-label" data-help="Estimated annual reduction in loss from mitigation, before subtracting mitigation cost."><strong>Annual Risk Reduction Value:</strong></span> ${currency(summary.riskReductionValue)}</li>
    <li><span class="help-label" data-help="Risk-reduction value minus mitigation cost; used as a cost-effectiveness screen."><strong>Net Benefit / ROI:</strong></span> ${currency(summary.mitigationROI)}</li>
    <li><span class="help-label" data-help="Suggested review cadence based on the mapped residual-risk tier."><strong>Review Frequency:</strong></span> ${escapeHtml(summary.frequency)}</li>
    <li><span class="help-label" data-help="Count of insurance records loaded into the scenario and available for reporting."><strong>Insurance Records:</strong></span> ${(summary.insurance || []).length}</li>
    <li><span class="help-label" data-help="Documented insurance premium total across all listed policies."><strong>Insurance Premium Total:</strong></span> ${currency(totalCurrencyField(summary.insurance, "premium"))}</li>
    <li><span class="help-label" data-help="Documented factual loss or cost evidence total across all listed hard facts."><strong>Hard Facts Total:</strong></span> ${currency(totalCurrencyField(summary.hardFacts, "amount"))}</li>
    <li><span class="help-label" data-help="Narrative of how evidence was used to anchor the severity assumptions."><strong>Evidence Narrative:</strong></span> ${escapeHtml(summary.evidenceNarrative || "None")}</li>
  `;
  renderReportSupplements(summary);

  const executiveDecisionEl = document.getElementById("executiveDecisionBox");
  if (executiveDecisionEl) {
    const insuranceSummaryItems = dedupeInsuranceEvaluationItems(summary.insuranceEvaluation);
    const insuranceBlock = insuranceSummaryItems.length
      ? `<br><br><strong>Insurance Effectiveness</strong><br>${insuranceSummaryItems.map(item => `${escapeHtml(item.title)}: ${escapeHtml(item.rating)} (Premium ${currency(item.premium)} | Deductible ${currency(item.deductible)} | Modeled Risk Reduction ${currency(Math.round(item.riskReduction))})`).join("<br>")}`
      : "";
    executiveDecisionEl.innerHTML = `
      <strong>Executive Decision Summary</strong><br>
      There is a ${escapeHtml(summary.tier.toLowerCase())} risk tied to <strong>${escapeHtml(summary.name)}</strong> that could cost the organization approximately <strong>${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}</strong> over a one-year period, with a most likely annual outcome near <strong>${currency(summary.rangeMedian)}</strong>.</strong><br><br>
      The broader 90% confidence band is <strong>${currency(summary.confidenceLow)} to ${currency(summary.confidenceHigh)}</strong>, indicating total uncertainty of approximately <strong>${currency(summary.uncertaintySpread)}</strong>.<br><br>
      ${escapeHtml(summary.evidenceNarrative || "")}<br><br>
      <strong>Decision Recommendation</strong><br>${escapeHtml(summary.decisionRecommendation || summary.decisionText || "")}
      ${insuranceBlock}
    `;
  }

  const decisionMetricsEl = document.getElementById("decisionMetricsBody");
  if (decisionMetricsEl) decisionMetricsEl.innerHTML = `
    <tr><td>Expected Annual Loss</td><td>${currency(summary.expectedLoss)}</td></tr>
    <tr><td>Residual Annual Loss</td><td>${currency(summary.residualExpectedLoss)}</td></tr>
    <tr><td>90% Confidence Band</td><td>${currency(summary.confidenceLow)} to ${currency(summary.confidenceHigh)}</td></tr>
    <tr><td>Total Insurance Premium</td><td>${currency(totalCurrencyField(summary.insurance, "premium"))}</td></tr>
    <tr><td>Total Hard Facts / Evidence Cost</td><td>${currency(totalCurrencyField(summary.hardFacts, "amount"))}</td></tr>
    <tr><td>Mitigation Cost</td><td>${currency(summary.mitigationCost)}</td></tr>
    <tr><td>Annual Risk Reduction Value</td><td>${currency(summary.riskReductionValue)}</td></tr>
    <tr><td>Net Benefit / ROI</td><td>${currency(summary.mitigationROI)}</td></tr>
    <tr><td>Decision View</td><td>${summary.mitigationROI >= 0 ? "Cost effective to mitigate" : "Consider alternatives or partial controls"}</td></tr>
  `;

  const horizonExposureEl = document.getElementById("horizonExposureBody");
  if (horizonExposureEl) horizonExposureEl.innerHTML = (summary.horizonRows || []).map(row => `
    <tr>
      <td>${escapeHtml(row.horizonLabel)}</td>
      <td>${currency(row.withoutMitigation)}</td>
      <td>${currency(row.withMitigation)}</td>
      <td>${currency(row.riskReduction)}</td>
    </tr>
  `).join("");
}



/* =========================
   PHASE 20.1.08c FIX
   Deduplicate insurance summary lines
========================= */

function dedupeInsuranceEvaluationItems(items) {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set();
  return list.filter((item) => {
    const key = [
      item?.title || "",
      item?.rating || "",
      Number(item?.premium || 0),
      Number(item?.deductible || 0),
      Math.round(Number(item?.riskReduction || 0))
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}



/* =========================
   PHASE 20.1.09
   Evidence Integration (Hubbard Alignment Step 1)
========================= */

function calculateEvidenceAdjustment(evidenceList) {
  if (!evidenceList || evidenceList.length === 0) return 1;

  const values = evidenceList
    .map(e => Number(e.amount || 0))
    .filter(v => v > 0);

  if (values.length === 0) return 1;

  const avg = values.reduce((a,b)=>a+b,0) / values.length;

  return avg > 0 ? avg : 1;
}

function applyEvidenceToSimulation(simResults, scenario) {
  const factor = calculateEvidenceAdjustment(scenario.evidence || []);

  if (factor > 0) {
    simResults.meanLoss = (simResults.meanLoss + factor) / 2;
    simResults.p95 = (simResults.p95 + factor * 1.25) / 2;
  }

  return simResults;
}


function applyFullEnhancement(simResults, scenario) {
  simResults = applyEvidenceToSimulation(simResults, scenario);
  return simResults;
}



/* =========================
   PHASE 20.1.10
   Distribution Modeling + Confidence Bands
========================= */

function estimateStdDevFromEvidence(evidenceList, fallbackMean) {
  const values = Array.isArray(evidenceList)
    ? evidenceList.map(e => Number(e.amount || 0)).filter(v => v > 0)
    : [];

  if (values.length >= 2) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  const meanBase = Number(fallbackMean || 0);
  return meanBase > 0 ? meanBase * 0.35 : 0;
}

function calculateConfidenceBand(meanLoss, stdDev) {
  const mean = Number(meanLoss || 0);
  const sd = Number(stdDev || 0);

  const low90 = Math.max(0, mean - 1.645 * sd);
  const high90 = Math.max(mean, mean + 1.645 * sd);
  const low95 = Math.max(0, mean - 1.96 * sd);
  const high95 = Math.max(mean, mean + 1.96 * sd);

  return {
    low90,
    high90,
    low95,
    high95
  };
}

function buildDistributionProfile(simResults, scenario) {
  const meanLoss = Number(simResults.meanLoss || 0);
  const p95 = Number(simResults.p95 || 0);
  const stdDev = estimateStdDevFromEvidence(scenario.evidence || [], meanLoss);
  const confidenceBand = calculateConfidenceBand(meanLoss, stdDev);

  let skew = "Moderate";
  if (p95 > meanLoss * 2.5) skew = "High";
  else if (p95 < meanLoss * 1.5) skew = "Low";

  return {
    stdDev,
    skew,
    confidenceBand
  };
}

function applyDistributionEnhancement(simResults, scenario) {
  const profile = buildDistributionProfile(simResults, scenario);

  simResults.distributionProfile = profile;
  simResults.confidenceBand90 = profile.confidenceBand;
  simResults.standardDeviation = profile.stdDev;
  simResults.distributionSkew = profile.skew;

  return simResults;
}

function applyAdvancedQuantEnhancement(simResults, scenario) {
  if (typeof applyEvidenceToSimulation === "function") {
    simResults = applyEvidenceToSimulation(simResults, scenario);
  }
  if (typeof applyDistributionEnhancement === "function") {
    simResults = applyDistributionEnhancement(simResults, scenario);
  }
  return simResults;
}

function renderDistributionProfileSummary(profile) {
  if (!profile || !profile.confidenceBand) return "";

  return `
    <div class="card mt-3">
      <div class="card-header">Distribution Profile</div>
      <div class="card-body">
        <div><strong>Skew:</strong> ${profile.skew || "Moderate"}</div>
        <div><strong>Std. Deviation:</strong> ${Math.round(profile.stdDev || 0).toLocaleString()}</div>
        <div><strong>90% Range:</strong> ${Math.round(profile.confidenceBand.low90 || 0).toLocaleString()} - ${Math.round(profile.confidenceBand.high90 || 0).toLocaleString()}</div>
        <div><strong>95% Range:</strong> ${Math.round(profile.confidenceBand.low95 || 0).toLocaleString()} - ${Math.round(profile.confidenceBand.high95 || 0).toLocaleString()}</div>
      </div>
    </div>
  `;
}


/* =========================
   PHASE 20.1.11
========================= */

function calculateRiskRating(meanLoss){
  if(meanLoss < 10000) return "Low";
  if(meanLoss < 100000) return "Moderate";
  if(meanLoss < 500000) return "High";
  return "Severe";
}

function calculateConfidenceRating(stdDev, meanLoss){
  if(!meanLoss) return "Low";
  const ratio = stdDev / meanLoss;
  if(ratio < 0.25) return "High";
  if(ratio < 0.5) return "Medium";
  return "Low";
}

function identifyTopRiskDrivers(simResults, scenario){
  const drivers = [];

  if(simResults.p95 > simResults.meanLoss * 2){
    drivers.push("Tail risk exposure");
  }

  if(!scenario.insurance || scenario.insurance.length === 0){
    drivers.push("No risk transfer mechanism");
  }

  if(drivers.length === 0){
    drivers.push("Balanced risk profile");
  }

  return drivers;
}

function applyDecisionLayer(simResults, scenario){
  simResults.riskRating = calculateRiskRating(simResults.meanLoss || 0);
  simResults.confidenceRating = calculateConfidenceRating(simResults.standardDeviation || 0, simResults.meanLoss || 0);
  simResults.topDrivers = identifyTopRiskDrivers(simResults, scenario);
  return simResults;
}


/* =========================
   PHASE 20.1.12
========================= */

function escapeRiskText(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRiskCurrency(value) {
  const num = Number(value || 0);
  return "$" + Math.round(num).toLocaleString();
}

function normalizeTopDrivers(drivers) {
  return Array.isArray(drivers) ? drivers.filter(Boolean) : [];
}

function buildBoardSummary(simResults, scenario) {
  const meanLoss = Number((simResults && simResults.meanLoss) || 0);
  const p95 = Number((simResults && simResults.p95) || 0);
  const riskRating = (simResults && simResults.riskRating) || "Unrated";
  const confidenceRating = (simResults && simResults.confidenceRating) || "Unrated";
  const drivers = normalizeTopDrivers(simResults && simResults.topDrivers);
  const scenarioName =
    (scenario && (scenario.scenarioName || scenario.title || scenario.name || scenario.issue)) ||
    "Scenario";

  const driverText = drivers.length ? drivers.join(", ") : "No dominant drivers identified.";

  return scenarioName + " is currently assessed as " + riskRating +
    " risk with " + confidenceRating +
    " confidence. Estimated mean loss is " + formatRiskCurrency(meanLoss) +
    " and severe-case exposure (P95) is " + formatRiskCurrency(p95) +
    ". Primary drivers: " + driverText + ".";
}

function renderDecisionLayerCard(simResults) {
  if (!simResults) return "";

  const riskRating = escapeRiskText(simResults.riskRating || "Unrated");
  const confidenceRating = escapeRiskText(simResults.confidenceRating || "Unrated");
  const drivers = normalizeTopDrivers(simResults.topDrivers);

  return `
    <div class="card mt-3">
      <div class="card-header">Decision Layer</div>
      <div class="card-body">
        <div><strong>Risk Rating:</strong> ${riskRating}</div>
        <div><strong>Confidence Rating:</strong> ${confidenceRating}</div>
        <div class="mt-2"><strong>Top Risk Drivers:</strong></div>
        <ul class="mb-0">
          ${drivers.length ? drivers.map(d => `<li>${escapeRiskText(d)}</li>`).join("") : "<li>None identified</li>"}
        </ul>
      </div>
    </div>
  `;
}

function renderBoardSummaryCard(simResults, scenario) {
  if (!simResults) return "";

  return `
    <div class="card mt-3">
      <div class="card-header">Board / Examiner Summary</div>
      <div class="card-body">
        ${escapeRiskText(buildBoardSummary(simResults, scenario))}
      </div>
    </div>
  `;
}

function buildDecisionLayerPackage(simResults, scenario) {
  if (!simResults) return simResults;

  simResults.boardSummary = buildBoardSummary(simResults, scenario);
  simResults.decisionLayerHtml = renderDecisionLayerCard(simResults);
  simResults.boardSummaryHtml = renderBoardSummaryCard(simResults, scenario);

  return simResults;
}

function applyDecisionPresentationLayer(simResults, scenario) {
  if (typeof applyDecisionLayer === "function") {
    simResults = applyDecisionLayer(simResults, scenario);
  }
  if (typeof buildDecisionLayerPackage === "function") {
    simResults = buildDecisionLayerPackage(simResults, scenario);
  }
  return simResults;
}



/* =========================
   PHASE 20.1.14a
   Information Center Integration (Corrective)
========================= */

function getRiskToolManualSections() {
  return [
    {
      id: "getting-started",
      title: "Getting Started",
      body: "Use Single Scenario for one issue, event, or control concern. Use Complex Scenario when multiple related scenarios belong to the same project, business line, or department. Complete the core fields first, then add evidence, insurance, and mitigation details before running the scenario."
    },
    {
      id: "single-scenario-guide",
      title: "Single Scenario Guide",
      body: "Single Scenario is designed for one discrete issue. Complete the scenario title, business context, estimated frequency, estimated financial impact, mitigation factors, insurance details, and evidence items. Save the scenario before running it if you want to preserve the current inputs."
    },
    {
      id: "complex-scenario-guide",
      title: "Complex Scenario Guide",
      body: "Complex Scenario is used when several connected scenarios must be evaluated together. Each component should represent a distinct risk item inside the larger initiative. Use a consistent naming pattern and confirm that all component scenarios belong to the same complex scenario grouping before running reports."
    },
    {
      id: "field-guidance",
      title: "Field Guidance",
      body: "Each field should be completed as specifically as possible. Frequency should reflect how often the event could occur. Financial impact should reflect estimated loss severity. Evidence should reflect known internal or external losses. Insurance should reflect active or proposed coverage, including premium, deductible, and policy terms."
    },
    {
      id: "understanding-results",
      title: "Understanding Results",
      body: "Results combine scenario estimates, evidence inputs, insurance economics, and simulation outputs. Mean loss reflects expected loss. P95 reflects severe-case exposure. Risk Rating summarizes the relative level of exposure. Confidence Rating reflects how stable the estimate appears based on available variability. Top Risk Drivers highlight the main contributors to exposure."
    },
    {
      id: "insurance-evaluation",
      title: "Insurance Evaluation",
      body: "Insurance effectiveness compares premium and deductible structure against modeled loss reduction. A policy may be effective, marginal, limited, or inefficient depending on whether the cost of coverage is justified by the financial protection it provides."
    },
    {
      id: "evidence-data-usage",
      title: "Evidence & Data Usage",
      body: "Evidence entries should be factual and traceable. Use actual losses, incident history, external events, audit findings, or documented amounts where available. Evidence improves the quality of scenario outputs by shifting the model toward real-world experience instead of relying only on judgment."
    },
    {
      id: "faq",
      title: "FAQ",
      body: "Save preserves the scenario. Run Scenario generates updated outputs. Complex scenarios should be used for grouped assessments. Insurance and evidence are optional but improve decision quality. Reports should be reviewed for reasonableness before being used for management, audit, or board communication."
    }
  ];
}

function getFieldHelpLibrary() {
  return {
    scenarioTitle: {
      label: "Scenario Title",
      shortHelp: "Enter a clear and specific name for the scenario.",
      detailedHelp: "Use a title that identifies the issue, process, product, project, or event being assessed. Avoid overly generic titles."
    },
    frequency: {
      label: "Frequency",
      shortHelp: "Estimate how often the event could occur.",
      detailedHelp: "Use the best available judgment, supported by evidence when possible. Frequency should reflect realistic occurrence, not worst-case assumptions."
    },
    financialImpact: {
      label: "Financial Impact",
      shortHelp: "Estimate the likely financial severity of the event.",
      detailedHelp: "Include direct losses, remediation cost, operational disruption, legal expense, fines, restitution, or other relevant cost components where appropriate."
    },
    evidence: {
      label: "Evidence",
      shortHelp: "Add factual loss history or supporting data.",
      detailedHelp: "Use internal incidents, external events, audit results, or documented loss amounts to ground the scenario in real-world information."
    },
    insurance: {
      label: "Insurance",
      shortHelp: "Add insurance coverage details tied to the scenario.",
      detailedHelp: "Capture policy title, premium, deductible, and other core terms so the system can compare cost against modeled loss reduction."
    },
    mitigation: {
      label: "Mitigation",
      shortHelp: "Describe controls or actions that reduce exposure.",
      detailedHelp: "Document current or planned controls that may reduce frequency, severity, or overall residual exposure."
    }
  };
}

function getFieldHelp(fieldKey) {
  const library = getFieldHelpLibrary();
  return library[fieldKey] || null;
}

function renderFieldHelpBlock(fieldKey) {
  const help = getFieldHelp(fieldKey);
  if (!help) return "";

  return `
    <div class="card mt-2">
      <div class="card-header">${help.label}</div>
      <div class="card-body">
        <div><strong>Quick Help:</strong> ${help.shortHelp}</div>
        <div class="mt-2"><strong>Detailed Help:</strong> ${help.detailedHelp}</div>
      </div>
    </div>
  `;
}

function renderRiskToolManual() {
  const sections = getRiskToolManualSections();
  return `
    <div class="card mt-3">
      <div class="card-header">Information / User Guide</div>
      <div class="card-body">
        ${sections.map(section => `
          <div class="mb-4" id="manual-${section.id}">
            <h5>${section.title}</h5>
            <p class="mb-0">${section.body}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function buildRiskToolInfoNav(sections) {
  return `
    <div class="risktool-info-nav">
      ${sections.map(section => `<a href="#manual-${section.id}">${section.title}</a>`).join("")}
    </div>
  `;
}

function renderFieldHelpShowcase() {
  const keys = ["scenarioTitle", "frequency", "financialImpact", "evidence", "insurance", "mitigation"];
  return `
    <div class="risktool-help-stack">
      ${keys.map(key => renderFieldHelpBlock(key)).join("")}
    </div>
  `;
}

function renderIntegratedRiskToolManual() {
  const sections = getRiskToolManualSections();
  return `
    <div class="risktool-info-grid">
      <div>
        ${buildRiskToolInfoNav(sections)}
        ${renderRiskToolManual()}
      </div>
      <div>
        <div class="card mt-0">
          <div class="card-header">Field Help Library</div>
          <div class="card-body">
            ${renderFieldHelpShowcase()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function ensureRiskToolInfoStyles() {
  if (document.getElementById("risktool-info-styles")) return;

  const style = document.createElement("style");
  style.id = "risktool-info-styles";
  style.textContent = `
    .risktool-info-fab {
      position: fixed;
      right: 18px;
      bottom: 48px;
      z-index: 9998;
      border: none;
      border-radius: 999px;
      padding: 10px 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,.18);
    }
    .risktool-info-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .risktool-info-overlay.open {
      display: flex;
    }
    .risktool-info-modal {
      width: min(1100px, 96vw);
      max-height: 90vh;
      overflow: auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }
    .risktool-info-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(0,0,0,.08);
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 2;
    }
    .risktool-info-body {
      padding: 20px;
    }
    .risktool-info-grid {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 18px;
    }
    .risktool-info-close {
      border: none;
      background: transparent;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }
    .risktool-info-nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .risktool-info-nav a {
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(0,0,0,.06);
      color: inherit;
      font-size: 13px;
    }
    .risktool-help-stack > * + * {
      margin-top: 12px;
    }
    @media (max-width: 900px) {
      .risktool-info-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureRiskToolInfoButton() {
  if (document.getElementById("risktool-info-fab")) return;

  const button = document.createElement("button");
  button.id = "risktool-info-fab";
  button.className = "risktool-info-fab btn btn-primary";
  button.type = "button";
  button.textContent = "Information";
  button.addEventListener("click", openRiskToolInfoModal);
  document.body.appendChild(button);
}

function ensureRiskToolInfoModal() {
  if (document.getElementById("risktool-info-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "risktool-info-overlay";
  overlay.className = "risktool-info-overlay";
  overlay.innerHTML = `
    <div class="risktool-info-modal">
      <div class="risktool-info-header">
        <div>
          <strong>Risk Manager Information Center</strong>
          <div style="font-size:12px;opacity:.75;">User guide, field help, and scenario completion guidance</div>
        </div>
        <button id="risktool-info-close" class="risktool-info-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="risktool-info-body" id="risktool-info-body"></div>
    </div>
  `;

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeRiskToolInfoModal();
  });

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById("risktool-info-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeRiskToolInfoModal);
  }
}

function openRiskToolInfoModal() {
  ensureRiskToolInfoStyles();
  ensureRiskToolInfoModal();

  const body = document.getElementById("risktool-info-body");
  if (body) {
    body.innerHTML = renderIntegratedRiskToolManual();
  }

  const overlay = document.getElementById("risktool-info-overlay");
  if (overlay) {
    overlay.classList.add("open");
  }
}

function closeRiskToolInfoModal() {
  const overlay = document.getElementById("risktool-info-overlay");
  if (overlay) {
    overlay.classList.remove("open");
  }
}

function initializeRiskToolInformationCenter() {
  if (typeof document === "undefined" || !document.body) return;
  ensureRiskToolInfoStyles();
  ensureRiskToolInfoButton();
  ensureRiskToolInfoModal();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeRiskToolInformationCenter);
  } else {
    initializeRiskToolInformationCenter();
  }
}



/* =========================
   PHASE 20.1.14b
   Left-Nav Information Integration
========================= */

function renderManual() {
  const target = document.getElementById("userManualCopy");
  if (!target) return;

  if (typeof renderIntegratedRiskToolManual === "function") {
    target.innerHTML = renderIntegratedRiskToolManual();
    return;
  }

  target.innerHTML = `
    <h4>Getting Started</h4>
    <p>Use Single Scenario for one issue, event, or control concern. Use Complex Scenario when multiple related scenarios belong to the same project, business line, or department.</p>
    <h4>How to Complete a Scenario</h4>
    <p>Complete the core fields first, then add evidence, insurance, and mitigation details before running the scenario. Save the scenario if you want to preserve the current inputs.</p>
    <h4>Understanding Results</h4>
    <p>Mean loss reflects expected loss. P95 reflects severe-case exposure. Risk Rating summarizes the relative level of exposure. Confidence Rating reflects how stable the estimate appears based on available variability.</p>
  `;
}

/* Disable floating Information entry point.
   All help/manual content should flow through the left navigation Information view only. */
function ensureRiskToolInfoButton() {
  const existing = document.getElementById("risktool-info-fab");
  if (existing) existing.remove();
}
function openRiskToolInfoModal() { return; }
function closeRiskToolInfoModal() { return; }
function initializeRiskToolInformationCenter() { return; }

if (typeof document !== "undefined") {
  const staleButton = document.getElementById("risktool-info-fab");
  if (staleButton) staleButton.remove();
}


/* =========================
   PHASE 20.1.15
   Scenario-Specific Information Content
========================= */

function getScenarioManualLibrary() {
  return {
    single: {
      title: "Single Scenario Walkthrough",
      intro: "Use Single Scenario when you need to assess one defined issue, event, control gap, product risk, compliance concern, or operational exposure.",
      steps: [
        "Enter a clear scenario title that identifies the issue being assessed.",
        "Describe the business context, product, process, or event involved.",
        "Estimate frequency based on realistic occurrence, not only worst-case assumptions.",
        "Estimate financial impact using direct and indirect cost components where appropriate.",
        "Add mitigation information to document controls already in place or planned.",
        "Add evidence items when you have known losses, incidents, audit findings, or external events.",
        "Add insurance entries if coverage exists or is being evaluated.",
        "Save the scenario before running if you want to preserve the current state.",
        "Run the scenario and review expected loss, tail exposure, confidence, and risk drivers."
      ],
      completionChecklist: [
        "Scenario title is specific",
        "Frequency estimate is realistic",
        "Financial impact estimate is documented",
        "Mitigation details are completed",
        "Evidence items are added where available",
        "Insurance details are added where applicable",
        "Scenario has been saved before final run"
      ]
    },
    complex: {
      title: "Complex Scenario Walkthrough",
      intro: "Use Complex Scenario when multiple related risks belong to the same initiative, department, project, product family, or business line and should be reviewed together.",
      steps: [
        "Create or confirm the complex scenario grouping ID.",
        "Add each component scenario as a distinct risk item within the same group.",
        "Use consistent naming so components are easy to distinguish in reports.",
        "Complete frequency and financial impact for each component independently.",
        "Add evidence and insurance details at the component level where they differ.",
        "Confirm that all scenarios in the group truly belong to the same broader assessment.",
        "Save the complex scenario set before running reports.",
        "Review both individual component results and grouped results for reasonableness."
      ],
      completionChecklist: [
        "All components share the correct complex grouping",
        "Each component has a distinct name",
        "Each component has complete loss and frequency inputs",
        "Evidence and insurance are aligned to the right component",
        "The grouped scenario set has been saved before final run"
      ]
    },
    results: {
      title: "How to Read Results",
      intro: "Results should be interpreted as decision support, not as exact predictions.",
      steps: [
        "Mean Loss represents the expected level of financial exposure.",
        "P95 represents severe-case exposure and helps frame tail risk.",
        "Risk Rating summarizes the relative level of exposure.",
        "Confidence Rating reflects how stable the estimate appears given variability.",
        "Top Risk Drivers identify the main conditions increasing exposure.",
        "Insurance Effectiveness compares coverage cost structure against modeled protection.",
        "Board / Examiner Summary translates model results into plain-language reporting."
      ],
      completionChecklist: [
        "Results are reviewed for reasonableness",
        "Tail risk is compared against management tolerance",
        "Insurance output is reviewed alongside retained exposure",
        "Decision recommendation aligns with the scenario facts"
      ]
    }
  };
}

function renderScenarioChecklist(items) {
  const list = Array.isArray(items) ? items : [];
  return `
    <ul class="mb-0">
      ${list.map(item => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderScenarioManualSection(section) {
  if (!section) return "";

  const steps = Array.isArray(section.steps) ? section.steps : [];
  return `
    <div class="card mt-3">
      <div class="card-header">${section.title}</div>
      <div class="card-body">
        <p>${section.intro || ""}</p>
        <div class="mt-2"><strong>Recommended Steps</strong></div>
        <ol class="mb-3">
          ${steps.map(step => `<li>${step}</li>`).join("")}
        </ol>
        <div><strong>Completion Checklist</strong></div>
        ${renderScenarioChecklist(section.completionChecklist)}
      </div>
    </div>
  `;
}

function renderScenarioManualHub() {
  const library = getScenarioManualLibrary();
  return `
    <div class="mt-3">
      ${renderScenarioManualSection(library.single)}
      ${renderScenarioManualSection(library.complex)}
      ${renderScenarioManualSection(library.results)}
    </div>
  `;
}

function renderManual() {
  const manual = document.getElementById("userManualCopy");
  if (!manual) return;
  manual.innerHTML = `
<div class="card mt-3">
  <div class="card-header">Information / User Guide</div>
  <div class="card-body">
    <h4>Getting Started</h4>
    <p>Use Single Scenario for one issue, event, or control concern. Use Complex Scenario when multiple related scenarios belong to the same project, business line, or department.</p>

    <h4>Single Scenario Walkthrough</h4>
    <ol>
      <li>Enter a clear scenario title.</li>
      <li>Describe the business context, product, process, or event involved.</li>
      <li>Estimate frequency using realistic occurrence, not only worst-case assumptions.</li>
      <li>Estimate financial impact using direct and indirect cost components where appropriate.</li>
      <li>Add mitigation information for controls already in place or planned.</li>
      <li>Add evidence items when you have known losses, incidents, audit findings, or external events.</li>
      <li>Add insurance entries if coverage exists or is being evaluated.</li>
      <li>Save the scenario before running if you want to preserve the current state.</li>
      <li>Run the scenario and review expected loss, tail exposure, confidence, and risk drivers.</li>
    </ol>

    <h4>Complex Scenario Walkthrough</h4>
    <ol>
      <li>Confirm the complex scenario grouping ID.</li>
      <li>Add each component scenario as a distinct risk item within the same group.</li>
      <li>Use consistent naming so components are easy to distinguish in reports.</li>
      <li>Complete frequency and financial impact for each component independently.</li>
      <li>Add evidence and insurance details at the component level where they differ.</li>
      <li>Save the complex scenario set before running reports.</li>
      <li>Review both individual component results and grouped results for reasonableness.</li>
    </ol>

    <h4>How to Read Results</h4>
    <ul>
      <li>Mean Loss represents the expected level of financial exposure.</li>
      <li>P95 represents severe-case exposure and helps frame tail risk.</li>
      <li>Risk Rating summarizes the relative level of exposure.</li>
      <li>Confidence Rating reflects how stable the estimate appears given variability.</li>
      <li>Top Risk Drivers identify the main conditions increasing exposure.</li>
      <li>Insurance Effectiveness compares coverage cost structure against modeled protection.</li>
      <li>Board / Examiner Summary translates model results into plain-language reporting.</li>
    </ul>

    <h4>Field Guidance</h4>
    <p><strong>Scenario Title:</strong> use a clear and specific name.</p>
    <p><strong>Frequency:</strong> estimate how often the event could occur.</p>
    <p><strong>Financial Impact:</strong> estimate likely severity including direct and indirect costs.</p>
    <p><strong>Evidence:</strong> add factual loss history or supporting data.</p>
    <p><strong>Insurance:</strong> add policy title, premium, deductible, and key terms.</p>
    <p><strong>Mitigation:</strong> document controls or actions that reduce exposure.</p>
  </div>
</div>
`;
}


/* =========================
   PHASE 20.1.16a
   Freeze Corrective Rollback
========================= */

function renderManualSafe() {
  try {
    if (typeof renderManual === "function") {
      renderManual();
      return true;
    }
  } catch (err) {
    console.error("renderManualSafe failed:", err);
  }
  return false;
}


/* =========================
   PHASE 20.1.17
   Safe Information Pane Integration Helpers
========================= */

function getInformationPaneTargets() {
  if (typeof document === "undefined") return [];
  return [
    document.getElementById("userManualCopy"),
    document.getElementById("informationContent"),
    document.getElementById("informationPageContent"),
    document.querySelector("#informationPage .card-body"),
    document.querySelector("[data-page='information'] .card-body"),
    document.querySelector(".information-page .card-body")
  ].filter(Boolean);
}

function buildInformationPageHtml() {
  let html = "";

  if (typeof renderIntegratedRiskToolManual === "function") {
    html += renderIntegratedRiskToolManual();
  } else if (typeof renderRiskToolManual === "function") {
    html += renderRiskToolManual();
  }

  if (typeof renderScenarioManualHub === "function") {
    html += renderScenarioManualHub();
  }

  if (!html) {
    html = `
      <div class="card mt-3">
        <div class="card-header">Information / User Guide</div>
        <div class="card-body">
          <p>Use Single Scenario for one issue, event, or control concern. Use Complex Scenario when multiple related scenarios belong to the same project, business line, or department.</p>
          <p>Complete the core fields first, then add evidence, insurance, and mitigation details before running the scenario.</p>
          <p>Review expected loss, severe-case exposure, confidence, risk drivers, and insurance effectiveness before finalizing a report.</p>
        </div>
      </div>
    `;
  }

  return html;
}

function injectInformationPageContent(target) {
  if (!target) return false;
  try {
    target.innerHTML = buildInformationPageHtml();
    return true;
  } catch (err) {
    console.error("injectInformationPageContent failed:", err);
    return false;
  }
}

function renderInformationPaneContent() {
  const targets = getInformationPaneTargets();
  if (!targets.length) return false;
  return injectInformationPageContent(targets[0]);
}

function bindInformationPaneRenderer() {
  if (typeof window === "undefined") return;

  window.renderInformationPaneContent = renderInformationPaneContent;
  window.injectInformationPageContent = injectInformationPageContent;
  window.buildInformationPageHtml = buildInformationPageHtml;
}

/* Safe export only. No observers, no click traps, no automatic page-wide hooks. */
bindInformationPaneRenderer();

/* PHASE 20.1.18 */

/* PHASE 20.1.19 - Direct Information content activation */


/* =========================
   PHASE 20.1.21
   Manual Polish + Expanded Guidance
========================= */

function getManualLayoutStyles() {
  return `
    <style>
      .manual-nav { display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 18px 0; }
      .manual-nav a { display:inline-block; padding:8px 12px; border-radius:999px; background:rgba(25,118,210,.08); color:#1f3a5f; text-decoration:none; font-size:13px; font-weight:600; line-height:1.2; }
      .manual-nav a:hover { background:rgba(25,118,210,.16); text-decoration:none; }
      .manual-card { border:1px solid rgba(0,0,0,.08); border-radius:18px; padding:18px 22px; background:#fff; box-shadow:0 2px 10px rgba(0,0,0,.04); }
      .manual-card h4 { margin:0 0 16px 0; font-size:22px; line-height:1.25; }
      .manual-section { padding:14px 0 18px 0; border-top:1px solid rgba(0,0,0,.06); }
      .manual-section:first-of-type { border-top:none; padding-top:0; }
      .manual-section h5 { margin:0 0 10px 0; font-size:18px; line-height:1.3; }
      .manual-section p { margin:0 0 12px 0; line-height:1.65; }
      .manual-section ol, .manual-section ul { margin:8px 0 0 20px; padding:0; line-height:1.65; }
      .manual-section li + li { margin-top:6px; }
      .manual-field-grid { display:grid; grid-template-columns:1fr; gap:10px; margin-top:10px; }
      .manual-field-item { padding:12px 14px; border-radius:12px; background:rgba(0,0,0,.03); }
      .manual-field-item strong { display:inline-block; margin-bottom:4px; }
    </style>
  `;
}

function getPolishedManualHtml() {
  return `
    ${getManualLayoutStyles()}
    <div class="manual-card">
      <h4>Information / User Guide</h4>

      <div class="manual-nav">
        <a href="#manual-getting-started">Getting Started</a>
        <a href="#manual-single-scenario">Single Scenario Guide</a>
        <a href="#manual-complex-scenario">Complex Scenario Guide</a>
        <a href="#manual-field-guidance">Field Guidance</a>
        <a href="#manual-results">Understanding Results</a>
        <a href="#manual-insurance">Insurance Evaluation</a>
        <a href="#manual-evidence">Evidence &amp; Data Usage</a>
        <a href="#manual-reference">Reference</a>
        <a href="#manual-faq">FAQ</a>
      </div>

      <div class="manual-section" id="manual-getting-started">
        <h5>Getting Started</h5>
        <p>Use Single Scenario for one issue, event, or control concern. Use Complex Scenario when multiple related scenarios belong to the same project, business line, or department.</p>
        <p>Complete the core fields first, then add evidence, insurance, and mitigation details before running the scenario.</p>
      </div>

      <div class="manual-section" id="manual-single-scenario">
        <h5>Single Scenario Guide</h5>
        <ol>
          <li>Enter a clear scenario title.</li>
          <li>Describe the business context, product, process, or event involved.</li>
          <li>Estimate frequency using realistic occurrence, not only worst-case assumptions.</li>
          <li>Estimate financial impact using direct and indirect cost components where appropriate.</li>
          <li>Add mitigation information for controls already in place or planned.</li>
          <li>Add evidence items when you have known losses, incidents, audit findings, or external events.</li>
          <li>Add insurance entries if coverage exists or is being evaluated.</li>
          <li>Save the scenario before running if you want to preserve the current state.</li>
          <li>Run the scenario and review expected loss, tail exposure, confidence, and risk drivers.</li>
        </ol>
      </div>

      <div class="manual-section" id="manual-complex-scenario">
        <h5>Complex Scenario Guide</h5>
        <ol>
          <li>Confirm the complex scenario grouping ID.</li>
          <li>Add each component scenario as a distinct risk item within the same group.</li>
          <li>Use consistent naming so components are easy to distinguish in reports.</li>
          <li>Complete frequency and financial impact for each component independently.</li>
          <li>Add evidence and insurance details at the component level where they differ.</li>
          <li>Save the complex scenario set before running reports.</li>
          <li>Review both individual component results and grouped results for reasonableness.</li>
        </ol>
      </div>

      <div class="manual-section" id="manual-field-guidance">
        <h5>Field Guidance</h5>
        <div class="manual-field-grid">
          <div class="manual-field-item"><strong>Scenario Title</strong><div>Use a clear and specific name.</div></div>
          <div class="manual-field-item"><strong>Business Context</strong><div>Describe where the risk exists, who is affected, and why the scenario matters to operations, compliance, finance, or management.</div></div>
          <div class="manual-field-item"><strong>Frequency</strong><div>Estimate how often the event could occur based on reasonable expectation, known history, and operating reality.</div></div>
          <div class="manual-field-item"><strong>Financial Impact</strong><div>Estimate likely severity including direct and indirect costs.</div></div>
          <div class="manual-field-item"><strong>Mitigation</strong><div>Document controls or actions that reduce exposure.</div></div>
          <div class="manual-field-item"><strong>Evidence</strong><div>Add factual loss history or supporting data.</div></div>
          <div class="manual-field-item"><strong>Insurance</strong><div>Add policy title, premium, deductible, and key terms.</div></div>
          <div class="manual-field-item"><strong>Results Review</strong><div>Review expected loss, severe-case exposure, confidence, insurance effectiveness, and board summary language for reasonableness before final use.</div></div>
        </div>
      </div>

      <div class="manual-section" id="manual-results">
        <h5>Understanding Results</h5>
        <ul>
          <li>Mean Loss represents the expected level of financial exposure.</li>
          <li>P95 represents severe-case exposure and helps frame tail risk.</li>
          <li>Risk Rating summarizes the relative level of exposure.</li>
          <li>Confidence Rating reflects how stable the estimate appears given variability.</li>
          <li>Top Risk Drivers identify the main conditions increasing exposure.</li>
          <li>Board / Examiner Summary translates model results into plain-language reporting.</li>
        </ul>
      </div>

      <div class="manual-section" id="manual-insurance">
        <h5>Insurance Evaluation</h5>
        <p>Insurance effectiveness compares coverage cost structure against modeled protection.</p>
        <p>A policy may be effective, marginal, limited, or inefficient depending on whether the cost of coverage is justified by the financial protection it provides.</p>
      </div>

      <div class="manual-section" id="manual-evidence">
        <h5>Evidence &amp; Data Usage</h5>
        <p>Evidence entries should be factual and traceable. Use actual losses, incident history, external events, audit findings, or documented amounts where available.</p>
        <p>Evidence improves the quality of scenario outputs by shifting the model toward real-world experience instead of relying only on judgment.</p>
      </div>

      <div class="manual-section" id="manual-reference">
        <h5>Reference</h5>
        <ul>
          <li>Single Scenario is best for one defined issue or event.</li>
          <li>Complex Scenario is best for grouped risks that belong to one broader initiative.</li>
          <li>Evidence improves model quality by grounding estimates in actual data.</li>
          <li>Insurance should be reviewed as an economic decision, not just a coverage list.</li>
          <li>Reports should be reviewed for reasonableness before being used for management, audit, or board communication.</li>
        </ul>
      </div>

      <div class="manual-section" id="manual-faq">
        <h5>FAQ</h5>
        <ul>
          <li>Save preserves the scenario.</li>
          <li>Run Scenario generates updated outputs.</li>
          <li>Insurance and evidence are optional but improve decision quality.</li>
          <li>Reports should be reviewed for reasonableness before being used for management, audit, or board communication.</li>
        </ul>
      </div>
    </div>
  `;
}
