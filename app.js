
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
let singleMitigations = [];
let complexMitigations = [];
let singleEvidence = [];
let complexEvidence = [];
let betaEvidence = [];
let singleInsurance = [];
let complexInsurance = [];
let betaInsurance = [];
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
function safeLink(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
function getEvidenceArray(mode) {
  if (mode === "single") return singleEvidence;
  if (mode === "complex") return complexEvidence;
  if (mode === "beta") return betaEvidence;
  return [];
}
function setEvidenceArray(mode, items) {
  const next = Array.isArray(items) ? items.slice() : [];
  if (mode === "single") singleEvidence = next;
  if (mode === "complex") complexEvidence = next;
  if (mode === "beta") betaEvidence = next;
}
function evidenceFieldId(mode, suffix) {
  const prefix = mode === "single" ? "singleEvidence" : mode === "complex" ? "complexEvidence" : "betaEvidence";
  return `${prefix}${suffix}`;
}
function readEvidenceEntry(mode) {
  const get = suffix => document.getElementById(evidenceFieldId(mode, suffix));
  const amount = Number(get("LossAmount")?.value || 0);
  const link = safeLink(get("Link")?.value || "");
  return {
    lossAmount: amount,
    sourceType: get("SourceType")?.value || "Internal",
    lossDate: get("LossDate")?.value || "",
    organization: get("Organization")?.value || "",
    evidenceType: get("Type")?.value || "Historical Loss",
    regulation: get("Regulation")?.value || "",
    confidence: get("Confidence")?.value || "Medium",
    link,
    description: get("Description")?.value || "",
    notes: get("Notes")?.value || ""
  };
}
function clearEvidenceInputs(mode) {
  ["LossAmount","LossDate","Organization","Regulation","Link","Description","Notes"].forEach(suffix => {
    const el = document.getElementById(evidenceFieldId(mode, suffix));
    if (el) el.value = "";
  });
  const source = document.getElementById(evidenceFieldId(mode, "SourceType"));
  if (source) source.value = "Internal";
  const type = document.getElementById(evidenceFieldId(mode, "Type"));
  if (type) type.value = "Historical Loss";
  const conf = document.getElementById(evidenceFieldId(mode, "Confidence"));
  if (conf) conf.value = "Medium";
}
function renderEvidenceTable(mode) {
  const tbodyId = mode === "single" ? "singleEvidenceBody" : mode === "complex" ? "complexEvidenceBody" : "betaEvidenceBody";
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const items = getEvidenceArray(mode);
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="8">No evidence records added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.lossDate || "")}</td>
      <td>${escapeHtml(item.sourceType || "")}</td>
      <td>${escapeHtml(item.organization || "")}</td>
      <td>${currency(item.lossAmount || 0)}</td>
      <td>${escapeHtml(item.evidenceType || "")}</td>
      <td>${escapeHtml(item.confidence || "")}</td>
      <td>${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}</td>
      <td><button class="btn btn-secondary small-btn" data-evidence-delete="${mode}:${index}">Delete</button></td>
    </tr>
  `).join("");
  tbody.querySelectorAll("[data-evidence-delete]").forEach(btn => btn.addEventListener("click", () => {
    const [targetMode, idx] = String(btn.dataset.evidenceDelete || "").split(":");
    const list = getEvidenceArray(targetMode);
    list.splice(Number(idx), 1);
    renderEvidenceTable(targetMode);
    if (lastSummary && lastSummary.mode === targetMode) renderEvidenceReport({ ...lastSummary, evidence: list.slice() });
  }));
}
function addEvidence(mode) {
  const entry = readEvidenceEntry(mode);
  if (!entry.lossAmount && !entry.description && !entry.link && !entry.organization) {
    alert("Add at least a loss amount, organization, link, or description before saving evidence.");
    return;
  }
  const list = getEvidenceArray(mode);
  list.push(entry);
  renderEvidenceTable(mode);
  clearEvidenceInputs(mode);
}
function summarizeEvidence(evidence) {
  const rows = Array.isArray(evidence) ? evidence : [];
  if (!rows.length) {
    return { count: 0, internalCount: 0, externalCount: 0, minLoss: 0, maxLoss: 0, avgLoss: 0 };
  }
  const losses = rows.map(x => Number(x.lossAmount || 0)).filter(x => Number.isFinite(x) && x >= 0);
  const internalCount = rows.filter(x => String(x.sourceType || "").toLowerCase() === "internal").length;
  const externalCount = rows.length - internalCount;
  return {
    count: rows.length,
    internalCount,
    externalCount,
    minLoss: losses.length ? Math.min(...losses) : 0,
    maxLoss: losses.length ? Math.max(...losses) : 0,
    avgLoss: losses.length ? Math.round(losses.reduce((a, b) => a + b, 0) / losses.length) : 0
  };
}
function renderEvidenceReport(summary) {
  const tbody = document.getElementById("evidenceReportBody");
  const statsBox = document.getElementById("evidenceSummaryBox");
  if (!tbody || !statsBox) return;
  const evidence = Array.isArray(summary?.evidence) ? summary.evidence : [];
  if (!evidence.length) {
    tbody.innerHTML = '<tr><td colspan="8">No evidence records are attached to this scenario.</td></tr>';
    statsBox.textContent = "No historical loss evidence has been recorded for this scenario yet.";
    return;
  }
  tbody.innerHTML = evidence.map(item => `
    <tr>
      <td>${escapeHtml(item.lossDate || "")}</td>
      <td>${escapeHtml(item.sourceType || "")}</td>
      <td>${escapeHtml(item.organization || "")}</td>
      <td>${currency(item.lossAmount || 0)}</td>
      <td>${escapeHtml(item.evidenceType || "")}</td>
      <td>${escapeHtml(item.regulation || "")}</td>
      <td>${escapeHtml(item.confidence || "")}</td>
      <td>${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</td>
    </tr>
  `).join("");
  const stats = summarizeEvidence(evidence);
  statsBox.textContent = `Evidence base includes ${stats.count} event${stats.count === 1 ? "" : "s"} (${stats.internalCount} internal, ${stats.externalCount} external). Observed loss range: ${currency(stats.minLoss)} to ${currency(stats.maxLoss)}. Average observed loss: ${currency(stats.avgLoss)}. Use the source links to validate the supporting facts.`;
}
function getInsuranceArray(mode) {
  if (mode === "single") return singleInsurance;
  if (mode === "complex") return complexInsurance;
  if (mode === "beta") return betaInsurance;
  return [];
}
function insuranceFieldId(mode, suffix) {
  const prefix = mode === "single" ? "singleInsurance" : mode === "complex" ? "complexInsurance" : "betaInsurance";
  return `${prefix}${suffix}`;
}
function readInsuranceEntry(mode) {
  const get = suffix => document.getElementById(insuranceFieldId(mode, suffix));
  return {
    title: get("Title")?.value || "",
    carrier: get("Carrier")?.value || "",
    coverageType: get("CoverageType")?.value || "Cyber",
    policyNumber: get("PolicyNumber")?.value || "",
    premiumCost: Number(get("PremiumCost")?.value || 0),
    deductible: Number(get("Deductible")?.value || 0),
    coverageLimit: Number(get("CoverageLimit")?.value || 0),
    coverageStartDate: get("CoverageStartDate")?.value || "",
    coverageEndDate: get("CoverageEndDate")?.value || "",
    duration: get("Duration")?.value || "",
    exclusions: get("Exclusions")?.value || "",
    claimStatus: get("ClaimStatus")?.value || "Not Submitted",
    notes: get("Notes")?.value || "",
    sourceLink: safeLink(get("SourceLink")?.value || "")
  };
}
function clearInsuranceInputs(mode) {
  ["Title","Carrier","PolicyNumber","PremiumCost","Deductible","CoverageLimit","CoverageStartDate","CoverageEndDate","Duration","Exclusions","Notes","SourceLink"].forEach(suffix => {
    const el = document.getElementById(insuranceFieldId(mode, suffix));
    if (el) el.value = "";
  });
  const type = document.getElementById(insuranceFieldId(mode, "CoverageType"));
  if (type) type.value = mode === "beta" ? "Project / Launch" : "Cyber";
  const claimStatus = document.getElementById(insuranceFieldId(mode, "ClaimStatus"));
  if (claimStatus) claimStatus.value = "Not Submitted";
}
function renderInsuranceTable(mode) {
  const tbody = document.getElementById(mode === "single" ? "singleInsuranceBody" : mode === "complex" ? "complexInsuranceBody" : "betaInsuranceBody");
  if (!tbody) return;
  const items = getInsuranceArray(mode);
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="9">No insurance coverages added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.title || "")}</td>
      <td>${escapeHtml(item.carrier || "")}</td>
      <td>${escapeHtml(item.coverageType || "")}</td>
      <td>${currency(item.premiumCost || 0)}</td>
      <td>${currency(item.deductible || 0)}</td>
      <td>${currency(item.coverageLimit || 0)}</td>
      <td>${escapeHtml(item.duration || "")}</td>
      <td>${item.sourceLink ? `<a href="${escapeHtml(item.sourceLink)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</td>
      <td><button class="btn btn-secondary small-btn" data-insurance-delete="${mode}:${index}">Delete</button></td>
    </tr>
  `).join("");
  tbody.querySelectorAll("[data-insurance-delete]").forEach(btn => btn.addEventListener("click", () => {
    const [targetMode, idx] = String(btn.dataset.insuranceDelete || "").split(":");
    const list = getInsuranceArray(targetMode);
    list.splice(Number(idx), 1);
    renderInsuranceTable(targetMode);
    if (lastSummary && lastSummary.mode === targetMode) renderInsuranceReport({ ...lastSummary, insurance: list.slice() });
  }));
}
function addInsurance(mode) {
  const entry = readInsuranceEntry(mode);
  if (!entry.title && !entry.carrier && !entry.policyNumber && !entry.sourceLink) {
    alert("Add at least a title, carrier, policy number, or source link before saving insurance coverage.");
    return;
  }
  const list = getInsuranceArray(mode);
  list.push(entry);
  renderInsuranceTable(mode);
  clearInsuranceInputs(mode);
}
function summarizeInsurance(rows) {
  const insurance = Array.isArray(rows) ? rows : [];
  return {
    count: insurance.length,
    totalPremium: insurance.reduce((sum, item) => sum + Number(item.premiumCost || 0), 0),
    totalLimit: insurance.reduce((sum, item) => sum + Number(item.coverageLimit || 0), 0),
    deductibleMin: insurance.length ? Math.min(...insurance.map(item => Number(item.deductible || 0))) : 0,
    deductibleMax: insurance.length ? Math.max(...insurance.map(item => Number(item.deductible || 0))) : 0
  };
}
function renderInsuranceReport(summary) {
  const tbody = document.getElementById("insuranceReportBody");
  const statsBox = document.getElementById("insuranceSummaryBox");
  if (!tbody || !statsBox) return;
  const insurance = Array.isArray(summary?.insurance) ? summary.insurance : [];
  if (!insurance.length) {
    tbody.innerHTML = '<tr><td colspan="9">No insurance coverages are attached to this scenario.</td></tr>';
    statsBox.textContent = "No insurance coverage records have been attached to this scenario yet.";
    return;
  }
  tbody.innerHTML = insurance.map(item => `
    <tr>
      <td>${escapeHtml(item.title || "")}</td>
      <td>${escapeHtml(item.carrier || "")}</td>
      <td>${escapeHtml(item.coverageType || "")}</td>
      <td>${currency(item.premiumCost || 0)}</td>
      <td>${currency(item.deductible || 0)}</td>
      <td>${currency(item.coverageLimit || 0)}</td>
      <td>${escapeHtml(item.duration || "")}</td>
      <td>${escapeHtml(item.claimStatus || "")}</td>
      <td>${item.sourceLink ? `<a href="${escapeHtml(item.sourceLink)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</td>
    </tr>
  `).join("");
  const stats = summarizeInsurance(insurance);
  statsBox.textContent = `Insurance library includes ${stats.count} coverage entr${stats.count === 1 ? "y" : "ies"}. Total premium: ${currency(stats.totalPremium)}. Total stated coverage limit: ${currency(stats.totalLimit)}. Deductible range: ${currency(stats.deductibleMin)} to ${currency(stats.deductibleMax)}.`;
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
    evidence: Array.isArray(saved.evidence) ? saved.evidence : [],
    insurance: Array.isArray(saved.insurance) ? saved.insurance : [],
    complexGroupId: saved.complexGroupId || saved.groupId || saved.parentGroupId || "",
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
  populateSelect("betaProductGroup", productGroups);
  populateSelect("betaRiskDomain", riskDomains);

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
  if (viewName === "beta") activeMode = "beta";
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
    tbody.innerHTML = '<tr><td colspan="7">No risk items added yet.</td></tr>';
  } else {
    tbody.innerHTML = currentComplexItems.map(item => `<tr data-issue-id="${escapeHtml(item.issueId || "")}"><td>${escapeHtml(item.parentGroupId || "")}</td><td><button class="scenario-link" data-issue-open="${escapeHtml(item.issueId || "")}">${escapeHtml(item.name)}</button></td><td>${escapeHtml(item.domain)}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.regulation)}</td><td>${item.score}</td><td>${item.weight}</td></tr>`).join("");
    tbody.querySelectorAll("[data-issue-open]").forEach(btn => btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueOpen;
      highlightIssueRow(issueId);
    }));
  }
  updateInherentScores();
}
function addRiskItem() {
  currentComplexItems.push({
    issueId: `ISS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    parentScenarioMode: "complex",
    parentGroupId: document.getElementById("complexGroupId")?.value || document.getElementById("complexScenarioId")?.value || "",
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
    hardCostMin: Number(document.getElementById("singleHardCostMin").value || 0),
    hardCostLikely: Number(document.getElementById("singleHardCostLikely").value || 0),
    hardCostMax: Number(document.getElementById("singleHardCostMax").value || 0),
    softCostMin: Number(document.getElementById("singleSoftCostMin").value || 0),
    softCostLikely: Number(document.getElementById("singleSoftCostLikely").value || 0),
    softCostMax: Number(document.getElementById("singleSoftCostMax").value || 0),
    mitigationCost: Number(document.getElementById("singleMitigationCost").value || 0),
    randomScenarioCount: Number(document.getElementById("singleRandomScenarioCount").value || 1000),
    items: [],
    mitigations: singleMitigations.slice(),
    evidence: singleEvidence.slice(),
    insurance: singleInsurance.slice(),
    acceptedRisk: getAcceptedRisk("single")
  };
}
function getComplexPayload() {
  return {
    mode: "complex",
    id: document.getElementById("complexScenarioId").value,
    name: document.getElementById("complexScenarioName").value || "Unnamed Complex Scenario",
    complexGroupId: document.getElementById("complexGroupId").value || document.getElementById("complexScenarioId").value || "",
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
    hardCostMin: Number(document.getElementById("complexHardCostMin").value || 0),
    hardCostLikely: Number(document.getElementById("complexHardCostLikely").value || 0),
    hardCostMax: Number(document.getElementById("complexHardCostMax").value || 0),
    softCostMin: Number(document.getElementById("complexSoftCostMin").value || 0),
    softCostLikely: Number(document.getElementById("complexSoftCostLikely").value || 0),
    softCostMax: Number(document.getElementById("complexSoftCostMax").value || 0),
    mitigationCost: Number(document.getElementById("complexMitigationCost").value || 0),
    randomScenarioCount: Number(document.getElementById("complexRandomScenarioCount").value || 1000),
    items: currentComplexItems.slice(),
    mitigations: complexMitigations.slice(),
    evidence: complexEvidence.slice(),
    insurance: complexInsurance.slice(),
    acceptedRisk: getAcceptedRisk("complex")
  };
}

function getBetaPayload() {
  return {
    mode: "beta",
    id: document.getElementById("betaScenarioId")?.value || "",
    name: document.getElementById("betaScenarioName")?.value || "Unnamed Beta Scenario",
    productGroup: document.getElementById("betaProductGroup")?.value || "",
    riskDomain: document.getElementById("betaRiskDomain")?.value || "",
    scenarioStatus: document.getElementById("betaScenarioStatus")?.value || "Draft",
    scenarioOwner: document.getElementById("betaScenarioOwner")?.value || "",
    identifiedDate: document.getElementById("betaIdentifiedDate")?.value || "",
    projectOrProductName: document.getElementById("betaProjectOrProductName")?.value || "",
    plannedDecisionDate: document.getElementById("betaPlannedDecisionDate")?.value || "",
    plannedGoLiveDate: document.getElementById("betaPlannedGoLiveDate")?.value || "",
    description: document.getElementById("betaScenarioDescription")?.value || "",
    betaInputs: {
      min: Number(document.getElementById("betaMin")?.value || 0),
      mode: Number(document.getElementById("betaMode")?.value || 0),
      max: Number(document.getElementById("betaMax")?.value || 0)
    },
    randomScenarioCount: Number(document.getElementById("betaRandomScenarioCount")?.value || 1000),
    evidence: betaEvidence.slice(),
    insurance: betaInsurance.slice()
  };
}
function renderBetaSummary(summary) {
  document.getElementById("betaRelativeMean").value = Number(summary.relativeMean || 0).toFixed(4);
  document.getElementById("betaShapeA").value = Number(summary.a || 0).toFixed(4);
  document.getElementById("betaShapeB").value = Number(summary.b || 0).toFixed(4);
  document.getElementById("betaExpectedValue").value = Math.round(summary.expectedValue || 0);
  document.getElementById("betaP10").value = Math.round(summary.p10 || 0);
  document.getElementById("betaP50").value = Math.round(summary.p50 || 0);
  document.getElementById("betaP90").value = Math.round(summary.p90 || 0);
  document.getElementById("betaExpectedValueDisplay").textContent = currency(summary.expectedValue || 0);
  document.getElementById("betaP10Display").textContent = currency(summary.p10 || 0);
  document.getElementById("betaP50Display").textContent = currency(summary.p50 || 0);
  document.getElementById("betaP90Display").textContent = currency(summary.p90 || 0);
  document.getElementById("betaIterationsDisplay").textContent = summary.iterations || 0;
  const evidenceStats = summarizeEvidence(summary.evidence || []);
  const evidenceText = evidenceStats.count ? ` Evidence base: ${evidenceStats.count} recorded event${evidenceStats.count === 1 ? "" : "s"} with observed loss range ${currency(evidenceStats.minLoss)} to ${currency(evidenceStats.maxLoss)}.` : "";
  document.getElementById("betaNarrative").textContent = `Expected value is ${currency(summary.expectedValue || 0)} with a P10 to P90 range of ${currency(summary.p10 || 0)} to ${currency(summary.p90 || 0)} across ${summary.iterations || 0} simulated outcomes.${evidenceText}`;
}
function runBetaScenario() {
  const payload = getBetaPayload();
  const simulation = runBetaScenarioSimulation(payload.betaInputs, payload.randomScenarioCount);
  const summary = { ...payload, ...simulation };
  lastSummary = summary;
  renderBetaSummary(summary);
  activateView("beta");
}
function saveBetaScenario() {
  const payload = getBetaPayload();
  const saved = getSavedScenarios();
  if (!payload.id) {
    payload.id = generateScenarioId(saved);
    const idEl = document.getElementById("betaScenarioId");
    if (idEl) idEl.value = payload.id;
  }
  const simulation = runBetaScenarioSimulation(payload.betaInputs, payload.randomScenarioCount);
  const summary = { ...payload, ...simulation };
  const idx = saved.findIndex(x => x.id === summary.id);
  if (idx >= 0) saved[idx] = summary; else saved.unshift(summary);
  setSavedScenarios(saved);
  lastSummary = summary;
  renderBetaSummary(summary);
  renderSavedScenarios();
  refreshLibraries();
  activateView("saved");
}
function loadBetaTestScenario() {
  document.getElementById("betaScenarioId").value = "";
  document.getElementById("betaScenarioName").value = "New Product Rollout Planning";
  setSelectValueSafe("betaProductGroup", "Payment Services");
  setSelectValueSafe("betaRiskDomain", "Strategic & Business Model Risk");
  document.getElementById("betaScenarioStatus").value = "Under Review";
  document.getElementById("betaProjectOrProductName").value = "Embedded Payments Launch";
  document.getElementById("betaScenarioOwner").value = "Product Management";
  document.getElementById("betaIdentifiedDate").value = todayIso();
  document.getElementById("betaPlannedDecisionDate").value = todayIso();
  document.getElementById("betaPlannedGoLiveDate").value = "";
  document.getElementById("betaMin").value = 100000;
  document.getElementById("betaMode").value = 250000;
  document.getElementById("betaMax").value = 700000;
  document.getElementById("betaRandomScenarioCount").value = "1000";
  document.getElementById("betaScenarioDescription").value = "This beta scenario estimates the financial uncertainty range around a planned launch before the project is promoted to an active risk scenario.";
  betaEvidence = [
    { lossAmount: 180000, sourceType: "External", lossDate: "2024-07-15", organization: "Peer Fintech", evidenceType: "Industry Loss Event", regulation: "", confidence: "Medium", link: "", description: "Launch delay and remediation costs after controls failed in pilot.", notes: "" },
    { lossAmount: 95000, sourceType: "Internal", lossDate: "2025-02-10", organization: "Internal Pilot", evidenceType: "Internal Historical Loss", regulation: "", confidence: "High", link: "", description: "Rework and delay cost observed during internal pilot testing.", notes: "" }
  ];
  renderEvidenceTable("beta");
  runBetaScenario();
}
function promoteBetaScenarioToActive() {
  const beta = getBetaPayload();
  document.getElementById("singleScenarioName").value = beta.name;
  setSelectValueSafe("singleProductGroup", beta.productGroup);
  setSelectValueSafe("singleRiskDomain", beta.riskDomain);
  document.getElementById("singleScenarioOwner").value = beta.scenarioOwner;
  document.getElementById("singleIdentifiedDate").value = beta.identifiedDate || todayIso();
  document.getElementById("singleScenarioDescription").value = beta.description;
  document.getElementById("singleHardCostMin").value = beta.betaInputs.min || 0;
  document.getElementById("singleHardCostLikely").value = beta.betaInputs.mode || 0;
  document.getElementById("singleHardCostMax").value = beta.betaInputs.max || 0;
  singleEvidence = beta.evidence.slice();
  renderEvidenceTable("single");
  activateView("single");
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
    rangeLow: Math.round(pct(totalSamples, 0.10)),
    rangeMedian: Math.round(pct(totalSamples, 0.50)),
    rangeHigh: Math.round(pct(totalSamples, 0.90)),
    horizonRows
  };
}
function currency(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function summarizePayload(payload) {
  const total = payload.inherent;
  const itemCount = payload.mode === "complex" ? Math.max(payload.items.length, 1) : 1;
  const residual = Math.max(0, Math.round(total * (1 - payload.control / 100)));
  const tier = getRiskTier(residual);
  const frequency = getReviewFrequency(residual);
  const mc = runFinancialMonteCarlo(payload);
  const evidenceStats = summarizeEvidence(payload.evidence || []);

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
    decisionText,
    evidence: Array.isArray(payload.evidence) ? payload.evidence.slice() : [],
    evidenceStats
  };
}
function renderScenarioSummary(summary) {
  document.getElementById("scenarioIdDisplay").textContent = summary.id || "Not Saved";
  document.getElementById("inherentRiskScoreDisplay").textContent = summary.inherent;
  document.getElementById("residualRiskScore").textContent = summary.residual;
  document.getElementById("riskTier").textContent = summary.tier;
  document.getElementById("reviewFrequency").textContent = summary.frequency;
  document.getElementById("itemCount").textContent = summary.itemCount;
  document.getElementById("dashboardNarrative").textContent = `${summary.name} was run as a ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"} for ${summary.primaryProduct}. Product Group: ${summary.productGroup}. Primary regulation: ${summary.primaryRegulation}. Inherent risk score: ${summary.inherent}. Residual risk score: ${summary.residual}. Estimated annual exposure range: ${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}. Recommended review frequency: ${summary.frequency}.`;
  document.getElementById("aiSummaryBox").textContent = summary.generatedSummary;
  document.getElementById("reportSummary").innerHTML = `
    <li><span class="help-label" data-help="Auto-generated scenario identifier used for tracking and reporting."><strong>Scenario ID:</strong></span> ${escapeHtml(summary.id || "Not Saved")}</li>
    <li><span class="help-label" data-help="The scenario currently being evaluated or reported."><strong>Scenario:</strong></span> ${escapeHtml(summary.name)}</li>
    <li><span class="help-label" data-help="Shows whether the report is based on a single or complex scenario builder."><strong>Builder:</strong></span> ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"}</li>
    <li><span class="help-label" data-help="Overall business or organizational group associated with the scenario."><strong>Product Group:</strong></span> ${escapeHtml(summary.productGroup)}</li>
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
    <li><span class="help-label" data-help="Historical loss evidence count recorded for this scenario, including internal and external support."><strong>Evidence Records:</strong></span> ${summary.evidenceStats?.count || 0}</li>
  `;
  document.getElementById("executiveDecisionBox").innerHTML = `
    <strong>Executive Decision Summary</strong><br>
    There is a ${escapeHtml(summary.tier.toLowerCase())} risk tied to <strong>${escapeHtml(summary.name)}</strong> that could cost the organization approximately <strong>${currency(summary.rangeLow)} to ${currency(summary.rangeHigh)}</strong> over a one-year period, with a most likely annual outcome near <strong>${currency(summary.rangeMedian)}</strong>.<br><br>
    Direct hard cost is modeled at approximately <strong>${currency(summary.hardCostExpected)}</strong> annually, while secondary or incidental soft cost is modeled at approximately <strong>${currency(summary.softCostExpected)}</strong> annually.<br><br>
    The estimated direct cost to mitigate the full risk is <strong>${currency(summary.mitigationCost)}</strong>, and the modeled annual reduction in loss is approximately <strong>${currency(summary.riskReductionValue)}</strong>.<br><br>
    ${escapeHtml(summary.decisionText)} Suggested next steps include validating assumptions, considering staged controls, and documenting whether alternative mitigating factors can reduce residual exposure at a lower cost.${summary.evidenceStats?.count ? ` The scenario currently includes ${summary.evidenceStats.count} historical evidence record${summary.evidenceStats.count === 1 ? "" : "s"} with source links to support the facts.` : ""}
  `;

  document.getElementById("decisionMetricsBody").innerHTML = `
    <tr><td>Expected Annual Loss</td><td>${currency(summary.expectedLoss)}</td></tr>
    <tr><td>Residual Annual Loss</td><td>${currency(summary.residualExpectedLoss)}</td></tr>
    <tr><td>Mitigation Cost</td><td>${currency(summary.mitigationCost)}</td></tr>
    <tr><td>Annual Risk Reduction Value</td><td>${currency(summary.riskReductionValue)}</td></tr>
    <tr><td>Net Benefit / ROI</td><td>${currency(summary.mitigationROI)}</td></tr>
    <tr><td>Decision View</td><td>${summary.mitigationROI >= 0 ? "Cost effective to mitigate" : "Consider alternatives or partial controls"}</td></tr>
  `;

  renderEvidenceReport(summary);
  document.getElementById("horizonExposureBody").innerHTML = summary.horizonRows.map(row => `
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
function runScenario() {
  if (activeMode === "beta") {
    runBetaScenario();
    return;
  }
  const payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  const summary = summarizePayload(payload);
  lastSummary = summary;
  renderScenarioSummary(summary);
  renderMonteCarloTable(summary);
  renderCharts(summary);
  activateView("dashboard");
}
function saveScenario() {
  if (activeMode === "beta") {
    saveBetaScenario();
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
    <td>${s.mode === "single" ? "Single" : s.mode === "beta" ? "Beta" : "Complex"}</td>
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
    <td>${s.mode === "single" ? "Single Scenario" : s.mode === "complex" ? "Complex Scenario" : "Unknown"}</td>
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
  if (s.mode === "beta") {
    document.getElementById("betaScenarioId").value = s.id || "";
    document.getElementById("betaScenarioName").value = s.name || "";
    setSelectValueSafe("betaProductGroup", s.productGroup || "");
    setSelectValueSafe("betaRiskDomain", s.riskDomain || "");
    document.getElementById("betaScenarioStatus").value = s.scenarioStatus || "Draft";
    document.getElementById("betaProjectOrProductName").value = s.projectOrProductName || "";
    document.getElementById("betaScenarioOwner").value = s.scenarioOwner || "";
    document.getElementById("betaIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("betaPlannedDecisionDate").value = s.plannedDecisionDate || "";
    document.getElementById("betaPlannedGoLiveDate").value = s.plannedGoLiveDate || "";
    document.getElementById("betaMin").value = s.betaInputs?.min || 0;
    document.getElementById("betaMode").value = s.betaInputs?.mode || 0;
    document.getElementById("betaMax").value = s.betaInputs?.max || 0;
    document.getElementById("betaRandomScenarioCount").value = String(s.randomScenarioCount || 1000);
    document.getElementById("betaScenarioDescription").value = s.description || "";
    betaEvidence = Array.isArray(s.evidence) ? s.evidence.slice() : [];
    betaInsurance = Array.isArray(s.insurance) ? s.insurance.slice() : [];
    renderEvidenceTable("beta");
    renderInsuranceTable("beta");
    renderBetaSummary({ ...s, ...runBetaScenarioSimulation(s.betaInputs || { min: 0, mode: 0, max: 0 }, s.randomScenarioCount || 1000) });
    activeMode = "beta";
    activateView("beta");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (s.mode === "single") {
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
    document.getElementById("singleHardCostMin").value = s.hardCostMin || 0;
    document.getElementById("singleHardCostLikely").value = s.hardCostLikely || 0;
    document.getElementById("singleHardCostMax").value = s.hardCostMax || 0;
    document.getElementById("singleSoftCostMin").value = s.softCostMin || 0;
    document.getElementById("singleSoftCostLikely").value = s.softCostLikely || 0;
    document.getElementById("singleSoftCostMax").value = s.softCostMax || 0;
    document.getElementById("singleMitigationCost").value = s.mitigationCost || 0;
    const singleRandom = document.getElementById("singleRandomScenarioCount");
    if (singleRandom) singleRandom.value = String(s.randomScenarioCount || 1000);
    singleMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    renderMitigationTable("singleMitigationBody", singleMitigations);
  singleEvidence = [
    { lossAmount: 85000, sourceType: "Internal", lossDate: todayIso(), organization: "Internal Card Services", evidenceType: "Internal Historical Loss", regulation: "Reg E", confidence: "High", link: "", description: "Prior reimbursement and remediation event tied to dispute workflow timing.", notes: "" },
    { lossAmount: 140000, sourceType: "External", lossDate: "2024-11-20", organization: "Regional Bank Peer", evidenceType: "Industry Loss Event", regulation: "Reg E", confidence: "Medium", link: "", description: "Observed peer event involving dispute servicing breakdown and remediation cost.", notes: "" }
  ];
  renderEvidenceTable("single");
    singleEvidence = Array.isArray(s.evidence) ? s.evidence.slice() : [];
    singleInsurance = Array.isArray(s.insurance) ? s.insurance.slice() : [];
    renderEvidenceTable("single");
    renderInsuranceTable("single");
    document.getElementById("singleAcceptedRiskFlag").checked = !!s.acceptedRisk?.isAccepted;
    document.getElementById("singleAcceptanceAuthority").value = s.acceptedRisk?.authority || acceptanceAuthorities[0] || "";
    document.getElementById("singleAcceptedBy").value = s.acceptedRisk?.acceptedBy || "";
    document.getElementById("singleAcceptanceDate").value = s.acceptedRisk?.acceptanceDate || "";
    document.getElementById("singleReviewDate").value = s.acceptedRisk?.reviewDate || "";
    document.getElementById("singleDecisionLogic").value = s.acceptedRisk?.decisionLogic || "";
    activeMode = "single";
    updateInherentScores();
    activateView("single");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    document.getElementById("complexScenarioId").value = s.id || "";
    document.getElementById("complexScenarioName").value = s.name || "";
    document.getElementById("complexGroupId").value = s.complexGroupId || s.id || "";
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
    document.getElementById("complexHardCostMin").value = s.hardCostMin || 0;
    document.getElementById("complexHardCostLikely").value = s.hardCostLikely || 0;
    document.getElementById("complexHardCostMax").value = s.hardCostMax || 0;
    document.getElementById("complexSoftCostMin").value = s.softCostMin || 0;
    document.getElementById("complexSoftCostLikely").value = s.softCostLikely || 0;
    document.getElementById("complexSoftCostMax").value = s.softCostMax || 0;
    document.getElementById("complexMitigationCost").value = s.mitigationCost || 0;
    const complexRandom = document.getElementById("complexRandomScenarioCount");
    if (complexRandom) complexRandom.value = String(s.randomScenarioCount || 1000);
    currentComplexItems = Array.isArray(s.items) ? s.items.slice().map(item => ({
      issueId: item.issueId || `ISS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      parentScenarioMode: "complex",
      description: item.description || "",
      ...item
    })) : [];
    renderComplexItems();
    complexMitigations = Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    renderMitigationTable("complexMitigationBody", complexMitigations);
  complexEvidence = [
    { lossAmount: 210000, sourceType: "External", lossDate: "2024-08-12", organization: "Industry Consortium Case", evidenceType: "Industry Loss Event", regulation: "Reg DD", confidence: "Medium", link: "", description: "Modernization effort caused disclosure remediation and complaint handling expense.", notes: "" },
    { lossAmount: 120000, sourceType: "Internal", lossDate: "2025-01-18", organization: "Deposit Operations", evidenceType: "Internal Historical Loss", regulation: "UDAAP", confidence: "High", link: "", description: "Internal complaint remediation and overtime spend from servicing issue.", notes: "" }
  ];
  renderEvidenceTable("complex");
    complexEvidence = Array.isArray(s.evidence) ? s.evidence.slice() : [];
    complexInsurance = Array.isArray(s.insurance) ? s.insurance.slice() : [];
    renderEvidenceTable("complex");
    renderInsuranceTable("complex");
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
  document.getElementById("singleHardCostMin").value = 40000;
  document.getElementById("singleHardCostLikely").value = 135000;
  document.getElementById("singleHardCostMax").value = 325000;
  document.getElementById("singleSoftCostMin").value = 0.15;
  document.getElementById("singleSoftCostLikely").value = 0.35;
  document.getElementById("singleSoftCostMax").value = 0.65;
  document.getElementById("singleMitigationCost").value = 60000;
  const singleRandom = document.getElementById("singleRandomScenarioCount");
  if (singleRandom) singleRandom.value = "1000";
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
  document.getElementById("complexHardCostMin").value = 125000;
  document.getElementById("complexHardCostLikely").value = 475000;
  document.getElementById("complexHardCostMax").value = 1200000;
  document.getElementById("complexSoftCostMin").value = 0.20;
  document.getElementById("complexSoftCostLikely").value = 0.45;
  document.getElementById("complexSoftCostMax").value = 0.90;
  document.getElementById("complexMitigationCost").value = 210000;
  const complexRandom = document.getElementById("complexRandomScenarioCount");
  if (complexRandom) complexRandom.value = "1000";
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
  const addSingleEvidenceBtn = document.getElementById("addSingleEvidenceBtn");
  if (addSingleEvidenceBtn) addSingleEvidenceBtn.addEventListener("click", () => addEvidence("single"));
  const addComplexEvidenceBtn = document.getElementById("addComplexEvidenceBtn");
  if (addComplexEvidenceBtn) addComplexEvidenceBtn.addEventListener("click", () => addEvidence("complex"));
  const addBetaEvidenceBtn = document.getElementById("addBetaEvidenceBtn");
  if (addBetaEvidenceBtn) addBetaEvidenceBtn.addEventListener("click", () => addEvidence("beta"));
  const addSingleInsuranceBtn = document.getElementById("addSingleInsuranceBtn");
  if (addSingleInsuranceBtn) addSingleInsuranceBtn.addEventListener("click", () => addInsurance("single"));
  const addComplexInsuranceBtn = document.getElementById("addComplexInsuranceBtn");
  if (addComplexInsuranceBtn) addComplexInsuranceBtn.addEventListener("click", () => addInsurance("complex"));
  const addBetaInsuranceBtn = document.getElementById("addBetaInsuranceBtn");
  if (addBetaInsuranceBtn) addBetaInsuranceBtn.addEventListener("click", () => addInsurance("beta"));
  document.getElementById("saveScenarioBtn").addEventListener("click", saveScenario);
  document.getElementById("runScenarioBtn").addEventListener("click", runScenario);
  document.getElementById("loadSingleTestBtn").addEventListener("click", loadSingleTestScenario);
  document.getElementById("loadComplexTestBtn").addEventListener("click", loadComplexTestScenario);
  const loadBetaBtn = document.getElementById("loadBetaTestBtn");
  if (loadBetaBtn) loadBetaBtn.addEventListener("click", loadBetaTestScenario);
  const runBetaBtn = document.getElementById("runBetaScenarioBtn");
  if (runBetaBtn) runBetaBtn.addEventListener("click", runBetaScenario);
  const saveBetaBtn = document.getElementById("saveBetaScenarioBtn");
  if (saveBetaBtn) saveBetaBtn.addEventListener("click", saveBetaScenario);
  const promoteBetaBtn = document.getElementById("promoteBetaScenarioBtn");
  if (promoteBetaBtn) promoteBetaBtn.addEventListener("click", promoteBetaScenarioToActive);

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
  if (outcomesBtn) outcomesBtn.addEventListener("click", () => {
    if (!lastSummary) {
      alert("Run or open a scenario first.");
      return;
    }
    const xml = buildOutcomesTableText(lastSummary);
    fileDownload(`random_outcomes_${(lastSummary?.id || currentDateStamp())}.xls`, xml, "application/vnd.ms-excel");
  });
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
    <p>Inherent risk is calculated, not manually entered. Single Scenario uses likelihood and impact. Complex Scenario uses the weighted average of risk items. Residual risk applies control effectiveness to the inherent score.</p>
    <h4>Financial Risk Modeling</h4>
    <p>The report separately considers direct hard cost and secondary or incidental soft cost. Hard cost is modeled as a bounded direct loss estimate. Soft cost is modeled as a multiplier applied to hard cost to reflect reputational, operational, complaint, and related secondary impacts.</p>
    <h4>Monte Carlo Method</h4>
    <p>The model uses bounded Monte Carlo simulation with triangular sampling. For each scenario, the user provides a minimum, most-likely, and maximum hard cost estimate, plus a minimum, most-likely, and maximum soft-cost multiplier. The model performs repeated randomized draws within those bounds and estimates a distribution of annual losses.</p>
    <p>This approach is designed to support U.S. regulatory examiner expectations by documenting assumptions, preserving bounded input ranges, showing the method used, and producing transparent output tables that can be reproduced and reviewed later.</p>
    <h4>Executive Decision Analysis</h4>
    <p>Reports now explain what the score means, estimate annual exposure ranges, compare expected loss to mitigation cost, and present a decision view on whether mitigation appears cost effective or whether other mitigating factors should be considered.</p>
    <h4>Time Horizons</h4>
    <p>Each report now includes one-year, three-year, five-year, ten-year, fifteen-year, twenty-year, twenty-five-year, and thirty-plus-year outlooks, both with and without mitigation, so leadership can understand longer-term exposure.</p>
    <h4>Category Admin</h4>
    <p>Category-driven fields are alphabetized. Existing selections are shown in Category Admin where users can add, edit, or remove values.</p>
    <h4>Future Scenario Types</h4>
    <p>The current tool supports Single Scenario and Complex Scenario builders. A future phase is planned for a dedicated scenario menu supporting beta-distribution-based project planning and related forecasting use cases.</p>
    <h4>Storage Limitation</h4>
    <p>Saved scenarios still live in local browser storage today. A later phase should add export/import and then shared storage so scenarios can follow the user across different workstations.</p>
  `;
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
    children.push(new Paragraph(`Product Group: ${s.productGroup} | Risk Domain: ${s.riskDomain} | Status: ${s.scenarioStatus}`));
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

function fileDownload(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function textDownload(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
function buildBoardPacketText(summary) {
  if (!summary) return "No scenario has been run or selected.";
  const lines = [];
  lines.push("BOARD RISK BRIEF");
  lines.push(`Scenario: ${summary.name}`);
  lines.push(`Scenario ID: ${summary.id || "Not Saved"}`);
  lines.push(`Builder: ${summary.mode === "single" ? "Single Scenario" : "Complex Scenario"}`);
  lines.push(`Product Group: ${summary.productGroup}`);
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
  manual.innerHTML = `
    <h4>Purpose</h4>
    <p>Risk Manager is used to evaluate single and complex risk scenarios, generate narrative summaries, maintain saved scenarios, and support executive decision-making with quantified risk estimates.</p>
    <h4>Single vs Complex Scenarios</h4>
    <p>Use Single Scenario for one focused issue. Use Complex Scenario for a broader project, business area, product family, or department with multiple weighted risk items.</p>
    <h4>Calculated Scores</h4>
    <p>Inherent risk is calculated, not typed in manually. Single Scenario uses likelihood and impact. Complex Scenario uses the weighted average of the individual complex risk items. Residual risk applies the stated control-effectiveness percentage to the inherent score.</p>
    <h4>Financial Modeling</h4>
    <p>The report separately evaluates direct <strong>hard cost</strong> and secondary or incidental <strong>soft cost</strong>. Hard cost is modeled as a bounded direct loss estimate. Soft cost is modeled as a bounded multiplier applied to hard cost to reflect secondary impacts such as reputational damage, customer complaints, operational disruption, and related indirect effects.</p>
    <h4>Monte Carlo Method</h4>
    <p>The model uses bounded Monte Carlo simulation with triangular sampling. For each scenario, the user provides a minimum, most-likely, and maximum hard-cost estimate, plus a minimum, most-likely, and maximum soft-cost multiplier. The model performs repeated randomized draws within those bounds and estimates a distribution of annual losses.</p>
    <p>This approach is intended to satisfy U.S. examiner expectations by documenting assumptions, using bounded inputs, identifying the method used, preserving transparency in the output tables, and allowing the methodology to be reviewed later.</p>
    <h4>Executive Decision Analysis</h4>
    <p>Reports explain what the score means, estimate annual exposure ranges, compare expected loss to mitigation cost, and present a decision view on whether mitigation appears cost effective or whether alternative mitigating factors should be considered.</p>
    <h4>Time Horizons</h4>
    <p>Each report includes outlooks for 1 year, 3 years, 5 years, 10 years, 15 years, 20 years, 25 years, and 30+ years, both with and without mitigation, so decision makers can understand longer-term exposure.</p>
    <h4>Category Admin</h4>
    <p>Category-driven fields are alphabetized. Existing selections are shown in Category Admin where users can add, edit, remove, and now restore the default libraries if needed.</p>
    <h4>Future Scenario Types</h4>
    <p>The current tool supports Single Scenario and Complex Scenario builders. A future phase is planned for a dedicated scenario menu supporting beta-distribution-based project planning and related forecasting use cases.</p>
    <h4>Storage Limitation</h4>
    <p>Saved scenarios still live in local browser storage today. A later phase should add export/import and then shared storage so scenarios can follow the user across different workstations.</p>
  `;
}

function init() {
  loadStoredMonteCarloConfig();
  wireInputs();
  renderManual();
  forceManualContent();
  renderMitigationTable("singleMitigationBody", singleMitigations);
  renderMitigationTable("complexMitigationBody", complexMitigations);
  renderEvidenceTable("single");
  renderEvidenceTable("complex");
  renderEvidenceTable("beta");
  renderComplexItems();
  refreshLibraries();
  updateInherentScores();
  renderHeatMap();
  const restoreBtn = document.getElementById("restoreDefaultLibrariesBtn");
  if (restoreBtn) restoreBtn.addEventListener("click", restoreAllDefaultLibraries);
  setupRandomOutcomesCsvButton();
  renderEvidenceReport(null);
}
document.addEventListener("DOMContentLoaded", init);



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
  const oldBtn = document.getElementById("downloadOutcomesTableBtn");
  if (!oldBtn) return;
  oldBtn.textContent = "Download Random Outcomes CSV";

  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);

  newBtn.addEventListener("click", () => {
    if (!lastSummary) {
      alert("Run or open a scenario first.");
      return;
    }
    const exportSummary = (!Array.isArray(lastSummary.randomOutcomeRows) || !lastSummary.randomOutcomeRows.length)
      ? summarizePayload(lastSummary)
      : lastSummary;

    if (!Array.isArray(exportSummary.randomOutcomeRows) || !exportSummary.randomOutcomeRows.length) {
      alert("No randomized outcome rows were generated. Run the scenario again and try once more.");
      return;
    }

    const csv = buildRandomOutcomesCsv(exportSummary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `random_outcomes_${(exportSummary?.id || currentDateStamp())}.csv`;
    link.click();
  });
}

