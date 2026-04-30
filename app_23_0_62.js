const APP_VERSION = "23.0.61";

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
function setInputValueSafe(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = String(value ?? "");
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

const USER_STORAGE_KEY = "risk_manager_users_v2101";
const SESSION_USER_KEY = "risk_manager_session_user_v2101";
const SESSION_STORAGE_MODE_KEY = "risk_manager_session_storage_mode_v2101";
const WORKSPACE_LOCAL_PATH_KEY = "risk_manager_workspace_local_path_v2101";
const WORKSPACE_SHARED_PATH_KEY = "risk_manager_workspace_shared_path_v2101";
const SCENARIO_SAVE_ENGINE_KEY = "risk_manager_scenario_save_engine_v2101";
const WORKSPACE_PACKAGE_EXPORT_KEY = "risk_manager_workspace_package_export_v23014";

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
let users = [];
let userAdminEditId = "";

let rotationRules = structuredClone(DEFAULT_ROTATION_RULES);

let currentComplexItems = [];
let complexProductSections = [];
let singleInsurance = [];
let complexInsurance = [];
let singleHardFacts = [];
let complexHardFacts = [];
let complexCostLosses = [];
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

function updateComplexScenarioSelectionUI() {
  const indicator = document.getElementById("currentComplexEditingIndicator");
  const activeComponent = complexScenarioComponents.find(x => String(x.componentId || "") === String(activeComplexComponentId || ""));
  if (indicator) {
    const label = activeComponent
      ? `${activeComponent.scenarioName || "Unnamed Area Component"} (${activeComponent.componentId || ""})`
      : "New / Unsaved Component";
    indicator.textContent = `Currently Editing Component: ${label}`;
  }
  const tbody = document.getElementById("complexScenarioComponentsBody");
  if (!tbody) return;
  tbody.querySelectorAll("tr[data-component-id]").forEach((row) => {
    const isActive = String(row.dataset.componentId || "") === String(activeComplexComponentId || "");
    row.style.background = isActive ? "#eef4ff" : "";
    row.style.outline = isActive ? "2px solid #24459a" : "";
    row.style.outlineOffset = isActive ? "-2px" : "";
  });
}


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

function normalizeUserRecord(user) {
  return {
    userId: String(user?.userId || "").trim(),
    displayName: String(user?.displayName || "").trim(),
    emailOrLogin: String(user?.emailOrLogin || "").trim(),
    password: String(user?.password || "").trim(),
    role: String(user?.role || "Standard User").trim(),
    reportingLine: String(user?.reportingLine || "").trim(),
    department: String(user?.department || "").trim(),
    status: String(user?.status || "Active").trim(),
    createdDate: String(user?.createdDate || todayIso()).trim(),
    lastUpdatedDate: String(user?.lastUpdatedDate || todayIso()).trim()
  };
}
function getStoredUsers() {
  const raw = readJSON(USER_STORAGE_KEY, []);
  return Array.isArray(raw) ? raw.map(normalizeUserRecord) : [];
}
function setStoredUsers(items) {
  writeJSON(USER_STORAGE_KEY, items.map(normalizeUserRecord));
}
function generateUserId() {
  return `USR-${Date.now()}`;
}
function ensureDefaultUsers() {
  let stored = getStoredUsers();
  if (!stored.length) {
    stored = [normalizeUserRecord({
      userId: "USR-LOCAL-ADMIN",
      displayName: "Local Admin",
      emailOrLogin: "local.admin",
      password: "admin",
      role: "Admin",
      reportingLine: "Administration",
      department: "Administration",
      status: "Active",
      createdDate: todayIso(),
      lastUpdatedDate: todayIso()
    })];
    setStoredUsers(stored);
  }
  return stored;
}
function getSessionUserId() {
  return localStorage.getItem(SESSION_USER_KEY) || "";
}
function setSessionUserId(value) {
  localStorage.setItem(SESSION_USER_KEY, String(value || ""));
}
function getSessionStorageMode() {
  return localStorage.getItem(SESSION_STORAGE_MODE_KEY) || "Local Workspace";
}
function setSessionStorageMode(value) {
  localStorage.setItem(SESSION_STORAGE_MODE_KEY, String(value || "Local Workspace"));
}

function getWorkspaceLocalPath() {
  return localStorage.getItem(WORKSPACE_LOCAL_PATH_KEY) || "";
}
function setWorkspaceLocalPath(value) {
  localStorage.setItem(WORKSPACE_LOCAL_PATH_KEY, String(value || ""));
}
function getWorkspaceSharedPath() {
  return localStorage.getItem(WORKSPACE_SHARED_PATH_KEY) || "";
}
function setWorkspaceSharedPath(value) {
  localStorage.setItem(WORKSPACE_SHARED_PATH_KEY, String(value || ""));
}
function getScenarioSaveEngine() {
  return localStorage.getItem(SCENARIO_SAVE_ENGINE_KEY) || "Chrome/Edge Workspace Folder";
}
function setScenarioSaveEngine(value) {
  localStorage.setItem(SCENARIO_SAVE_ENGINE_KEY, String(value || "Chrome/Edge Workspace Folder"));
}
function getCurrentSaveDestinationText() {
  const engine = getScenarioSaveEngine();
  if (engine === "Shared Workspace Reference Only") {
    const sharedPath = getWorkspaceSharedPath();
    return sharedPath ? `Browser local storage + shared workspace reference (${sharedPath})` : "Browser local storage + shared workspace reference (path not set)";
  }
  const localPath = getWorkspaceLocalPath();
  return localPath ? `Browser local storage (workspace reference: ${localPath})` : "Browser local storage";
}
function getActualBrowserSaveLocationText() {
  const origin = (() => {
    try { return window.location.origin || "browser origin"; } catch (e) { return "browser origin"; }
  })();
  return `${origin} -> localStorage[${STORAGE_KEY}]`;
}
function getLastWorkspacePackageExport() {
  return localStorage.getItem(WORKSPACE_PACKAGE_EXPORT_KEY) || "Not yet exported";
}
function setLastWorkspacePackageExport(value) {
  localStorage.setItem(WORKSPACE_PACKAGE_EXPORT_KEY, String(value || ""));
}
function getWorkspaceCategorySnapshot() {
  return {
    productGroups: getStoredArray(CAT_KEYS.productGroups),
    products: getStoredArray(CAT_KEYS.products),
    regulations: getStoredArray(CAT_KEYS.regulations),
    riskDomains: getStoredArray(CAT_KEYS.riskDomains),
    scenarioStatuses: getStoredArray(CAT_KEYS.scenarioStatuses),
    scenarioSources: getStoredArray(CAT_KEYS.scenarioSources),
    acceptanceAuthorities: getStoredArray(CAT_KEYS.acceptanceAuthorities)
  };
}
function refreshWorkspaceDiagnostics() {
  const saveDest = document.getElementById("workspaceSaveDestination");
  if (saveDest) saveDest.value = getCurrentSaveDestinationText();
  const actual = document.getElementById("workspaceActualBrowserLocation");
  if (actual) actual.value = getActualBrowserSaveLocationText();
  const lastExport = document.getElementById("workspaceLastPackageExport");
  if (lastExport) lastExport.value = getLastWorkspacePackageExport();
}
function buildWorkspacePackagePayload() {
  return {
    exportedAt: new Date().toISOString(),
    phase: "23.0.61",
    workspaceSetup: {
      sessionUserId: getSessionUserId(),
      sessionStorageMode: getSessionStorageMode(),
      scenarioSaveEngine: getScenarioSaveEngine(),
      localPath: getWorkspaceLocalPath(),
      sharedPath: getWorkspaceSharedPath(),
      currentSaveDestination: getCurrentSaveDestinationText(),
      actualBrowserSaveLocation: getActualBrowserSaveLocationText()
    },
    users: getStoredUsers(),
    categories: getWorkspaceCategorySnapshot(),
    scenarios: getSavedScenarios()
  };
}
function downloadWorkspacePackage() {
  const payload = buildWorkspacePackagePayload();
  const stamp = new Date().toISOString();
  setLastWorkspacePackageExport(stamp);
  refreshWorkspaceDiagnostics();
  triggerDownload(`risktool_workspace_package_${currentDateStamp()}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const status = document.getElementById("workspaceSetupStatus");
  if (status) status.textContent = `Workspace package downloaded at ${stamp}.`;
}
function mergeUniqueStrings(existing, incoming) {
  return sortedUnique([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]);
}
function importWorkspacePackageFile(file) {
  if (!file) return;
  file.text().then(text => {
    const payload = JSON.parse(text);
    if (!payload || !Array.isArray(payload.scenarios)) {
      alert("Invalid workspace package JSON.");
      return;
    }
    if (Array.isArray(payload.users) && payload.users.length) {
      const existingUsers = getStoredUsers();
      const mergedUsers = new Map(existingUsers.map(u => [String(u.userId || ""), u]));
      payload.users.forEach(u => {
        if (u && u.userId) mergedUsers.set(String(u.userId), u);
      });
      writeJSON(USER_STORAGE_KEY, Array.from(mergedUsers.values()));
      users = ensureDefaultUsers();
    }
    if (payload.workspaceSetup) {
      setSessionUserId(payload.workspaceSetup.sessionUserId || getSessionUserId() || "");
      setSessionStorageMode(payload.workspaceSetup.sessionStorageMode || getSessionStorageMode());
      setScenarioSaveEngine(payload.workspaceSetup.scenarioSaveEngine || getScenarioSaveEngine());
      setWorkspaceLocalPath(payload.workspaceSetup.localPath || getWorkspaceLocalPath());
      setWorkspaceSharedPath(payload.workspaceSetup.sharedPath || getWorkspaceSharedPath());
    }
    const cats = payload.categories || {};
    if (cats.productGroups) setStoredArray(CAT_KEYS.productGroups, mergeUniqueStrings(getStoredArray(CAT_KEYS.productGroups), cats.productGroups));
    if (cats.products) setStoredArray(CAT_KEYS.products, mergeUniqueStrings(getStoredArray(CAT_KEYS.products), cats.products));
    if (cats.regulations) setStoredArray(CAT_KEYS.regulations, mergeUniqueStrings(getStoredArray(CAT_KEYS.regulations), cats.regulations));
    if (cats.riskDomains) setStoredArray(CAT_KEYS.riskDomains, mergeUniqueStrings(getStoredArray(CAT_KEYS.riskDomains), cats.riskDomains));
    if (cats.scenarioStatuses) setStoredArray(CAT_KEYS.scenarioStatuses, mergeUniqueStrings(getStoredArray(CAT_KEYS.scenarioStatuses), cats.scenarioStatuses));
    if (cats.scenarioSources) setStoredArray(CAT_KEYS.scenarioSources, mergeUniqueStrings(getStoredArray(CAT_KEYS.scenarioSources), cats.scenarioSources));
    if (cats.acceptanceAuthorities) setStoredArray(CAT_KEYS.acceptanceAuthorities, mergeUniqueStrings(getStoredArray(CAT_KEYS.acceptanceAuthorities), cats.acceptanceAuthorities));
    const existing = getSavedScenarios();
    const mergedMap = new Map(existing.map(s => [String(s.id || ""), s]));
    payload.scenarios.map(normalizeScenario).forEach(s => {
      if (!s.id) s.id = generateScenarioId(Array.from(mergedMap.values()));
      mergedMap.set(String(s.id), s);
    });
    setSavedScenarios(Array.from(mergedMap.values()));
    refreshLibraries();
    renderUserAdmin();
    renderSavedScenarios();
    renderDashboardOpenTable();
    renderHeatMap();
    refreshWorkspaceDiagnostics();
    const status = document.getElementById("workspaceSetupStatus");
    if (status) status.textContent = `Workspace package imported: ${file.name}`;
  }).catch(err => {
    alert("Unable to import workspace package JSON.");
    console.error(err);
  });
}
function saveWorkspaceSetup() {
  setScenarioSaveEngine(document.getElementById("scenarioSaveEngine")?.value || "Local Browser Storage");
  setSessionStorageMode(document.getElementById("sessionStorageMode")?.value || "Local Workspace");
  setWorkspaceLocalPath(document.getElementById("workspaceLocalPath")?.value || "");
  setWorkspaceSharedPath(document.getElementById("workspaceSharedPath")?.value || "");
  const status = document.getElementById("workspaceSetupStatus");
  if (status) {
    status.textContent = `Workspace setup saved. Scenario records now use: ${getCurrentSaveDestinationText()}`;
  }
  renderUserAdmin();
  refreshWorkspaceDiagnostics();
}
function getCurrentSessionUser() {
  const sessionId = getSessionUserId();
  if (!sessionId) return null;
  return users.find(x => x.userId === sessionId && x.status === "Active") || null;
}
function populateUserAdminForm(user) {
  document.getElementById("userAdminUserId").value = user?.userId || "";
  document.getElementById("userAdminDisplayName").value = user?.displayName || "";
  document.getElementById("userAdminEmailOrLogin").value = user?.emailOrLogin || "";
  document.getElementById("userAdminPassword").value = user?.password || "";
  setSelectValueSafe("userAdminRole", user?.role || "Standard User");
  document.getElementById("userAdminReportingLine").value = user?.reportingLine || "";
  document.getElementById("userAdminDepartment").value = user?.department || "";
  setSelectValueSafe("userAdminStatus", user?.status || "Active");
}
function resetUserAdminForm() {
  userAdminEditId = "";
  populateUserAdminForm(null);
  document.getElementById("userAdminEditStatus").textContent = "No user selected for editing.";
}
function saveUserAdminRecord() {
  const displayName = document.getElementById("userAdminDisplayName").value.trim();
  const passwordValue = document.getElementById("userAdminPassword").value;
  if (!displayName) {
    alert("Display Name is required.");
    return;
  }
  if (!passwordValue) {
    alert("Password is required.");
    return;
  }
  const existing = getStoredUsers();
  const userId = userAdminEditId || document.getElementById("userAdminUserId").value || generateUserId();
  const record = normalizeUserRecord({
    userId,
    displayName,
    emailOrLogin: document.getElementById("userAdminEmailOrLogin").value,
    password: document.getElementById("userAdminPassword").value,
    role: document.getElementById("userAdminRole").value,
    reportingLine: document.getElementById("userAdminReportingLine").value,
    department: document.getElementById("userAdminDepartment").value,
    status: document.getElementById("userAdminStatus").value,
    createdDate: existing.find(x => x.userId === userId)?.createdDate || todayIso(),
    lastUpdatedDate: todayIso()
  });
  const idx = existing.findIndex(x => x.userId === userId);
  if (idx >= 0) existing[idx] = record
  else existing.unshift(record);
  setStoredUsers(existing);
  users = ensureDefaultUsers();

  renderUserAdmin();
  resetUserAdminForm();
}
function editUserAdminRecord(userId) {
  const user = users.find(x => x.userId === userId);
  if (!user) return;
  userAdminEditId = user.userId;
  populateUserAdminForm(user);
  document.getElementById("userAdminEditStatus").textContent = `Editing ${user.displayName}`;
}
function toggleUserAdminStatus(userId) {
  const existing = getStoredUsers();
  const idx = existing.findIndex(x => x.userId === userId);
  if (idx < 0) return;
  existing[idx].status = existing[idx].status === "Active" ? "Inactive" : "Active";
  existing[idx].lastUpdatedDate = todayIso();
  setStoredUsers(existing);
  users = ensureDefaultUsers();
  renderUserAdmin();
}

function getActiveUserOptions() {
  return users.filter(x => x.status === "Active");
}
function refreshOwnershipSelects() {
  const activeUsers = getActiveUserOptions();
  const options = activeUsers.map(u => u.userId);
  populateSelect("sessionActiveUserId", options);
  const sessionUser = getCurrentSessionUser();
  setSelectValueSafe("sessionActiveUserId", getSessionUserId() || sessionUser?.userId || activeUsers[0]?.userId || "");
  setSelectValueSafe("sessionStorageMode", getSessionStorageMode());
  const localPath = document.getElementById("workspaceLocalPath");
  const sharedPath = document.getElementById("workspaceSharedPath");
  if (localPath) localPath.value = getWorkspaceLocalPath();
  if (sharedPath) sharedPath.value = getWorkspaceSharedPath();
}
function applyOwnershipFieldsToForms(record, mode) {
  return;
}
function collectOwnershipFieldsFromForms(payload, mode, existingRecord) {
  return applyOwnershipMetadata(payload, existingRecord);
}
function resetOwnershipFields(mode) {
  return;
}


function isUserLoggedIn() {
  const sessionUser = getCurrentSessionUser();
  return !!sessionUser;
}
function refreshLoginGateOptions() {
  const pwd = document.getElementById("loginGatePassword");
  if (pwd) pwd.value = "";
  setSelectValueSafe("loginGateStorageMode", getSessionStorageMode());
}
function showLoginGate() {
  refreshLoginGateOptions();
  const gate = document.getElementById("loginGate");
  if (gate) {
    gate.style.display = "flex";
    gate.style.pointerEvents = "auto";
    gate.style.visibility = "visible";
    gate.style.opacity = "1";
  }
}
function lockAppShell() {
  return;
}

function unlockAppShell() {
  const sidebar = document.querySelector(".sidebar");
  const main = document.querySelector(".main");
  if (sidebar) {
    sidebar.style.pointerEvents = "";
    sidebar.style.opacity = "";
  }
  if (main) {
    main.style.pointerEvents = "";
    main.style.opacity = "";
  }
}

function destroyLoginGate() {
  const gate = document.getElementById("loginGate");
  if (gate && gate.parentNode) {
    gate.parentNode.removeChild(gate);
  }
}

function hideLoginGate() {
  const gate = document.getElementById("loginGate");
  if (gate) {
    gate.style.display = "none";
    gate.style.pointerEvents = "none";
    gate.style.visibility = "hidden";
    gate.style.opacity = "0";
  }
}
function updateLoginState() {
  const sessionUser = getCurrentSessionUser();
  const gate = document.getElementById("loginGate");
  if (!sessionUser) {
    if (gate) showLoginGate();
    const sessionUserDisplay = document.getElementById("sessionUserDisplay");
    if (sessionUserDisplay) sessionUserDisplay.textContent = "Not Set";
  } else {
    if (gate) hideLoginGate();
    unlockAppShell();
    const sessionUserDisplay = document.getElementById("sessionUserDisplay");
    if (sessionUserDisplay) sessionUserDisplay.textContent = sessionUser.displayName || "Not Set";
  }
  const sessionStorageDisplay = document.getElementById("sessionStorageDisplay");
  if (sessionStorageDisplay) sessionStorageDisplay.textContent = getSessionStorageMode();
}
function startUserSession() {
  ensureDefaultUsers();
  users = getStoredUsers();
  const userText = String(document.getElementById("loginGateUserText")?.value || "").trim();
  const password = String(document.getElementById("loginGatePassword")?.value || "");
  const status = document.getElementById("loginGateStatus");

  if (!userText) {
    if (status) status.textContent = "Enter a user name or login first.";
    return;
  }

  const normalizedUserText = userText.toLowerCase();
  let user = users.find(x =>
    x.status === "Active" &&
    (
      String(x.displayName || "").trim().toLowerCase() === normalizedUserText ||
      String(x.emailOrLogin || "").trim().toLowerCase() === normalizedUserText
    )
  );

  if (!user && normalizedUserText === "admin" && password === "admin") {
    user = users.find(x => String(x.userId || "") === "USR-ADMIN") || {
      userId: "USR-ADMIN",
      displayName: "Admin",
      emailOrLogin: "admin",
      password: "admin",
      role: "Admin",
      reportingLine: "Administration",
      department: "Administration",
      status: "Active"
    };
  }

  if (!user && (normalizedUserText === "local admin" || normalizedUserText === "local.admin") && password === "admin") {
    user = users.find(x => String(x.userId || "") === "USR-LOCAL-ADMIN") || {
      userId: "USR-LOCAL-ADMIN",
      displayName: "Local Admin",
      emailOrLogin: "local.admin",
      password: "admin",
      role: "Admin",
      reportingLine: "Administration",
      department: "Administration",
      status: "Active"
    };
  }

  if (!user) {
    if (status) status.textContent = "User was not found.";
    return;
  }

  const expectedPassword = String(user.password || "").trim();
  if (expectedPassword !== password) {
    if (status) status.textContent = "Password is incorrect.";
    return;
  }

  setSessionUserId(user.userId);
  setSessionStorageMode(document.getElementById("loginGateStorageMode")?.value || "Local Workspace");
  if (status) status.textContent = "Session started.";
  hideLoginGate();
  destroyLoginGate();
  unlockAppShell();
  renderUserAdmin();
  updateLoginState();
  setTimeout(function(){ if (typeof showPostLoginRestoreScreen === "function") showPostLoginRestoreScreen(); }, 150);
}

function openUserAdminFromLogin() {
  hideLoginGate();
  activateView("users");
  const status = document.getElementById("loginGateStatus");
  if (status) status.textContent = "You can manage users and workspace setup here. Default Local Admin password is admin unless changed.";
}

function guardLoggedInAction(event) {
  return;
}

function renderUserAdmin() {
  const body = document.getElementById("userAdminBody");
  if (!body) return;
  users = ensureDefaultUsers();
  const activeUsers = users.filter(x => x.status === "Active");
  document.getElementById("activeUserCount").textContent = String(activeUsers.length);
  const sessionSelect = document.getElementById("sessionActiveUserId");
  const currentSessionUser = getCurrentSessionUser();
  if (sessionSelect) {
    sessionSelect.innerHTML = activeUsers.map(u => `<option value="${escapeHtml(u.userId)}">${escapeHtml(u.displayName)} (${escapeHtml(u.role)})</option>`).join("");
    setSelectValueSafe("sessionActiveUserId", getSessionUserId() || activeUsers[0]?.userId || "");
  }
  setSelectValueSafe("sessionStorageMode", getSessionStorageMode());
  document.getElementById("sessionUserDisplay").textContent = currentSessionUser?.displayName || "Not Set";
  document.getElementById("sessionStorageDisplay").textContent = getSessionStorageMode();
  updateLoginState();
  refreshOwnershipSelects();
  refreshWorkspaceDiagnostics();
  if (!users.length) {
    body.innerHTML = '<tr><td colspan="9">No users available.</td></tr>';
    return;
  }
  body.innerHTML = users.map(u => `<tr>
    <td>${escapeHtml(u.userId)}</td>
    <td>${escapeHtml(u.displayName)}</td>
    <td>${escapeHtml(u.emailOrLogin)}</td>
    <td>${escapeHtml(u.role)}</td>
    <td>${escapeHtml(u.reportingLine)}</td>
    <td>${escapeHtml(u.department)}</td>
    <td>${escapeHtml(u.status)}</td>
    <td>
      <button class="btn btn-secondary small-btn" type="button" data-user-edit="${escapeHtml(u.userId)}">Edit</button>
      <button class="btn btn-secondary small-btn" type="button" data-user-toggle="${escapeHtml(u.userId)}">${u.status === "Active" ? "Deactivate" : "Activate"}</button>
    </td>
  </tr>`).join("");
  body.querySelectorAll("[data-user-edit]").forEach(btn => btn.addEventListener("click", () => editUserAdminRecord(btn.dataset.userEdit)));
  body.querySelectorAll("[data-user-toggle]").forEach(btn => btn.addEventListener("click", () => toggleUserAdminStatus(btn.dataset.userToggle)));
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



function getComplexScenarioCostBasis() {
  const hardLikely = parseCurrencyValue(document.getElementById("complexHardCostLikely")?.value || 0);
  const softLikely = Number(document.getElementById("complexSoftCostLikely")?.value || 0);
  const mitigationCost = parseCurrencyValue(document.getElementById("complexMitigationCost")?.value || 0);
  return Math.max(1, hardLikely + (softLikely * 1000) + mitigationCost);
}
function statusCreditValue(status) {
  const value = String(status || "").toLowerCase();
  if (/effective|implemented|complete|closed|validated|active/.test(value)) return 1;
  if (/progress|partial|testing|pending/.test(value)) return 0.55;
  if (/planned|draft|proposed/.test(value)) return 0.25;
  if (/failed|expired|ineffective|open/.test(value)) return 0;
  return value ? 0.35 : 0;
}
function calculateProductSectionWeight(section) {
  const productName = String(section?.productServiceArea || "");
  const componentItems = (complexScenarioComponents || []).flatMap(component => Array.isArray(component.items) ? component.items : []);
  const combinedItems = [...(currentComplexItems || []), ...componentItems];
  const seenIssueIds = new Set();
  const linkedItems = combinedItems.filter(item => {
    if (String(item.product || "") !== productName) return false;
    const key = String(item.issueId || item.name || Math.random());
    if (seenIssueIds.has(key)) return false;
    seenIssueIds.add(key);
    return true;
  });
  if (!linkedItems.length) {
    return { weight: 1, rawScore: 0, note: "Calculated 1/5: no linked component risk items yet. Add risk items to raise or validate this area's exposure." };
  }
  let weightedScore = 0;
  let totalItemWeight = 0;
  linkedItems.forEach(item => {
    const itemWeight = Math.max(1, Number(item.weight || 1));
    weightedScore += Math.max(0, Number(item.score || 0)) * itemWeight;
    totalItemWeight += itemWeight;
  });
  const baseScore = weightedScore / Math.max(1, totalItemWeight);
  const componentHardFacts = (complexScenarioComponents || []).flatMap(component => Array.isArray(component.hardFacts) ? component.hardFacts : []);
  const allHardFacts = [...(complexHardFacts || []), ...componentHardFacts];
  const evidenceCount = Array.isArray(allHardFacts) ? allHardFacts.length : 0;
  const evidenceSourced = (allHardFacts || []).filter(f => String(f.source || f.attachment || f.notes || "").trim()).length;
  const evidenceStrength = Math.min(1, (evidenceCount * 0.18) + (evidenceSourced * 0.10));
  const uncertaintyFactor = 1.18 - Math.min(0.18, evidenceStrength * 0.18);
  const componentMitigations = (complexScenarioComponents || []).flatMap(component => Array.isArray(component.mitigations) ? component.mitigations : []);
  const allMitigations = [...(complexMitigations || []), ...componentMitigations];
  const mitigationCredits = (allMitigations || []).map(m => statusCreditValue(m.status));
  const mitigationCredit = mitigationCredits.length ? mitigationCredits.reduce((sum, val) => sum + val, 0) / mitigationCredits.length : 0;
  const costBasis = getComplexScenarioCostBasis();
  const componentInsurance = (complexScenarioComponents || []).flatMap(component => Array.isArray(component.insurance) ? component.insurance : []);
  const allInsurance = [...(complexInsurance || []), ...componentInsurance];
  const coverageAmount = totalCurrencyField(allInsurance, "coverageAmount");
  const deductibleAmount = totalCurrencyField(allInsurance, "deductible");
  const netCoverageRatio = Math.max(0, coverageAmount - deductibleAmount) / Math.max(1, costBasis);
  const insuranceCredit = Math.min(0.45, netCoverageRatio * 0.25);
  const adjustedScore = baseScore * uncertaintyFactor * (1 - Math.min(0.35, mitigationCredit * 0.35)) * (1 - insuranceCredit);
  const clampedScore = Math.max(0, Math.min(100, adjustedScore));
  const calculatedWeight = Math.max(1, Math.min(5, Math.ceil(clampedScore / 20)));
  const componentCount = (complexScenarioComponents || []).length + (currentComplexItems && currentComplexItems.length ? 1 : 0);
  const note = 'Calculated ' + calculatedWeight + '/5 from ' + linkedItems.length + ' linked component risk item(s) across ' + componentCount + ' component workspace(s), base score ' + Math.round(baseScore) + ', evidence count ' + evidenceCount + ', mitigation credit ' + Math.round(mitigationCredit * 100) + '%, and insurance offset ' + Math.round(insuranceCredit * 100) + '%.';
  return { weight: calculatedWeight, rawScore: Math.round(clampedScore), note };
}
function recalculateComplexProductSectionWeights() {
  complexProductSections = (complexProductSections || []).map(section => {
    const result = calculateProductSectionWeight(section);
    return { ...section, weight: result.weight, calculatedWeight: result.weight, calculatedRiskScore: result.rawScore, calculationNote: result.note };
  });
  const field = document.getElementById("complexSectionWeight");
  if (field) field.value = "Calculated after add";
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
function calculateComplexComponentRollup(component) {
  const items = Array.isArray(component?.items) ? component.items : [];
  const weighted = items.reduce((acc, item) => {
    const weight = Math.max(1, Number(item.weight || 1));
    acc.score += Math.max(0, Number(item.score || 0)) * weight;
    acc.weight += weight;
    return acc;
  }, { score: 0, weight: 0 });
  const itemBasedInherent = weighted.weight ? Math.round(weighted.score / weighted.weight) : 0;
  const inherent = Math.max(0, Math.min(100, Number(component?.inherent || itemBasedInherent || 0)));
  const controlCredit = Math.max(0, Math.min(0.85, Number(component?.control || 0) / 100));
  const mitigationItems = Array.isArray(component?.mitigations) ? component.mitigations : [];
  const mitigationCredit = mitigationItems.length
    ? Math.min(0.25, (mitigationItems.reduce((sum, m) => sum + statusCreditValue(m.status), 0) / mitigationItems.length) * 0.25)
    : 0;
  const insuranceItems = Array.isArray(component?.insurance) ? component.insurance : [];
  const exposure = Math.max(1, Number(component?.hardCostLikely || 0) + (Number(component?.softCostLikely || 0) * 1000) + Number(component?.mitigationCost || 0));
  const coverage = totalCurrencyField(insuranceItems, "coverageAmount");
  const deductible = totalCurrencyField(insuranceItems, "deductible");
  const insuranceCredit = Math.min(0.20, Math.max(0, coverage - deductible) / exposure * 0.20);
  const residualBeforeInsurance = Math.max(0, Math.min(100, Math.round(inherent * (1 - controlCredit) * (1 - mitigationCredit))));
  const residual = Math.max(0, Math.min(100, Math.round(residualBeforeInsurance * (1 - insuranceCredit))));
  const deltaRisk = Math.max(0, inherent - residual);
  const insuranceImpact = Math.max(0, residualBeforeInsurance - residual);
  const highest = items.slice().sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  const highestDriver = highest ? (highest.name || highest.issue || highest.issueId || "Risk item") : "No risk items yet";
  return { inherent, residual, deltaRisk, insuranceImpact, highestDriver };
}
function renderComplexProductSections() {
  const tbody = document.getElementById("complexProductSectionsBody");
  const status = document.getElementById("complexProductSectionStatus");
  if (!tbody) return;
  recalculateComplexProductSectionWeights();
  const areaName = (complexProductSections[0]?.productServiceArea || document.getElementById("complexSectionProduct")?.value || "Selected Area");
  if (!complexProductSections.length) {
    tbody.innerHTML = '<tr><td colspan="9">No area/product family added yet. Define the parent area first, then add components underneath it.</td></tr>';
    if (status) status.textContent = "Define the Area / Product Family before assigning component risk items.";
    refreshComplexProductSectionSelects();
    return;
  }
  if (!complexScenarioComponents.length) {
    const section = complexProductSections[0];
    tbody.innerHTML = '<tr><td colspan="9"><strong>Area Rollup: ' + escapeHtml(areaName) + '</strong><br><small>No saved components yet. Complete the Selected Component Workspace and click Save Area Component to build this rollup.</small><br><button class="btn btn-secondary" type="button" data-delete-product-section="' + escapeHtml(section.sectionId) + '">Delete Area</button></td></tr>';
    if (status) status.textContent = "Area Rollup: " + areaName + ". Add components to calculate overall area residual score and highest-risk component.";
    refreshComplexProductSectionSelects();
    return;
  }
  const rows = complexScenarioComponents.map(component => {
    const rollup = calculateComplexComponentRollup(component);
    const componentName = component.scenarioName || component.primaryProduct || component.componentId || "Unnamed Component";
    const statusText = component.scenarioStatus || (rollup.residual >= 70 ? "Elevated" : rollup.residual >= 40 ? "Moderate" : "Lower");
    return { component, rollup, componentName, statusText };
  });
  const overallResidual = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.rollup.residual, 0) / rows.length) : 0;
  const highestRisk = rows.slice().sort((a, b) => b.rollup.residual - a.rollup.residual)[0];
  tbody.innerHTML = rows.map(row => '<tr class="clickable-rollup-row" data-open-complex-component="' + escapeHtml(row.component.componentId || "") + '" title="Open component workspace">' +
    '<td><strong>' + escapeHtml(row.componentName) + '</strong><br><small>' + escapeHtml(row.component.componentId || "") + '</small></td>' +
    '<td>' + (Array.isArray(row.component.items) ? row.component.items.length : 0) + '</td>' +
    '<td>' + row.rollup.inherent + '</td>' +
    '<td><strong>' + row.rollup.residual + '</strong></td>' +
    '<td>' + row.rollup.deltaRisk + '</td>' +
    '<td>' + row.rollup.insuranceImpact + '</td>' +
    '<td>' + escapeHtml(row.rollup.highestDriver) + '</td>' +
    '<td>' + escapeHtml(row.statusText) + '</td>' +
    '<td><button class="scenario-link" type="button" data-open-complex-component-button="' + escapeHtml(row.component.componentId || "") + '">Open</button> <button class="btn btn-secondary" type="button" data-delete-complex-component="' + escapeHtml(row.component.componentId || "") + '">Delete</button></td>' +
    '</tr>').join("");
  tbody.querySelectorAll("tr[data-open-complex-component]").forEach(row => row.addEventListener("click", (event) => {
    const tag = String(event.target?.tagName || "").toLowerCase();
    if (tag === "button" || tag === "a" || tag === "input" || tag === "select" || tag === "textarea") return;
    openComplexScenarioComponent(row.dataset.openComplexComponent);
  }));
  tbody.querySelectorAll("[data-open-complex-component-button]").forEach(btn => btn.addEventListener("click", (event) => {
    event.stopPropagation();
    openComplexScenarioComponent(btn.dataset.openComplexComponentButton);
  }));
  if (status) status.textContent = "Area Rollup: " + areaName + ". Overall Area Residual Score: " + overallResidual + ". Highest-Risk Component: " + (highestRisk ? highestRisk.componentName : "None") + ".";
  refreshComplexProductSectionSelects();
}
function addComplexProductSection() {
  const productServiceArea = document.getElementById("complexSectionProduct")?.value || "";
  const notes = document.getElementById("complexSectionNotes")?.value || "";
  if (!productServiceArea) {
    alert("Select an Area / Product Family first.");
    return;
  }
  if (complexProductSections.some(section => section.productServiceArea === productServiceArea)) {
    alert("That Area / Product Family is already added to this complex review.");
    return;
  }
  complexProductSections.push({
    sectionId: `SEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productServiceArea,
    weight: 1,
    calculatedWeight: 1,
    calculatedRiskScore: 0,
    calculationNote: "Calculated after component risk items are added.",
    notes
  });
  renderComplexProductSections();
}
function deleteComplexProductSection(sectionId) {
  const section = complexProductSections.find(x => String(x.sectionId || "") === String(sectionId || ""));
  if (!section) return;

  const linkedItems = currentComplexItems.filter(item => String(item.product || "") === String(section.productServiceArea || ""));
  if (linkedItems.length) {
    const confirmed = window.confirm(`This will delete the Area / Product Family "${section.productServiceArea}" and ${linkedItems.length} associated risk item(s). Continue?`);
    if (!confirmed) return;
    currentComplexItems = currentComplexItems.filter(item => String(item.product || "") !== String(section.productServiceArea || ""));
  } else {
    const confirmed = window.confirm(`Delete Area / Product Family "${section.productServiceArea}"?`);
    if (!confirmed) return;
  }

  complexProductSections = complexProductSections.filter(x => String(x.sectionId || "") !== String(sectionId || ""));
  renderComplexProductSections();
  renderComplexItems();
  renderCostLossTable("complexCostLossBody", complexCostLosses);
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
  const scenarioName = document.getElementById("complexScenarioName")?.value || "Unnamed Area Component";
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
    costLosses: complexCostLosses.map(item => ({ ...item })),
    hardCostMin: getComplexCostLossSummary().hardMin,
    hardCostLikely: getComplexCostLossSummary().hardLikely,
    hardCostMax: getComplexCostLossSummary().hardMax,
    softCostMin: getComplexCostLossSummary().softMin,
    softCostLikely: getComplexCostLossSummary().softLikely,
    softCostMax: getComplexCostLossSummary().softMax,
    mitigationCost: getComplexCostLossSummary().mitigationLikely,
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
  setSelectValueSafe("complexScenarioStatus", component.scenarioStatus || scenarioStatuses[0] || "Open");
  setSelectValueSafe("complexProductGroup", component.productGroup || products[0] || "");
  setSelectValueSafe("complexRiskDomain", component.riskDomain || riskDomains[0] || "");
  setSelectValueSafe("complexPrimaryProduct", component.primaryProduct || productGroups[0] || "");
  setSelectValueSafe("complexPrimaryRegulation", component.primaryRegulation || regulations[0] || "");
  setInputValueSafe("complexScenarioOwner", component.scenarioOwner || "");
  document.getElementById("complexIdentifiedDate").value = component.identifiedDate || "";
  document.getElementById("complexScenarioDescription").value = component.description || "";
  document.getElementById("complexControlEffectiveness").value = component.control || 0;
  complexCostLosses = Array.isArray(component.costLosses) ? component.costLosses.map(item => ({ ...item })) : migrateLegacyComponentCosts(component);
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
  if (!Array.isArray(component.costLosses)) complexCostLosses = migrateLegacyComponentCosts(component);
  complexMitigations = Array.isArray(component.mitigations) ? component.mitigations.map(item => ({ ...item })) : [];
  renderComplexItems();
  renderInsuranceTable("complexInsuranceBody", complexInsurance);
  renderHardFactsTable("complexHardFactsBody", complexHardFacts);
  renderCostLossTable("complexCostLossBody", complexCostLosses);
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
  renderComplexProductSections();
  updateComplexScenarioSelectionUI();
}
function syncComplexComponentIdField(forceNew = false) {
  const field = document.getElementById("complexComponentId");
  if (forceNew || !activeComplexComponentId) activeComplexComponentId = generateComponentId();
  if (field) field.value = activeComplexComponentId || "";
  updateComplexScenarioSelectionUI();
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
  renderComplexProductSections();
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

function deleteComplexScenarioComponent(componentId) {
  const component = complexScenarioComponents.find(x => String(x.componentId || "") === String(componentId || ""));
  if (!component) return;
  const componentName = component.scenarioName || component.primaryProduct || component.componentId || "this component";
  const itemCount = Array.isArray(component.items) ? component.items.length : 0;
  const evidenceCount = Array.isArray(component.hardFacts) ? component.hardFacts.length : 0;
  const mitigationCount = Array.isArray(component.mitigations) ? component.mitigations.length : 0;
  const insuranceCount = Array.isArray(component.insurance) ? component.insurance.length : 0;
  const confirmed = window.confirm(`Delete "${componentName}" and all associated risk items, evidence, mitigations, insurance, and accepted-risk entries? This will remove ${itemCount} risk item(s), ${evidenceCount} evidence item(s), ${mitigationCount} mitigation(s), and ${insuranceCount} insurance record(s).`);
  if (!confirmed) return;

  complexScenarioComponents = complexScenarioComponents.filter(x => String(x.componentId || "") !== String(componentId || ""));

  if (String(activeComplexComponentId || "") === String(componentId || "")) {
    activeComplexComponentId = "";
    currentComplexItems = [];
    complexInsurance = [];
    complexHardFacts = [];
    complexCostLosses = [];
    complexMitigations = [];
    window.complexAcceptedRisks = [];
    syncComplexComponentIdField(true);
    renderComplexItems();
    renderInsuranceTable("complexInsuranceBody", complexInsurance);
    renderHardFactsTable("complexHardFactsBody", complexHardFacts);
    renderCostLossTable("complexCostLossBody", complexCostLosses);
    renderMitigationTable("complexMitigationBody", complexMitigations);
    renderAcceptedRiskTable("complexAcceptedRiskBody", window.complexAcceptedRisks, "complex");
  }

  renderComplexScenarioComponents();
  renderComplexProductSections();
  updateComplexScenarioSelectionUI();
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
    createdByUserId: saved.createdByUserId || "",
    createdByName: saved.createdByName || "",
    assignedOwnerUserId: saved.assignedOwnerUserId || "",
    assignedOwnerName: saved.assignedOwnerName || "",
    lastUpdatedByUserId: saved.lastUpdatedByUserId || "",
    lastUpdatedByName: saved.lastUpdatedByName || "",
    teamOrDepartment: saved.teamOrDepartment || "",
    storageMode: saved.storageMode || "Local Workspace",
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
  const raw = readJSON(STORAGE_KEY, []);
  return Array.isArray(raw) ? raw : [];
}
function setSavedScenarios(items) {
  writeJSON(STORAGE_KEY, Array.isArray(items) ? items : []);
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
  populateSelect("singlePrimaryProduct", productGroups);
  populateSelect("complexPrimaryProduct", productGroups);
  populateSelect("singlePrimaryRegulation", regulations);
  populateSelect("complexPrimaryRegulation", regulations);
  populateSelect("riskItemDomain", riskDomains);
  populateSelect("complexSectionProduct", productGroups);
  refreshComplexProductSectionSelects();
  populateSelect("riskItemReg", regulations);
  populateSelect("singleAcceptanceAuthority", acceptanceAuthorities);
  populateSelect("complexAcceptanceAuthority", acceptanceAuthorities);

  users = ensureDefaultUsers();
  renderCategoryAdmin();
  renderUserAdmin();
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
  if (viewName === "information") {
    if (typeof renderInformationPaneContent === "function") {
      renderInformationPaneContent();
    } else if (typeof renderManual === "function") {
      renderManual();
    }
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
    tbody.innerHTML = '<tr><td colspan="7">No risk items added yet.</td></tr>';
  } else {
    tbody.innerHTML = currentComplexItems.map(item => `<tr data-issue-id="${escapeHtml(item.issueId || "")}"><td><button class="scenario-link" data-issue-open="${escapeHtml(item.issueId || "")}">${escapeHtml(item.name)}</button></td><td>${escapeHtml(item.domain)}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.regulation)}</td><td>${item.score}</td><td>${item.weight}</td><td><button class="btn btn-secondary" type="button" data-delete-risk-item="${escapeHtml(item.issueId || "")}">Delete</button></td></tr>`).join("");
    tbody.querySelectorAll("[data-issue-open]").forEach(btn => btn.addEventListener("click", () => {
      const issueId = btn.dataset.issueOpen;
      highlightIssueRow(issueId);
    }));
  }
  refreshComplexProductSectionSelects();
  updateInherentScores();
  renderComplexProductSections();
}
function deleteComplexRiskItem(issueId) {
  const item = currentComplexItems.find(x => String(x.issueId || "") === String(issueId || ""));
  if (!item) return;
  const confirmed = window.confirm(`Delete risk item "${item.name || "Unnamed Risk Item"}"?`);
  if (!confirmed) return;
  currentComplexItems = currentComplexItems.filter(x => String(x.issueId || "") !== String(issueId || ""));
  renderComplexItems();
}
function addRiskItem() {
  if (!complexProductSections.length) {
    alert("Add an Area / Product Family first.");
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
  if (mode === "complex") renderComplexProductSections();
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
    scenarioOwner: (document.getElementById("singleScenarioOwner")?.value || ""),
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
    scenarioOwner: (document.getElementById("complexScenarioOwner")?.value || ""),
    identifiedDate: document.getElementById("complexIdentifiedDate").value,
    description: document.getElementById("complexScenarioDescription").value,
    likelihood: 0,
    impact: 0,
    inherent: avgInherent,
    control: Number(document.getElementById("complexControlEffectiveness").value || 0),
    hardCostMin: getComplexCostLossSummary().hardMin,
    hardCostLikely: getComplexCostLossSummary().hardLikely,
    hardCostMax: getComplexCostLossSummary().hardMax,
    softCostMin: getComplexCostLossSummary().softMin,
    softCostLikely: getComplexCostLossSummary().softLikely,
    softCostMax: getComplexCostLossSummary().softMax,
    mitigationCost: getComplexCostLossSummary().mitigationLikely,
    costLosses: complexCostLosses.map(item => ({ ...item })),
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
    scenarioOwner: (document.getElementById("betaScenarioOwner")?.value || "") || "",
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
  if (!isUserLoggedIn()) { showLoginGate(); return; }
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  let payload = getBetaPayload();
  const saved = getSavedScenarios();
  const existingRecord = saved.find(x => x.id === payload.id);
  payload = applyOwnershipMetadata(payload, existingRecord);
  if (!payload.id) {
    payload.id = generateScenarioId(saved);
    document.getElementById("betaScenarioId").value = payload.id;
  }
  const existingIndex = saved.findIndex(x => x.id === payload.id);
  if (existingIndex >= 0) saved[existingIndex] = normalizeScenario(payload); else saved.unshift(normalizeScenario(payload));
  setSavedScenarios(saved);
  if (typeof renderSavedScenarios === "function") renderSavedScenarios();
  if (typeof renderDashboardOpenTable === "function") renderDashboardOpenTable();
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
  setInputValueSafe("betaScenarioOwner", "Product Management");
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
  setInputValueSafe("singleScenarioOwner", payload.scenarioOwner || "");
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

function applyOwnershipMetadata(payload, existingRecord) {
  const sessionUser = getCurrentSessionUser();
  const sessionStorageMode = getSessionStorageMode();
  const assignedOwnerUserId = sessionUser?.userId || existingRecord?.assignedOwnerUserId || "";
  const assignedOwner = users.find(x => x.userId === assignedOwnerUserId) || sessionUser || null;
  payload.createdByUserId = existingRecord?.createdByUserId || sessionUser?.userId || "";
  payload.createdByName = existingRecord?.createdByName || sessionUser?.displayName || "";
  payload.assignedOwnerUserId = assignedOwnerUserId;
  payload.assignedOwnerName = assignedOwner?.displayName || existingRecord?.assignedOwnerName || "";
  payload.lastUpdatedByUserId = sessionUser?.userId || "";
  payload.lastUpdatedByName = sessionUser?.displayName || "";
  payload.teamOrDepartment = existingRecord?.teamOrDepartment || assignedOwner?.department || sessionUser?.department || "";
  payload.storageMode = sessionStorageMode || existingRecord?.storageMode || "Local Workspace";
  return payload;
}

function saveScenario(event) {
  if (!isUserLoggedIn()) { showLoginGate(); return; }
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  const activeViewEl = document.querySelector(".view.active");
  const currentViewName = activeViewEl?.id?.replace(/^view-/, "") || (activeMode === "complex" ? "complex" : "single");
  if (currentViewName === "beta") {
    saveBetaScenario(event);
    return;
  }
  let payload = activeMode === "single" ? getSinglePayload() : getComplexPayload();
  const saved = getSavedScenarios();
  const existingRecord = saved.find(x => x.id === payload.id);
  payload = applyOwnershipMetadata(payload, existingRecord);
  if (!payload.id) {
    payload.id = generateScenarioId(saved);
    if (payload.mode === "single") document.getElementById("singleScenarioId").value = payload.id;
    if (payload.mode === "complex") document.getElementById("complexScenarioId").value = payload.id;
  }
  const summary = summarizePayload(payload);
  const existingIndex = saved.findIndex(x => x.id === summary.id);
  if (existingIndex >= 0) saved[existingIndex] = summary; else saved.unshift(summary);
  setSavedScenarios(saved);
  if (typeof renderSavedScenarios === "function") renderSavedScenarios();
  if (typeof renderDashboardOpenTable === "function") renderDashboardOpenTable();
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
    tbody.innerHTML = '<tr><td colspan="11">No saved scenarios yet.</td></tr>';
    return;
  }
  tbody.innerHTML = saved.map(s => `<tr>
    <td>${escapeHtml(s.id)}</td>
    <td>${escapeHtml(s.name)}</td>
    <td>${s.mode === "single" ? "Single" : s.mode === "complex" ? "Complex" : s.mode === "beta" ? "Beta" : "Unknown"}</td>
    <td>${escapeHtml(s.productGroup)}</td>
    <td>${escapeHtml(s.scenarioStatus)}</td>
    <td>${escapeHtml(s.assignedOwnerName || "")}</td>
    <td>${escapeHtml(s.storageMode || "Local Workspace")}</td>
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
    tbody.innerHTML = '<tr><td colspan="11">No open scenarios available.</td></tr>';
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
    <td>${escapeHtml(s.assignedOwnerName || "")}</td>
    <td>${escapeHtml(s.storageMode || "Local Workspace")}</td>
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
    setSelectValueSafe("singleProductGroup", s.productGroup || products[0] || "");
    document.getElementById("singleRiskDomain").value = s.riskDomain || riskDomains[0] || "";
    document.getElementById("singleScenarioStatus").value = s.scenarioStatus || "Open";
    document.getElementById("singleScenarioSource").value = s.scenarioSource || scenarioSources[0] || "";
    setSelectValueSafe("singlePrimaryProduct", s.primaryProduct || productGroups[0] || "");
    document.getElementById("singlePrimaryRegulation").value = s.primaryRegulation || regulations[0] || "";
    setInputValueSafe("singleScenarioOwner", s.scenarioOwner || "");
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
    setInputValueSafe("betaScenarioOwner", s.scenarioOwner || "");
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
    setInputValueSafe("complexScenarioOwner", s.scenarioOwner || "");
    document.getElementById("complexIdentifiedDate").value = s.identifiedDate || "";
    document.getElementById("complexScenarioDescription").value = s.description || "";
    document.getElementById("complexControlEffectiveness").value = s.control || 0;
    complexCostLosses = Array.isArray(s.costLosses) ? s.costLosses.slice() : migrateLegacyComponentCosts(s);
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
    complexCostLosses = firstComponent && Array.isArray(firstComponent.costLosses) ? firstComponent.costLosses.slice() : (Array.isArray(s.costLosses) ? s.costLosses.slice() : migrateLegacyComponentCosts(s));
    complexMitigations = firstComponent && Array.isArray(firstComponent.mitigations) ? firstComponent.mitigations.slice() : Array.isArray(s.mitigations) ? s.mitigations.slice() : [];
    activeComplexComponentId = firstComponent?.componentId || "";
    syncComplexComponentIdField(!activeComplexComponentId);
    window.complexAcceptedRisks = Array.isArray(s.acceptedRiskEntries) && s.acceptedRiskEntries.length ? s.acceptedRiskEntries.slice() : (s.acceptedRisk ? [s.acceptedRisk] : []);
    renderInsuranceTable("complexInsuranceBody", complexInsurance);
    renderHardFactsTable("complexHardFactsBody", complexHardFacts);
    renderCostLossTable("complexCostLossBody", complexCostLosses);
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
  if (typeof renderSavedScenarios === "function") renderSavedScenarios();
  if (typeof renderDashboardOpenTable === "function") renderDashboardOpenTable();
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
  setInputValueSafe("singleScenarioOwner", "Compliance");
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
  setInputValueSafe("complexScenarioOwner", "Enterprise Risk");
  document.getElementById("complexIdentifiedDate").value = todayIso();
  document.getElementById("complexControlEffectiveness").value = 28;
  complexCostLosses = [
    { costLossId: nextRecordId('COST'), costType: 'Hard Loss', appliesTo: 'Component', riskItemId: '', amountMin: 125000, amountLikely: 475000, amountMax: 1200000, datePeriod: todayIso(), sourceType: 'Internal', notes: 'Direct hard-cost exposure for deposit modernization component.', sourceLink: '' },
    { costLossId: nextRecordId('COST'), costType: 'Soft Cost', appliesTo: 'Component', riskItemId: '', amountMin: 25000, amountLikely: 95000, amountMax: 250000, datePeriod: todayIso(), sourceType: 'Internal', notes: 'Secondary operational/customer-impact cost estimate.', sourceLink: '' },
    { costLossId: nextRecordId('COST'), costType: 'Remediation', appliesTo: 'Component', riskItemId: '', amountMin: 90000, amountLikely: 210000, amountMax: 400000, datePeriod: todayIso(), sourceType: 'Internal', notes: 'Control redesign and remediation cost.', sourceLink: '' }
  ];
  renderCostLossTable("complexCostLossBody", complexCostLosses);
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
  const workspaceDownloadBtn = document.getElementById("downloadWorkspacePackageBtn");
  if (workspaceDownloadBtn) workspaceDownloadBtn.addEventListener("click", downloadWorkspacePackage);
  const workspaceLoadBtn = document.getElementById("loadWorkspacePackageBtn");
  const workspaceLoadFile = document.getElementById("loadWorkspacePackageFile");
  if (workspaceLoadBtn && workspaceLoadFile) workspaceLoadBtn.addEventListener("click", () => workspaceLoadFile.click());
  if (workspaceLoadFile) workspaceLoadFile.addEventListener("change", (event) => {
    importWorkspacePackageFile(event.target.files?.[0]);
    event.target.value = "";
  });
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
  manual.innerHTML = (typeof getExpandedPolishedManualHtmlV2 === "function") ? getExpandedPolishedManualHtmlV2() : ((typeof getExpandedPolishedManualHtml === "function") ? getExpandedPolishedManualHtml() : getPolishedManualHtml());
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
  manual.innerHTML = (typeof getExpandedPolishedManualHtmlV2 === "function") ? getExpandedPolishedManualHtmlV2() : ((typeof getExpandedPolishedManualHtml === "function") ? getExpandedPolishedManualHtml() : getPolishedManualHtml());
}


function getModeCollection(kind, mode) {
  const map = {
    insurance: { single: singleInsurance, complex: complexInsurance, beta: betaInsurance },
    hardFact: { single: singleHardFacts, complex: complexHardFacts, beta: betaHardFacts },
    costLoss: { complex: complexCostLosses },
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
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="9">No hard facts / evidence entries added yet.</td></tr>'; return; }
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
  if (mode === "complex") renderComplexProductSections();
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
  if (mode === "complex") renderComplexProductSections();
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
  if (mode === "complex") renderComplexProductSections();
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
  const keyMap = { insurance: 'insuranceId', hardFact: 'hardFactId', mitigation: 'mitigationId', acceptedRisk: 'acceptedRiskId', costLoss: 'costLossId' };
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
  const keyMap = { insurance: 'insuranceId', hardFact: 'hardFactId', mitigation: 'mitigationId', acceptedRisk: 'acceptedRiskId', costLoss: 'costLossId' };
  const next = list.filter(x => String(x[keyMap[kind]]) !== String(id));
  if (kind === 'insurance') { if (mode === 'single') singleInsurance = next; else if (mode === 'complex') complexInsurance = next; else betaInsurance = next; renderInsuranceTable(`${mode}InsuranceBody`, next); resetInsuranceForm(mode); }
  if (kind === 'hardFact') { if (mode === 'single') singleHardFacts = next; else if (mode === 'complex') complexHardFacts = next; else betaHardFacts = next; renderHardFactsTable(`${mode}HardFactsBody`, next); resetHardFactForm(mode); }
  if (kind === 'mitigation') { if (mode === 'single') singleMitigations = next; else complexMitigations = next; renderMitigationTable(`${mode}MitigationBody`, next); resetMitigationForm(mode); }
  if (kind === 'acceptedRisk') { if (mode === 'single') window.singleAcceptedRisks = next; else window.complexAcceptedRisks = next; renderAcceptedRiskTable(`${mode}AcceptedRiskBody`, next, mode); resetAcceptedRiskForm(mode); }
}
function wireRecordMaintenanceEnhancements() {
  [['single','Insurance'],['complex','Insurance'],['beta','Insurance'],['single','HardFact'],['complex','HardFact'],['beta','HardFact'],['complex','CostLoss'],['single','Mitigation'],['complex','Mitigation'],['single','AcceptedRisk'],['complex','AcceptedRisk']].forEach(([mode,kind]) => {
    const btn = document.getElementById(`cancel${mode[0].toUpperCase()+mode.slice(1)}${kind}EditBtn`);
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = 'true';
      btn.addEventListener('click', () => {
        if (kind === 'Insurance') resetInsuranceForm(mode);
        if (kind === 'HardFact') resetHardFactForm(mode);
        if (kind === 'CostLoss') resetCostLossForm(mode);
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

/* ===== PHASE 23.0.61 COMPLEX COST/LOSS TABLE + EVIDENCE-DRIVEN RISK ITEMS ===== */
function migrateLegacyComponentCosts(component) {
  const records = [];
  if (!component) return records;
  const hardMin = safeNumber(component.hardCostMin || 0, 0);
  const hardLikely = safeNumber(component.hardCostLikely || 0, 0);
  const hardMax = safeNumber(component.hardCostMax || 0, 0);
  if (hardMin || hardLikely || hardMax) records.push({ costLossId: nextRecordId('COST'), costType: 'Hard Loss', appliesTo: 'Component', riskItemId: '', amountMin: hardMin, amountLikely: hardLikely || hardMin, amountMax: hardMax || hardLikely || hardMin, datePeriod: component.identifiedDate || '', sourceType: 'Legacy Component', notes: 'Migrated from prior component-level hard cost fields.', sourceLink: '' });
  const softMin = safeNumber(component.softCostMin || 0, 0);
  const softLikely = safeNumber(component.softCostLikely || 0, 0);
  const softMax = safeNumber(component.softCostMax || 0, 0);
  const softBase = Math.max(hardLikely, 1);
  if (softMin || softLikely || softMax) records.push({ costLossId: nextRecordId('COST'), costType: 'Soft Cost', appliesTo: 'Component', riskItemId: '', amountMin: Math.round(softBase * softMin), amountLikely: Math.round(softBase * softLikely), amountMax: Math.round(softBase * softMax), datePeriod: component.identifiedDate || '', sourceType: 'Legacy Component', notes: 'Migrated from prior component-level soft-cost multiplier fields.', sourceLink: '' });
  const mitigation = safeNumber(component.mitigationCost || 0, 0);
  if (mitigation) records.push({ costLossId: nextRecordId('COST'), costType: 'Remediation', appliesTo: 'Component', riskItemId: '', amountMin: mitigation, amountLikely: mitigation, amountMax: mitigation, datePeriod: component.identifiedDate || '', sourceType: 'Legacy Component', notes: 'Migrated from prior component-level mitigation cost field.', sourceLink: '' });
  return records;
}
function getComplexCostLossSummary(records) {
  const list = Array.isArray(records) ? records : (Array.isArray(complexCostLosses) ? complexCostLosses : []);
  const hardTypes = new Set(['Hard Loss','Legal','Customer Restitution','Vendor','Staff Time','Other']);
  const softTypes = new Set(['Soft Cost']);
  const mitigationTypes = new Set(['Remediation','Control Cost']);
  const sum = (field, predicate) => list.filter(predicate).reduce((total, item) => total + safeNumber(item[field] || 0, 0), 0);
  const isHard = x => hardTypes.has(x.costType || 'Hard Loss');
  const isSoft = x => softTypes.has(x.costType || '');
  const isMit = x => mitigationTypes.has(x.costType || '');
  const hardMin = sum('amountMin', isHard), hardLikely = sum('amountLikely', isHard), hardMax = sum('amountMax', isHard);
  const softMinDollars = sum('amountMin', isSoft), softLikelyDollars = sum('amountLikely', isSoft), softMaxDollars = sum('amountMax', isSoft);
  const base = Math.max(hardLikely, 1);
  return { hardMin, hardLikely, hardMax, softMin: softMinDollars / base, softLikely: softLikelyDollars / base, softMax: softMaxDollars / base, softMinDollars, softLikelyDollars, softMaxDollars, mitigationMin: sum('amountMin', isMit), mitigationLikely: sum('amountLikely', isMit), mitigationMax: sum('amountMax', isMit), totalLikely: hardLikely + softLikelyDollars + sum('amountLikely', isMit) };
}
function resetCostLossForm(mode) {
  if (mode !== 'complex') return;
  setSelectValueSafe('complexCostLossType', 'Hard Loss');
  setSelectValueSafe('complexCostLossAppliesTo', 'Component');
  setSelectValueSafe('complexCostLossRiskItemId', '');
  setSelectValueSafe('complexCostLossSourceType', 'Internal');
  ['AmountMin','AmountLikely','AmountMax','DatePeriod','Notes','SourceLink'].forEach(s => { const el = document.getElementById('complexCostLoss' + s); if (el) el.value = ''; });
  setButtonLabel('addComplexCostLossBtn', 'Add Cost / Loss');
  setStatusText('complexCostLossEditStatus', 'No cost/loss entry selected for editing.');
  setEditState('costLoss', 'complex', null);
  formatAllCurrencyFields();
}
function renderCostLossRiskItemOptions() {
  const select = document.getElementById('complexCostLossRiskItemId');
  if (!select) return;
  const current = select.value;
  const rows = ['<option value="">Component-level / not tied to one risk item</option>'];
  (currentComplexItems || []).forEach(item => rows.push('<option value="' + escapeHtml(item.issueId || '') + '">' + escapeHtml(item.name || item.issueId || 'Risk Item') + '</option>'));
  select.innerHTML = rows.join('');
  if ([...select.options].some(o => o.value === current)) select.value = current;
}
function renderCostLossTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  renderCostLossRiskItemOptions();
  if (!items || !items.length) { tbody.innerHTML = '<tr><td colspan="10">No cost/loss entries added yet. Add known losses, legal costs, remediation costs, staff time, vendor costs, or other exposure items for this component.</td></tr>'; return; }
  const riskName = (id) => (currentComplexItems || []).find(x => String(x.issueId || '') === String(id || ''))?.name || (id ? id : 'Component');
  tbody.innerHTML = items.map(x => '<tr><td>' + escapeHtml(x.costType || '') + '</td><td>' + escapeHtml(x.appliesTo || '') + '</td><td>' + escapeHtml(riskName(x.riskItemId || '')) + '</td><td>' + currency(x.amountMin) + '</td><td>' + currency(x.amountLikely) + '</td><td>' + currency(x.amountMax) + '</td><td>' + escapeHtml(x.datePeriod || '') + '</td><td>' + escapeHtml(x.sourceType || '') + '</td><td>' + escapeHtml(x.notes || '') + '</td><td>' + renderActionButtons('costLoss', 'complex', escapeHtml(x.costLossId || '')) + '</td></tr>').join('');
}
function addCostLoss(mode) {
  if (mode !== 'complex') return;
  const editId = getEditState('costLoss', 'complex');
  const record = {
    costLossId: editId || nextRecordId('COST'),
    costType: document.getElementById('complexCostLossType')?.value || 'Hard Loss',
    appliesTo: document.getElementById('complexCostLossAppliesTo')?.value || 'Component',
    riskItemId: document.getElementById('complexCostLossRiskItemId')?.value || '',
    amountMin: parseCurrencyValue(document.getElementById('complexCostLossAmountMin')?.value || 0),
    amountLikely: parseCurrencyValue(document.getElementById('complexCostLossAmountLikely')?.value || 0),
    amountMax: parseCurrencyValue(document.getElementById('complexCostLossAmountMax')?.value || 0),
    datePeriod: document.getElementById('complexCostLossDatePeriod')?.value || '',
    sourceType: document.getElementById('complexCostLossSourceType')?.value || 'Internal',
    notes: document.getElementById('complexCostLossNotes')?.value || '',
    sourceLink: document.getElementById('complexCostLossSourceLink')?.value || ''
  };
  if (!record.amountLikely && (record.amountMin || record.amountMax)) record.amountLikely = Math.round((record.amountMin + record.amountMax) / 2);
  if (!record.amountMax) record.amountMax = record.amountLikely || record.amountMin || 0;
  if (!record.amountMin) record.amountMin = Math.min(record.amountLikely || 0, record.amountMax || record.amountLikely || 0);
  const idx = complexCostLosses.findIndex(x => String(x.costLossId || '') === String(record.costLossId || ''));
  if (idx >= 0) complexCostLosses[idx] = record; else complexCostLosses.push(record);
  renderCostLossTable('complexCostLossBody', complexCostLosses);
  renderComplexProductSections();
  resetCostLossForm('complex');
}
const __rt52_priorEditRecord = typeof editRecord === 'function' ? editRecord : null;
editRecord = function(kind, mode, id) {
  if (kind === 'costLoss' && mode === 'complex') {
    const item = (complexCostLosses || []).find(x => String(x.costLossId || '') === String(id || ''));
    if (!item) return;
    setEditState('costLoss', 'complex', id);
    setSelectValueSafe('complexCostLossType', item.costType || 'Hard Loss');
    setSelectValueSafe('complexCostLossAppliesTo', item.appliesTo || 'Component');
    renderCostLossRiskItemOptions();
    setSelectValueSafe('complexCostLossRiskItemId', item.riskItemId || '');
    setCurrencyFieldValue('complexCostLossAmountMin', item.amountMin || 0);
    setCurrencyFieldValue('complexCostLossAmountLikely', item.amountLikely || 0);
    setCurrencyFieldValue('complexCostLossAmountMax', item.amountMax || 0);
    const dateEl = document.getElementById('complexCostLossDatePeriod'); if (dateEl) dateEl.value = item.datePeriod || '';
    setSelectValueSafe('complexCostLossSourceType', item.sourceType || 'Internal');
    const notesEl = document.getElementById('complexCostLossNotes'); if (notesEl) notesEl.value = item.notes || '';
    const linkEl = document.getElementById('complexCostLossSourceLink'); if (linkEl) linkEl.value = item.sourceLink || '';
    setButtonLabel('addComplexCostLossBtn', 'Update Cost / Loss');
    setStatusText('complexCostLossEditStatus', 'Editing cost/loss: ' + (item.costType || 'Cost/Loss') + ' ' + currency(item.amountLikely || 0));
    formatAllCurrencyFields();
    return;
  }
  return __rt52_priorEditRecord ? __rt52_priorEditRecord(kind, mode, id) : undefined;
};
const __rt52_priorDeleteRecord = typeof deleteRecord === 'function' ? deleteRecord : null;
deleteRecord = function(kind, mode, id) {
  if (kind === 'costLoss' && mode === 'complex') {
    const item = (complexCostLosses || []).find(x => String(x.costLossId || '') === String(id || ''));
    if (item && !window.confirm('Delete cost/loss entry "' + (item.costType || 'Cost/Loss') + '" for ' + currency(item.amountLikely || 0) + '?')) return;
    complexCostLosses = (complexCostLosses || []).filter(x => String(x.costLossId || '') !== String(id || ''));
    renderCostLossTable('complexCostLossBody', complexCostLosses);
    renderComplexProductSections();
    resetCostLossForm('complex');
    return;
  }
  return __rt52_priorDeleteRecord ? __rt52_priorDeleteRecord(kind, mode, id) : undefined;
};
renderComplexItems = function() {
  const tbody = document.getElementById('riskItemsTableBody');
  if (!tbody) return;
  if (!currentComplexItems.length) {
    tbody.innerHTML = '<tr><td colspan="10">No risk items added yet.</td></tr>';
  } else {
    tbody.innerHTML = currentComplexItems.map(item => {
      const prob = safeNumber(item.probMin,0) + '% / ' + safeNumber(item.probLikely,0) + '% / ' + safeNumber(item.probMax,0) + '%';
      const impact = currency(item.impactMin) + ' / ' + currency(item.impactLikely) + ' / ' + currency(item.impactMax);
      const costCount = (complexCostLosses || []).filter(c => String(c.riskItemId || '') === String(item.issueId || '')).length;
      return '<tr data-issue-id="' + escapeHtml(item.issueId || '') + '"><td><button class="scenario-link" data-issue-open="' + escapeHtml(item.issueId || '') + '">' + escapeHtml(item.name) + '</button></td><td>' + escapeHtml(item.domain) + '</td><td>' + escapeHtml(item.product) + '</td><td>' + escapeHtml(item.regulation) + '</td><td>' + prob + '</td><td>' + impact + '</td><td>' + escapeHtml(item.evidenceQuality || 'Medium') + '</td><td>' + costCount + '</td><td>' + escapeHtml(item.status || 'Open') + '</td><td><button class="btn btn-secondary" type="button" data-delete-risk-item="' + escapeHtml(item.issueId || '') + '">Delete</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('[data-issue-open]').forEach(btn => btn.addEventListener('click', () => highlightIssueRow(btn.dataset.issueOpen)));
  }
  renderCostLossRiskItemOptions();
  refreshComplexProductSectionSelects();
  updateInherentScores();
  renderComplexProductSections();
};
calculateComplexInherent = function() {
  if (!currentComplexItems.length) return 0;
  const scores = currentComplexItems.map(item => {
    if (item.probLikely !== undefined || item.impactLikely !== undefined) {
      const probScore = Math.max(0, Math.min(100, safeNumber(item.probLikely || 0, 0)));
      const impactScore = Math.min(100, Math.round(Math.log10(Math.max(1, safeNumber(item.impactLikely || 0, 0))) * 16));
      return Math.round((probScore * 0.45) + (impactScore * 0.55));
    }
    return safeNumber(item.score || 0, 0);
  });
  return Math.round(scores.reduce((a,b) => a + b, 0) / Math.max(scores.length, 1));
};
addRiskItem = function() {
  if (!complexProductSections.length) { alert('Add an Area / Product Family first.'); return; }
  const impactLikely = parseCurrencyValue(document.getElementById('riskItemImpactLikely')?.value || 0);
  currentComplexItems.push({ issueId: 'ISS-' + Date.now() + '-' + Math.floor(Math.random() * 1000), parentScenarioMode: 'complex', name: document.getElementById('riskItemName')?.value || 'Unnamed Risk Item', domain: document.getElementById('riskItemDomain')?.value || '', product: document.getElementById('riskItemProduct')?.value || '', regulation: document.getElementById('riskItemReg')?.value || '', description: document.getElementById('riskItemDescription')?.value || '', probMin: safeNumber(document.getElementById('riskItemProbMin')?.value || 0, 0), probLikely: safeNumber(document.getElementById('riskItemProbLikely')?.value || 0, 0), probMax: safeNumber(document.getElementById('riskItemProbMax')?.value || 0, 0), impactMin: parseCurrencyValue(document.getElementById('riskItemImpactMin')?.value || 0), impactLikely, impactMax: parseCurrencyValue(document.getElementById('riskItemImpactMax')?.value || impactLikely), evidenceQuality: document.getElementById('riskItemEvidenceQuality')?.value || 'Medium', status: document.getElementById('riskItemStatus')?.value || 'Open', score: 0, weight: 1 });
  ['riskItemName','riskItemDescription','riskItemProbMin','riskItemProbLikely','riskItemProbMax','riskItemImpactMin','riskItemImpactLikely','riskItemImpactMax'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderComplexItems();
  formatAllCurrencyFields();
};
deleteComplexRiskItem = function(issueId) {
  const item = currentComplexItems.find(x => String(x.issueId || '') === String(issueId || ''));
  if (!item) return;
  const linkedCosts = (complexCostLosses || []).filter(x => String(x.riskItemId || '') === String(issueId || '')).length;
  const confirmed = window.confirm('Delete risk item "' + (item.name || 'Unnamed Risk Item') + '"?' + (linkedCosts ? ' This will also unlink ' + linkedCosts + ' cost/loss entry from this risk item.' : ''));
  if (!confirmed) return;
  currentComplexItems = currentComplexItems.filter(x => String(x.issueId || '') !== String(issueId || ''));
  complexCostLosses = (complexCostLosses || []).map(x => String(x.riskItemId || '') === String(issueId || '') ? { ...x, appliesTo: 'Component', riskItemId: '' } : x);
  renderComplexItems();
  renderCostLossTable('complexCostLossBody', complexCostLosses);
};
const __rt52_priorCalculateComplexComponentRollup = typeof calculateComplexComponentRollup === 'function' ? calculateComplexComponentRollup : null;
calculateComplexComponentRollup = function(component) {
  const base = __rt52_priorCalculateComplexComponentRollup ? __rt52_priorCalculateComplexComponentRollup(component) : { inherent:0,residual:0,delta:0,insuranceImpact:'None',highestDriver:'No component data',exposure:0 };
  const costs = Array.isArray(component?.costLosses) ? component.costLosses : migrateLegacyComponentCosts(component);
  const summary = getComplexCostLossSummary(costs);
  const evidenceLoss = Array.isArray(component?.hardFacts) ? component.hardFacts.reduce((t,x)=>t + safeNumber(x.amount || 0,0),0) : 0;
  const costExposure = Math.max(summary.hardLikely + summary.softLikelyDollars, evidenceLoss, 1);
  const itemExpected = (Array.isArray(component?.items) ? component.items : []).reduce((t,item)=> t + ((safeNumber(item.probLikely || 0,0)/100) * safeNumber(item.impactLikely || 0,0)), 0);
  const expectedExposure = Math.max(itemExpected, costExposure * Math.max(0.01, safeNumber(base.inherent || 0,0)/100));
  const controlCredit = Math.max(0, Math.min(0.85, safeNumber(component?.control || 0,0) / 100));
  const coverage = (Array.isArray(component?.insurance) ? component.insurance : []).reduce((t,x)=> t + Math.max(0, safeNumber(x.coverageAmount||0,0) - safeNumber(x.deductible||0,0)), 0);
  const residualDollars = Math.max(0, expectedExposure * (1-controlCredit) - Math.min(coverage, expectedExposure));
  const residualScore = Math.max(0, Math.min(100, Math.round((residualDollars / Math.max(costExposure, 1)) * 100)));
  return { ...base, exposure: Math.round(costExposure), residualExposure: Math.round(residualDollars), residual: residualScore, delta: Math.max(0, Math.round((base.inherent || residualScore) - residualScore)), highestDriver: (summary.totalLikely ? 'Cost/Loss table exposure' : (evidenceLoss ? 'Hard facts evidence anchor' : base.highestDriver)) };
};
function wireCostLossButtons() {
  const addBtn = document.getElementById('addComplexCostLossBtn');
  if (addBtn && !addBtn.dataset.wired) { addBtn.dataset.wired='true'; addBtn.addEventListener('click', () => addCostLoss('complex')); }
  const cancelBtn = document.getElementById('cancelComplexCostLossEditBtn');
  if (cancelBtn && !cancelBtn.dataset.wired) { cancelBtn.dataset.wired='true'; cancelBtn.addEventListener('click', () => resetCostLossForm('complex')); }
  renderCostLossRiskItemOptions();
}
const __rt52_priorWireRecordMaintenanceEnhancements = typeof wireRecordMaintenanceEnhancements === 'function' ? wireRecordMaintenanceEnhancements : null;
wireRecordMaintenanceEnhancements = function() { if (__rt52_priorWireRecordMaintenanceEnhancements) __rt52_priorWireRecordMaintenanceEnhancements(); wireCostLossButtons(); };
/* ===== END PHASE 23.0.61 ===== */

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
  renderCostLossTable("complexCostLossBody", complexCostLosses);
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
  document.getElementById("saveUserAdminBtn")?.addEventListener("click", saveUserAdminRecord);
  document.getElementById("cancelUserAdminEditBtn")?.addEventListener("click", resetUserAdminForm);
  document.getElementById("sessionActiveUserId")?.addEventListener("change", (event) => {
    setSessionUserId(event.target.value || "");
    renderUserAdmin();
  });
  document.getElementById("sessionStorageMode")?.addEventListener("change", (event) => {
    setSessionStorageMode(event.target.value || "Local Workspace");
    renderUserAdmin();
  });
  document.getElementById("saveWorkspaceSetupBtn")?.addEventListener("click", saveWorkspaceSetup);
  document.getElementById("scenarioSaveEngine")?.addEventListener("change", (event) => {
    setScenarioSaveEngine(event.target.value || "Local Browser Storage");
    renderUserAdmin();
  });
  document.getElementById("loginGateContinueBtn")?.addEventListener("click", rtStartSessionAndReconnect);
  document.getElementById("loginGateOpenAdminBtn")?.addEventListener("click", openUserAdminFromLogin);
  setupRandomOutcomesCsvButton();
  wireStabilityHandlers();
  wireDelegatedActionHandlers();
  wireRecordMaintenanceEnhancements();
  syncComplexComponentIdField(true);
  renderUserAdmin();
  updateLoginState();
  syncAppVersionDisplay();
  document.getElementById("downloadCurrentScenarioBtn")?.addEventListener("click", triggerScenarioJsonDownload);
  document.getElementById("uploadScenarioFileInput")?.addEventListener("change", handleScenarioJsonUpload);
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
    addBtn.textContent = "Save Component";
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
    const deleteComponentBtn = event.target.closest('[data-delete-complex-component]');
    if (deleteComponentBtn) {
      event.preventDefault();
      event.stopPropagation();
      deleteComplexScenarioComponent(deleteComponentBtn.dataset.deleteComplexComponent);
      return;
    }
    const deleteRiskItemBtn = event.target.closest('[data-delete-risk-item]');
    if (deleteRiskItemBtn) {
      event.preventDefault();
      event.stopPropagation();
      deleteComplexRiskItem(deleteRiskItemBtn.dataset.deleteRiskItem);
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
      gap: 12px;
      row-gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 18px;
    }
    .risktool-info-nav a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      margin: 0 4px 4px 0;
      padding: 7px 12px;
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
  const stale = document.getElementById("risktool-info-fab");
  if (stale) stale.remove();
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
      .manual-nav { display:flex; flex-wrap:wrap; gap:12px; row-gap:12px; margin:8px 0 18px 0; align-items:center; }
      .manual-nav a { display:inline-flex; align-items:center; justify-content:center; margin:0 4px 4px 0; padding:8px 14px; border-radius:999px; background:rgba(25,118,210,.08); color:#1f3a5f; text-decoration:none; font-size:13px; font-weight:600; line-height:1.25; white-space:normal; word-break:normal; }
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


/* =========================
   PHASE 20.1.46
   Information Buildout Phase 2
========================= */
function getExpandedPolishedManualHtmlV2() {
  const prior = (typeof getExpandedPolishedManualHtml === "function")
    ? getExpandedPolishedManualHtml()
    : ((typeof getPolishedManualHtml === "function") ? getPolishedManualHtml() : "");

  const fieldGuide = `
    <div class="card mt-3">
      <div class="card-header">Field Guide</div>
      <div class="card-body">
        <h4>Reporting Lines</h4>
        <p>Use Reporting Lines for organizational ownership, management oversight, and reporting structure. This is the ownership and reporting field, not the product taxonomy.</p>

        <h4>Category</h4>
        <p>Use Category to identify the product, service, or operational area most directly tied to the scenario. This should align to Category.</p>

        <h4>Hard Facts / Evidence</h4>
        <p>Use this section for factual support such as loss history, complaint data, audit findings, external examples, enforcement actions, or internal incidents.</p>

        <h4>Mitigation Entry</h4>
        <p>Use mitigation entries to document the control actions being taken, who owns them, and implementation status.</p>

        <h4>Accepted Risk</h4>
        <p>Use accepted-risk records only when governance has intentionally decided to retain exposure. Document authority, rationale, review date, and decision logic clearly.</p>
      </div>
    </div>
  `;

  const reportGuide = `
    <div class="card mt-3">
      <div class="card-header">How to Read the Report</div>
      <div class="card-body">
        <h4>Inherent Risk Score</h4>
        <p>This is the starting risk level before control effectiveness is applied.</p>

        <h4>Residual Risk Score</h4>
        <p>This is the remaining exposure after the stated control effectiveness percentage is applied.</p>

        <h4>Expected Annual Loss</h4>
        <p>This is the model’s expected annual financial impact across the simulated loss range.</p>

        <h4>Risk Reduction Value</h4>
        <p>This estimates how much annual loss is reduced after mitigation assumptions are applied.</p>

        <h4>Net Benefit / ROI</h4>
        <p>This compares the modeled reduction in loss to mitigation cost so leadership can judge whether mitigation appears financially efficient.</p>
      </div>
    </div>
  `;

  const examinerGuide = `
    <div class="card mt-3">
      <div class="card-header">Examiner-Ready Interpretation</div>
      <div class="card-body">
        <p>This tool is designed to support transparent, reviewable risk assessment rather than black-box outputs. Each scenario should show:</p>
        <ul>
          <li>what is being evaluated,</li>
          <li>who owns it,</li>
          <li>what evidence supports it,</li>
          <li>what mitigation is planned,</li>
          <li>whether risk is accepted,</li>
          <li>and how the financial model supports the decision.</li>
        </ul>
        <p>The goal is not false precision. The goal is disciplined modeling, visible assumptions, and a defensible management record.</p>
      </div>
    </div>
  `;

  const qaGuide = `
    <div class="card mt-3">
      <div class="card-header">Additional Q&amp;A</div>
      <div class="card-body">
        <h4>Why use a range instead of one number?</h4>
        <p>Because risk outcomes are uncertain. A range better reflects reality and helps leadership consider both ordinary and severe outcomes.</p>

        <h4>Why keep Reporting Lines separate from Category?</h4>
        <p>Because organizational accountability and product taxonomy are different dimensions. Keeping them separate improves rollups and reporting.</p>

        <h4>What should go in a Complex Scenario?</h4>
        <p>Use Complex Scenario when several related scenarios belong to one broader initiative, business line, or product family and should be viewed together while still being managed separately.</p>

        <h4>How should I use insurance data?</h4>
        <p>Insurance should be evaluated as part of the financial and decision framework, not just listed. Compare coverage, deductible, and premium to expected loss ranges.</p>
      </div>
    </div>
  `;

  
  /* PHASE 20.1.47 SAFE APPEND */
  const walkthroughGuide = `
    <div class="card mt-3">
      <div class="card-header">Scenario Walkthroughs</div>
      <div class="card-body">
        <h4>Single Scenario Walkthrough</h4>
        <p>Start with the scenario name, Reporting Lines, Risk Domain, and Category. Add evidence, mitigation, and accepted-risk detail only after the base scenario is clearly defined.</p>

        <h4>Complex Scenario Walkthrough</h4>
        <p>Define the Product Section first. Then add one or more scenarios beneath that broader area. Each scenario should carry its own risk items, insurance, hard facts / evidence, mitigation, and accepted-risk decisions.</p>

        <h4>Beta Scenario Walkthrough</h4>
        <p>Use Beta Scenario when you want a min / most likely / max style view and want randomized outcomes across that bounded range.</p>
      </div>
    </div>
  `;

  const decisionGuide = `
    <div class="card mt-3">
      <div class="card-header">Decision Guidance</div>
      <div class="card-body">
        <h4>When mitigation appears strong</h4>
        <p>Mitigation is stronger when the action is specific, ownership is clear, and modeled reduction in loss is meaningful relative to cost.</p>

        <h4>When insurance matters</h4>
        <p>Insurance matters when coverage meaningfully offsets modeled loss, the deductible is realistic, and exclusions do not remove the practical benefit.</p>

        <h4>When acceptance may be appropriate</h4>
        <p>Acceptance may be appropriate when residual exposure is understood, governance is informed, and the mitigation cost exceeds the expected reduction in loss.</p>
      </div>
    </div>
  `;

  const boardGuide = `
    <div class="card mt-3">
      <div class="card-header">Board / Committee Interpretation</div>
      <div class="card-body">
        <p>Board and committee readers usually need a concise decision view: what the scenario is, who owns it, how severe it appears, the likely financial range, what mitigation is planned, and whether management recommends mitigation or acceptance.</p>
      </div>
    </div>
  `;

  const glossaryGuide = `
    <div class="card mt-3">
      <div class="card-header">Plain-English Glossary</div>
      <div class="card-body">
        <h4>Inherent Risk</h4>
        <p>The risk before current controls are considered.</p>

        <h4>Residual Risk</h4>
        <p>The risk remaining after current controls or mitigation assumptions are applied.</p>

        <h4>P10 / P50 / P90</h4>
        <p>Lower-end, middle, and upper-end results across the simulated distribution of outcomes.</p>

        <h4>Reporting Lines</h4>
        <p>The organizational ownership and reporting view for the scenario.</p>

        <h4>Category</h4>
        <p>The product, service, or area taxonomy used to classify where the scenario belongs operationally.</p>
      </div>
    </div>
  `;

  
  /* PHASE 20.1.48 SAFE APPEND */
  const screenGuide = `
    <div class="card mt-3">
      <div class="card-header">Screen-by-Screen Guide</div>
      <div class="card-body">
        <h4>Dashboard</h4>
        <p>Use the Dashboard to review open scenarios, saved scenario counts, and summary-level monitoring views.</p>

        <h4>Single Scenario</h4>
        <p>Use Single Scenario for one contained issue, event, or risk decision that can be modeled as one assessment.</p>

        <h4>Complex Scenario</h4>
        <p>Use Complex Scenario when one broader initiative, product family, or business area contains several related scenarios that should be tracked together but managed separately.</p>

        <h4>Beta Scenario</h4>
        <p>Use Beta Scenario when a bounded min / most likely / max style distribution is the clearest way to estimate uncertain outcomes.</p>

        <h4>Reports</h4>
        <p>Use Reports to turn the scenario into a leadership-ready interpretation with financial ranges, mitigation economics, and supporting context.</p>
      </div>
    </div>
  `;

  const exampleGuide = `
    <div class="card mt-3">
      <div class="card-header">Scenario Examples</div>
      <div class="card-body">
        <h4>Consumer Compliance Example</h4>
        <p>A fee-disclosure breakdown affecting one deposit product can be modeled as a Single Scenario with evidence from complaints, audits, and remediation cost estimates.</p>

        <h4>Technology Change Example</h4>
        <p>A platform modernization effort can be modeled as a Complex Scenario with separate scenarios for implementation risk, vendor dependence, customer disruption, and control breakdown risk.</p>

        <h4>Insurance Evaluation Example</h4>
        <p>If a policy exists, compare deductible, premium, and coverage amount to modeled loss ranges to decide whether insurance meaningfully changes the residual exposure.</p>
      </div>
    </div>
  `;

  const reportUseGuide = `
    <div class="card mt-3">
      <div class="card-header">Using Reports Well</div>
      <div class="card-body">
        <p>Reports work best when they combine narrative judgment with visible evidence and modeled ranges. Decision-makers should be able to see what the scenario is, how severe it appears, what the likely loss range is, and why management recommends mitigation or acceptance.</p>
        <p>For committee or board use, avoid overloading the report with every data point. Surface the key drivers, material evidence, financial range, and the recommended action.</p>
      </div>
    </div>
  `;

  
  /* PHASE 20.1.49 SAFE APPEND */
  const validationGuide = `
    <div class="card mt-3">
      <div class="card-header">Validation Checklist</div>
      <div class="card-body">
        <ul>
          <li>Reporting Lines reflects ownership</li>
          <li>Category reflects correct product</li>
          <li>Evidence supports the scenario</li>
          <li>Mitigation is actionable</li>
          <li>Insurance evaluated against loss</li>
          <li>Acceptance includes rationale</li>
        </ul>
      </div>
    </div>
  `;

  const modelingGuide = `
    <div class="card mt-3">
      <div class="card-header">Modeling Guidance</div>
      <div class="card-body">
        <p>Focus on ranges, not a single number. The model supports decisions, not precision.</p>
      </div>
    </div>
  `;

  
  /* PHASE 20.1.50 SAFE APPEND */
  const boardPacketGuide = `
    <div class="card mt-3">
      <div class="card-header">Board Packet Use</div>
      <div class="card-body">
        <p>For board packets, keep the presentation focused on the scenario summary, ownership, severity, expected loss range, mitigation recommendation, and any acceptance decision.</p>
        <p>Use detailed evidence and modeling support as backup material rather than the front page of the discussion.</p>
      </div>
    </div>
  `;

  const narrativeGuide = `
    <div class="card mt-3">
      <div class="card-header">Narrative Writing Guidance</div>
      <div class="card-body">
        <p>Good scenario narratives explain what happened, why it matters, what evidence supports the concern, and what management recommends next.</p>
        <p>Avoid vague language. A strong narrative should be understandable to leadership without requiring the reader to decode the model.</p>
      </div>
    </div>
  `;

  const reviewGuide = `
    <div class="card mt-3">
      <div class="card-header">Review and Challenge Questions</div>
      <div class="card-body">
        <ul>
          <li>What evidence most strongly supports this scenario?</li>
          <li>What assumption most changes the modeled outcome?</li>
          <li>What would leadership need to see before accepting this risk?</li>
          <li>Does insurance materially change the decision?</li>
          <li>Is the mitigation specific enough to be tested later?</li>
        </ul>
      </div>
    </div>
  `;

  return prior + fieldGuide + reportGuide + examinerGuide + qaGuide + walkthroughGuide + decisionGuide + boardGuide + glossaryGuide + screenGuide + exampleGuide + reportUseGuide + validationGuide + modelingGuide + boardPacketGuide + narrativeGuide + reviewGuide;


}


function syncAppVersionDisplay() {
  const el = document.getElementById("appVersion");
  if (el) el.textContent = APP_VERSION;
}


function getActiveScenarioPayloadForDownload() {
  if (typeof activeMode !== "undefined" && activeMode === "complex" && typeof getComplexPayload === "function") return getComplexPayload();
  if (typeof activeMode !== "undefined" && activeMode === "beta" && typeof getBetaPayload === "function") return getBetaPayload();
  if (typeof getSinglePayload === "function") return getSinglePayload();
  return null;
}

function triggerScenarioJsonDownload() {
  const payload = getActiveScenarioPayloadForDownload();
  const status = document.getElementById("scenarioFileStatus");
  if (!payload) {
    if (status) status.textContent = "No scenario payload available to download.";
    return;
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const filename = `${String(payload.mode || "scenario")}_${String(payload.id || "scenario")}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (status) status.textContent = `Downloaded ${filename}`;
}

function importScenarioObject(obj) {
  if (!obj || typeof obj !== "object") throw new Error("Invalid scenario JSON.");
  const saved = getSavedScenarios();
  const idx = saved.findIndex(x => String(x.id || "") === String(obj.id || ""));
  if (idx >= 0) saved[idx] = obj;
  else saved.unshift(obj);
  setSavedScenarios(saved);
  if (typeof renderSavedScenarios === "function") renderSavedScenarios();
  if (typeof renderDashboardOpenTable === "function") renderDashboardOpenTable();
  if (typeof renderSavedScenarios === "function") renderSavedScenarios();
  if (typeof renderDashboardOpenTable === "function") renderDashboardOpenTable();
  return obj;
}

function handleScenarioJsonUpload(event) {
  const file = event.target.files && event.target.files[0];
  const status = document.getElementById("scenarioFileStatus");
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const imported = importScenarioObject(parsed);
      if (status) status.textContent = `Imported ${imported.id || file.name}`;
      if (typeof openScenario === "function" && imported.id) {
        try { openScenario(imported.id); } catch (e) {}
      }
    } catch (err) {
      if (status) status.textContent = `Import failed: ${err.message}`;
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}


/* ===== PHASE 23.0.61 SAVE OVERRIDE ===== */
function rtSafeSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; }
}
function rtWriteSaved(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
}
function rtGenerateScenarioId() {
  return "SCN-" + Date.now();
}
function rtBuildSummary(payload) {
  const inherent = Number(payload?.inherent || 0);
  const control = Number(payload?.control || 0);
  const residual = Math.max(0, Math.round(inherent * (1 - control / 100)));
  return {
    ...payload,
    id: payload?.id || rtGenerateScenarioId(),
    name: payload?.name || "Unnamed Scenario",
    mode: payload?.mode || "single",
    productGroup: payload?.productGroup || "",
    riskDomain: payload?.riskDomain || "",
    scenarioStatus: payload?.scenarioStatus || "Open",
    identifiedDate: payload?.identifiedDate || "",
    primaryProduct: payload?.primaryProduct || "",
    primaryRegulation: payload?.primaryRegulation || "",
    inherent,
    residual
  };
}
function setSavedScenarios(items) {
  rtWriteSaved(items);
}
function getSavedScenarios() {
  return rtSafeSaved();
}
function renderSavedScenarios() {
  const tbody = document.getElementById("savedEvaluationsBody");
  const countEl = document.getElementById("savedCount");
  if (!tbody) return;
  const saved = getSavedScenarios();
  if (countEl) countEl.textContent = String(saved.length);
  if (!saved.length) {
    tbody.innerHTML = '<tr><td colspan="11">No saved scenarios yet.</td></tr>';
    return;
  }
  tbody.innerHTML = saved.map(s => `<tr>
    <td>${escapeHtml(String(s.id || ""))}</td>
    <td>${escapeHtml(String(s.name || ""))}</td>
    <td>${s.mode === "single" ? "Single" : s.mode === "complex" ? "Complex" : s.mode === "beta" ? "Beta" : "Unknown"}</td>
    <td>${escapeHtml(String(s.productGroup || ""))}</td>
    <td>${escapeHtml(String(s.scenarioStatus || ""))}</td>
    <td>${escapeHtml(String(s.assignedOwnerName || ""))}</td>
    <td>${escapeHtml(String(s.storageMode || "Local Browser Storage"))}</td>
    <td>${Number(s.inherent || 0)}</td>
    <td>${Number(s.residual || 0)}</td>
    <td>${escapeHtml(String(s.identifiedDate || ""))}</td>
    <td>
      <button class="btn btn-secondary small-btn" data-action="open" data-id="${escapeHtml(String(s.id || ""))}">Open</button>
      <button class="btn btn-secondary small-btn" data-action="delete" data-id="${escapeHtml(String(s.id || ""))}">Delete</button>
    </td>
  </tr>`).join("");
}
function renderDashboardOpenTable() {
  const tbody = document.getElementById("dashboardOpenScenarioBody");
  if (!tbody) return;
  const rows = getSavedScenarios().filter(s => String(s.scenarioStatus || "").toLowerCase() !== "closed");
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11">No open scenarios available.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(s => `<tr>
    <td><button class="scenario-link" data-open-id="${escapeHtml(String(s.id || ""))}">${escapeHtml(String(s.id || ""))}</button></td>
    <td>${s.mode === "single" ? "Single Scenario" : s.mode === "complex" ? "Complex Scenario" : s.mode === "beta" ? "Beta Scenario" : "Unknown"}</td>
    <td>${escapeHtml(String(s.name || ""))}</td>
    <td>${escapeHtml(String(s.scenarioStatus || ""))}</td>
    <td>${Number(s.inherent || 0)}</td>
    <td>${escapeHtml(String(s.identifiedDate || ""))}</td>
    <td>${escapeHtml(String(s.productGroup || ""))}</td>
    <td>${escapeHtml(String(s.riskDomain || ""))}</td>
    <td>${escapeHtml(String(s.assignedOwnerName || ""))}</td>
    <td>${escapeHtml(String(s.storageMode || "Local Browser Storage"))}</td>
    <td><button class="btn btn-secondary small-btn" data-report-id="${escapeHtml(String(s.id || ""))}">Open Report</button></td>
  </tr>`).join("");
  tbody.querySelectorAll("[data-open-id]").forEach(btn => btn.addEventListener("click", () => {
    try { openScenario(btn.dataset.openId); } catch(e) { console.error(e); }
  }));
}
function rtPersistPayload(payload) {
  const summary = rtBuildSummary(payload);
  const saved = getSavedScenarios();
  const idx = saved.findIndex(x => String(x.id || "") === String(summary.id || ""));
  if (idx >= 0) saved[idx] = summary; else saved.unshift(summary);
  setSavedScenarios(saved);
  try { renderSavedScenarios(); } catch(e) { console.error(e); }
  try { renderDashboardOpenTable(); } catch(e) { console.error(e); }
  return summary;
}
saveScenario = function(event) {
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  let payload = null;
  const activeViewEl = document.querySelector(".view.active");
  const currentViewName = activeViewEl?.id?.replace(/^view-/, "") || (typeof activeMode !== "undefined" ? activeMode : "single");
  if (currentViewName === "beta" || (typeof activeMode !== "undefined" && activeMode === "beta")) {
    return saveBetaScenario(event);
  }
  payload = (typeof activeMode !== "undefined" && activeMode === "complex" && typeof getComplexPayload === "function")
    ? getComplexPayload()
    : (typeof getSinglePayload === "function" ? getSinglePayload() : null);
  if (!payload) return;
  if (!payload.id) {
    payload.id = rtGenerateScenarioId();
    const idEl = document.getElementById(payload.mode === "complex" ? "complexScenarioId" : "singleScenarioId");
    if (idEl) idEl.value = payload.id;
  }
  const summary = rtPersistPayload(payload);
  try { lastSummary = summary; } catch(e) {}
  const status = document.getElementById("scenarioFileStatus");
  if (status) status.textContent = `Saved OK: ${summary.id}`;
};
saveBetaScenario = function(event) {
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  if (typeof getBetaPayload !== "function") return;
  const payload = getBetaPayload();
  if (!payload.id) {
    payload.id = rtGenerateScenarioId();
    const idEl = document.getElementById("betaScenarioId");
    if (idEl) idEl.value = payload.id;
  }
  const summary = rtPersistPayload(payload);
  try { lastSummary = summary; } catch(e) {}
  const status = document.getElementById("scenarioFileStatus");
  if (status) status.textContent = `Saved OK: ${summary.id}`;
};
document.addEventListener("DOMContentLoaded", () => {
  try { renderSavedScenarios(); } catch(e) {}
  try { renderDashboardOpenTable(); } catch(e) {}
});
/* ===== END PHASE 23.0.61 SAVE OVERRIDE ===== */


/* ===== PHASE 23.0.61 WORKSPACE BRIDGE ===== */
document.addEventListener("DOMContentLoaded", () => {
  try { refreshWorkspaceDiagnostics(); } catch (e) { console.error(e); }
});
/* ===== END PHASE 23.0.61 WORKSPACE BRIDGE ===== */

/* ===== PHASE 23.0.61 CHROME EDGE WORKSPACE MODE ===== */
const WORKSPACE_LAST_FILE_WRITE_KEY = "risk_manager_workspace_last_file_write_v23016";
let workspaceFolderHandle = null;
let workspaceFolderName = "Not connected";
let workspaceScenarioCache = [];
function getLastWorkspaceFileWrite() { return localStorage.getItem(WORKSPACE_LAST_FILE_WRITE_KEY) || "None yet"; }
function setLastWorkspaceFileWrite(value) { localStorage.setItem(WORKSPACE_LAST_FILE_WRITE_KEY, String(value || "")); }
function browserSupportsWorkspaceFolderMode() { return !!(window && window.showDirectoryPicker && window.FileSystemHandle); }
function workspaceFolderModeEnabled() { return getScenarioSaveEngine() === "Chrome/Edge Workspace Folder"; }
function getWorkspaceConnectionStatusText() { return workspaceFolderHandle ? "Connected" : "Not connected"; }
function getCurrentWorkspaceFolderLabel() { return workspaceFolderHandle ? workspaceFolderName : "Not connected"; }
function workspaceStatus(msg) { const el = document.getElementById("workspaceSetupStatus"); if (el) el.textContent = msg; const s=document.getElementById("scenarioFileStatus"); if (s && msg) s.textContent = msg; }
function refreshWorkspaceFolderModeUi() {
  const support = document.getElementById("workspaceBrowserSupport"); if (support) support.value = browserSupportsWorkspaceFolderMode() ? "Supported in this browser" : "Not supported here - use Chrome or Edge";
  const conn = document.getElementById("workspaceConnectionStatus"); if (conn) conn.value = getWorkspaceConnectionStatusText();
  const folder = document.getElementById("workspaceSelectedFolder"); if (folder) folder.value = getCurrentWorkspaceFolderLabel();
  const last = document.getElementById("workspaceLastFileWrite"); if (last) last.value = getLastWorkspaceFileWrite();
  const actual = document.getElementById("workspaceActualBrowserLocation");
  if (actual && workspaceFolderModeEnabled() && workspaceFolderHandle) actual.value = `${workspaceFolderName} -> scenarios/*.json, scenarios/index.json`;
  const saveDest = document.getElementById("workspaceSaveDestination");
  if (saveDest && workspaceFolderModeEnabled() && workspaceFolderHandle) saveDest.value = `Workspace folder (${workspaceFolderName})`;
  else if (saveDest && workspaceFolderModeEnabled()) saveDest.value = "Chrome/Edge workspace folder mode selected, but no folder is connected yet";
}
async function getOrCreateDirectory(parentHandle, name) {
  return await parentHandle.getDirectoryHandle(name, { create: true });
}
async function writeJsonFile(dirHandle, fileName, data) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}
function buildWorkspaceConfigSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    sessionUserId: getSessionUserId(),
    sessionStorageMode: getSessionStorageMode(),
    scenarioSaveEngine: getScenarioSaveEngine(),
    localPath: getWorkspaceLocalPath(),
    sharedPath: getWorkspaceSharedPath()
  };
}
async function flushWorkspaceFiles() {
  if (!workspaceFolderHandle) throw new Error("No workspace folder selected");
  const configDir = await getOrCreateDirectory(workspaceFolderHandle, "config");
  const scenariosDir = await getOrCreateDirectory(workspaceFolderHandle, "scenarios");
  const reportsDir = await getOrCreateDirectory(workspaceFolderHandle, "reports");
  const auditDir = await getOrCreateDirectory(workspaceFolderHandle, "audit");
  await writeJsonFile(configDir, "workspace-settings.json", buildWorkspaceConfigSnapshot());
  try { await writeJsonFile(configDir, "users.json", getStoredUsers()); } catch (e) { console.error(e); }
  try { await writeJsonFile(configDir, "categories.json", getWorkspaceCategorySnapshot()); } catch (e) { console.error(e); }
  const scenarioIndex = workspaceScenarioCache.map(item => ({
    id: item.id || "",
    name: item.name || "",
    mode: item.mode || "single",
    productGroup: item.productGroup || "",
    scenarioStatus: item.scenarioStatus || "Open",
    assignedOwnerName: item.assignedOwnerName || "",
    storageMode: item.storageMode || getSessionStorageMode() || "Local Workspace",
    inherent: Number(item.inherent || 0),
    residual: Number(item.residual || 0),
    identifiedDate: item.identifiedDate || "",
    riskDomain: item.riskDomain || ""
  }));
  await writeJsonFile(scenariosDir, "index.json", scenarioIndex);
  for (const item of workspaceScenarioCache) {
    if (!item?.id) continue;
    await writeJsonFile(scenariosDir, `${String(item.id).replace(/[^a-zA-Z0-9_-]/g, "_")}.json`, item);
  }
  await writeJsonFile(reportsDir, "workspace-summary.json", { generatedAt: new Date().toISOString(), scenarioCount: scenarioIndex.length });
  const stamp = `${new Date().toLocaleString()} :: ${workspaceFolderName}`;
  await writeJsonFile(auditDir, "last-write.json", { lastWriteAt: new Date().toISOString(), folder: workspaceFolderName, scenarioCount: scenarioIndex.length });
  setLastWorkspaceFileWrite(stamp);
  refreshWorkspaceFolderModeUi();
  return stamp;
}
async function loadWorkspaceScenarioCache() {
  workspaceScenarioCache = [];
  if (!workspaceFolderHandle) return [];
  try {
    const scenariosDir = await getOrCreateDirectory(workspaceFolderHandle, "scenarios");
    const indexHandle = await scenariosDir.getFileHandle("index.json", { create: false });
    const file = await indexHandle.getFile();
    const text = await file.text();
    const indexItems = JSON.parse(text || "[]");
    if (!Array.isArray(indexItems)) return [];
    const out = [];
    for (const item of indexItems) {
      try {
        const fh = await scenariosDir.getFileHandle(`${String(item.id).replace(/[^a-zA-Z0-9_-]/g, "_")}.json`, { create: false });
        const f = await fh.getFile();
        const payload = JSON.parse(await f.text());
        out.push(payload);
      } catch (e) { out.push(item); }
    }
    workspaceScenarioCache = out;
  } catch (e) { console.error(e); }
  return workspaceScenarioCache;
}
async function selectWorkspaceFolder() {
  if (!browserSupportsWorkspaceFolderMode()) { alert("Use Chrome or Edge for workspace-folder mode."); return; }
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    workspaceFolderHandle = handle;
    workspaceFolderName = handle?.name || "Selected folder";
    if (!getWorkspaceLocalPath()) setWorkspaceLocalPath(workspaceFolderName);
    await loadWorkspaceScenarioCache();
    await flushWorkspaceFiles();
    refreshWorkspaceDiagnostics();
    refreshWorkspaceFolderModeUi();
    try { renderSavedScenarios(); renderDashboardOpenTable(); } catch (e) { console.error(e); }
    workspaceStatus(`Workspace folder connected: ${workspaceFolderName}`);
  } catch (e) { console.error(e); workspaceStatus("Workspace folder selection was cancelled or failed."); }
}
function disconnectWorkspaceFolder() {
  workspaceFolderHandle = null; workspaceFolderName = "Not connected"; workspaceScenarioCache = [];
  refreshWorkspaceDiagnostics(); refreshWorkspaceFolderModeUi(); renderSavedScenarios(); renderDashboardOpenTable();
  workspaceStatus("Workspace folder disconnected. Browser storage is now temporary only.");
}
const __rtOriginalGetSavedScenarios = getSavedScenarios;
const __rtOriginalSetSavedScenarios = setSavedScenarios;
getSavedScenarios = function() {
  if (workspaceFolderModeEnabled() && workspaceFolderHandle) return Array.isArray(workspaceScenarioCache) ? workspaceScenarioCache.slice() : [];
  return __rtOriginalGetSavedScenarios();
};
setSavedScenarios = function(items) {
  if (workspaceFolderModeEnabled() && workspaceFolderHandle) { workspaceScenarioCache = Array.isArray(items) ? items.slice() : []; return; }
  return __rtOriginalSetSavedScenarios(items);
};
deleteScenario = async function(id) {
  const next = getSavedScenarios().filter(x => x.id !== id);
  setSavedScenarios(next);
  if (workspaceFolderModeEnabled() && workspaceFolderHandle) {
    await flushWorkspaceFiles();
    workspaceStatus(`Deleted scenario ${id} from workspace folder.`);
  }
  renderSavedScenarios(); renderDashboardOpenTable(); refreshLibraries();
};
rtPersistPayload = async function(payload) {
  const summary = rtBuildSummary(payload);
  const saved = getSavedScenarios();
  const idx = saved.findIndex(x => String(x.id || "") === String(summary.id || ""));
  if (idx >= 0) saved[idx] = summary; else saved.unshift(summary);
  setSavedScenarios(saved);
  if (workspaceFolderModeEnabled()) {
    if (!workspaceFolderHandle) throw new Error("Select Workspace Folder before saving live data in Chrome/Edge workspace mode.");
    await flushWorkspaceFiles();
  } else {
    __rtOriginalSetSavedScenarios(saved);
  }
  try { renderSavedScenarios(); } catch(e) { console.error(e); }
  try { renderDashboardOpenTable(); } catch(e) { console.error(e); }
  return summary;
};
saveScenario = async function(event) {
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  let payload = null;
  const activeViewEl = document.querySelector(".view.active");
  const currentViewName = activeViewEl?.id?.replace(/^view-/, "") || (typeof activeMode !== "undefined" ? activeMode : "single");
  if (currentViewName === "beta" || (typeof activeMode !== "undefined" && activeMode === "beta")) return saveBetaScenario(event);
  payload = (typeof activeMode !== "undefined" && activeMode === "complex" && typeof getComplexPayload === "function") ? getComplexPayload() : (typeof getSinglePayload === "function" ? getSinglePayload() : null);
  if (!payload) return;
  if (!payload.id) { payload.id = rtGenerateScenarioId(); const idEl = document.getElementById(payload.mode === "complex" ? "complexScenarioId" : "singleScenarioId"); if (idEl) idEl.value = payload.id; }
  try {
    const summary = await rtPersistPayload(payload);
    try { lastSummary = summary; } catch(e) {}
    const status = document.getElementById("scenarioFileStatus");
    if (status) status.textContent = workspaceFolderModeEnabled() && workspaceFolderHandle ? `Saved to workspace folder: ${summary.id}` : `Saved OK: ${summary.id}`;
  } catch (e) {
    console.error(e); alert(e.message || "Unable to save scenario.");
  }
};
saveBetaScenario = async function(event) {
  if (event?.preventDefault) event.preventDefault();
  if (event?.stopPropagation) event.stopPropagation();
  if (typeof getBetaPayload !== "function") return;
  const payload = getBetaPayload();
  if (!payload.id) { payload.id = rtGenerateScenarioId(); const idEl = document.getElementById("betaScenarioId"); if (idEl) idEl.value = payload.id; }
  try {
    const summary = await rtPersistPayload(payload);
    try { lastSummary = summary; } catch(e) {}
    const status = document.getElementById("scenarioFileStatus");
    if (status) status.textContent = workspaceFolderModeEnabled() && workspaceFolderHandle ? `Saved to workspace folder: ${summary.id}` : `Saved OK: ${summary.id}`;
  } catch (e) { console.error(e); alert(e.message || "Unable to save beta scenario."); }
};
document.addEventListener("DOMContentLoaded", () => {
  try { refreshWorkspaceFolderModeUi(); } catch (e) { console.error(e); }
  document.getElementById("selectWorkspaceFolderBtn")?.addEventListener("click", selectWorkspaceFolder);
  document.getElementById("disconnectWorkspaceFolderBtn")?.addEventListener("click", disconnectWorkspaceFolder);
});
const __rtOriginalRefreshWorkspaceDiagnostics = refreshWorkspaceDiagnostics;
refreshWorkspaceDiagnostics = function() { __rtOriginalRefreshWorkspaceDiagnostics(); try { refreshWorkspaceFolderModeUi(); } catch (e) { console.error(e); } };
/* ===== END PHASE 23.0.61 CHROME EDGE WORKSPACE MODE ===== */


/* ===== PHASE 23.0.61 SESSION RESTORE AFTER LOGIN ===== */
const WORKSPACE_SESSION_STATE_FILE = "session-state.json";
let workspaceRestorePromptOpen = false;
let lastWorkspaceSessionSnapshot = null;
function getActiveViewNameForSessionState() {
  try {
    return document.querySelector('.view.active')?.id?.replace(/^view-/, '') || (activeMode === 'complex' ? 'complex' : activeMode === 'beta' ? 'beta' : 'single');
  } catch (e) {
    return activeMode === 'complex' ? 'complex' : activeMode === 'beta' ? 'beta' : 'single';
  }
}
function getCurrentScenarioIdForSessionState() {
  const ids = [
    document.getElementById('singleScenarioId')?.value,
    document.getElementById('complexScenarioId')?.value,
    document.getElementById('betaScenarioId')?.value
  ].map(v => String(v || '').trim()).filter(Boolean);
  return ids[0] || '';
}
function getCurrentScenarioNameForSessionState() {
  const names = [
    document.getElementById('singleScenarioName')?.value,
    document.getElementById('complexScenarioName')?.value,
    document.getElementById('betaScenarioName')?.value
  ].map(v => String(v || '').trim()).filter(Boolean);
  return names[0] || '';
}
function buildWorkspaceSessionState(reason, extra) {
  const sessionUser = getCurrentSessionUser();
  return {
    updatedAt: new Date().toISOString(),
    reason: String(reason || ''),
    sessionUserId: sessionUser?.userId || getSessionUserId() || '',
    sessionUserName: sessionUser?.displayName || '',
    scenarioId: String(extra?.scenarioId || getCurrentScenarioIdForSessionState() || ''),
    scenarioName: String(extra?.scenarioName || getCurrentScenarioNameForSessionState() || ''),
    activeView: String(extra?.activeView || getActiveViewNameForSessionState() || 'dashboard'),
    activeMode: String(extra?.activeMode || activeMode || 'single'),
    workspaceFolderName: workspaceFolderName || '',
    saveEngine: getScenarioSaveEngine(),
    storageMode: getSessionStorageMode()
  };
}
async function writeWorkspaceSessionState(reason, extra) {
  if (!workspaceFolderModeEnabled() || !workspaceFolderHandle) return null;
  try {
    const configDir = await getOrCreateDirectory(workspaceFolderHandle, 'config');
    const snapshot = buildWorkspaceSessionState(reason, extra || {});
    await writeJsonFile(configDir, WORKSPACE_SESSION_STATE_FILE, snapshot);
    lastWorkspaceSessionSnapshot = snapshot;
    const foundEl = document.getElementById('workspaceLastSessionFound');
    if (foundEl) foundEl.value = snapshot.scenarioId ? 'Yes' : 'No saved scenario recorded';
    const stampEl = document.getElementById('workspaceLastSessionTimestamp');
    if (stampEl) stampEl.value = snapshot.updatedAt || '';
    return snapshot;
  } catch (e) {
    console.error(e);
    return null;
  }
}
async function readWorkspaceSessionState() {
  if (!workspaceFolderModeEnabled() || !workspaceFolderHandle) return null;
  try {
    const configDir = await getOrCreateDirectory(workspaceFolderHandle, 'config');
    const fileHandle = await configDir.getFileHandle(WORKSPACE_SESSION_STATE_FILE, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    const payload = JSON.parse(text || '{}');
    lastWorkspaceSessionSnapshot = payload;
    const foundEl = document.getElementById('workspaceLastSessionFound');
    if (foundEl) foundEl.value = payload?.scenarioId ? 'Yes' : 'No saved scenario recorded';
    const stampEl = document.getElementById('workspaceLastSessionTimestamp');
    if (stampEl) stampEl.value = payload?.updatedAt || '';
    return payload;
  } catch (e) {
    const foundEl = document.getElementById('workspaceLastSessionFound');
    if (foundEl) foundEl.value = 'No';
    const stampEl = document.getElementById('workspaceLastSessionTimestamp');
    if (stampEl) stampEl.value = '';
    return null;
  }
}
async function clearWorkspaceSessionState() {
  if (!workspaceFolderModeEnabled() || !workspaceFolderHandle) return;
  try {
    const configDir = await getOrCreateDirectory(workspaceFolderHandle, 'config');
    const fileHandle = await configDir.getFileHandle(WORKSPACE_SESSION_STATE_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({ clearedAt: new Date().toISOString(), clearedByUserId: getSessionUserId() || '' }, null, 2));
    await writable.close();
    lastWorkspaceSessionSnapshot = null;
    const foundEl = document.getElementById('workspaceLastSessionFound');
    if (foundEl) foundEl.value = 'No';
    const stampEl = document.getElementById('workspaceLastSessionTimestamp');
    if (stampEl) stampEl.value = '';
    workspaceStatus('Previous session state cleared.');
  } catch (e) { console.error(e); }
}
function ensureRestorePromptShell() {
  if (document.getElementById('restoreSessionModal')) return;
  const modal = document.createElement('div');
  modal.id = 'restoreSessionModal';
  modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(12,18,34,0.72); z-index:10001; align-items:center; justify-content:center; padding:24px;';
  modal.innerHTML = `
    <div class="card" style="width:min(560px,96vw); max-height:90vh; overflow:auto;">
      <div class="card-header"><h3>Restore Previous Session</h3><span>Resume your last saved workspace session</span></div>
      <div class="card-body">
        <p id="restoreSessionMessage" style="margin-top:0;">A previous session was found.</p>
        <div class="builder-actions">
          <button class="btn btn-primary" type="button" id="restoreSessionConfirmBtn">Restore Previous Session</button>
          <button class="btn btn-secondary" type="button" id="restoreSessionNotNowBtn">Not Now</button>
          <button class="btn btn-secondary" type="button" id="restoreSessionClearBtn">Clear Session State</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('restoreSessionNotNowBtn')?.addEventListener('click', () => {
    modal.style.display = 'none';
    workspaceRestorePromptOpen = false;
  });
  document.getElementById('restoreSessionConfirmBtn')?.addEventListener('click', async () => {
    modal.style.display = 'none';
    workspaceRestorePromptOpen = false;
    await restoreWorkspaceSessionFromFile();
  });
  document.getElementById('restoreSessionClearBtn')?.addEventListener('click', async () => {
    await clearWorkspaceSessionState();
    modal.style.display = 'none';
    workspaceRestorePromptOpen = false;
  });
}
function showRestorePrompt(snapshot) {
  ensureRestorePromptShell();
  const modal = document.getElementById('restoreSessionModal');
  const msg = document.getElementById('restoreSessionMessage');
  if (msg) {
    const name = snapshot?.scenarioName || snapshot?.scenarioId || 'your last scenario';
    const when = snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleString() : 'an earlier session';
    msg.textContent = `A previous session was found for ${name}. Last updated ${when}. Would you like to restore it now?`;
  }
  if (modal) modal.style.display = 'flex';
  workspaceRestorePromptOpen = true;
}
async function maybePromptWorkspaceRestore(trigger) {
  if (workspaceRestorePromptOpen) return false;
  if (!isUserLoggedIn()) return false;
  if (!workspaceFolderModeEnabled() || !workspaceFolderHandle) return false;
  const snapshot = await readWorkspaceSessionState();
  if (!snapshot || !snapshot.scenarioId) return false;
  showRestorePrompt(snapshot);
  return true;
}
async function restoreWorkspaceSessionFromFile() {
  if (!workspaceFolderModeEnabled() || !workspaceFolderHandle) {
    alert('Connect a workspace folder first.');
    return false;
  }
  const snapshot = await readWorkspaceSessionState();
  if (!snapshot || !snapshot.scenarioId) {
    alert('No previous session was found in the connected workspace folder.');
    return false;
  }
  try { await loadWorkspaceScenarioCache(); } catch (e) { console.error(e); }
  const saved = getSavedScenarios();
  const match = saved.find(x => String(x.id || '') === String(snapshot.scenarioId || ''));
  if (!match) {
    alert('The previous scenario was not found in the connected workspace folder.');
    return false;
  }
  openScenario(match.id);
  if (snapshot.activeView && ['dashboard','single','complex','beta','saved','reports','users','information'].includes(snapshot.activeView)) {
    activateView(snapshot.activeView);
  }
  workspaceStatus(`Previous session restored: ${snapshot.scenarioName || snapshot.scenarioId}`);
  return true;
}
const rtOriginalActivateView = activateView;
activateView = function(viewName) {
  const result = rtOriginalActivateView.apply(this, arguments);
  if (workspaceFolderModeEnabled() && workspaceFolderHandle && isUserLoggedIn()) {
    writeWorkspaceSessionState('view-change', { activeView: viewName }).catch(console.error);
  }
  return result;
};
const rtOriginalOpenScenario = openScenario;
openScenario = function(id) {
  const result = rtOriginalOpenScenario.apply(this, arguments);
  const match = getSavedScenarios().find(x => String(x.id || '') === String(id || ''));
  if (match && workspaceFolderModeEnabled() && workspaceFolderHandle && isUserLoggedIn()) {
    writeWorkspaceSessionState('scenario-open', {
      scenarioId: match.id || '',
      scenarioName: match.name || '',
      activeView: match.mode === 'complex' ? 'complex' : match.mode === 'beta' ? 'beta' : 'single',
      activeMode: match.mode || activeMode || 'single'
    }).catch(console.error);
  }
  return result;
};
const rtOriginalSaveScenario = saveScenario;
saveScenario = function(event) {
  const result = rtOriginalSaveScenario.apply(this, arguments);
  if (workspaceFolderModeEnabled() && workspaceFolderHandle && isUserLoggedIn()) {
    const scenarioId = getCurrentScenarioIdForSessionState();
    const scenarioName = getCurrentScenarioNameForSessionState();
    writeWorkspaceSessionState('scenario-save', {
      scenarioId,
      scenarioName,
      activeView: getActiveViewNameForSessionState(),
      activeMode: activeMode || 'single'
    }).catch(console.error);
  }
  return result;
};
const rtOriginalStartUserSession = startUserSession;
startUserSession = function() {
  const result = rtOriginalStartUserSession.apply(this, arguments);
  setTimeout(() => { maybePromptWorkspaceRestore('login').catch(console.error); }, 250);
  return result;
};
const rtOriginalSelectWorkspaceFolder = selectWorkspaceFolder;
selectWorkspaceFolder = async function() {
  const result = await rtOriginalSelectWorkspaceFolder.apply(this, arguments);
  await readWorkspaceSessionState();
  await maybePromptWorkspaceRestore('folder-connect');
  return result;
};
const rtOriginalFlushWorkspaceFiles = flushWorkspaceFiles;
flushWorkspaceFiles = async function() {
  const result = await rtOriginalFlushWorkspaceFiles.apply(this, arguments);
  await writeWorkspaceSessionState('workspace-flush', {
    scenarioId: getCurrentScenarioIdForSessionState(),
    scenarioName: getCurrentScenarioNameForSessionState(),
    activeView: getActiveViewNameForSessionState(),
    activeMode: activeMode || 'single'
  });
  return result;
};
document.addEventListener('DOMContentLoaded', () => {
  try {
    const restoreBtn = document.getElementById('restorePreviousSessionBtn');
    if (restoreBtn) restoreBtn.addEventListener('click', () => restoreWorkspaceSessionFromFile().catch(console.error));
    const clearBtn = document.getElementById('clearPreviousSessionBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => clearWorkspaceSessionState().catch(console.error));
    readWorkspaceSessionState().catch(() => {});
    syncAppVersionDisplay();
  } catch (e) { console.error(e); }
});
/* ===== END PHASE 23.0.61 SESSION RESTORE AFTER LOGIN ===== */

/* ===== PHASE 23.0.61 LOGIN RECONNECT + RESTORE PROMPT FIX ===== */
(function(){
  const RT_FORCE_LOGIN_EACH_PAGE_LOAD = true;
  let postLoginReconnectPromptOpen = false;
  let postLoginReconnectPromptDismissed = false;

  function rt2424IsWorkspaceModeAvailable() {
    try { return typeof window.showDirectoryPicker === 'function'; } catch (e) { return false; }
  }

  function rt2424ForceLoginOnFreshLoad() {
    if (!RT_FORCE_LOGIN_EACH_PAGE_LOAD) return;
    try { localStorage.removeItem(SESSION_USER_KEY); } catch (e) { console.warn(e); }
  }

  function rt2424EnsureReconnectPromptShell() {
    if (document.getElementById('postLoginWorkspaceReconnectModal')) return;
    const modal = document.createElement('div');
    modal.id = 'postLoginWorkspaceReconnectModal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(12,18,34,0.72); z-index:10002; align-items:center; justify-content:center; padding:24px;';
    modal.innerHTML = `
      <div class="card" style="width:min(640px,96vw); max-height:90vh; overflow:auto;">
        <div class="card-header"><h3>Reconnect Workspace Folder</h3><span>Required before restoring or saving live work files</span></div>
        <div class="card-body">
          <p style="margin-top:0;">RiskTool work mode uses Chrome or Edge folder access so scenario files stay in your selected local or shared-drive workspace folder.</p>
          <p>After login, reconnect the same workspace folder. If <code>config/session-state.json</code> exists, RiskTool will then offer to restore your previous session.</p>
          <div class="note-box" id="postLoginWorkspaceReconnectStatus">No workspace folder is connected for this browser session yet.</div>
          <div class="builder-actions">
            <button class="btn btn-primary" type="button" id="postLoginReconnectFolderBtn">Reconnect Workspace Folder</button>
            <button class="btn btn-secondary" type="button" id="postLoginSkipReconnectBtn">Not Now</button>
            <button class="btn btn-secondary" type="button" id="postLoginOpenUserAdminBtn">Open User Admin</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('postLoginSkipReconnectBtn')?.addEventListener('click', () => {
      postLoginReconnectPromptDismissed = true;
      postLoginReconnectPromptOpen = false;
      modal.style.display = 'none';
    });
    document.getElementById('postLoginOpenUserAdminBtn')?.addEventListener('click', () => {
      postLoginReconnectPromptDismissed = true;
      postLoginReconnectPromptOpen = false;
      modal.style.display = 'none';
      try { activateView('users'); } catch(e) { console.error(e); }
    });
    document.getElementById('postLoginReconnectFolderBtn')?.addEventListener('click', async () => {
      const status = document.getElementById('postLoginWorkspaceReconnectStatus');
      try {
        if (!rt2424IsWorkspaceModeAvailable()) {
          if (status) status.textContent = 'This browser does not support workspace folder access. Use current Chrome or Edge.';
          return;
        }
        setScenarioSaveEngine('Chrome/Edge Workspace Folder');
        if (typeof selectWorkspaceFolder === 'function') {
          await selectWorkspaceFolder();
        } else if (typeof window.showDirectoryPicker === 'function') {
          workspaceFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          workspaceFolderName = workspaceFolderHandle?.name || 'Selected folder';
        }
        if (status) status.textContent = `Workspace folder connected: ${workspaceFolderName || 'Selected folder'}. Checking for previous session...`;
        postLoginReconnectPromptOpen = false;
        modal.style.display = 'none';
        try { if (typeof refreshWorkspaceDiagnostics === 'function') refreshWorkspaceDiagnostics(); } catch(e) {}
        try { if (typeof refreshWorkspaceFolderModeUi === 'function') refreshWorkspaceFolderModeUi(); } catch(e) {}
        if (typeof maybePromptWorkspaceRestore === 'function') {
          const shown = await maybePromptWorkspaceRestore('post-login-reconnect');
          if (!shown && status) workspaceStatus('Workspace folder connected. No previous session file was found.');
        }
      } catch (e) {
        console.error(e);
        if (status) status.textContent = 'Workspace folder was not connected. Select the approved workspace folder to restore or save live work files.';
      }
    });
  }

  function rt2424ShowPostLoginReconnectPrompt(reason) {
    if (!isUserLoggedIn || !isUserLoggedIn()) return false;
    if (postLoginReconnectPromptOpen || postLoginReconnectPromptDismissed) return false;
    if (!rt2424IsWorkspaceModeAvailable()) return false;
    try { setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
    if (typeof workspaceFolderHandle !== 'undefined' && workspaceFolderHandle) {
      if (typeof maybePromptWorkspaceRestore === 'function') maybePromptWorkspaceRestore(reason || 'post-login').catch(console.error);
      return false;
    }
    rt2424EnsureReconnectPromptShell();
    const modal = document.getElementById('postLoginWorkspaceReconnectModal');
    const status = document.getElementById('postLoginWorkspaceReconnectStatus');
    if (status) status.textContent = 'Login complete. Reconnect the approved workspace folder to continue with file-based storage and previous-session restore.';
    if (modal) modal.style.display = 'flex';
    postLoginReconnectPromptOpen = true;
    return true;
  }

  const rt2424PriorStartUserSession = startUserSession;
  startUserSession = function() {
    const before = isUserLoggedIn ? isUserLoggedIn() : false;
    const result = rt2424PriorStartUserSession.apply(this, arguments);
    const after = isUserLoggedIn ? isUserLoggedIn() : false;
    if (!before && after) {
      setTimeout(() => rt2424ShowPostLoginReconnectPrompt('login'), 350);
    }
    return result;
  };

  document.addEventListener('DOMContentLoaded', () => {
    rt2424ForceLoginOnFreshLoad();
    try { updateLoginState(); } catch(e) { console.error(e); }
    try { showLoginGate(); } catch(e) { console.error(e); }
    setTimeout(() => {
      if (isUserLoggedIn && isUserLoggedIn()) rt2424ShowPostLoginReconnectPrompt('already-logged-in');
    }, 500);
  });
})();
/* ===== END PHASE 23.0.61 LOGIN RECONNECT + RESTORE PROMPT FIX ===== */


/* ===== PHASE 23.0.61 WORKSPACE-GATED LISTS + POST-LOGIN RESTORE ===== */
(function(){
  const PHASE = "23.0.61";
  function folderConnected(){ try { return typeof workspaceFolderHandle !== 'undefined' && !!workspaceFolderHandle; } catch(e) { return false; } }
  function supportsPicker(){ try { return typeof window.showDirectoryPicker === 'function'; } catch(e) { return false; } }
  function setPhaseDisplays(){
    const appVersion = document.getElementById('appVersion');
    if (appVersion) appVersion.textContent = PHASE;
    const note = document.getElementById('workspacePhaseNote');
    if (note) note.textContent = `Current frontend phase: ${PHASE}. Scenario lists stay empty until a workspace folder is connected. Live work files write to the selected Chrome/Edge workspace folder, not the website.`;
  }
  async function readSessionStateFile(){
    if (!folderConnected()) return null;
    try {
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: false });
      const f = await fh.getFile();
      return JSON.parse(await f.text());
    } catch(e) { return null; }
  }
  async function writeSessionStateFile(reason, extra){
    if (!folderConnected()) return null;
    try {
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: true });
      const w = await fh.createWritable();
      const activeViewEl = document.querySelector('.view.active');
      const payload = Object.assign({ phase: PHASE, reason: reason || 'update', updatedAt: new Date().toISOString(), activeView: activeViewEl?.id?.replace(/^view-/, '') || '', userId: (typeof getSessionUserId === 'function' ? getSessionUserId() : '') }, extra || {});
      await w.write(JSON.stringify(payload, null, 2)); await w.close(); return payload;
    } catch(e) { console.error('session-state write failed', e); return null; }
  }
  async function promptRestoreIfSessionExists(){
    if (!folderConnected()) return false;
    try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) { console.error(e); }
    const session = await readSessionStateFile();
    const id = session?.scenarioId || session?.lastScenarioId || '';
    if (!id) return false;
    const saved = (typeof getSavedScenarios === 'function') ? getSavedScenarios() : [];
    const match = saved.find(s => String(s.id || '') === String(id));
    const label = match?.name || session?.scenarioName || id;
    if (!confirm(`Restore previous RiskTool session?\n\nScenario: ${label}\nLast saved: ${session.updatedAt || session.timestamp || 'Unknown'}`)) return true;
    if (match && typeof openScenario === 'function') { openScenario(match.id); return true; }
    alert('Previous session was found, but the scenario was not found in the connected workspace folder.');
    return true;
  }
  function ensureReconnectModal(){
    let modal = document.getElementById('rtReconnectWorkspace25');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'rtReconnectWorkspace25';
    modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:20000; background:rgba(15,23,42,.72); align-items:center; justify-content:center; padding:24px;';
    modal.innerHTML = `<div class="card" style="width:min(680px,96vw);max-height:90vh;overflow:auto;"><div class="card-header"><h3>Reconnect Workspace Folder</h3><span>Required for secure file storage and session restore</span></div><div class="card-body"><p style="margin-top:0;">Scenario lists and live work files remain unavailable until you connect the approved local or shared-drive workspace folder.</p><div class="note-box" id="rtReconnectWorkspace25Status">Login complete. Choose the workspace folder to continue.</div><div class="builder-actions"><button type="button" class="btn btn-primary" id="rtChooseWorkspace25">Choose Workspace Folder</button><button type="button" class="btn btn-secondary" id="rtSkipWorkspace25">Not Now</button></div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#rtSkipWorkspace25')?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.querySelector('#rtChooseWorkspace25')?.addEventListener('click', async () => {
      const status = document.getElementById('rtReconnectWorkspace25Status');
      try {
        if (!supportsPicker()) { if (status) status.textContent = 'Use current Chrome or Edge for workspace folder access.'; return; }
        try { setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
        if (typeof selectWorkspaceFolder === 'function') await selectWorkspaceFolder();
        else { workspaceFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); workspaceFolderName = workspaceFolderHandle?.name || 'Selected folder'; }
        if (status) status.textContent = `Workspace connected: ${workspaceFolderName || 'Selected folder'}. Checking for previous session...`;
        try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) {}
        try { renderSavedScenarios(); renderDashboardOpenTable(); } catch(e) {}
        modal.style.display = 'none';
        const shown = await promptRestoreIfSessionExists();
        if (!shown) alert('Workspace folder connected. No previous session file was found yet.');
      } catch(e) { console.error(e); if (status) status.textContent = 'Workspace folder was not connected.'; }
    });
    return modal;
  }
  function showReconnectPrompt(){ if (folderConnected()) { promptRestoreIfSessionExists().catch(console.error); return; } ensureReconnectModal().style.display = 'flex'; }
  const priorGetSaved = getSavedScenarios;
  getSavedScenarios = function(){ if (!folderConnected()) return []; return priorGetSaved.apply(this, arguments); };
  const priorSetSaved = setSavedScenarios;
  setSavedScenarios = function(items){ if (!folderConnected()) { alert('Connect the approved workspace folder before saving live scenarios.'); return; } return priorSetSaved.apply(this, arguments); };
  const priorRenderSaved = renderSavedScenarios;
  renderSavedScenarios = function(){ if (!folderConnected()) { const c=document.getElementById('savedCount'); if(c)c.textContent='0'; const b=document.getElementById('savedEvaluationsBody'); if(b)b.innerHTML='<tr><td colspan="11">Connect a workspace folder to view saved scenarios.</td></tr>'; return; } return priorRenderSaved.apply(this, arguments); };
  const priorRenderDash = renderDashboardOpenTable;
  renderDashboardOpenTable = function(){ if (!folderConnected()) { const b=document.getElementById('dashboardOpenScenarioBody'); if(b)b.innerHTML='<tr><td colspan="11">Connect a workspace folder to view open scenarios.</td></tr>'; return; } return priorRenderDash.apply(this, arguments); };
  deleteScenario = async function(id){
    if (!folderConnected()) { alert('Connect a workspace folder before deleting scenario files.'); return; }
    if (!confirm(`Delete scenario ${id}?`)) return;
    try { workspaceScenarioCache = (getSavedScenarios() || []).filter(x => String(x.id || '') !== String(id || '')); } catch(e) {}
    try { const dir = await workspaceFolderHandle.getDirectoryHandle('scenarios', {create:true}); const fn = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`; if (typeof dir.removeEntry === 'function') await dir.removeEntry(fn).catch(()=>{}); } catch(e) { console.warn(e); }
    try { if (typeof flushWorkspaceFiles === 'function') await flushWorkspaceFiles(); } catch(e) { console.error(e); }
    try { renderSavedScenarios(); renderDashboardOpenTable(); if (typeof refreshLibraries==='function') refreshLibraries(); } catch(e) {}
  };
  const priorStart = startUserSession;
  startUserSession = function(){ const result = priorStart.apply(this, arguments); if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) setTimeout(showReconnectPrompt, 300); return result; };
  const priorSelect = (typeof selectWorkspaceFolder === 'function') ? selectWorkspaceFolder : null;
  if (priorSelect) selectWorkspaceFolder = async function(){ const result = await priorSelect.apply(this, arguments); try { await loadWorkspaceScenarioCache(); renderSavedScenarios(); renderDashboardOpenTable(); } catch(e) {} return result; };
  const priorOpen = openScenario;
  openScenario = function(id){ const result = priorOpen.apply(this, arguments); const m=(getSavedScenarios()||[]).find(s=>String(s.id||'')===String(id||'')); if(m) writeSessionStateFile('scenario-open', {scenarioId:m.id, scenarioName:m.name}).catch(console.error); return result; };
  const priorSave = saveScenario;
  saveScenario = async function(event){ if (!folderConnected()) { alert('Connect a workspace folder before saving live scenarios.'); return; } const result = await priorSave.apply(this, arguments); const id=document.getElementById('singleScenarioId')?.value || document.getElementById('complexScenarioId')?.value || document.getElementById('betaScenarioId')?.value || ''; const name=document.getElementById('singleScenarioName')?.value || document.getElementById('complexScenarioName')?.value || document.getElementById('betaScenarioName')?.value || ''; await writeSessionStateFile('scenario-save', {scenarioId:id, scenarioName:name}); return result; };
  document.addEventListener('DOMContentLoaded', () => { setPhaseDisplays(); try { setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {} setTimeout(()=>{ try { renderSavedScenarios(); renderDashboardOpenTable(); } catch(e){} }, 200); setTimeout(()=>{ if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) showReconnectPrompt(); }, 500); });
})();
/* ===== END PHASE 23.0.61 ===== */


/* ===== PHASE 23.0.61 DIRECT LOGIN RECONNECT HOOK ===== */
(function(){
  const PHASE = "23.0.61";
  function rt28SetPhaseDisplays(){
    try { if (typeof APP_VERSION !== 'undefined') window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}
    const ids = ['appVersion','versionDisplay','footerVersion','phaseVersion'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = PHASE; });
    const note = document.getElementById('workspacePhaseNote');
    if (note) note.textContent = `Current frontend phase: ${PHASE}. Login now routes through the direct workspace reconnect flow. Scenario lists remain empty until a Chrome/Edge workspace folder is connected.`;
  }
  function rt28FolderConnected(){
    try { return typeof workspaceFolderHandle !== 'undefined' && !!workspaceFolderHandle; } catch(e) { return false; }
  }
  function rt28SupportsPicker(){
    try { return typeof window.showDirectoryPicker === 'function'; } catch(e) { return false; }
  }
  async function rt28ReadSessionState(){
    if (!rt28FolderConnected()) return null;
    try {
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: false });
      const f = await fh.getFile();
      return JSON.parse(await f.text());
    } catch(e) { return null; }
  }
  async function rt28WriteSessionState(reason){
    if (!rt28FolderConnected()) return null;
    try {
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: true });
      const w = await fh.createWritable();
      const id = document.getElementById('singleScenarioId')?.value || document.getElementById('complexScenarioId')?.value || document.getElementById('betaScenarioId')?.value || '';
      const name = document.getElementById('singleScenarioName')?.value || document.getElementById('complexScenarioName')?.value || document.getElementById('betaScenarioName')?.value || '';
      const activeViewEl = document.querySelector('.view.active');
      const payload = {
        phase: PHASE,
        reason: reason || 'session-update',
        updatedAt: new Date().toISOString(),
        scenarioId: id,
        scenarioName: name,
        activeView: activeViewEl?.id?.replace(/^view-/, '') || '',
        userId: (typeof getSessionUserId === 'function' ? getSessionUserId() : '')
      };
      await w.write(JSON.stringify(payload, null, 2));
      await w.close();
      return payload;
    } catch(e) { console.error('RiskTool session-state write failed', e); return null; }
  }
  async function rt28OfferRestore(){
    const session = await rt28ReadSessionState();
    const id = session?.scenarioId || session?.lastScenarioId || '';
    const label = session?.scenarioName || id || 'Previous session';
    if (!session || !id) {
      alert('Workspace folder connected. No previous session file with a scenario ID was found yet.');
      return false;
    }
    try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) { console.error(e); }
    if (!confirm(`Restore previous RiskTool session?\n\nScenario: ${label}\nLast saved: ${session.updatedAt || session.timestamp || 'Unknown'}`)) return true;
    const saved = (typeof getSavedScenarios === 'function') ? getSavedScenarios() : [];
    const match = saved.find(s => String(s.id || '') === String(id));
    if (match && typeof openScenario === 'function') {
      openScenario(match.id);
      return true;
    }
    alert('Previous session was found, but that scenario was not found in the connected workspace folder.');
    return true;
  }
  function rt28EnsureReconnectModal(){
    let modal = document.getElementById('rtDirectReconnectModal28');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'rtDirectReconnectModal28';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:30000;background:rgba(15,23,42,.74);align-items:center;justify-content:center;padding:24px;';
    modal.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:90vh;overflow:auto;"><div class="card-header"><h3>Reconnect Workspace Folder</h3><span>Chrome / Edge file workspace required</span></div><div class="card-body"><p style="margin-top:0;">Login is complete. To load saved scenarios and restore the previous session, reconnect the approved local or shared-drive workspace folder.</p><div class="note-box" id="rtDirectReconnectStatus28">Choose the same workspace folder used for RiskTool files.</div><div class="builder-actions"><button type="button" class="btn btn-primary" id="rtDirectChooseWorkspace28">Reconnect Workspace Folder</button><button type="button" class="btn btn-secondary" id="rtDirectSkipWorkspace28">Not Now</button></div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#rtDirectSkipWorkspace28')?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.querySelector('#rtDirectChooseWorkspace28')?.addEventListener('click', async () => {
      const status = document.getElementById('rtDirectReconnectStatus28');
      try {
        if (!rt28SupportsPicker()) { if (status) status.textContent = 'Use current Chrome or Edge. This browser does not expose workspace folder access.'; return; }
        try { if (typeof setScenarioSaveEngine === 'function') setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
        if (typeof selectWorkspaceFolder === 'function') {
          await selectWorkspaceFolder();
        } else {
          workspaceFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          workspaceFolderName = workspaceFolderHandle?.name || 'Selected folder';
        }
        if (status) status.textContent = `Workspace connected: ${workspaceFolderName || 'Selected folder'}. Checking previous session...`;
        try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) { console.error(e); }
        try { if (typeof renderSavedScenarios === 'function') renderSavedScenarios(); if (typeof renderDashboardOpenTable === 'function') renderDashboardOpenTable(); } catch(e) { console.error(e); }
        modal.style.display = 'none';
        await rt28OfferRestore();
      } catch(e) {
        console.error(e);
        if (status) status.textContent = 'Workspace folder was not connected. Choose the folder again to restore the session.';
      }
    });
    return modal;
  }
  function rt28ShowReconnectModal(){
    if (rt28FolderConnected()) { rt28OfferRestore().catch(console.error); return; }
    rt28EnsureReconnectModal().style.display = 'flex';
  }
  window.rtLoginAndReconnect = function(){
    try { if (typeof startUserSession === 'function') startUserSession(); } catch(e) { console.error(e); }
    setTimeout(() => {
      try {
        if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) rt28ShowReconnectModal();
      } catch(e) { console.error(e); }
    }, 450);
  };
  window.rtShowReconnectWorkspacePrompt = rt28ShowReconnectModal;
  document.addEventListener('DOMContentLoaded', () => {
    rt28SetPhaseDisplays();
    try { if (typeof setScenarioSaveEngine === 'function') setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
    const loginBtn = document.getElementById('loginGateContinueBtn');
    if (loginBtn) {
      loginBtn.onclick = null;
      loginBtn.addEventListener('click', window.rtLoginAndReconnect);
    }
    const pwd = document.getElementById('loginGatePassword');
    if (pwd) {
      pwd.onkeydown = null;
      pwd.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); window.rtLoginAndReconnect(); } });
    }
  });
  try {
    const priorSave = saveScenario;
    saveScenario = async function(){
      const result = await priorSave.apply(this, arguments);
      await rt28WriteSessionState('scenario-save');
      return result;
    };
  } catch(e) { console.warn('RiskTool save session hook not applied', e); }
})();
/* ===== END PHASE 23.0.61 ===== */



/* ===== PHASE 23.0.61 DIRECT POST-LOGIN RECONNECT FLOW ===== */
(function(){
  const PHASE = "23.0.61";
  function setPhase29Displays(){
    ["appVersion","phaseBadge","phaseVersion","footerVersion"].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=PHASE; });
    document.querySelectorAll('[data-app-version]').forEach(el => { el.textContent = PHASE; });
  }
  function userLoggedIn29(){
    try { return typeof isUserLoggedIn === 'function' ? !!isUserLoggedIn() : !!(typeof getSessionUserId === 'function' && getSessionUserId()); } catch(e) { return false; }
  }
  function folderConnected29(){
    try { return typeof workspaceFolderHandle !== 'undefined' && !!workspaceFolderHandle; } catch(e) { return false; }
  }
  function supportsFolderPicker29(){
    try { return typeof window.showDirectoryPicker === 'function'; } catch(e) { return false; }
  }
  async function readSessionState29(){
    try {
      if (!folderConnected29()) return null;
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: false });
      const file = await fh.getFile();
      return JSON.parse(await file.text());
    } catch(e) { return null; }
  }
  async function writeSessionState29(reason, extra){
    try {
      if (!folderConnected29()) return null;
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: true });
      const writable = await fh.createWritable();
      const activeView = document.querySelector('.view.active')?.id?.replace(/^view-/,'') || '';
      const payload = Object.assign({ phase: PHASE, reason: reason || 'update', updatedAt: new Date().toISOString(), activeView, userId: (typeof getSessionUserId === 'function' ? getSessionUserId() : '') }, extra || {});
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      return payload;
    } catch(e) { console.error('Phase 23.0.61 session write failed', e); return null; }
  }
  async function offerRestore29(){
    if (!folderConnected29()) return false;
    try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) { console.error(e); }
    try { if (typeof renderSavedScenarios === 'function') renderSavedScenarios(); if (typeof renderDashboardOpenTable === 'function') renderDashboardOpenTable(); } catch(e) {}
    const session = await readSessionState29();
    if (!session) return false;
    const id = session.scenarioId || session.lastScenarioId || '';
    if (!id) return false;
    const saved = (typeof getSavedScenarios === 'function') ? getSavedScenarios() : [];
    const match = saved.find(s => String(s.id || '') === String(id));
    const label = (match && match.name) || session.scenarioName || id;
    const answer = confirm(`Restore previous RiskTool session?\n\nScenario: ${label}\nLast saved: ${session.updatedAt || session.timestamp || 'Unknown'}`);
    if (!answer) return true;
    if (match && typeof openScenario === 'function') { openScenario(match.id); return true; }
    alert('Previous session was found, but the matching scenario was not found in the selected workspace folder.');
    return true;
  }
  function ensureReconnectModal29(){
    let modal = document.getElementById('rtReconnectWorkspace29');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'rtReconnectWorkspace29';
    modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:30000; background:rgba(15,23,42,.74); align-items:center; justify-content:center; padding:24px;';
    modal.innerHTML = `
      <div class="card" style="width:min(700px,96vw);max-height:90vh;overflow:auto;">
        <div class="card-header"><h3>Reconnect Workspace Folder</h3><span>Required before saved scenarios or session restore can load</span></div>
        <div class="card-body">
          <p style="margin-top:0;">RiskTool does not keep work scenarios in the website. After login, choose the approved local or shared-drive workspace folder so saved scenarios and previous session restore can load.</p>
          <div class="note-box" id="rtReconnectWorkspace29Status">Login complete. Choose the workspace folder to continue.</div>
          <div class="builder-actions">
            <button type="button" class="btn btn-primary" id="rtChooseWorkspace29">Reconnect Workspace Folder</button>
            <button type="button" class="btn btn-secondary" id="rtSkipWorkspace29">Not Now</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#rtSkipWorkspace29')?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.querySelector('#rtChooseWorkspace29')?.addEventListener('click', async () => {
      const status = document.getElementById('rtReconnectWorkspace29Status');
      try {
        if (!supportsFolderPicker29()) { if (status) status.textContent = 'Use Chrome or Edge for workspace folder access.'; return; }
        try { if (typeof setScenarioSaveEngine === 'function') setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
        if (typeof selectWorkspaceFolder === 'function') await selectWorkspaceFolder();
        else {
          workspaceFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          workspaceFolderName = workspaceFolderHandle?.name || 'Selected folder';
        }
        if (status) status.textContent = `Workspace connected: ${typeof workspaceFolderName !== 'undefined' ? workspaceFolderName : 'Selected folder'}. Checking previous session...`;
        try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) {}
        try { if (typeof refreshWorkspaceFolderModeUi === 'function') refreshWorkspaceFolderModeUi(); if (typeof renderSavedScenarios === 'function') renderSavedScenarios(); if (typeof renderDashboardOpenTable === 'function') renderDashboardOpenTable(); } catch(e) {}
        modal.style.display = 'none';
        const restoredPromptShown = await offerRestore29();
        if (!restoredPromptShown) alert('Workspace folder connected. No previous session file was found yet.');
      } catch(e) {
        console.error(e);
        if (status) status.textContent = 'Workspace folder was not connected.';
      }
    });
    return modal;
  }
  window.rtShowReconnectWorkspaceModal = function(reason){
    setPhase29Displays();
    if (!userLoggedIn29()) return;
    if (folderConnected29()) { offerRestore29().catch(console.error); return; }
    ensureReconnectModal29().style.display = 'flex';
  };
  window.rtStartSessionAndReconnect = function(){
    try { if (typeof startUserSession === 'function') startUserSession(); } catch(e) { console.error(e); }
    setTimeout(() => { window.rtShowReconnectWorkspaceModal('login-direct'); }, 300);
  };
  document.addEventListener('DOMContentLoaded', () => {
    setPhase29Displays();
    const oldBtn = document.getElementById('loginGateContinueBtn');
    if (oldBtn) {
      const btn = oldBtn.cloneNode(true);
      oldBtn.parentNode.replaceChild(btn, oldBtn);
      btn.onclick = function(event){ event.preventDefault(); window.rtStartSessionAndReconnect(); return false; };
    }
    const pwd = document.getElementById('loginGatePassword');
    if (pwd) pwd.onkeydown = function(event){ if(event.key === 'Enter'){ event.preventDefault(); window.rtStartSessionAndReconnect(); return false; } };
  });
  try {
    const priorOpen = typeof openScenario === 'function' ? openScenario : null;
    if (priorOpen) openScenario = function(id){ const result = priorOpen.apply(this, arguments); const m=(typeof getSavedScenarios === 'function' ? getSavedScenarios() : []).find(s=>String(s.id||'')===String(id||'')); if(m) writeSessionState29('scenario-open', {scenarioId:m.id, scenarioName:m.name}).catch(console.error); return result; };
  } catch(e) {}
  try {
    const priorSave = typeof saveScenario === 'function' ? saveScenario : null;
    if (priorSave) saveScenario = async function(event){ const result = await priorSave.apply(this, arguments); const id=document.getElementById('singleScenarioId')?.value || document.getElementById('complexScenarioId')?.value || document.getElementById('betaScenarioId')?.value || ''; const name=document.getElementById('singleScenarioName')?.value || document.getElementById('complexScenarioName')?.value || document.getElementById('betaScenarioName')?.value || ''; if(id) await writeSessionState29('scenario-save', {scenarioId:id, scenarioName:name}); return result; };
  } catch(e) {}
})();
/* ===== END PHASE 23.0.61 ===== */


/* ===== PHASE 23.0.61 SIMPLE POST-LOGIN RESTORE SCREEN ===== */
(function(){
  const PHASE = "23.0.61";
  function setVersion32(){
    try { ["appVersion","versionDisplay","phaseBadge","phaseVersion","footerVersion"].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=PHASE; }); } catch(e) {}
    try { document.querySelectorAll('[data-app-version]').forEach(el=>el.textContent=PHASE); } catch(e) {}
    try { document.querySelectorAll('.sidebar-note h4').forEach(el=>{ if((el.textContent||'').indexOf('Phase 23.0.')>=0) el.textContent='Phase '+PHASE; }); } catch(e) {}
  }
  function supportsFolder32(){ return typeof window.showDirectoryPicker === 'function'; }
  function hasFolder32(){ try { return typeof workspaceFolderHandle !== 'undefined' && !!workspaceFolderHandle; } catch(e) { return false; } }
  async function loadWorkspace32(){
    try { if (typeof setScenarioSaveEngine === 'function') setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
    try { if (typeof loadWorkspaceScenarioCache === 'function') await loadWorkspaceScenarioCache(); } catch(e) { console.warn(e); }
    try { if (typeof refreshWorkspaceFolderModeUi === 'function') refreshWorkspaceFolderModeUi(); } catch(e) {}
    try { if (typeof renderSavedScenarios === 'function') renderSavedScenarios(); } catch(e) {}
    try { if (typeof renderDashboardOpenTable === 'function') renderDashboardOpenTable(); } catch(e) {}
    try { if (typeof refreshLibraries === 'function') refreshLibraries(); } catch(e) {}
  }
  async function readSession32(){
    try {
      if(!hasFolder32()) return null;
      const cfg = await workspaceFolderHandle.getDirectoryHandle('config', { create: true });
      const fh = await cfg.getFileHandle('session-state.json', { create: false });
      const file = await fh.getFile();
      return JSON.parse(await file.text());
    } catch(e) { return null; }
  }
  function getSaved32(){
    try { if (Array.isArray(workspaceScenarioCache)) return workspaceScenarioCache.slice(); } catch(e) {}
    try { if (typeof getSavedScenarios === 'function') return getSavedScenarios(); } catch(e) {}
    return [];
  }
  async function offerRestore32(){
    await loadWorkspace32();
    const session = await readSession32();
    if(!session){ alert('Workspace folder connected. No previous session file was found yet.'); return false; }
    const id = String(session.scenarioId || session.lastScenarioId || '');
    if(!id){ alert('Workspace folder connected, but the previous session file did not include a scenario ID.'); return false; }
    const saved = getSaved32();
    const match = saved.find(s => String(s.id || '') === id);
    const label = (match && match.name) || session.scenarioName || id;
    const restore = confirm('Restore previous RiskTool session?\n\nScenario: ' + label + '\nLast saved: ' + (session.updatedAt || session.timestamp || 'Unknown'));
    if(!restore) return true;
    if(match && typeof openScenario === 'function') { openScenario(match.id); return true; }
    alert('Previous session was found, but the matching scenario was not found in the connected workspace folder.');
    return true;
  }
  function ensurePostLoginModal32(){
    let modal = document.getElementById('rtPostLoginRestore32');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'rtPostLoginRestore32';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:70000;background:rgba(15,23,42,.78);align-items:center;justify-content:center;padding:24px;';
    modal.innerHTML = '<div class="card" style="width:min(760px,96vw);max-height:90vh;overflow:auto;"><div class="card-header"><h3>Reconnect Workspace Folder</h3><span>Restore previous session</span></div><div class="card-body"><p style="margin-top:0;">Login was successful. RiskTool does not keep work scenarios on the website. Reconnect the approved local or shared-drive workspace folder to load saved scenarios and restore your previous session.</p><div class="note-box" id="rtPostLoginRestore32Status">Choose the same workspace folder used for RiskTool files.</div><div class="builder-actions"><button type="button" class="btn btn-primary" id="rtPostLoginRestore32Choose">Reconnect Workspace Folder</button><button type="button" class="btn btn-secondary" id="rtPostLoginRestore32Skip">Continue Without Restore</button></div></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#rtPostLoginRestore32Skip')?.addEventListener('click',()=>{ modal.style.display='none'; });
    modal.querySelector('#rtPostLoginRestore32Choose')?.addEventListener('click', async ()=>{
      const status = document.getElementById('rtPostLoginRestore32Status');
      try {
        if(!supportsFolder32()) { if(status) status.textContent='Use Chrome or Edge. This browser does not support workspace folder access.'; return; }
        if(status) status.textContent='Waiting for folder selection...';
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        try { workspaceFolderHandle = handle; workspaceFolderName = handle?.name || 'Selected folder'; } catch(e) {}
        try { window.workspaceFolderHandle = handle; window.workspaceFolderName = handle?.name || 'Selected folder'; } catch(e) {}
        if(status) status.textContent='Workspace connected: ' + (handle?.name || 'Selected folder') + '. Checking previous session...';
        modal.style.display='none';
        await offerRestore32();
      } catch(e) {
        console.error(e);
        if(status) status.textContent='Workspace folder was not connected. Choose the folder again to restore saved work.';
      }
    });
    return modal;
  }
  window.showPostLoginRestoreScreen = function(){
    setVersion32();
    ensurePostLoginModal32().style.display='flex';
  };
  // Remove old stacked login listeners by replacing the button once, then bind directly to the original startUserSession.
  document.addEventListener('DOMContentLoaded', function(){
    setVersion32();
    try { if (typeof setScenarioSaveEngine === 'function') setScenarioSaveEngine('Chrome/Edge Workspace Folder'); } catch(e) {}
    const btn = document.getElementById('loginGateContinueBtn');
    if(btn){
      const clone = btn.cloneNode(true);
      clone.removeAttribute('onclick');
      clone.onclick = function(event){ event.preventDefault(); if(typeof startUserSession === 'function') startUserSession(); return false; };
      btn.parentNode.replaceChild(clone, btn);
    }
    const pwd = document.getElementById('loginGatePassword');
    if(pwd){
      pwd.removeAttribute('onkeydown');
      pwd.onkeydown = function(event){ if(event.key === 'Enter'){ event.preventDefault(); if(typeof startUserSession === 'function') startUserSession(); return false; } };
    }
  });
})();
/* ===== END PHASE 23.0.61 ===== */


/* ===== PHASE 23.0.61 SAVED SCENARIO DELETE HARDENING ===== */
(function(){
  const PHASE = "23.0.61";

  function rt33SetVersion(){
    try {
      const ids = ["appVersion","versionDisplay","footerVersion","phaseVersion"];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = PHASE;
      });
      document.querySelectorAll("[data-app-version]").forEach(el => { el.textContent = PHASE; });
    } catch(e) {}
  }

  function rt33FolderConnected(){
    try { return typeof workspaceFolderHandle !== "undefined" && !!workspaceFolderHandle; } catch(e) { return false; }
  }

  function rt33SafeScenarioFileName(id){
    return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
  }

  async function rt33RefreshLists(){
    try { if (typeof loadWorkspaceScenarioCache === "function" && rt33FolderConnected()) await loadWorkspaceScenarioCache(); } catch(e) { console.warn("Reload after delete failed", e); }
    try { if (typeof renderSavedScenarios === "function") renderSavedScenarios(); } catch(e) { console.warn(e); }
    try { if (typeof renderDashboardOpenTable === "function") renderDashboardOpenTable(); } catch(e) { console.warn(e); }
    try { if (typeof refreshLibraries === "function") refreshLibraries(); } catch(e) { console.warn(e); }
    try { if (typeof refreshWorkspaceFolderModeUi === "function") refreshWorkspaceFolderModeUi(); } catch(e) { console.warn(e); }
  }

  window.deleteScenario = deleteScenario = async function(id){
    id = String(id || "");
    if (!id) {
      alert("No scenario id was supplied for deletion.");
      return;
    }

    if (!rt33FolderConnected()) {
      alert("Connect the approved workspace folder before deleting saved scenario files.");
      return;
    }

    let current = [];
    try {
      current = Array.isArray(workspaceScenarioCache) ? workspaceScenarioCache.slice() : [];
      if (!current.length && typeof loadWorkspaceScenarioCache === "function") {
        current = await loadWorkspaceScenarioCache();
      }
    } catch(e) {
      console.warn("Could not read workspace scenario cache before delete", e);
      current = [];
    }

    const match = current.find(x => String(x && x.id || "") === id);
    const label = match && match.name ? `${match.name} (${id})` : id;

    if (!confirm(`Delete saved scenario?\n\n${label}\n\nThis removes it from the connected workspace index and attempts to remove the matching JSON file.`)) {
      return;
    }

    try {
      workspaceScenarioCache = current.filter(x => String(x && x.id || "") !== id);
    } catch(e) {
      console.error("Could not update in-memory scenario list", e);
      alert("Delete failed before the workspace list could be updated.");
      return;
    }

    try {
      const scenariosDir = await workspaceFolderHandle.getDirectoryHandle("scenarios", { create: true });
      const fileName = rt33SafeScenarioFileName(id);
      try {
        await scenariosDir.removeEntry(fileName);
      } catch(removeErr) {
        // If the file was already missing, still continue and rewrite index.json.
        console.warn("Scenario file removal skipped or failed; index will still be rewritten.", removeErr);
      }
    } catch(dirErr) {
      console.warn("Could not access scenarios directory during delete; index rewrite will still be attempted.", dirErr);
    }

    try {
      if (typeof flushWorkspaceFiles === "function") {
        await flushWorkspaceFiles();
      }
    } catch(flushErr) {
      console.error("Failed to rewrite workspace files after delete", flushErr);
      alert("The scenario was removed from the screen cache, but RiskTool could not rewrite the workspace files. Reconnect the workspace folder and try again.");
      await rt33RefreshLists();
      return;
    }

    await rt33RefreshLists();
    try { if (typeof workspaceStatus === "function") workspaceStatus(`Deleted scenario ${id} from the connected workspace folder.`); } catch(e) {}
  };

  function rt33HandleSavedScenarioClick(event){
    const btn = event.target && event.target.closest ? event.target.closest("#savedEvaluationsBody button[data-action]") : null;
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id || "";

    if (action === "delete") {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      window.deleteScenario(id);
      return false;
    }

    if (action === "open" && typeof openScenario === "function") {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openScenario(id);
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    rt33SetVersion();

    const tbody = document.getElementById("savedEvaluationsBody");
    if (tbody && !tbody.dataset.rt33DeleteHandler) {
      tbody.dataset.rt33DeleteHandler = "true";
      tbody.addEventListener("click", rt33HandleSavedScenarioClick, true);
    }
  });
})();
/* ===== END PHASE 23.0.61 ===== */

/* ===== PHASE 23.0.61 AREA ROLLUP + ENTERPRISE RISK REPORT ===== */
(function(){
  const PHASE = "23.0.61";
  try { window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}

  function rt44Num(value, fallback){ const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  function rt44RiskStatus(score){ return score >= 75 ? "High" : score >= 55 ? "Elevated" : score >= 35 ? "Moderate" : "Lower"; }
  function rt44SafeText(value){ return String(value == null ? "" : value); }
  function rt44ComponentName(component){ return component?.scenarioName || component?.primaryProduct || component?.name || component?.componentId || "Unnamed Component"; }
  function rt44AreaName(){ return complexProductSections?.[0]?.productServiceArea || document.getElementById("complexSectionProduct")?.value || "Selected Area"; }
  function rt44ComponentExposure(component){
    return Math.max(1,
      rt44Num(component?.hardCostLikely) +
      (rt44Num(component?.softCostLikely) * 1000) +
      rt44Num(component?.mitigationCost) +
      ((Array.isArray(component?.items) ? component.items.length : 0) * 1000)
    );
  }
  function calculateAreaRollupMetrics44(){
    const components = Array.isArray(complexScenarioComponents) ? complexScenarioComponents : [];
    const rows = components.map(component => {
      const rollup = (typeof calculateComplexComponentRollup === "function") ? calculateComplexComponentRollup(component) : { inherent:0, residual:0, deltaRisk:0, insuranceImpact:0, highestDriver:"" };
      const exposure = rt44ComponentExposure(component);
      return { component, componentName: rt44ComponentName(component), rollup, exposure };
    });
    const exposureTotal = rows.reduce((sum, row) => sum + row.exposure, 0) || rows.length || 1;
    const residual = rows.length ? Math.round(rows.reduce((sum, row) => sum + (rt44Num(row.rollup.residual) * row.exposure), 0) / exposureTotal) : 0;
    const inherent = rows.length ? Math.round(rows.reduce((sum, row) => sum + (rt44Num(row.rollup.inherent) * row.exposure), 0) / exposureTotal) : 0;
    const weight = rows.length ? Math.max(1, Math.min(5, Math.ceil(residual / 20))) : 0;
    const highestRisk = rows.slice().sort((a,b) => rt44Num(b.rollup.residual) - rt44Num(a.rollup.residual))[0] || null;
    const deltaRisk = Math.max(0, inherent - residual);
    const insuranceImpact = rows.length ? Math.round(rows.reduce((sum, row) => sum + rt44Num(row.rollup.insuranceImpact), 0) / rows.length) : 0;
    return { areaName: rt44AreaName(), rows, inherent, residual, weight, highestRisk, deltaRisk, insuranceImpact, status: rt44RiskStatus(residual) };
  }
  function updateAreaRollupWeightField44(metrics){
    const field = document.getElementById("complexSectionWeight");
    if (!field) return;
    if (!complexProductSections?.length) field.value = "Define area first";
    else if (!metrics.rows.length) field.value = "Calculated after components";
    else field.value = `${metrics.weight}/5 | Residual ${metrics.residual} | ${metrics.rows.length} component${metrics.rows.length === 1 ? "" : "s"}`;
  }
  window.calculateAreaRollupMetrics44 = calculateAreaRollupMetrics44;

  window.renderComplexProductSections = renderComplexProductSections = function(){
    const tbody = document.getElementById("complexProductSectionsBody");
    const status = document.getElementById("complexProductSectionStatus");
    if (!tbody) return;
    try { if (typeof recalculateComplexProductSectionWeights === "function") recalculateComplexProductSectionWeights(); } catch(e) { console.warn(e); }
    const metrics = calculateAreaRollupMetrics44();
    updateAreaRollupWeightField44(metrics);
    if (!complexProductSections?.length) {
      tbody.innerHTML = '<tr><td colspan="9">No area/product family added yet. Define the parent area first, then add components underneath it.</td></tr>';
      if (status) { status.textContent = "Define the Area / Product Family before assigning component risk items."; status.classList.remove("hidden"); }
      try { refreshComplexProductSectionSelects(); } catch(e) {}
      return;
    }
    if (!metrics.rows.length) {
      const section = complexProductSections[0];
      tbody.innerHTML = '<tr><td colspan="9"><strong>' + escapeHtml(metrics.areaName) + '</strong><br><small>No saved components yet. Complete the Selected Component Workspace and click Save Area Component to build the rollup.</small><br><div class="rollup-actions"><button class="btn btn-secondary small-btn" type="button" data-delete-product-section="' + escapeHtml(section.sectionId || "") + '">Delete Area</button></div></td></tr>';
      if (status) { status.textContent = "Area is ready. Add the first component below."; status.classList.remove("hidden"); }
      try { refreshComplexProductSectionSelects(); } catch(e) {}
      return;
    }
    tbody.innerHTML = metrics.rows.map(row => {
      const statusText = row.component.scenarioStatus || rt44RiskStatus(row.rollup.residual);
      return '<tr class="clickable-rollup-row" data-open-complex-component="' + escapeHtml(row.component.componentId || "") + '" title="Open component workspace">' +
        '<td><strong>' + escapeHtml(row.componentName) + '</strong><br><small>' + escapeHtml(row.component.componentId || "") + '</small></td>' +
        '<td>' + (Array.isArray(row.component.items) ? row.component.items.length : 0) + '</td>' +
        '<td>' + rt44Num(row.rollup.inherent) + '</td>' +
        '<td><strong>' + rt44Num(row.rollup.residual) + '</strong></td>' +
        '<td>' + rt44Num(row.rollup.deltaRisk) + '</td>' +
        '<td>' + rt44Num(row.rollup.insuranceImpact) + '</td>' +
        '<td>' + escapeHtml(row.rollup.highestDriver || "No risk items yet") + '</td>' +
        '<td>' + escapeHtml(statusText) + '</td>' +
        '<td><div class="rollup-actions"><button class="btn btn-secondary small-btn" type="button" data-open-complex-component-button="' + escapeHtml(row.component.componentId || "") + '">Open</button><button class="btn btn-danger small-btn" type="button" data-delete-complex-component="' + escapeHtml(row.component.componentId || "") + '">Delete</button></div></td>' +
      '</tr>';
    }).join("");
    tbody.querySelectorAll("tr[data-open-complex-component]").forEach(row => row.addEventListener("click", (event) => {
      const tag = String(event.target?.tagName || "").toLowerCase();
      if (["button","a","input","select","textarea"].includes(tag)) return;
      openComplexScenarioComponent(row.dataset.openComplexComponent);
    }));
    tbody.querySelectorAll("[data-open-complex-component-button]").forEach(btn => btn.addEventListener("click", event => { event.stopPropagation(); openComplexScenarioComponent(btn.dataset.openComplexComponentButton); }));
    if (status) { status.textContent = ""; status.classList.add("hidden"); }
    try { refreshComplexProductSectionSelects(); } catch(e) {}
  };

  function getRankedScenarioRows44(){
    const saved = (typeof getSavedScenarios === "function" ? getSavedScenarios() : []) || [];
    return saved.map((s, idx) => {
      const residual = rt44Num(s.residual);
      const inherent = rt44Num(s.inherent);
      const delta = Math.max(0, inherent - residual);
      const expectedLoss = rt44Num(s.residualExpectedLoss || s.expectedLoss || 0);
      const concern = residual >= 75 ? "Immediate management attention" : residual >= 55 ? "Elevated management monitoring" : residual >= 35 ? "Routine management monitoring" : "Maintain controls";
      const driver = s.mode === "complex" && Array.isArray(s.components) && s.components.length
        ? (s.components.slice().sort((a,b)=>rt44Num((calculateComplexComponentRollup(a)||{}).residual)-rt44Num((calculateComplexComponentRollup(b)||{}).residual)).pop()?.scenarioName || "Highest component")
        : (s.riskDomain || s.primaryRegulation || s.primaryProduct || "Scenario risk drivers");
      return { ...s, rankSourceIndex: idx, residual, inherent, delta, expectedLoss, concern, driver };
    }).sort((a,b) => (b.residual - a.residual) || (b.inherent - a.inherent) || (b.expectedLoss - a.expectedLoss));
  }
  function buildOverallRiskReport44(){
    const rows = getRankedScenarioRows44();
    const generatedAt = new Date().toISOString();
    const highest = rows[0] || null;
    const highCount = rows.filter(r => r.residual >= 75).length;
    const elevatedCount = rows.filter(r => r.residual >= 55 && r.residual < 75).length;
    const reportRows = rows.map((r, idx) => ({
      rank: idx + 1,
      id: r.id || "",
      name: r.name || "Unnamed Scenario",
      builder: r.mode || "",
      productGroup: r.productGroup || r.primaryProduct || "",
      status: r.scenarioStatus || "",
      inherent: r.inherent,
      residual: r.residual,
      riskReduction: r.delta,
      expectedLoss: r.expectedLoss,
      primaryDriver: r.driver,
      managementConcern: r.concern,
      reasoning: `Ranked #${idx + 1} because residual risk is ${r.residual} after controls, compared with inherent risk of ${r.inherent}. Management should focus on ${r.driver} because it is the clearest driver available in the saved scenario data.`
    }));
    const narrative = highest
      ? `The highest ranked scenario is ${highest.name || highest.id} with residual risk ${highest.residual}. Management should be concerned because this scenario remains the largest post-control exposure in the saved scenario library. The ranking uses residual risk first, then inherent risk and expected loss where available, so the order emphasizes what remains after mitigation rather than just initial severity.`
      : "No saved scenarios are available for ranking yet.";
    return { generatedAt, scenarioCount: rows.length, highCount, elevatedCount, highestRiskScenario: highest ? (highest.name || highest.id || "") : "", narrative, rows: reportRows };
  }
  function reportToText44(report){
    const lines = [];
    lines.push("RiskTool Overall Saved Scenario Risk Ranking Report");
    lines.push("Generated: " + report.generatedAt);
    lines.push("Scenario Count: " + report.scenarioCount);
    lines.push("High: " + report.highCount + " | Elevated: " + report.elevatedCount);
    lines.push("");
    lines.push("Management Summary");
    lines.push(report.narrative);
    lines.push("");
    lines.push("Ranked Scenarios");
    (report.rows || []).forEach(row => {
      lines.push(`${row.rank}. ${row.name} (${row.id})`);
      lines.push(`   Residual: ${row.residual} | Inherent: ${row.inherent} | Reduction: ${row.riskReduction} | Status: ${row.status}`);
      lines.push(`   Driver: ${row.primaryDriver}`);
      lines.push(`   Concern: ${row.managementConcern}`);
      lines.push(`   Reasoning: ${row.reasoning}`);
    });
    return lines.join("\n");
  }
  function renderOverallRiskReport44(){
    const tbody = document.getElementById("overallRiskReportBody");
    const summary = document.getElementById("overallRiskReportSummary");
    if (!tbody) return;
    const report = buildOverallRiskReport44();
    window.__rt44LastOverallRiskReport = report;
    if (summary) summary.textContent = report.narrative;
    if (!report.rows.length) {
      tbody.innerHTML = '<tr><td colspan="10">No saved scenarios available. Save scenarios first, then generate the ranked report.</td></tr>';
      return;
    }
    tbody.innerHTML = report.rows.map(row => '<tr>' +
      '<td>' + row.rank + '</td>' +
      '<td>' + escapeHtml(row.name) + '<br><small>' + escapeHtml(row.id) + '</small></td>' +
      '<td>' + escapeHtml(row.builder) + '</td>' +
      '<td>' + escapeHtml(row.productGroup) + '</td>' +
      '<td>' + escapeHtml(row.status) + '</td>' +
      '<td>' + row.inherent + '</td>' +
      '<td><strong>' + row.residual + '</strong></td>' +
      '<td>' + row.riskReduction + '</td>' +
      '<td>' + escapeHtml(row.primaryDriver) + '</td>' +
      '<td>' + escapeHtml(row.managementConcern) + '</td>' +
    '</tr>').join("");
  }
  function ensureOverallRiskReportUi44(){
    const reportsView = document.getElementById("view-reports");
    if (!reportsView || document.getElementById("overallRiskReportCard")) return;
    const card = document.createElement("div");
    card.className = "card";
    card.id = "overallRiskReportCard";
    card.innerHTML = '<div class="card-header"><h3>Overall Saved Scenario Risk Ranking</h3><span>Highest to lowest residual risk</span></div>' +
      '<p class="muted">Ranks all saved scenarios by residual risk, then inherent risk and expected loss where available. Use this for management concern, prioritization, and board/examiner preparation.</p>' +
      '<div class="builder-actions"><button class="btn btn-secondary" id="generateOverallRiskReportBtn" type="button">Generate / Refresh Ranking</button><button class="btn btn-secondary" id="downloadOverallRiskReportBtn" type="button">Download TXT Report</button><button class="btn btn-secondary" id="saveOverallRiskReportWorkspaceBtn" type="button">Save to Workspace Folder</button></div>' +
      '<div class="note-box" id="overallRiskReportSummary">Generate the report after saving scenarios.</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Scenario</th><th>Builder</th><th>Product/Area</th><th>Status</th><th>Inherent</th><th>Residual</th><th>Risk Reduction</th><th>Primary Driver</th><th>Management Concern</th></tr></thead><tbody id="overallRiskReportBody"><tr><td colspan="10">Generate report to rank saved scenarios.</td></tr></tbody></table></div>';
    const firstReportCard = reportsView.querySelector(".card");
    if (firstReportCard && firstReportCard.nextSibling) reportsView.insertBefore(card, firstReportCard.nextSibling); else reportsView.appendChild(card);
    document.getElementById("generateOverallRiskReportBtn")?.addEventListener("click", renderOverallRiskReport44);
    document.getElementById("downloadOverallRiskReportBtn")?.addEventListener("click", () => {
      const report = buildOverallRiskReport44();
      triggerDownload(`risktool_overall_risk_ranking_${currentDateStamp ? currentDateStamp() : Date.now()}.txt`, new Blob([reportToText44(report)], { type: "text/plain" }));
    });
    document.getElementById("saveOverallRiskReportWorkspaceBtn")?.addEventListener("click", async () => {
      const report = buildOverallRiskReport44();
      const stamp = new Date().toISOString().replace(/[:.]/g,"-");
      try {
        if (typeof workspaceFolderModeEnabled === "function" && workspaceFolderModeEnabled() && workspaceFolderHandle) {
          const reportsDir = await getOrCreateDirectory(workspaceFolderHandle, "reports");
          await writeJsonFile(reportsDir, `overall-risk-ranking-${stamp}.json`, report);
          const txtHandle = await reportsDir.getFileHandle(`overall-risk-ranking-${stamp}.txt`, { create: true });
          const writable = await txtHandle.createWritable();
          await writable.write(reportToText44(report));
          await writable.close();
          if (typeof workspaceStatus === "function") workspaceStatus("Saved overall risk ranking report to workspace reports folder.");
          alert("Saved overall risk ranking report to the workspace reports folder.");
        } else {
          triggerDownload(`risktool_overall_risk_ranking_${Date.now()}.txt`, new Blob([reportToText44(report)], { type: "text/plain" }));
          alert("Workspace folder is not connected. Downloaded the report instead.");
        }
      } catch(e) { console.error(e); alert(e.message || "Unable to save report to workspace folder."); }
    });
    renderOverallRiskReport44();
  }
  window.renderOverallRiskReport44 = renderOverallRiskReport44;
  window.buildOverallRiskReport44 = buildOverallRiskReport44;

  const priorRenderSaved44 = typeof renderSavedScenarios === "function" ? renderSavedScenarios : null;
  if (priorRenderSaved44) {
    window.renderSavedScenarios = renderSavedScenarios = function(){
      const result = priorRenderSaved44.apply(this, arguments);
      try { renderOverallRiskReport44(); } catch(e) {}
      return result;
    };
  }
  document.addEventListener("DOMContentLoaded", () => {
    try { ensureOverallRiskReportUi44(); } catch(e) { console.error(e); }
    try { renderComplexProductSections(); } catch(e) {}
    try { document.querySelectorAll('.sidebar-note h4').forEach(el => { if ((el.textContent || '').includes('Phase 23.0.')) el.textContent = 'Phase ' + PHASE; }); } catch(e) {}
    try { const appVer = document.getElementById('appVersion'); if (appVer) appVer.textContent = PHASE; } catch(e) {}
  });
})();
/* ===== END PHASE 23.0.61 ===== */

/* ===== PHASE 23.0.61 HUBBARD EXPECTED LOSS + PORTFOLIO AREA RANKING ===== */
(function(){
  const PHASE = "23.0.61";
  const impactMap = { low:10000, moderate:50000, medium:50000, high:250000, severe:1000000, critical:1000000 };
  function n(v){ const x = Number(String(v ?? '').replace(/[^0-9.-]/g,'')); return Number.isFinite(x) ? x : 0; }
  function pct(v, fallback){ let x=n(v); if(!x && fallback!==undefined) x=fallback; if(x>1) x=x/100; return Math.max(0, Math.min(1, x)); }
  function money(v){ try { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n(v)); } catch(e){ return '$' + Math.round(n(v)).toLocaleString(); } }
  function esc(v){ return (typeof escapeHtml==='function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function severityImpact(item){ const direct = n(item?.impactAmount || item?.financialImpact || item?.estimatedImpact || item?.lossExposure || item?.impactDollars); if(direct>0) return direct; const sev = String(item?.severity || item?.impactLevel || item?.riskLevel || item?.impactRating || '').toLowerCase(); return impactMap[sev] || impactMap.moderate; }
  function itemProbability(item){ const direct = pct(item?.probability ?? item?.likelihood ?? item?.eventProbability ?? item?.frequencyProbability, NaN); if(Number.isFinite(direct) && direct>0) return direct; const likelihood = String(item?.likelihoodRating || item?.likelihoodLevel || item?.likelihood || '').toLowerCase(); if(likelihood.includes('rare') || likelihood.includes('low')) return 0.10; if(likelihood.includes('moderate') || likelihood.includes('medium')) return 0.30; if(likelihood.includes('high') || likelihood.includes('likely')) return 0.60; if(likelihood.includes('severe') || likelihood.includes('critical') || likelihood.includes('certain')) return 0.80; return 0.25; }
  function linked(component, listName){ const id = component?.componentId || component?.scenarioId || component?.id; const arr = Array.isArray(window[listName]) ? window[listName] : []; return arr.filter(x => String(x.componentId||x.scenarioComponentId||x.scenarioId||x.parentComponentId||'') === String(id)); }
  function riskItems(component){ let items=[]; ['complexRiskItems','scenarioRiskItems','riskItems'].forEach(name => { items = items.concat(linked(component,name)); }); if(Array.isArray(component?.riskItems)) items = items.concat(component.riskItems); const seen = new Set(); return items.filter(x => { const k=String(x.issueId||x.riskId||x.id||JSON.stringify(x)); if(seen.has(k)) return false; seen.add(k); return true; }); }
  function mitigationEffect(component){ let list=[]; ['complexMitigations','mitigations','scenarioMitigations'].forEach(name => { list=list.concat(linked(component,name)); }); if(Array.isArray(component?.mitigations)) list=list.concat(component.mitigations); if(!list.length) return 0; const vals=list.map(m => pct(m.effectiveness ?? m.controlEffectiveness ?? m.mitigationEffectiveness ?? m.reductionPercent, 0.15)); return Math.min(0.85, vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length)); }
  function insuranceOffset(component, residual){ let list=[]; ['complexInsurance','insuranceCoverages','scenarioInsurance','insuranceItems'].forEach(name => { list=list.concat(linked(component,name)); }); if(Array.isArray(component?.insurance)) list=list.concat(component.insurance); const coverage = list.reduce((sum,i)=>sum+n(i.coverageAmount||i.coverage||i.limit||i.policyLimit),0); const deductible = list.reduce((sum,i)=>sum+n(i.deductible||i.retention),0); const premium = list.reduce((sum,i)=>sum+n(i.premium||i.annualPremium),0); return Math.max(0, Math.min(residual, Math.max(0, coverage - deductible - premium))); }
  function topDriver(items){ if(!items.length) return 'No risk items saved'; let top=items[0], val=-1; items.forEach(it=>{ const v=itemProbability(it)*severityImpact(it); if(v>val){val=v; top=it;} }); return top.title || top.riskTitle || top.name || top.issue || top.description || 'Highest expected-loss risk item'; }
  function rollup(component){ const items=riskItems(component); const inherent=items.reduce((sum,it)=>sum+itemProbability(it)*severityImpact(it),0); const effect=mitigationEffect(component); const residualBeforeInsurance=inherent*(1-effect); const insuranceImpact=insuranceOffset(component,residualBeforeInsurance); const residual=Math.max(0,residualBeforeInsurance-insuranceImpact); return { inherent, residual, expectedLoss:inherent, residualExpectedLoss:residual, deltaRisk:Math.max(0,inherent-residual), insuranceImpact, mitigationEffect:effect, riskItemCount:items.length, highestDriver:topDriver(items), status: residual>=500000?'High':residual>=100000?'Elevated':residual>=25000?'Moderate':'Low' }; }
  window.calculateComplexComponentRollup = rollup; window.calculateHubbardComponentRollup45 = rollup;
  function areas(){ const comps=Array.isArray(window.complexScenarioComponents)?window.complexScenarioComponents:[]; const sections=Array.isArray(window.complexProductSections)?window.complexProductSections:[]; const map=new Map(); sections.forEach(s=>{ const id=String(s.sectionId||s.areaId||s.id||s.productName||s.areaName||'Area'); map.set(id,{id,name:s.productName||s.areaName||s.name||'Area / Product Family',components:[]}); }); comps.forEach(c=>{ const id=String(c.sectionId||c.areaId||c.productSectionId||c.parentSectionId||c.productName||c.areaName||'Unassigned Area'); if(!map.has(id)) map.set(id,{id,name:c.productName||c.areaName||c.area||'Unassigned Area',components:[]}); map.get(id).components.push(c); }); return Array.from(map.values()).map(a=>{ const rolls=a.components.map(c=>({component:c, rollup:rollup(c)})); const total=rolls.reduce((s,r)=>s+r.rollup.residual,0); const inherent=rolls.reduce((s,r)=>s+r.rollup.inherent,0); const high=rolls.slice().sort((x,y)=>y.rollup.residual-x.rollup.residual)[0]; return {...a,rolls,total,inherent,highestComponent: high?.component?.scenarioName||high?.component?.componentName||high?.component?.name||'None',driver: high?.rollup?.highestDriver||'No components saved'}; }).sort((a,b)=>b.total-a.total); }
  window.generatePortfolioRiskRanking45=function(){ const list=areas(); const rows=list.length?list.map((a,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(a.name)+'</td><td>'+money(a.total)+'</td><td>'+money(a.inherent)+'</td><td>'+a.components.length+'</td><td>'+esc(a.highestComponent)+'</td><td>'+esc(a.driver)+'</td><td>'+(a.total>=500000?'High':a.total>=100000?'Elevated':a.total>=25000?'Moderate':'Low')+'</td><td>'+esc(a.name)+' should be prioritized based on residual expected loss of '+money(a.total)+'. Management should review '+esc(a.highestComponent)+' and validate probability, impact, mitigation, and insurance assumptions.</td></tr>').join(''):'<tr><td colspan="9">No Area/Product Family data available. Build and save complex components first.</td></tr>'; const html='<div class="card"><div class="card-header"><h3>Portfolio Risk Ranking</h3><span>Area / Product Family hot spots</span></div><div class="card-body"><p class="muted">Ranks Area/Product Families by Hubbard-style residual expected loss: probability × dollar impact, reduced for mitigation effectiveness and insurance transfer.</p><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Area / Product Family</th><th>Total Residual Expected Loss</th><th>Inherent Expected Loss</th><th>Components</th><th>Highest Component</th><th>Top Driver</th><th>Status</th><th>Management Concern</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="builder-actions"><button class="btn btn-primary" type="button" id="savePortfolioRiskReport45">Save Portfolio Report Snapshot</button></div></div></div>'; const host=document.getElementById('overallRiskReportHost')||document.getElementById('reportsGeneratedContent')||document.getElementById('view-reports'); if(host) host.insertAdjacentHTML('afterbegin',html); return list; };
  async function saveSnapshot(){ const list=areas(); const body='RiskTool Portfolio Risk Ranking - '+new Date().toLocaleString()+'\n\n'+list.map((a,i)=>(i+1)+'. '+a.name+' - Residual Expected Loss: '+money(a.total)+'; Highest Component: '+a.highestComponent+'; Top Driver: '+a.driver).join('\n'); if(window.rtWorkspaceWriteText){ await window.rtWorkspaceWriteText('reports/portfolio-risk-ranking-'+Date.now()+'.txt', body); alert('Portfolio report snapshot saved to workspace reports folder.'); } else { const blob=new Blob([body],{type:'text/plain'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download='portfolio-risk-ranking-'+Date.now()+'.txt'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); } }
  document.addEventListener('click', function(e){ if(e.target&&e.target.id==='savePortfolioRiskReport45') saveSnapshot(); if(e.target&&(e.target.id==='generateOverallRiskReport'||e.target.id==='generatePortfolioRiskReport')) setTimeout(window.generatePortfolioRiskRanking45,0); });
  function syncVersion(){ document.querySelectorAll('[data-version], .version, #appVersion, #versionLabel, #dashboardVersion').forEach(el=>{ if(el) el.textContent = PHASE; }); } document.addEventListener('DOMContentLoaded', syncVersion); setTimeout(syncVersion,500);
})();
/* ===== END PHASE 23.0.61 ===== */

/* ===== PHASE 23.0.50 PORTFOLIO REPORT MODE REWRITE ===== */
(function(){
  const PHASE = "23.0.61";
  const ITERATION_OPTIONS = [100, 1000, 10000, 100000];
  try { window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}

  function num(v, fallback = 0){
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }
  function esc(v){
    if (typeof escapeHtml === "function") return escapeHtml(v);
    return String(v ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  }
  function fmt(v){
    try { return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(num(v)); }
    catch(e){ return "$" + Math.round(num(v)).toLocaleString(); }
  }
  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0; }
  function percentile(sorted, p){
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p/100) * sorted.length) - 1));
    return sorted[idx];
  }
  function triangular(min, mode, max){
    min = Math.max(0, num(min)); mode = Math.max(min, num(mode, min)); max = Math.max(mode, num(max, mode));
    if (max <= min) return min;
    const u = Math.random();
    const c = (mode - min) / (max - min || 1);
    return u < c ? min + Math.sqrt(u * (max-min) * (mode-min)) : max - Math.sqrt((1-u) * (max-min) * (max-mode));
  }
  function scenarioLabel(s){ return s?.name || s?.scenarioName || s?.primaryProduct || s?.id || "Unnamed Scenario"; }
  function scenarioArea(s){
    const fromSection = Array.isArray(s?.productSections) && s.productSections[0] ? (s.productSections[0].productServiceArea || s.productSections[0].productName || s.productSections[0].areaName) : "";
    return fromSection || s?.primaryProduct || s?.productGroup || s?.riskDomain || "Unmapped Area";
  }
  function statusFromRisk(v){ return v >= 500000 ? "High" : v >= 100000 ? "Elevated" : v >= 25000 ? "Moderate" : "Lower"; }
  function componentLabel(c, idx){ return c?.scenarioName || c?.componentName || c?.name || c?.primaryProduct || `Component ${idx+1}`; }
  function evidenceAmounts51(records){
    return (Array.isArray(records) ? records : [])
      .map(item => num(item?.amount ?? item?.lossAmount ?? item?.costAmount ?? item?.documentedLoss ?? 0))
      .filter(v => Number.isFinite(v) && v > 0);
  }
  function evidenceAnchor51(c, parent){
    const amounts = evidenceAmounts51(c?.hardFacts)
      .concat(evidenceAmounts51(c?.evidence))
      .concat(evidenceAmounts51(parent?.hardFacts))
      .concat(evidenceAmounts51(parent?.evidence));
    if (!amounts.length) return null;
    const sorted = amounts.slice().sort((a,b)=>a-b);
    const total = amounts.reduce((a,b)=>a+b,0);
    const mean = total / amounts.length;
    const median = sorted[Math.floor(sorted.length / 2)] || mean;
    const p90 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.90) - 1)] || sorted[sorted.length - 1] || mean;
    return { count: amounts.length, total, mean, median, p90, max: sorted[sorted.length - 1] || mean };
  }
  function componentInputs(c, parent){
    const evidence = evidenceAnchor51(c, parent);
    const baseLikely = num(c?.hardCostLikely, num(parent?.hardCostLikely, num(c?.residualExpectedLoss, num(c?.expectedLoss, 50000))));
    const hardLikely = evidence ? Math.max(baseLikely, evidence.median || evidence.mean || 0) : baseLikely;
    const hardMin = evidence ? Math.max(num(c?.hardCostMin, hardLikely ? hardLikely * 0.50 : num(parent?.hardCostMin, 10000)), Math.min(evidence.median || hardLikely, evidence.mean || hardLikely)) : num(c?.hardCostMin, hardLikely ? hardLikely * 0.50 : num(parent?.hardCostMin, 10000));
    const hardMax = evidence ? Math.max(num(c?.hardCostMax, hardLikely ? hardLikely * 2.00 : num(parent?.hardCostMax, 250000)), evidence.p90 || evidence.max || hardLikely, evidence.total || 0) : num(c?.hardCostMax, hardLikely ? hardLikely * 2.00 : num(parent?.hardCostMax, 250000));
    const softLikely = num(c?.softCostLikely, num(parent?.softCostLikely, 0.25));
    const softMin = num(c?.softCostMin, num(parent?.softCostMin, 0.05));
    const softMax = num(c?.softCostMax, num(parent?.softCostMax, Math.max(softLikely, 0.75)));
    const control = Math.max(0, Math.min(100, num(c?.control, num(parent?.control, 0)))) / 100;
    const mitigationCost = num(c?.mitigationCost, 0);
    const rollup = (typeof window.calculateComplexComponentRollup === "function" && parent?.mode === "complex") ? window.calculateComplexComponentRollup(c) : null;
    return { hardMin, hardLikely, hardMax, softMin, softLikely, softMax, control, mitigationCost, rollup, evidence };
  }
  function getScenarioComponents(s){
    if (s?.mode === "complex" && Array.isArray(s.components) && s.components.length) return s.components;
    return [s || {}];
  }
  function runScenarioMonteCarlo50(s, iterations){
    iterations = ITERATION_OPTIONS.includes(Number(iterations)) ? Number(iterations) : 1000;
    const comps = getScenarioComponents(s);
    const compInputs = comps.map(c => componentInputs(c, s));
    const outcomes = [];
    for (let i = 0; i < iterations; i++) {
      let inherent = 0, residual = 0;
      compInputs.forEach(input => {
        const hard = triangular(input.hardMin, input.hardLikely, input.hardMax);
        const softMultiplier = triangular(input.softMin, input.softLikely, input.softMax);
        const gross = hard + (hard * softMultiplier);
        const afterControl = Math.max(0, gross * (1 - input.control));
        inherent += gross;
        residual += Math.max(0, afterControl + input.mitigationCost);
      });
      outcomes.push({ scenarioNumber: i + 1, inherentLoss: Math.round(inherent), residualLoss: Math.round(residual) });
    }
    const residualSorted = outcomes.map(x => x.residualLoss).sort((a,b)=>a-b);
    const inherentSorted = outcomes.map(x => x.inherentLoss).sort((a,b)=>a-b);
    const componentRisks = compInputs.map(input => {
      if (input.rollup && num(input.rollup.residual) > 0) return num(input.rollup.residual);
      const hard = input.hardLikely || avg([input.hardMin,input.hardMax]);
      const gross = hard + (hard * input.softLikely);
      return Math.max(0, gross * (1 - input.control) + input.mitigationCost);
    });
    const totalExposure = avg(residualSorted);
    return {
      iterations,
      outcomes,
      avgComponentRisk: Math.round(avg(componentRisks)),
      totalExposure: Math.round(totalExposure),
      expectedLoss: Math.round(avg(inherentSorted)),
      residualExpectedLoss: Math.round(totalExposure),
      p50: Math.round(percentile(residualSorted, 50)),
      p90: Math.round(percentile(residualSorted, 90)),
      p95: Math.round(percentile(residualSorted, 95)),
      p99: Math.round(percentile(residualSorted, 99)),
      volatility: Math.round(percentile(residualSorted, 95) - percentile(residualSorted, 50)),
      riskReduction: Math.max(0, Math.round(avg(inherentSorted) - totalExposure)),
      componentCount: comps.length,
      componentRisks
    };
  }
  function topDriverForScenario(s, metrics){
    if (s?.mode === "complex" && Array.isArray(s.components) && s.components.length) {
      let rows = s.components.map((c, idx) => ({ name: componentLabel(c, idx), metric: componentInputs(c, s).rollup }));
      rows = rows.sort((a,b) => num(b.metric?.residual) - num(a.metric?.residual));
      if (rows[0]?.metric?.highestDriver) return `${rows[0].name}: ${rows[0].metric.highestDriver}`;
      return rows[0]?.name || "Largest component exposure";
    }
    const evidence = evidenceAnchor51(s, s);
    if (evidence) return `Hard facts / evidence loss-cost anchor: ${fmt(evidence.total)} documented across ${evidence.count} item(s)`;
    return s?.riskDomain || s?.primaryRegulation || s?.primaryProduct || "Scenario exposure assumptions";
  }
  function recommendationForScenario(s, m){
    const name = scenarioLabel(s), area = scenarioArea(s), driver = topDriverForScenario(s, m);
    const status = statusFromRisk(m.avgComponentRisk);
    let action = "maintain existing controls and continue scheduled monitoring";
    if (status === "High") action = "prioritize immediate management review, validate control design, and consider stronger mitigation or risk transfer";
    else if (status === "Elevated") action = "assign a management owner, validate assumptions, strengthen controls, and track remediation timing";
    else if (status === "Moderate") action = "monitor through normal governance and test key controls for continued effectiveness";
    return `${name} in ${area} ranks ${status.toLowerCase()} based on average component residual risk of ${fmt(m.avgComponentRisk)} and total modeled exposure of ${fmt(m.totalExposure)}. The main concern is ${driver}. Monte Carlo results show P95 residual exposure of ${fmt(m.p95)} and P99 exposure of ${fmt(m.p99)}, so management should ${action}.`;
  }
  function getPortfolioRows50(){
    const saved = (typeof getSavedScenarios === "function" ? getSavedScenarios() : []) || [];
    const iterations = Number(document.getElementById("portfolioMonteCarloIterations50")?.value || 1000);
    return saved.map(s => {
      const metrics = runScenarioMonteCarlo50(s, iterations);
      return { scenario: s, metrics, driver: topDriverForScenario(s, metrics), recommendation: recommendationForScenario(s, metrics) };
    }).sort((a,b) => (b.metrics.avgComponentRisk - a.metrics.avgComponentRisk) || (b.metrics.totalExposure - a.metrics.totalExposure));
  }
  function drawBarChart50(canvasId, rows, metricName, label){
    const canvas = document.getElementById(canvasId); if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d"); const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h); ctx.font = "12px Inter, Arial"; ctx.fillStyle = "#334155";
    if (!rows.length) { ctx.fillText("No saved scenarios available.", 20, 40); return; }
    const max = Math.max(...rows.map(r => num(r.metrics[metricName])), 1);
    const pad = 42, barH = Math.max(16, Math.min(34, (h - pad - 20) / rows.length - 8));
    rows.forEach((r, i) => {
      const y = pad + i * (barH + 8);
      const val = num(r.metrics[metricName]);
      const barW = Math.max(2, (w - 260) * val / max);
      ctx.fillStyle = "#e2e8f0"; ctx.fillRect(210, y, w - 250, barH);
      ctx.fillStyle = "#64748b"; ctx.fillRect(210, y, barW, barH);
      ctx.fillStyle = "#0f172a"; ctx.fillText(String(i+1)+". "+scenarioLabel(r.scenario).slice(0,24), 10, y + barH - 4);
      ctx.fillText(fmt(val), 220 + barW, y + barH - 4);
    });
    ctx.fillStyle = "#0f172a"; ctx.font = "14px Inter, Arial"; ctx.fillText(label, 10, 20);
  }
  function drawDistribution50(canvasId, outcomes){
    const canvas = document.getElementById(canvasId); if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h); ctx.font = "12px Inter, Arial"; ctx.fillStyle = "#334155";
    if (!outcomes || !outcomes.length) { ctx.fillText("Select a scenario to preview Monte Carlo distribution.", 20, 40); return; }
    const vals = outcomes.map(o => o.residualLoss); const min = Math.min(...vals), max = Math.max(...vals); const bins = 20; const counts = Array(bins).fill(0);
    vals.forEach(v => { const idx = Math.min(bins-1, Math.max(0, Math.floor(((v-min)/(max-min || 1))*bins))); counts[idx]++; });
    const maxCount = Math.max(...counts, 1), pad = 34, bw = (w - pad*2) / bins;
    counts.forEach((c,i) => { const bh = (h - 70) * c / maxCount; ctx.fillStyle = "#64748b"; ctx.fillRect(pad + i*bw, h - pad - bh, Math.max(1,bw-2), bh); });
    ctx.fillStyle = "#0f172a"; ctx.fillText(`Distribution: ${fmt(min)} to ${fmt(max)}`, 10, 20);
  }
  function renderPortfolioReport50(){
    const host = document.getElementById("portfolioReportBody50"); if (!host) return;
    const rows = getPortfolioRows50();
    if (!rows.length) {
      host.innerHTML = '<div class="note-box">No saved scenarios found. Save Single and Complex scenarios first, then run the Portfolio Report.</div>';
      drawBarChart50("portfolioAvgRiskChart50", [], "avgComponentRisk", "Average Component Risk");
      drawBarChart50("portfolioTotalRiskChart50", [], "totalExposure", "Total Exposure");
      return;
    }
    host.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Scenario</th><th>Type</th><th>Area / Product Family</th><th>Avg Component Risk</th><th>Total Exposure</th><th>P95</th><th>P99</th><th>Components</th><th>Top Driver</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${esc(scenarioLabel(r.scenario))}</strong><br><small>${esc(r.scenario.id || "")}</small></td><td>${esc(r.scenario.mode || "")}</td><td>${esc(scenarioArea(r.scenario))}</td><td><strong>${fmt(r.metrics.avgComponentRisk)}</strong></td><td>${fmt(r.metrics.totalExposure)}</td><td>${fmt(r.metrics.p95)}</td><td>${fmt(r.metrics.p99)}</td><td>${r.metrics.componentCount}</td><td>${esc(r.driver)}</td><td>${statusFromRisk(r.metrics.avgComponentRisk)}</td><td><button class="btn btn-secondary small-btn" data-pr-scenario="${esc(r.scenario.id || "")}">Review</button><button class="btn btn-secondary small-btn" data-outcomes50="${esc(r.scenario.id || "")}">View Outcomes</button><button class="btn btn-secondary small-btn" data-export50="${esc(r.scenario.id || "")}">Export CSV</button></td></tr><tr><td></td><td colspan="11"><strong>Management recommendation:</strong> ${esc(r.recommendation)}</td></tr>`).join("")}</tbody></table></div>`;
    drawBarChart50("portfolioAvgRiskChart50", rows, "avgComponentRisk", "Portfolio Ranking by Average Component Risk");
    drawBarChart50("portfolioTotalRiskChart50", rows, "totalExposure", "Portfolio Total Exposure by Scenario");
    host.querySelectorAll("[data-pr-scenario]").forEach(btn => btn.addEventListener("click", () => renderScenarioReview50(btn.dataset.prScenario)));
    host.querySelectorAll("[data-outcomes50]").forEach(btn => btn.addEventListener("click", () => previewOutcomes50(btn.dataset.outcomes50)));
    host.querySelectorAll("[data-export50]").forEach(btn => btn.addEventListener("click", () => exportOutcomes50(btn.dataset.export50)));
  }
  function rowForId(id){ return getPortfolioRows50().find(r => String(r.scenario.id || "") === String(id)); }
  function previewOutcomes50(id){
    const row = rowForId(id); if (!row) return;
    const box = document.getElementById("portfolioOutcomesPreview50"); if (!box) return;
    const sample = row.metrics.outcomes.slice(0, 100);
    box.innerHTML = `<h3>Monte Carlo Outcomes — ${esc(scenarioLabel(row.scenario))}</h3><p class="muted">Showing first ${sample.length} of ${row.metrics.iterations.toLocaleString()} random scenarios. Full CSV is available from Export CSV.</p><div class="table-wrap"><table><thead><tr><th>#</th><th>Inherent Loss</th><th>Residual Loss</th></tr></thead><tbody>${sample.map(o=>`<tr><td>${o.scenarioNumber}</td><td>${fmt(o.inherentLoss)}</td><td>${fmt(o.residualLoss)}</td></tr>`).join("")}</tbody></table></div>`;
    drawDistribution50("portfolioDistributionChart50", row.metrics.outcomes);
  }
  function csvEscape(v){ return `"${String(v ?? "").replace(/"/g,'""')}"`; }
  function exportOutcomes50(id){
    const row = rowForId(id); if (!row) return;
    const lines = [["scenario_id","scenario_name","iteration","inherent_loss","residual_loss"].join(",")].concat(row.metrics.outcomes.map(o => [row.scenario.id, scenarioLabel(row.scenario), o.scenarioNumber, o.inherentLoss, o.residualLoss].map(csvEscape).join(",")));
    const blob = new Blob([lines.join("\n")], {type:"text/csv"}); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `risktool-outcomes-${(row.scenario.id || "scenario")}-${Date.now()}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }
  function renderScenarioReview50(id){
    const select = document.getElementById("scenarioReviewSelect50");
    if (select && id) select.value = id;
    const row = id ? rowForId(id) : rowForId(select?.value);
    const host = document.getElementById("scenarioReviewBody50"); if (!host) return;
    if (!row) { host.innerHTML = '<div class="note-box">Select a scenario to review.</div>'; return; }
    const s = row.scenario, m = row.metrics;
    host.innerHTML = `<div class="card"><div class="card-header"><h3>${esc(scenarioLabel(s))}</h3><span>${esc(s.mode || "Scenario")}</span></div><div class="card-body"><p>${esc(row.recommendation)}</p><div class="table-wrap"><table><tbody><tr><th>Area / Product Family</th><td>${esc(scenarioArea(s))}</td></tr><tr><th>Average Component Risk</th><td>${fmt(m.avgComponentRisk)}</td></tr><tr><th>Total Exposure</th><td>${fmt(m.totalExposure)}</td></tr><tr><th>Expected Loss</th><td>${fmt(m.expectedLoss)}</td></tr><tr><th>P50 / P90 / P95 / P99</th><td>${fmt(m.p50)} / ${fmt(m.p90)} / ${fmt(m.p95)} / ${fmt(m.p99)}</td></tr><tr><th>Volatility</th><td>${fmt(m.volatility)}</td></tr><tr><th>Top Driver</th><td>${esc(row.driver)}</td></tr><tr><th>Management Status</th><td>${statusFromRisk(m.avgComponentRisk)}</td></tr></tbody></table></div><div class="builder-actions"><button class="btn btn-secondary" id="scenarioReviewOutcomes50">View Outcomes</button><button class="btn btn-secondary" id="scenarioReviewExport50">Export Outcomes CSV</button></div></div></div>`;
    document.getElementById("scenarioReviewOutcomes50")?.addEventListener("click", () => previewOutcomes50(s.id));
    document.getElementById("scenarioReviewExport50")?.addEventListener("click", () => exportOutcomes50(s.id));
    try { if (typeof activateView === "function") activateView("scenario-review"); } catch(e) {}
  }
  function savePortfolioSnapshot50(){
    const rows = getPortfolioRows50();
    const body = `RiskTool Portfolio Report ${PHASE}\nGenerated: ${new Date().toLocaleString()}\nMonte Carlo Iterations: ${document.getElementById("portfolioMonteCarloIterations50")?.value || 1000}\n\n` + rows.map((r,i)=>`${i+1}. ${scenarioLabel(r.scenario)} | Area: ${scenarioArea(r.scenario)} | Avg Component Risk: ${fmt(r.metrics.avgComponentRisk)} | Total Exposure: ${fmt(r.metrics.totalExposure)} | P95: ${fmt(r.metrics.p95)} | Recommendation: ${r.recommendation}`).join("\n\n");
    const blob = new Blob([body], {type:"text/plain"}); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `risktool-portfolio-report-${Date.now()}.txt`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function installViews50(){
    const nav = document.querySelector(".nav");
    if (nav && !document.querySelector('[data-view="portfolio-report"]')) {
      const savedBtn = nav.querySelector('[data-view="saved"]');
      const portfolioBtn = document.createElement("button"); portfolioBtn.className = "nav-item"; portfolioBtn.dataset.view = "portfolio-report"; portfolioBtn.textContent = "Portfolio Report";
      const reportBtn = nav.querySelector('[data-view="reports"]'); if (reportBtn) reportBtn.textContent = "Scenario Review";
      if (reportBtn) nav.insertBefore(portfolioBtn, reportBtn); else if (savedBtn?.nextSibling) nav.insertBefore(portfolioBtn, savedBtn.nextSibling); else nav.appendChild(portfolioBtn);
      portfolioBtn.addEventListener("click", () => { try { activateView("portfolio-report"); } catch(e){} renderPortfolioReport50(); });
    }
    const main = document.querySelector("main.main") || document.querySelector("main") || document.body;
    if (!document.getElementById("view-portfolio-report")) {
      const section = document.createElement("section"); section.className = "view"; section.id = "view-portfolio-report";
      section.innerHTML = `<div class="section-header"><h2>Portfolio Report</h2><p>Runs every saved Single and Complex scenario, ranks by average component risk, and shows total exposure for management review.</p></div><div class="card"><div class="card-header"><h3>Portfolio Controls</h3><span>Monte Carlo</span></div><div class="builder-actions"><label>Random scenarios per saved scenario <select id="portfolioMonteCarloIterations50"><option value="100">100</option><option value="1000" selected>1,000</option><option value="10000">10,000</option><option value="100000">100,000</option></select></label><button class="btn btn-primary" id="runPortfolioReport50" type="button">Run Portfolio Report</button><button class="btn btn-secondary" id="savePortfolioSnapshot50" type="button">Save Report Snapshot</button></div><div class="note-box">Ranking uses average component residual risk so large and small scenarios can be compared consistently. Total exposure is shown beside it for dollar materiality.</div></div><div class="grid two"><div class="card"><div class="card-header"><h3>Average Risk Ranking</h3><span>Rank Metric</span></div><canvas id="portfolioAvgRiskChart50" width="760" height="300"></canvas></div><div class="card"><div class="card-header"><h3>Total Exposure</h3><span>Dollar Exposure</span></div><canvas id="portfolioTotalRiskChart50" width="760" height="300"></canvas></div></div><div class="card"><div class="card-header"><h3>Portfolio Ranking & Recommendations</h3><span>All saved scenarios</span></div><div id="portfolioReportBody50"><div class="note-box">Run the portfolio report to evaluate all saved scenarios.</div></div></div><div class="card"><div class="card-header"><h3>Selected Scenario Outcomes</h3><span>Auditor / Examiner Support</span></div><canvas id="portfolioDistributionChart50" width="760" height="260"></canvas><div id="portfolioOutcomesPreview50" class="note-box">Select View Outcomes to preview Monte Carlo rows for a scenario.</div></div>`;
      main.appendChild(section);
      section.querySelector("#runPortfolioReport50")?.addEventListener("click", renderPortfolioReport50);
      section.querySelector("#portfolioMonteCarloIterations50")?.addEventListener("change", renderPortfolioReport50);
      section.querySelector("#savePortfolioSnapshot50")?.addEventListener("click", savePortfolioSnapshot50);
    }
    if (!document.getElementById("view-scenario-review")) {
      const section = document.createElement("section"); section.className = "view"; section.id = "view-scenario-review";
      section.innerHTML = `<div class="section-header"><h2>Scenario Review</h2><p>Individual scenario review remains available separately from the portfolio-wide report.</p></div><div class="card"><div class="card-header"><h3>Select Scenario</h3><span>Single review</span></div><div class="builder-actions"><select id="scenarioReviewSelect50"></select><button class="btn btn-primary" id="runScenarioReview50" type="button">Review Scenario</button></div></div><div id="scenarioReviewBody50"><div class="note-box">Select one saved scenario to review.</div></div>`;
      main.appendChild(section);
      section.querySelector("#runScenarioReview50")?.addEventListener("click", () => renderScenarioReview50());
    }
    const reportBtn = document.querySelector('[data-view="reports"]');
    if (reportBtn && !reportBtn.dataset.rt50Alias) {
      reportBtn.dataset.rt50Alias = "true";
      reportBtn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); populateScenarioReview50(); try { activateView("scenario-review"); } catch(e){} }, true);
    }
    populateScenarioReview50();
  }
  function populateScenarioReview50(){
    const select = document.getElementById("scenarioReviewSelect50"); if (!select) return;
    const saved = (typeof getSavedScenarios === "function" ? getSavedScenarios() : []) || [];
    const current = select.value;
    select.innerHTML = saved.length ? saved.map(s=>`<option value="${esc(s.id || "")}">${esc(scenarioLabel(s))} (${esc(s.mode || "")})</option>`).join("") : '<option value="">No saved scenarios</option>';
    if (saved.some(s => String(s.id) === String(current))) select.value = current;
  }
  function syncVersion50(){
    document.querySelectorAll(".sidebar-note h4").forEach(el => el.textContent = "Phase " + PHASE);
    document.querySelectorAll("#appVersion,#versionLabel,#dashboardVersion,[data-version],.version").forEach(el => { if (el) el.textContent = PHASE; });
  }
  document.addEventListener("DOMContentLoaded", function(){
    installViews50(); syncVersion50(); setTimeout(()=>{ installViews50(); syncVersion50(); }, 500);
  });
  window.renderPortfolioReport50 = renderPortfolioReport50;
  window.renderScenarioReview50 = renderScenarioReview50;
  window.renderPortfolioReport51 = renderPortfolioReport50;
  window.renderScenarioReview51 = renderScenarioReview50;
})();
/* ===== END PHASE 23.0.50 ===== */


/* ===== PHASE 23.0.61 RESET STABILIZATION GUARD ===== */
(function(){
  const PHASE = "23.0.61";
  try { window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}
  function syncVersion51(){
    document.querySelectorAll(".sidebar-note h4").forEach(el => el.textContent = "Phase " + PHASE);
    document.querySelectorAll("#appVersion,#versionLabel,#dashboardVersion,[data-version],.version").forEach(el => { if (el) el.textContent = PHASE; });
    const note = document.getElementById("workspacePhaseNote");
    if (note) note.textContent = "Current frontend phase: " + PHASE + ". Chrome and Edge workspace-folder mode is active. Live work files should be written to a selected workspace folder, not kept in site storage. If no folder is selected, the app falls back to browser storage only as a temporary backup mode.";
  }
  function hideSubjectiveRiskFields51(){
    const ids = ["riskItemScore","riskItemWeight","singleInherentRisk","complexInherentRisk","betaInherentRisk","complexSectionWeight"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      const wrap = el?.closest("label,.form-row,.field,.input-group,.form-group,div");
      if (wrap) wrap.style.display = "none";
      else if (el) el.style.display = "none";
    });
    Array.from(document.querySelectorAll("label, th, h4, h3, p, span")).forEach(el => {
      const t = (el.textContent || "").trim().toLowerCase();
      if (t === "item risk score (0-100)" || t === "weight (1-5)" || t === "inherent risk score") {
        const wrap = el.closest("label,.form-row,.field,.input-group,.form-group,div");
        if (wrap) wrap.style.display = "none";
      }
    });
  }
  document.addEventListener("DOMContentLoaded", function(){
    syncVersion51(); hideSubjectiveRiskFields51();
    setTimeout(()=>{ syncVersion51(); hideSubjectiveRiskFields51(); }, 250);
    setTimeout(()=>{ syncVersion51(); hideSubjectiveRiskFields51(); }, 1000);
  });
})();
/* ===== END PHASE 23.0.61 ===== */

/* ===== PHASE 23.0.61 COLUMN SOURCES + FULL ROW EDITING ===== */
(function(){
  const PHASE = "23.0.61";
  const keyMap = { insurance: 'insuranceId', hardFact: 'hardFactId', mitigation: 'mitigationId', acceptedRisk: 'acceptedRiskId', costLoss: 'costLossId' };
  const prefixMap = { insurance: 'INS', hardFact: 'HF', mitigation: 'MIT', acceptedRisk: 'AR', costLoss: 'COST' };
  window.rtEditingRiskItemId = window.rtEditingRiskItemId || null;

  function rtId(prefix){
    if (typeof nextRecordId === 'function') return nextRecordId(prefix);
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random()*100000);
  }
  function ensureIds(kind, list){
    const key = keyMap[kind];
    const prefix = prefixMap[kind] || 'ROW';
    if (!Array.isArray(list) || !key) return list || [];
    list.forEach(row => { if (row && !row[key]) row[key] = rtId(prefix); });
    return list;
  }
  function ensureAllRowIds(){
    try {
      ensureIds('insurance', window.singleInsurance || singleInsurance);
      ensureIds('insurance', window.complexInsurance || complexInsurance);
      ensureIds('insurance', window.betaInsurance || betaInsurance);
      ensureIds('hardFact', window.singleHardFacts || singleHardFacts);
      ensureIds('hardFact', window.complexHardFacts || complexHardFacts);
      ensureIds('hardFact', window.betaHardFacts || betaHardFacts);
      ensureIds('mitigation', window.singleMitigations || singleMitigations);
      ensureIds('mitigation', window.complexMitigations || complexMitigations);
      ensureIds('acceptedRisk', window.singleAcceptedRisks || []);
      ensureIds('acceptedRisk', window.complexAcceptedRisks || []);
      ensureIds('costLoss', window.complexCostLosses || complexCostLosses || []);
      (window.currentComplexItems || currentComplexItems || []).forEach(item => { if (item && !item.issueId) item.issueId = rtId('ISS'); });
    } catch(e) {}
  }

  const columnSources = {
    'risk-item:item': 'Risk Item Table → Item comes from the Risk Item Name field in the Risk Item Entry form.',
    'risk-item:domain': 'Risk Item Table → Domain comes from the Risk Domain dropdown in the Risk Item Entry form.',
    'risk-item:product': 'Risk Item Table → Product comes from the Related Area / Product Family dropdown in the Risk Item Entry form.',
    'risk-item:regulation': 'Risk Item Table → Regulation comes from the Related Regulation dropdown in the Risk Item Entry form.',
    'risk-item:probability': 'Risk Item Table → Probability Min / Likely / Max comes from the three Probability fields in the Risk Item Entry form.',
    'risk-item:impact': 'Risk Item Table → Impact Min / Likely / Max comes from the three Impact fields in the Risk Item Entry form. Cost/Loss entries and hard facts are separately used as exposure anchors in rollups.',
    'risk-item:evidence': 'Risk Item Table → Evidence Quality comes from the Evidence Quality dropdown in the Risk Item Entry form.',
    'risk-item:costs': 'Risk Item Table → Linked Costs is calculated from the Cost/Loss table rows tied to this risk item.',
    'risk-item:status': 'Risk Item Table → Status comes from the Risk Item Status dropdown in the Risk Item Entry form.',
    'cost-loss:type': 'Cost/Loss Table → Cost Type comes from the Cost Type dropdown.',
    'cost-loss:applies': 'Cost/Loss Table → Applies To comes from the Applies To dropdown.',
    'cost-loss:risk': 'Cost/Loss Table → Related Risk Item comes from the Related Risk Item dropdown; blank means component-level exposure.',
    'cost-loss:min': 'Cost/Loss Table → Amount Min comes from Amount Min ($).',
    'cost-loss:likely': 'Cost/Loss Table → Amount Likely comes from Amount Likely ($), and is used as a primary exposure anchor.',
    'cost-loss:max': 'Cost/Loss Table → Amount Max comes from Amount Max ($).',
    'cost-loss:date': 'Cost/Loss Table → Date/Period comes from Date / Period.',
    'cost-loss:source': 'Cost/Loss Table → Source Type comes from Source Type.',
    'cost-loss:notes': 'Cost/Loss Table → Notes comes from Notes.',
    'hard-fact:source': 'Hard Facts / Evidence Table → Source Type comes from the Hard Fact Source Type dropdown.',
    'hard-fact:amount': 'Hard Facts / Evidence Table → Amount comes from the Hard Fact Amount field and feeds risk as an actual loss/cost evidence anchor.',
    'hard-fact:date': 'Hard Facts / Evidence Table → Date comes from the Hard Fact Date field.',
    'hard-fact:description': 'Hard Facts / Evidence Table → Description comes from the Hard Fact Description field.',
    'hard-fact:link': 'Hard Facts / Evidence Table → Source Link comes from Source Link / Document Location.',
    'mitigation:title': 'Mitigation Table → Title comes from the Mitigation Title field.',
    'mitigation:owner': 'Mitigation Table → Owner comes from the Mitigation Owner field.',
    'mitigation:status': 'Mitigation Table → Status comes from the Mitigation Status field.',
    'mitigation:attachment': 'Mitigation Table → Attachment comes from the attachment/source field.',
    'insurance:policy': 'Insurance Table → Policy Name comes from Policy Name.',
    'insurance:number': 'Insurance Table → Policy Number comes from Policy Number.',
    'insurance:carrier': 'Insurance Table → Carrier comes from Carrier.',
    'insurance:type': 'Insurance Table → Coverage Type comes from Coverage Type.',
    'insurance:premium': 'Insurance Table → Premium comes from Premium.',
    'insurance:deductible': 'Insurance Table → Deductible comes from Deductible and reduces net insurance offset.',
    'insurance:coverage': 'Insurance Table → Coverage Amount comes from Coverage Amount and is used as the gross risk-transfer value.',
    'insurance:dates': 'Insurance Table → Coverage Dates comes from Coverage Dates.',
    'insurance:notes': 'Insurance Table → Notes comes from Notes / Exclusions / Comments.',
    'accepted:flag': 'Accepted Risk Table → Accepted comes from the Risk Accepted checkbox.',
    'accepted:authority': 'Accepted Risk Table → Authority comes from the Acceptance Authority dropdown.',
    'accepted:by': 'Accepted Risk Table → Accepted By comes from the Accepted By field.',
    'accepted:date': 'Accepted Risk Table → Acceptance Date comes from Acceptance Date.',
    'accepted:review': 'Accepted Risk Table → Review Date comes from Review Date.',
    'accepted:logic': 'Accepted Risk Table → Decision Logic comes from Decision Logic.'
  };
  function src(key){ return '<br><button type="button" class="column-source-link" data-column-source="' + key + '">(source)</button>'; }
  function showSource(key){
    const msg = columnSources[key] || 'This column is populated from the matching input field or a calculated related table value.';
    let box = document.getElementById('rtColumnSourceModal');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rtColumnSourceModal';
      box.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.38);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;';
      box.innerHTML = '<div style="max-width:620px;width:100%;background:#fff;border-radius:16px;box-shadow:0 20px 70px rgba(15,23,42,.28);border:1px solid #dbe6f4;"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px 18px;border-bottom:1px solid #e7edf7;"><strong>Column Input Source</strong><button type="button" class="btn btn-secondary small-btn" id="rtColumnSourceClose">Close</button></div><div id="rtColumnSourceText" style="padding:18px;line-height:1.55;color:#0f2544;"></div></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function(e){ if (e.target === box || e.target.id === 'rtColumnSourceClose') box.style.display='none'; });
    }
    const text = document.getElementById('rtColumnSourceText');
    if (text) text.textContent = msg;
    box.style.display = 'flex';
  }
  function decorateHeaders(){
    const maps = [
      ['complexItemsBody', ['risk-item:item','risk-item:domain','risk-item:product','risk-item:regulation','risk-item:probability','risk-item:impact','risk-item:evidence','risk-item:costs','risk-item:status',null]],
      ['complexCostLossBody', ['cost-loss:type','cost-loss:applies','cost-loss:risk','cost-loss:min','cost-loss:likely','cost-loss:max','cost-loss:date','cost-loss:source','cost-loss:notes',null]],
      ['complexHardFactsBody', ['hard-fact:source','hard-fact:amount','hard-fact:date','hard-fact:description','hard-fact:link',null]],
      ['complexMitigationBody', ['mitigation:title','mitigation:owner','mitigation:status','mitigation:attachment',null]],
      ['complexInsuranceBody', ['insurance:policy','insurance:number','insurance:carrier','insurance:type','insurance:premium','insurance:deductible','insurance:coverage','insurance:dates','insurance:notes',null,null]],
      ['complexAcceptedRiskBody', ['accepted:flag','accepted:authority','accepted:by','accepted:date','accepted:review','accepted:logic',null]]
    ];
    maps.forEach(([tbodyId, keys]) => {
      const tbody = document.getElementById(tbodyId);
      const table = tbody?.closest('table');
      if (!table) return;
      table.querySelectorAll('thead th').forEach((th, i) => {
        if (!keys[i] || th.querySelector('.column-source-link')) return;
        th.insertAdjacentHTML('beforeend', src(keys[i]));
      });
    });
    if (!document.getElementById('rtColumnSourceStyles')) {
      const style = document.createElement('style');
      style.id = 'rtColumnSourceStyles';
      style.textContent = '.column-source-link{border:0;background:transparent;color:#0b5bd3;text-decoration:underline;cursor:pointer;font-size:11px;font-weight:600;padding:1px 0;margin:2px 0 0 0}.column-source-link:hover{color:#063b8c}.rt-editing-row{outline:2px solid #0b5bd3;outline-offset:-2px;background:#f0f6ff!important}';
      document.head.appendChild(style);
    }
  }

  function clearRiskItemForm(){
    ['riskItemName','riskItemDescription','riskItemProbMin','riskItemProbLikely','riskItemProbMax','riskItemImpactMin','riskItemImpactLikely','riskItemImpactMax'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    try { setSelectValueSafe('riskItemEvidenceQuality', 'Medium'); setSelectValueSafe('riskItemStatus', 'Open'); } catch(e) {}
    window.rtEditingRiskItemId = null;
    const btn = document.getElementById('addRiskItemBtn'); if (btn) btn.textContent = 'Add Risk Item';
    const status = document.getElementById('riskItemEditStatus'); if (status) status.textContent = 'No risk item selected for editing.';
    const cancel = document.getElementById('cancelRiskItemEditBtn'); if (cancel) cancel.style.display = 'none';
    formatAllCurrencyFields && formatAllCurrencyFields();
  }
  function ensureRiskEditControls(){
    const addBtn = document.getElementById('addRiskItemBtn');
    if (!addBtn) return;
    let cancel = document.getElementById('cancelRiskItemEditBtn');
    if (!cancel) {
      cancel = document.createElement('button');
      cancel.type = 'button'; cancel.id = 'cancelRiskItemEditBtn'; cancel.className = 'btn btn-secondary'; cancel.textContent = 'Cancel Edit'; cancel.style.display = 'none';
      addBtn.insertAdjacentElement('afterend', cancel);
      cancel.addEventListener('click', clearRiskItemForm);
    }
    let status = document.getElementById('riskItemEditStatus');
    if (!status) {
      status = document.createElement('div');
      status.id = 'riskItemEditStatus'; status.className = 'note-box'; status.textContent = 'No risk item selected for editing.';
      cancel.insertAdjacentElement('afterend', status);
    }
  }
  function editRiskItem(issueId){
    const list = window.currentComplexItems || currentComplexItems || [];
    const item = list.find(x => String(x.issueId || '') === String(issueId || ''));
    if (!item) return;
    window.rtEditingRiskItemId = item.issueId;
    const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ''; };
    setVal('riskItemName', item.name || '');
    setSelectValueSafe && setSelectValueSafe('riskItemDomain', item.domain || '');
    setSelectValueSafe && setSelectValueSafe('riskItemProduct', item.product || '');
    setSelectValueSafe && setSelectValueSafe('riskItemReg', item.regulation || '');
    setVal('riskItemProbMin', item.probMin ?? 0); setVal('riskItemProbLikely', item.probLikely ?? 0); setVal('riskItemProbMax', item.probMax ?? 0);
    if (typeof setCurrencyFieldValue === 'function') { setCurrencyFieldValue('riskItemImpactMin', item.impactMin || 0); setCurrencyFieldValue('riskItemImpactLikely', item.impactLikely || 0); setCurrencyFieldValue('riskItemImpactMax', item.impactMax || 0); }
    else { setVal('riskItemImpactMin', item.impactMin || 0); setVal('riskItemImpactLikely', item.impactLikely || 0); setVal('riskItemImpactMax', item.impactMax || 0); }
    setSelectValueSafe && setSelectValueSafe('riskItemEvidenceQuality', item.evidenceQuality || 'Medium');
    setSelectValueSafe && setSelectValueSafe('riskItemStatus', item.status || 'Open');
    setVal('riskItemDescription', item.description || '');
    const btn = document.getElementById('addRiskItemBtn'); if (btn) btn.textContent = 'Update Risk Item';
    const cancel = document.getElementById('cancelRiskItemEditBtn'); if (cancel) cancel.style.display = '';
    const status = document.getElementById('riskItemEditStatus'); if (status) status.textContent = 'Editing risk item: ' + (item.name || item.issueId || 'Risk Item');
    document.querySelectorAll('#complexItemsBody tr').forEach(tr => tr.classList.toggle('rt-editing-row', tr.dataset.issueId === String(issueId || '')));
    formatAllCurrencyFields && formatAllCurrencyFields();
    document.getElementById('riskItemName')?.focus();
  }

  renderComplexItems = function() {
    ensureAllRowIds();
    const tbody = document.getElementById('complexItemsBody');
    if (!tbody) return;
    if (!currentComplexItems.length) {
      tbody.innerHTML = '<tr><td colspan="10">No risk items added yet.</td></tr>';
    } else {
      tbody.innerHTML = currentComplexItems.map(item => {
        const prob = safeNumber(item.probMin,0) + '% / ' + safeNumber(item.probLikely,0) + '% / ' + safeNumber(item.probMax,0) + '%';
        const impact = currency(item.impactMin) + ' / ' + currency(item.impactLikely) + ' / ' + currency(item.impactMax);
        const costCount = (complexCostLosses || []).filter(c => String(c.riskItemId || '') === String(item.issueId || '')).length;
        const actions = '<button class="btn btn-secondary small-btn" type="button" data-edit-risk-item="' + escapeHtml(item.issueId || '') + '">Edit</button> <button class="btn btn-danger small-btn" type="button" data-delete-risk-item="' + escapeHtml(item.issueId || '') + '">Delete</button>';
        return '<tr data-issue-id="' + escapeHtml(item.issueId || '') + '"><td><button class="scenario-link" data-issue-open="' + escapeHtml(item.issueId || '') + '">' + escapeHtml(item.name) + '</button></td><td>' + escapeHtml(item.domain) + '</td><td>' + escapeHtml(item.product) + '</td><td>' + escapeHtml(item.regulation) + '</td><td>' + prob + '</td><td>' + impact + '</td><td>' + escapeHtml(item.evidenceQuality || 'Medium') + '</td><td>' + costCount + '</td><td>' + escapeHtml(item.status || 'Open') + '</td><td>' + actions + '</td></tr>';
      }).join('');
      tbody.querySelectorAll('[data-issue-open]').forEach(btn => btn.addEventListener('click', () => highlightIssueRow(btn.dataset.issueOpen)));
      tbody.querySelectorAll('[data-edit-risk-item]').forEach(btn => btn.addEventListener('click', () => editRiskItem(btn.dataset.editRiskItem)));
    }
    decorateHeaders();
    renderCostLossRiskItemOptions && renderCostLossRiskItemOptions();
    refreshComplexProductSectionSelects && refreshComplexProductSectionSelects();
    updateInherentScores && updateInherentScores();
    renderComplexProductSections && renderComplexProductSections();
  };

  addRiskItem = function() {
    if (!complexProductSections.length) { alert('Add an Area / Product Family first.'); return; }
    const editId = window.rtEditingRiskItemId;
    const impactLikely = parseCurrencyValue(document.getElementById('riskItemImpactLikely')?.value || 0);
    const record = { issueId: editId || ('ISS-' + Date.now() + '-' + Math.floor(Math.random() * 1000)), parentScenarioMode: 'complex', name: document.getElementById('riskItemName')?.value || 'Unnamed Risk Item', domain: document.getElementById('riskItemDomain')?.value || '', product: document.getElementById('riskItemProduct')?.value || '', regulation: document.getElementById('riskItemReg')?.value || '', description: document.getElementById('riskItemDescription')?.value || '', probMin: safeNumber(document.getElementById('riskItemProbMin')?.value || 0, 0), probLikely: safeNumber(document.getElementById('riskItemProbLikely')?.value || 0, 0), probMax: safeNumber(document.getElementById('riskItemProbMax')?.value || 0, 0), impactMin: parseCurrencyValue(document.getElementById('riskItemImpactMin')?.value || 0), impactLikely, impactMax: parseCurrencyValue(document.getElementById('riskItemImpactMax')?.value || impactLikely), evidenceQuality: document.getElementById('riskItemEvidenceQuality')?.value || 'Medium', status: document.getElementById('riskItemStatus')?.value || 'Open', score: 0, weight: 1 };
    const idx = currentComplexItems.findIndex(x => String(x.issueId || '') === String(record.issueId || ''));
    if (idx >= 0) currentComplexItems[idx] = record; else currentComplexItems.push(record);
    clearRiskItemForm();
    renderComplexItems();
    formatAllCurrencyFields && formatAllCurrencyFields();
  };

  const priorRenderInsurance = renderInsuranceTable;
  renderInsuranceTable = function(targetId, items){ ensureIds('insurance', items); priorRenderInsurance(targetId, items); decorateHeaders(); };
  const priorRenderHardFacts = renderHardFactsTable;
  renderHardFactsTable = function(targetId, items){ ensureIds('hardFact', items); priorRenderHardFacts(targetId, items); decorateHeaders(); };
  const priorRenderMitigation = renderMitigationTable;
  renderMitigationTable = function(targetId, items){ ensureIds('mitigation', items); priorRenderMitigation(targetId, items); decorateHeaders(); };
  const priorRenderAccepted = renderAcceptedRiskTable;
  renderAcceptedRiskTable = function(targetId, items, mode){ ensureIds('acceptedRisk', items); priorRenderAccepted(targetId, items, mode); decorateHeaders(); };
  const priorRenderCostLoss = renderCostLossTable;
  renderCostLossTable = function(targetId, items){ ensureIds('costLoss', items); priorRenderCostLoss(targetId, items); decorateHeaders(); };

  document.addEventListener('click', function(e){
    const source = e.target.closest('[data-column-source]');
    if (source) { e.preventDefault(); showSource(source.dataset.columnSource); return; }
    const editRisk = e.target.closest('[data-edit-risk-item]');
    if (editRisk) { e.preventDefault(); editRiskItem(editRisk.dataset.editRiskItem); return; }
  });
  document.addEventListener('DOMContentLoaded', function(){
    ensureAllRowIds(); ensureRiskEditControls(); decorateHeaders();
    setTimeout(function(){ ensureAllRowIds(); ensureRiskEditControls(); decorateHeaders(); try { renderComplexItems(); } catch(e) {} }, 300);
  });
})();
/* ===== END PHASE 23.0.61 ===== */

/* ===== PHASE 23.0.61 COMPLEX WORKSPACE UI ===== */
(function(){
  const PHASE = "23.0.61";
  try { window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}
  const qs=(s,r=document)=>r.querySelector(s); const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num=v=>{ const n=Number(String(v??'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:0; };
  const money=v=>{ try{return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(num(v));}catch(e){return '$'+Math.round(num(v)).toLocaleString();} };
  const tabs=[['risk','1. Risk Items','Manage risks for this component','!'],['cost','2. Costs / Losses','Manage all cost and loss entries','$'],['evidence','3. Hard Facts / Evidence','Manage evidence and data sources','D'],['mitigation','4. Mitigation / Controls','Manage mitigations and controls','✓'],['insurance','5. Insurance / Risk Transfer','Manage insurance and risk transfer','☂'],['accepted','6. Accepted Risk','Manage accepted risk decisions','✓']];
  const map={risk:['Risk Item Entry for Selected Component','Risk Item Table'],cost:['Cost / Loss Entry','Cost / Loss Table'],evidence:['Hard Facts / Evidence Entry','Hard Facts / Evidence Table'],mitigation:['Mitigation Entry','Mitigation Table'],insurance:['Insurance Entry','Insurance Table'],accepted:['Accepted Risk','Accepted Risk Table']};
  function addStyles(){ if(qs('#rt54Styles'))return; const st=document.createElement('style'); st.id='rt54Styles'; st.textContent=`#view-complex.rt54-workspace .section-header h2::after{content:' › Component Workspace';font-weight:800;color:#172033}.rt54-topbar{display:flex;justify-content:flex-end;gap:12px;margin:-6px 0 12px}.rt54-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:16px}.rt54-main{min-width:0}.rt54-sidebar{position:sticky;top:14px;display:flex;flex-direction:column;gap:14px}.rt54-summary,.rt54-card{background:#fff;border:1px solid #dbe4f0;border-radius:12px;box-shadow:0 2px 8px rgba(15,23,42,.06);padding:14px;margin-bottom:14px}.rt54-summary h3,.rt54-card h3{margin:0 0 10px;color:#0f1f3d}.rt54-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px}.rt54-label{font-size:11px;font-weight:800;color:#0b3b80}.rt54-value{font-size:14px;color:#172033;margin-top:4px}.rt54-tabs{display:flex;gap:18px;border-bottom:1px solid #dbe4f0;margin:0 0 12px;overflow:auto}.rt54-tab{border:0;background:transparent;padding:12px 0 10px;color:#25324b;font-weight:800;white-space:nowrap;cursor:pointer;border-bottom:3px solid transparent}.rt54-tab.active{color:#0b5bd3;border-bottom-color:#0b5bd3}.rt54-side-row{width:100%;display:flex;gap:10px;align-items:center;border:1px solid #dbe4f0;background:#fff;border-radius:10px;padding:12px;margin:7px 0;text-align:left;cursor:pointer}.rt54-side-row.active{border-color:#0b5bd3;background:#f0f6ff}.rt54-icon{width:28px;height:28px;border:1px solid #b9cff0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#0b5bd3;font-weight:900}.rt54-side-title{font-weight:800}.rt54-side-sub{font-size:12px;color:#5b6475}.rt54-link,.rt54-src{border:0;background:transparent;color:#0b5bd3;text-decoration:underline;cursor:pointer;font-size:12px;font-weight:700;padding:0}.rt54-src{display:block;text-align:left;margin-top:2px}.rt54-field-source{display:inline;margin-left:6px}.rt54-hidden{display:none!important}.rt54-editing-row{outline:2px solid #0b5bd3;outline-offset:-2px;background:#f0f6ff!important}.rt54-workspace .btn-danger,.rt54-workspace .btn.btn-danger{border:1px solid #ef4444;color:#dc2626;background:#fff}.rt54-info-list{padding-left:18px;margin:8px 0}.rt54-info-list li{margin-bottom:8px;font-size:13px;line-height:1.35}@media(max-width:1100px){.rt54-layout{grid-template-columns:1fr}.rt54-sidebar{position:static}.rt54-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`; document.head.appendChild(st); }
  function card(title){return qsa('#view-complex .card').find(c=>(c.querySelector('.card-header h3')?.textContent||'').trim()===title)}
  function version(){ qsa('#appVersion,.app-version,[data-version-label]').forEach(e=>e.textContent=PHASE); }
  function summary(){ let c=qs('#rt54Summary'); const ref=card('Selected Component Workspace')||card('Risk Item Entry for Selected Component'); if(!c&&ref){ c=document.createElement('div'); c.id='rt54Summary'; c.className='rt54-summary'; ref.parentNode.insertBefore(c,ref); } if(!c)return; const items=window.currentComplexItems||currentComplexItems||[]; const costs=window.complexCostLosses||complexCostLosses||[]; const total=costs.reduce((t,x)=>t+num(x.amountLikely||x.amount||0),0); const rows=items.map(x=>({name:x.name||'Risk Item',el:(num(x.probLikely)/100)*num(x.impactLikely)})).sort((a,b)=>b.el-a.el); const avg=rows.length?rows.reduce((t,x)=>t+x.el,0)/rows.length:0; c.innerHTML=`<h3>Component Summary <button class="rt54-link" data-column-source="rollup:component-summary">(rollup)</button></h3><div class="rt54-grid"><div><div class="rt54-label">Component ID</div><div class="rt54-value">${esc(qs('#complexComponentId')?.value||'Generated on save')}</div></div><div><div class="rt54-label">Product / Service / Area</div><div class="rt54-value">${esc(qs('#complexPrimaryProduct')?.selectedOptions?.[0]?.textContent||'Not selected')}</div></div><div><div class="rt54-label">Regulation</div><div class="rt54-value">${esc(qs('#complexPrimaryRegulation')?.selectedOptions?.[0]?.textContent||'Not selected')}</div></div><div><div class="rt54-label">Status</div><div class="rt54-value">${esc(qs('#complexScenarioStatus')?.value||'Draft')}</div></div><div><div class="rt54-label">Risk Items</div><div class="rt54-value">${items.length}</div></div><div><div class="rt54-label">Total Cost / Loss Exposure</div><div class="rt54-value">${money(total)}</div></div><div><div class="rt54-label">Avg Residual Risk (EL)</div><div class="rt54-value">${money(avg)}<br><small>${esc(rows[0]?.name||'No risk items yet')}</small></div></div></div>`; }
  function topbar(){ if(qs('#rt54Topbar'))return; const h=qs('#view-complex .section-header'); if(!h)return; const b=document.createElement('div'); b.id='rt54Topbar'; b.className='rt54-topbar'; b.innerHTML=`<button class="rt54-link" data-column-source="workspace:all">Column Input Sources</button><button class="btn btn-secondary" id="rt54RefreshRollups" type="button">Refresh Rollups</button><button class="btn btn-primary" id="rt54SaveAll" type="button">Save All Changes</button>`; h.after(b); qs('#rt54RefreshRollups')?.addEventListener('click',()=>{summary(); try{renderComplexProductSections();renderComplexItems();}catch(e){}}); qs('#rt54SaveAll')?.addEventListener('click',()=>qs('#addComplexScenarioBtn')?.click()); }
  function layout(){ if(qs('#rt54Layout'))return; summary(); const s=qs('#rt54Summary'); if(!s)return; const lay=document.createElement('div'); lay.id='rt54Layout'; lay.className='rt54-layout'; const main=document.createElement('div'); main.id='rt54Main'; main.className='rt54-main'; const side=document.createElement('aside'); side.id='rt54Sidebar'; side.className='rt54-sidebar'; s.parentNode.insertBefore(lay,s); lay.append(main,side); let n=s; while(n){const next=n.nextElementSibling; main.appendChild(n); if(n.matches?.('.card')&&(n.querySelector('.card-header h3')?.textContent||'').trim()==='Accepted Risk Table')break; n=next;} side.innerHTML=`<div class="rt54-card"><h3>Component Workspace Tables <button class="rt54-link" data-column-source="workspace:choose">(choose table)</button></h3>${tabs.map(([k,t,sub,ic])=>`<button class="rt54-side-row" data-rt54-tab="${k}" type="button"><span class="rt54-icon">${ic}</span><span><div class="rt54-side-title">${t}</div><div class="rt54-side-sub">${sub}</div></span></button>`).join('')}</div><div class="rt54-card"><h3>How Rollups Are Calculated <button class="rt54-link" data-column-source="rollup:calculation">(information)</button></h3><ul class="rt54-info-list"><li>Risk Item EL = Probability Likely × Impact Likely.</li><li>Costs / Losses feed total exposure.</li><li>Hard facts can anchor impact/cost assumptions.</li><li>Mitigation reduces exposure; insurance offsets residual exposure.</li><li>Highest Driver = largest residual expected-loss contributor.</li></ul><button class="rt54-link" data-column-source="rollup:details">View Calculation Details</button></div>`; side.addEventListener('click',e=>{const b=e.target.closest('[data-rt54-tab]'); if(b) activate(b.dataset.rt54Tab)}); }
  function tabbar(){ if(qs('#rt54Tabs'))return; const f=card('Risk Item Entry for Selected Component'); if(!f)return; const t=document.createElement('div'); t.id='rt54Tabs'; t.className='rt54-tabs'; t.innerHTML=tabs.map(([k,l])=>`<button class="rt54-tab" data-rt54-tab="${k}" type="button">${l}</button>`).join(''); f.parentNode.insertBefore(t,f); t.addEventListener('click',e=>{const b=e.target.closest('[data-rt54-tab]'); if(b)activate(b.dataset.rt54Tab)}); }
  function activate(k='risk'){ window.rt54ActiveTab=k; Object.entries(map).forEach(([key,titles])=>titles.forEach(t=>card(t)?.classList.toggle('rt54-hidden',key!==k))); qsa('[data-rt54-tab]').forEach(b=>b.classList.toggle('active',b.dataset.rt54Tab===k)); }
  function sources(){ const fields={riskItemName:'Risk Items',riskItemProbMin:'Risk Items',riskItemProbLikely:'Risk Items',riskItemProbMax:'Risk Items',riskItemImpactMin:'Risk Items',riskItemImpactLikely:'Risk Items',riskItemImpactMax:'Risk Items',complexCostLossType:'Costs',complexCostLossAmountLikely:'Costs',complexHardFactAmount:'Evidence',complexMitTitle:'Mitigation',complexInsurancePolicyName:'Insurance',complexAcceptedBy:'Accepted Risk'}; Object.entries(fields).forEach(([id,src])=>{const lab=qs('#'+id)?.closest('div')?.querySelector('label'); if(lab&&!lab.querySelector('.rt54-field-source'))lab.insertAdjacentHTML('beforeend',` <button class="rt54-link rt54-field-source" data-column-source="source:${src}" type="button">(source: ${src})</button>`)}); const tables=[['riskItemsTableBody',['Risk Items','Risk Items','Risk Items','Risk Items','Risk Items','Risk Items','Risk Items','Costs','Risk Items',null]],['complexCostLossBody',['Costs','Costs','Risk Items','Costs','Costs','Costs','Costs','Costs','Costs',null]],['complexHardFactsBody',['Evidence','Evidence','Evidence','Evidence','Evidence',null]],['complexMitigationBody',['Mitigation','Mitigation','Mitigation','Mitigation',null]],['complexInsuranceBody',['Insurance','Insurance','Insurance','Insurance','Insurance','Insurance','Insurance','Insurance','Insurance','Insurance',null]],['complexAcceptedRiskBody',['Accepted Risk','Accepted Risk','Accepted Risk','Accepted Risk','Accepted Risk','Accepted Risk',null]]]; tables.forEach(([body,arr])=>{const ths=qs('#'+body)?.closest('table')?.querySelectorAll('thead th')||[]; Array.from(ths).forEach((th,i)=>{if(arr[i]&&!th.querySelector('.rt54-src'))th.insertAdjacentHTML('beforeend',`<button class="rt54-src" data-column-source="source:${arr[i]}" type="button">(source)</button>`)});}); }
  function sourceMsg(k){ const msgs={'rollup:component-summary':'Component Summary is calculated from selected component details, risk items, cost/loss rows, hard facts, mitigation, and insurance.','workspace:all':'Each underlined source link explains what form or child table feeds that field or table column.','workspace:choose':'These buttons switch between child tables scoped to the selected component.','rollup:calculation':'Rollups use evidence-driven probability, impact, hard fact, cost/loss, mitigation, and insurance inputs. No subjective risk score is used.','rollup:details':'Average residual risk is derived from expected loss; total exposure sums likely cost/loss rows; highest driver is the largest remaining contributor.'}; alert(msgs[k]||String(k).replace('source:','This value comes from the ')+' table or input group.'); }
  function riskEditWire(){ const add=qs('#addRiskItemBtn'); if(!add||add.dataset.rt54)return; add.dataset.rt54='1'; let cancel=qs('#cancelRiskItemEditBtn'); if(!cancel){cancel=document.createElement('button');cancel.id='cancelRiskItemEditBtn';cancel.type='button';cancel.className='btn btn-secondary';cancel.textContent='Cancel';add.after(cancel)} let clear=qs('#clearRiskItemFormBtn'); if(!clear){clear=document.createElement('button');clear.id='clearRiskItemFormBtn';clear.type='button';clear.className='btn btn-danger';clear.textContent='Clear Form';cancel.after(clear)} let st=qs('#riskItemEditStatus'); if(!st){st=document.createElement('div');st.id='riskItemEditStatus';st.className='note-box';st.textContent='No risk item selected for editing.';clear.after(st)} cancel.onclick=clearRisk; clear.onclick=clearRisk; add.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveRisk();},true); }
  function clearRisk(){ ['riskItemName','riskItemDescription','riskItemProbMin','riskItemProbLikely','riskItemProbMax','riskItemImpactMin','riskItemImpactLikely','riskItemImpactMax'].forEach(id=>{const el=qs('#'+id); if(el)el.value=''}); window.rt54EditRisk=null; const b=qs('#addRiskItemBtn'); if(b)b.textContent='Add Risk Item'; const s=qs('#riskItemEditStatus'); if(s)s.textContent='No risk item selected for editing.'; qsa('#riskItemsTableBody tr').forEach(tr=>tr.classList.remove('rt54-editing-row')); }
  function editRisk(id){ const list=window.currentComplexItems||currentComplexItems||[]; const x=list.find(r=>String(r.issueId||'')===String(id||'')); if(!x)return; window.rt54EditRisk=x.issueId; const set=(id,v)=>{const e=qs('#'+id); if(e)e.value=v??''}; set('riskItemName',x.name||''); set('riskItemDescription',x.description||''); try{setSelectValueSafe('riskItemDomain',x.domain||'');setSelectValueSafe('riskItemProduct',x.product||'');setSelectValueSafe('riskItemReg',x.regulation||'')}catch(e){} set('riskItemProbMin',x.probMin||0); set('riskItemProbLikely',x.probLikely||0); set('riskItemProbMax',x.probMax||0); try{setCurrencyFieldValue('riskItemImpactMin',x.impactMin||0);setCurrencyFieldValue('riskItemImpactLikely',x.impactLikely||0);setCurrencyFieldValue('riskItemImpactMax',x.impactMax||0)}catch(e){set('riskItemImpactMin',x.impactMin||0);set('riskItemImpactLikely',x.impactLikely||0);set('riskItemImpactMax',x.impactMax||0)} try{setSelectValueSafe('riskItemEvidenceQuality',x.evidenceQuality||'Medium');setSelectValueSafe('riskItemStatus',x.status||'Open')}catch(e){} const b=qs('#addRiskItemBtn'); if(b)b.textContent='Update Risk Item'; const s=qs('#riskItemEditStatus'); if(s)s.textContent='Editing risk item: '+(x.name||x.issueId); qsa('#riskItemsTableBody tr').forEach(tr=>tr.classList.toggle('rt54-editing-row',tr.dataset.issueId===String(id))); activate('risk'); qs('#riskItemName')?.focus(); }
  function saveRisk(){ if(!complexProductSections.length){alert('Add an Area / Product Family first.');return} const id=window.rt54EditRisk||('ISS-'+Date.now()+'-'+Math.floor(Math.random()*1000)); const rec={issueId:id,parentScenarioMode:'complex',name:qs('#riskItemName')?.value||'Unnamed Risk Item',domain:qs('#riskItemDomain')?.value||'',product:qs('#riskItemProduct')?.value||'',regulation:qs('#riskItemReg')?.value||'',description:qs('#riskItemDescription')?.value||'',probMin:num(qs('#riskItemProbMin')?.value),probLikely:num(qs('#riskItemProbLikely')?.value),probMax:num(qs('#riskItemProbMax')?.value),impactMin:(typeof parseCurrencyValue==='function'?parseCurrencyValue(qs('#riskItemImpactMin')?.value||0):num(qs('#riskItemImpactMin')?.value)),impactLikely:(typeof parseCurrencyValue==='function'?parseCurrencyValue(qs('#riskItemImpactLikely')?.value||0):num(qs('#riskItemImpactLikely')?.value)),impactMax:(typeof parseCurrencyValue==='function'?parseCurrencyValue(qs('#riskItemImpactMax')?.value||0):num(qs('#riskItemImpactMax')?.value)),evidenceQuality:qs('#riskItemEvidenceQuality')?.value||'Medium',status:qs('#riskItemStatus')?.value||'Open',score:0,weight:1}; const i=currentComplexItems.findIndex(x=>String(x.issueId||'')===String(id)); if(i>=0)currentComplexItems[i]=rec; else currentComplexItems.push(rec); clearRisk(); renderComplexItems(); try{renderCostLossRiskItemOptions();renderComplexProductSections();formatAllCurrencyFields()}catch(e){} summary(); }
  function renderRisk(){ const body=qs('#riskItemsTableBody'); if(!body)return; const list=window.currentComplexItems||currentComplexItems||[]; if(!list.length){body.innerHTML='<tr><td colspan="10">No risk items added yet.</td></tr>';return} body.innerHTML=list.map(x=>`<tr data-issue-id="${esc(x.issueId||'')}"><td><button class="scenario-link" data-edit-risk-item="${esc(x.issueId||'')}" type="button">${esc(x.name||'Risk Item')}</button></td><td>${esc(x.domain||'')}</td><td>${esc(x.product||'')}</td><td>${esc(x.regulation||'')}</td><td>${num(x.probMin)}% / ${num(x.probLikely)}% / ${num(x.probMax)}%</td><td>${money(x.impactMin)} / ${money(x.impactLikely)} / ${money(x.impactMax)}</td><td>${esc(x.evidenceQuality||'Medium')}</td><td>${(window.complexCostLosses||complexCostLosses||[]).filter(c=>String(c.riskItemId||'')===String(x.issueId||'')).length}</td><td>${esc(x.status||'Open')}</td><td><button class="btn btn-secondary small-btn" data-edit-risk-item="${esc(x.issueId||'')}" type="button">Edit</button> <button class="btn btn-danger small-btn" data-delete-risk-item="${esc(x.issueId||'')}" type="button">Delete</button></td></tr>`).join(''); sources(); summary(); }
  try{ renderComplexItems=renderRisk; }catch(e){}
  document.addEventListener('click',e=>{const src=e.target.closest('[data-column-source]'); if(src){e.preventDefault();sourceMsg(src.dataset.columnSource);return} const ed=e.target.closest('[data-edit-risk-item]'); if(ed){e.preventDefault();editRisk(ed.dataset.editRiskItem);return}},true);
  function init54(){ const v=qs('#view-complex'); if(!v)return; v.classList.add('rt54-workspace'); addStyles(); version(); topbar(); summary(); tabbar(); layout(); sources(); riskEditWire(); try{renderComplexItems()}catch(e){} activate(window.rt54ActiveTab||'risk'); }
  document.addEventListener('input',e=>{if(e.target.closest?.('#view-complex'))setTimeout(summary,50)}); document.addEventListener('change',e=>{if(e.target.closest?.('#view-complex'))setTimeout(summary,50)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init54,300)); else setTimeout(init54,300); setTimeout(init54,1200);
})();
/* ===== END PHASE 23.0.61 COMPLEX WORKSPACE UI ===== */

/* ===== PHASE 23.0.61 COMPLEX WORKSPACE VISUAL MATCH PATCH ===== */
(function(){
  const PHASE = "23.0.61";
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const num=v=>{ const n=Number(String(v??'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:0; };
  const money=v=>{ try{return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(num(v));}catch(e){return '$'+Math.round(num(v)).toLocaleString();} };
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function injectStyle(){
    if(qs('#rt55VisualStyle')) return;
    const st=document.createElement('style'); st.id='rt55VisualStyle';
    st.textContent=`:root{--rt55-navy:#082b61;--rt55-navy2:#071f49;--rt55-blue:#0b5bd3;--rt55-bg:#f4f7fb;--rt55-border:#dbe4f0;--rt55-text:#0f172a;--rt55-muted:#64748b}body{background:var(--rt55-bg)!important;color:var(--rt55-text)!important}.sidebar{background:linear-gradient(180deg,var(--rt55-navy),var(--rt55-navy2))!important;width:210px!important;box-shadow:none!important}.brand{padding:18px 12px 16px!important;gap:10px!important;align-items:center!important}.brand-mark{display:none!important}.brand-name{font-size:24px!important;font-weight:800!important;color:#fff!important;letter-spacing:-.02em!important;line-height:1!important}.brand-name::after{content:'  ${PHASE}';font-size:16px;font-weight:800;color:#fff;vertical-align:baseline}.brand-sub{display:none!important}.nav{padding:0 8px!important;gap:7px!important}.nav-item{background:transparent!important;color:#fff!important;border-radius:8px!important;border:0!important;padding:12px 14px!important;font-weight:700!important;text-align:left!important;box-shadow:none!important}.nav-item[data-view="complex"],.nav-item.active[data-view="complex"]{background:#0b6ff0!important;color:#fff!important}.nav-item.active:not([data-view="complex"]){background:rgba(255,255,255,.12)!important}.nav-item[data-view="reports"]{font-size:0!important}.nav-item[data-view="reports"]::after{content:'Portfolio Report';font-size:14px}.sidebar-note{display:none!important}.main{background:var(--rt55-bg)!important;padding:20px 22px 28px!important}.topbar{margin-bottom:18px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}.topbar h1,.topbar p{display:none!important}.topbar-actions{display:flex!important;gap:12px!important;justify-content:flex-end!important}.btn{border-radius:8px!important;font-weight:800!important;padding:10px 16px!important;box-shadow:none!important}.btn-primary{background:#0b5bd3!important;border-color:#0b5bd3!important;color:#fff!important}.btn-secondary{background:#fff!important;border:1px solid #d6dfec!important;color:#0f1f3d!important}.btn-danger{border:1px solid #ef4444!important;color:#dc2626!important;background:#fff!important}.card,.rt54-summary,.rt54-card{background:#fff!important;border:1px solid var(--rt55-border)!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important}.card{padding:0!important;margin-bottom:12px!important}.card-header{padding:14px 18px!important;border-bottom:0!important}.card-header h3{font-size:17px!important;font-weight:800!important;color:#0f172a!important;margin:0!important}.card-header span{color:#60708a!important;font-size:13px!important}.form-grid{padding:0 18px 18px!important;gap:12px 14px!important}label,.help-label{font-size:12px!important;font-weight:800!important;color:#053575!important;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px}input,select,textarea{border:1px solid #d8e2ef!important;border-radius:8px!important;background:#fff!important;color:#0f172a!important;min-height:36px!important}textarea{min-height:82px!important}table{font-size:13px!important;border-collapse:collapse!important;width:100%!important}thead th{background:#f6f8fb!important;color:#082b61!important;font-size:12px!important;font-weight:800!important;padding:12px 12px!important;border-bottom:1px solid #dbe4f0!important;vertical-align:bottom!important}tbody td{padding:12px!important;border-bottom:1px solid #e8eef7!important;color:#24324a!important;vertical-align:middle!important}.table-wrap{padding:0 14px 14px!important}.scenario-link,.rt54-link,.rt54-src{color:#0b5bd3!important;text-decoration:underline!important;text-underline-offset:2px!important;background:transparent!important;border:0!important;cursor:pointer!important;font-weight:700!important}#appVersion{background:transparent!important;box-shadow:none!important;color:#cbd5e1!important;left:12px!important;bottom:8px!important;border-radius:0!important;padding:0!important;z-index:6000!important}#appVersion::before{content:'Version '}#view-complex>.section-header{margin-bottom:12px!important;display:grid!important;grid-template-columns:1fr auto!important;gap:10px 16px!important;align-items:start!important}#view-complex>.section-header h2{font-size:26px!important;line-height:1.1!important;font-weight:800!important;color:#0f172a!important;margin:0!important}#view-complex>.section-header h2::after{content:' > Component Workspace'!important;font-weight:800!important;color:#0f172a!important}#view-complex>.section-header p{grid-column:1/-1!important;margin:0!important;color:#64748b!important;max-width:1120px!important}#view-complex.rt55-mockup #rt54Topbar{margin:-8px 0 12px!important;display:flex!important;justify-content:flex-end!important;gap:12px!important}#view-complex.rt55-mockup #rt54Layout{grid-template-columns:minmax(0,1fr) 300px!important;gap:14px!important;align-items:start!important}#view-complex.rt55-mockup #rt54Sidebar{position:sticky!important;top:14px!important;gap:12px!important}#view-complex.rt55-mockup #rt54Main{min-width:0!important}#view-complex.rt55-mockup #rt54Summary{display:block!important;margin:0 0 12px!important}#view-complex.rt55-mockup .rt54-summary h3{font-size:16px!important;margin:0 0 12px!important}#view-complex.rt55-mockup .rt54-grid{display:grid!important;grid-template-columns:repeat(7,minmax(90px,1fr))!important;gap:14px!important}#view-complex.rt55-mockup .rt54-label{font-size:12px!important;color:#0b3b80!important;font-weight:800!important}#view-complex.rt55-mockup .rt54-value{font-size:14px!important;color:#0f172a!important}#view-complex.rt55-mockup #rt54Tabs{display:flex!important;gap:28px!important;border-bottom:1px solid #dbe4f0!important;margin:0 0 12px!important;padding:0 8px!important;overflow-x:auto!important;background:transparent!important}#view-complex.rt55-mockup .rt54-tab{border:0!important;background:transparent!important;padding:12px 0 10px!important;color:#25324b!important;font-weight:800!important;border-bottom:3px solid transparent!important;white-space:nowrap!important}#view-complex.rt55-mockup .rt54-tab.active{color:#0b5bd3!important;border-bottom-color:#0b5bd3!important}#view-complex.rt55-mockup .rt54-card{padding:14px!important}#view-complex.rt55-mockup .rt54-card h3{font-size:16px!important;line-height:1.25!important;margin:0 0 10px!important}#view-complex.rt55-mockup .rt54-side-row{border:1px solid #dbe4f0!important;background:#fff!important;border-radius:8px!important;padding:10px!important;margin:7px 0!important;width:100%!important}#view-complex.rt55-mockup .rt54-side-row.active{border-color:#0b5bd3!important;background:#f0f6ff!important}#view-complex.rt55-mockup .rt54-icon{width:30px!important;height:30px!important;border-radius:8px!important;border:1px solid #b9cff0!important;background:#fff!important}#view-complex.rt55-mockup .rt54-side-title{font-weight:800!important;color:#0f172a!important}#view-complex.rt55-mockup .rt54-side-sub{font-size:12px!important;color:#5b6475!important}#view-complex.rt55-mockup .rt54-info-list li{font-size:13px!important;line-height:1.38!important;margin-bottom:8px!important}#view-complex.rt55-mockup .rt54-field-source{display:inline!important;margin-left:8px!important;font-size:11px!important}#view-complex.rt55-mockup .rt54-src{display:block!important;font-size:11px!important;margin-top:2px!important;text-align:left!important}#view-complex.rt55-mockup table .btn{padding:7px 11px!important;font-size:12px!important;border-radius:7px!important}#view-complex.rt55-mockup .rt54-hidden{display:none!important}#view-complex.rt55-mockup .note-box{background:#f8fbff!important;border:1px solid #dbeafe!important;color:#334155!important;border-radius:10px!important}#view-complex.rt55-mockup .card[data-rt55-setup="true"],#view-complex.rt55-mockup .card[data-rt55-rollup="true"]{display:none!important}@media(max-width:1180px){#view-complex.rt55-mockup #rt54Layout{grid-template-columns:1fr!important}#view-complex.rt55-mockup #rt54Sidebar{position:static!important}.sidebar{width:190px!important}}`;
    document.head.appendChild(st);
  }
  function forceVersion(){ try{window.RISKTOOL_RUNTIME_VERSION=PHASE}catch(e){} qsa('#appVersion,.app-version,[data-version-label]').forEach(el=>el.textContent=PHASE); qsa('.sidebar-note h4').forEach(el=>el.textContent='Phase '+PHASE); const title=qs('title'); if(title) title.textContent='RiskTool '+PHASE; }
  function markComplexCards(){ qsa('#view-complex .card').forEach(card=>{ const h=(card.querySelector('.card-header h3')?.textContent||'').trim(); if(h==='Area / Product Family Setup') card.dataset.rt55Setup='true'; if(h==='Area Rollup Summary') card.dataset.rt55Rollup='true'; }); }
  function moveWorkspaceToTop(){ const header=qs('#view-complex>.section-header'), topbar=qs('#rt54Topbar'), layout=qs('#rt54Layout'); if(topbar&&header&&topbar.previousElementSibling!==header) header.after(topbar); if(layout&&topbar&&layout.previousElementSibling!==topbar) topbar.after(layout); }
  function strengthenSummary(){ const s=qs('#rt54Summary'); if(!s)return; const items=(typeof currentComplexItems!=='undefined'?currentComplexItems:window.currentComplexItems||[])||[]; const costs=(typeof complexCostLosses!=='undefined'?complexCostLosses:window.complexCostLosses||[])||[]; const total=costs.reduce((t,x)=>t+num(x.amountLikely||x.amount||x.costLikely||0),0); const rows=items.map(x=>({name:x.name||'Risk Item',el:(num(x.probLikely)/100)*num(x.impactLikely)})).sort((a,b)=>b.el-a.el); const avg=rows.length?rows.reduce((t,x)=>t+x.el,0)/rows.length:0; const product=qs('#complexSectionProduct')?.selectedOptions?.[0]?.textContent||qs('#complexPrimaryProduct')?.selectedOptions?.[0]?.textContent||'Not selected'; const regulation=qs('#complexPrimaryRegulation')?.selectedOptions?.[0]?.textContent||qs('#riskItemReg')?.selectedOptions?.[0]?.textContent||'Not selected'; const status=qs('#complexScenarioStatus')?.value||'Draft'; s.innerHTML=`<h3>Component Summary <button class="rt54-link" data-column-source="rollup:component-summary" type="button">(rollup)</button></h3><div class="rt54-grid"><div><div class="rt54-label">Component ID</div><div class="rt54-value">${esc(qs('#complexComponentId')?.value||'CMP-000001')}</div></div><div><div class="rt54-label">Product / Service / Area</div><div class="rt54-value">${esc(product)}</div></div><div><div class="rt54-label">Regulation</div><div class="rt54-value">${esc(regulation)}</div></div><div><div class="rt54-label">Status</div><div class="rt54-value">${esc(status)}</div></div><div><div class="rt54-label">Risk Items</div><div class="rt54-value">${items.length}</div></div><div><div class="rt54-label">Total Cost / Loss Exposure</div><div class="rt54-value">${money(total)}</div></div><div><div class="rt54-label">Avg Residual Risk (EL)</div><div class="rt54-value">${money(avg)}<br><small>${esc(rows[0]?.name||'No risk items yet')}</small></div></div></div>`; }
  function renameComplexNav(){ qsa('.nav-item').forEach(b=>{ if(b.dataset.view==='complex')b.textContent='Complex Scenario Builder'; if(b.dataset.view==='single')b.textContent='Single Scenario Builder'; if(b.dataset.view==='saved')b.textContent='Saved Scenarios'; if(b.dataset.view==='reports')b.textContent='Portfolio Report'; }); }
  function init55(){ injectStyle(); forceVersion(); renameComplexNav(); const view=qs('#view-complex'); if(view){view.classList.add('rt55-mockup'); markComplexCards(); moveWorkspaceToTop(); strengthenSummary();} }
  document.addEventListener('click',()=>setTimeout(init55,80),true); document.addEventListener('input',e=>{if(e.target.closest?.('#view-complex'))setTimeout(init55,80)},true); document.addEventListener('change',e=>{if(e.target.closest?.('#view-complex'))setTimeout(init55,80)},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(init55,100);setTimeout(init55,800);setTimeout(init55,1600)}); else {setTimeout(init55,100);setTimeout(init55,800);setTimeout(init55,1600)}
})();
/* ===== END PHASE 23.0.61 COMPLEX WORKSPACE VISUAL MATCH PATCH ===== */

/* ===== PHASE 23.0.61 COMPLEX WORKSPACE LAYOUT CORRECTION ===== */
(function(){
  const PHASE = "23.0.61";
  try { window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num=v=>{ const n=Number(String(v??'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:0; };
  const money=v=>{ try{return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(num(v));}catch(e){return '$'+Math.round(num(v)).toLocaleString();} };
  const tabs=[['component','1. Component Entry','Define and update this component','▦'],['risk','2. Risk Items','Manage risks for this component','△'],['cost','3. Costs / Losses','Manage cost and loss entries','$'],['evidence','4. Hard Facts / Evidence','Manage evidence and data sources','▤'],['mitigation','5. Mitigation / Controls','Manage mitigations and controls','✓'],['insurance','6. Insurance / Risk Transfer','Manage insurance and risk transfer','☂'],['accepted','7. Accepted Risk','Manage accepted risk decisions','○']];
  const cards={component:['Selected Component Workspace'],risk:['Risk Item Entry for Selected Component','Risk Item Table'],cost:['Cost / Loss Entry','Cost / Loss Table'],evidence:['Hard Facts / Evidence Entry','Hard Facts / Evidence Table'],mitigation:['Mitigation Entry','Mitigation Table'],insurance:['Insurance Entry','Insurance Table'],accepted:['Accepted Risk','Accepted Risk Table']};
  function findCard(title){ return qsa('#view-complex .card').find(c=>(c.querySelector('.card-header h3')?.textContent||'').trim()===title); }
  function inject56Style(){ if(qs('#rt56Styles')) return; const st=document.createElement('style'); st.id='rt56Styles'; st.textContent=`body{grid-template-columns:210px 1fr!important;background:#f4f7fb!important}.sidebar{width:auto!important;min-width:0!important;padding:24px 14px!important;gap:22px!important;background:linear-gradient(180deg,#062b63,#07275a)!important}.brand{align-items:flex-start!important;gap:10px!important;padding:0 4px 18px!important}.brand-mark{display:inline-flex!important;width:42px!important;height:42px!important;border-radius:12px!important;background:#ff8a2a!important;color:#fff!important;align-items:center!important;justify-content:center!important;font-weight:800!important;flex:none!important}.brand-name{font-size:22px!important;line-height:.95!important;color:#fff!important;font-weight:800!important;display:block!important}.brand-name::after{content:''!important}.brand-sub{display:block!important;color:#d9e6fb!important;font-size:12px!important;line-height:1.1!important}.nav{gap:8px!important;padding:0!important}.nav-item{display:flex!important;align-items:center!important;gap:12px!important;padding:11px 12px!important;border-radius:8px!important;color:#fff!important;background:transparent!important;font-weight:800!important;line-height:1.1!important;white-space:normal!important}.nav-item::before{display:inline-flex!important;width:20px!important;min-width:20px!important;height:20px!important;align-items:center!important;justify-content:center!important;font-size:16px!important;opacity:.95}.nav-item[data-view="dashboard"]::before{content:'⌂'}.nav-item[data-view="single"]::before{content:'▣'}.nav-item[data-view="complex"]::before{content:'⌘'}.nav-item[data-view="beta"]::before{content:'β'}.nav-item[data-view="categories"]::before{content:'⚙'}.nav-item[data-view="users"]::before{content:'♙'}.nav-item[data-view="saved"]::before{content:'▤'}.nav-item[data-view="portfolio-report"]::before{content:'☂'}.nav-item[data-view="reports"]::before{content:'☂'}.nav-item[data-view="information"]::before{content:'ⓘ'}.nav-item.active,.nav-item[data-view="complex"].active{background:#1177f2!important;color:#fff!important}.main{padding:20px 22px!important;margin:0!important;min-width:0!important}#view-complex.rt55-mockup #rt54Layout{grid-template-columns:minmax(0,1fr) 300px!important;gap:14px!important;margin-top:0!important}#view-complex.rt55-mockup #rt54Tabs{display:flex!important;gap:26px!important;border-bottom:1px solid #dbe4f0!important;margin:0 0 12px!important;padding:0 8px!important;overflow-x:auto!important;background:transparent!important;align-items:flex-end!important}#view-complex.rt55-mockup .rt54-tab{border:0!important;background:transparent!important;padding:12px 0 10px!important;color:#25324b!important;font-weight:800!important;border-bottom:3px solid transparent!important;white-space:nowrap!important}#view-complex.rt55-mockup .rt54-tab.active{color:#0b5bd3!important;border-bottom-color:#0b5bd3!important}#view-complex.rt55-mockup .rt54-side-row{display:flex!important;align-items:center!important;gap:10px!important}#view-complex.rt55-mockup .rt54-icon{font-size:16px!important;color:#0b5bd3!important}#view-complex.rt55-mockup .card[data-rt55-setup="true"],#view-complex.rt55-mockup .card[data-rt55-rollup="true"]{display:none!important}#appVersion{font-size:12px!important;color:#d9e6fb!important}@media(max-width:1180px){body{grid-template-columns:190px 1fr!important}#view-complex.rt55-mockup #rt54Layout{grid-template-columns:1fr!important}}`; document.head.appendChild(st); }
  function forceVersion(){ qsa('#appVersion,.app-version,[data-version-label]').forEach(el=>el.textContent=PHASE); qsa('.sidebar-note h4').forEach(el=>el.textContent='Phase '+PHASE); if(document.title) document.title='RiskTool '+PHASE; }
  function markOldSections(){ qsa('#view-complex .card').forEach(card=>{ const h=(card.querySelector('.card-header h3')?.textContent||'').trim(); if(h==='Area / Product Family Setup') card.dataset.rt55Setup='true'; if(h==='Area Rollup Summary') card.dataset.rt55Rollup='true'; }); }
  function rebuildTabs(){ const view=qs('#view-complex'); if(!view) return; let t=qs('#rt54Tabs'); if(!t){ t=document.createElement('div'); t.id='rt54Tabs'; t.className='rt54-tabs'; } t.innerHTML=tabs.map(([k,l])=>`<button class="rt54-tab" data-rt56-tab="${k}" data-rt54-tab="${k}" type="button">${l}</button>`).join(''); const componentCard=findCard('Selected Component Workspace'); const summary=qs('#rt54Summary'); if(componentCard){ componentCard.parentNode.insertBefore(t, componentCard); } else if(summary){ summary.after(t); } t.onclick=function(e){ const b=e.target.closest('[data-rt56-tab]'); if(b){ e.preventDefault(); activate56(b.dataset.rt56Tab); } }; }
  function rebuildSidebar(){ const side=qs('#rt54Sidebar .rt54-card'); if(!side) return; side.innerHTML=`<h3>Component Workspace Tables <button class="rt54-link" data-column-source="workspace:choose" type="button">(choose table)</button></h3>` + tabs.map(([k,t,sub,ic])=>`<button class="rt54-side-row" data-rt56-tab="${k}" data-rt54-tab="${k}" type="button"><span class="rt54-icon">${ic}</span><span><div class="rt54-side-title">${t}</div><div class="rt54-side-sub">${sub}</div></span></button>`).join(''); side.onclick=function(e){ const b=e.target.closest('[data-rt56-tab]'); if(b){ e.preventDefault(); activate56(b.dataset.rt56Tab); } }; }
  function activate56(which){ const key=which||window.rt56ActiveTab||'component'; window.rt56ActiveTab=key; Object.entries(cards).forEach(([k,names])=>names.forEach(name=>{ const c=findCard(name); if(c) c.classList.toggle('rt54-hidden', k!==key); })); qsa('[data-rt56-tab]').forEach(b=>b.classList.toggle('active', b.dataset.rt56Tab===key)); }
  function strengthenSummary56(){ const s=qs('#rt54Summary'); if(!s)return; const items=(typeof currentComplexItems!=='undefined'?currentComplexItems:window.currentComplexItems||[])||[]; const costs=(typeof complexCostLosses!=='undefined'?complexCostLosses:window.complexCostLosses||[])||[]; const total=costs.reduce((t,x)=>t+num(x.amountLikely||x.amount||x.costLikely||0),0); const rows=items.map(x=>({name:x.name||'Risk Item',el:(num(x.probLikely)/100)*num(x.impactLikely)})).sort((a,b)=>b.el-a.el); const avg=rows.length?rows.reduce((t,x)=>t+x.el,0)/rows.length:0; const product=qs('#complexSectionProduct')?.selectedOptions?.[0]?.textContent||qs('#complexPrimaryProduct')?.selectedOptions?.[0]?.textContent||qs('#riskItemProduct')?.selectedOptions?.[0]?.textContent||'Not selected'; const regulation=qs('#complexPrimaryRegulation')?.selectedOptions?.[0]?.textContent||qs('#riskItemReg')?.selectedOptions?.[0]?.textContent||'Not selected'; const status=qs('#complexScenarioStatus')?.value||'Draft'; s.innerHTML=`<h3>Component Summary <button class="rt54-link" data-column-source="rollup:component-summary" type="button">(rollup)</button></h3><div class="rt54-grid"><div><div class="rt54-label">Component ID</div><div class="rt54-value">${esc(qs('#complexComponentId')?.value||'CMP-000001')}</div></div><div><div class="rt54-label">Product / Service / Area</div><div class="rt54-value">${esc(product)}</div></div><div><div class="rt54-label">Regulation</div><div class="rt54-value">${esc(regulation)}</div></div><div><div class="rt54-label">Status</div><div class="rt54-value">${esc(status)}</div></div><div><div class="rt54-label">Risk Items</div><div class="rt54-value">${items.length}</div></div><div><div class="rt54-label">Total Cost / Loss Exposure</div><div class="rt54-value">${money(total)}</div></div><div><div class="rt54-label">Avg Residual Risk (EL)</div><div class="rt54-value">${money(avg)}<br><small>${esc(rows[0]?.name||'No risk items yet')}</small></div></div></div>`; }
  function init56(){ inject56Style(); forceVersion(); const view=qs('#view-complex'); if(!view) return; view.classList.add('rt55-mockup','rt56-corrected'); markOldSections(); strengthenSummary56(); rebuildTabs(); rebuildSidebar(); activate56(window.rt56ActiveTab||'component'); }
  document.addEventListener('click',()=>setTimeout(init56,60),true); document.addEventListener('input',e=>{if(e.target.closest?.('#view-complex'))setTimeout(init56,60)},true); document.addEventListener('change',e=>{if(e.target.closest?.('#view-complex'))setTimeout(init56,60)},true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{setTimeout(init56,150);setTimeout(init56,700);setTimeout(init56,1500);}); else {setTimeout(init56,150);setTimeout(init56,700);setTimeout(init56,1500);}
})();
/* ===== END PHASE 23.0.61 COMPLEX WORKSPACE LAYOUT CORRECTION ===== */

/* ===== PHASE 23.0.61 NEW COMPONENT CREATE + SIDEBAR CLEANUP ===== */
(function(){
  const PHASE = "23.0.61";
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  function setVersion(){try{window.RISKTOOL_RUNTIME_VERSION=PHASE;}catch(e){} qsa('#appVersion,.app-version,[data-version-label]').forEach(el=>el.textContent=PHASE); qsa('.sidebar-note h4').forEach(el=>el.textContent='Phase '+PHASE); if(document.title)document.title='RiskTool '+PHASE;}
  function addStyles(){if(qs('#rt57Styles'))return; const st=document.createElement('style'); st.id='rt57Styles'; st.textContent=`#view-complex .rt57-create-row{display:flex;align-items:center;gap:12px;margin:8px 0 10px;padding:0}#view-complex .rt57-new-component{display:inline-flex;align-items:center;gap:8px;background:#0b5bd3!important;color:#fff!important;border:1px solid #0b5bd3!important;border-radius:9px!important;font-weight:800!important;padding:10px 14px!important;box-shadow:none!important;cursor:pointer}#view-complex .rt57-new-component svg{width:16px;height:16px;stroke:currentColor;stroke-width:2.5;fill:none}#view-complex .rt57-mode-pill{font-size:12px;font-weight:800;color:#334155;background:#f8fbff;border:1px solid #dbeafe;border-radius:999px;padding:7px 10px}#view-complex #currentComplexEditingIndicator.rt57-create-mode{border-color:#bfdbfe!important;background:#eff6ff!important;color:#0f3f86!important;font-weight:700!important}#view-complex #currentComplexEditingIndicator.rt57-edit-mode{border-color:#dbe4f0!important;background:#f8fafc!important;color:#172033!important;font-weight:700!important}.nav-item svg.rt57-nav-icon{width:18px;height:18px;min-width:18px;stroke:currentColor;stroke-width:2;fill:none;display:inline-block}.nav-item .rt57-nav-label{display:inline-block;line-height:1.05}.nav-item::before{content:none!important;display:none!important}body{grid-template-columns:210px 1fr!important}.main{margin-left:0!important;padding-left:20px!important}`; document.head.appendChild(st);}
  function ensureNewComponentButton(){const view=qs('#view-complex'); if(!view||qs('#rt57NewComponentBtn'))return; const summary=qs('#rt54Summary')||qsa('#view-complex .card').find(c=>(c.textContent||'').includes('Component Summary')); const header=qs('#view-complex .section-header'); const row=document.createElement('div'); row.className='rt57-create-row'; row.innerHTML=`<button id="rt57NewComponentBtn" class="rt57-new-component" type="button" title="Create a new component under the selected Area / Product Family"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>New Component</span></button><span id="rt57ComponentModePill" class="rt57-mode-pill">Create or edit components here</span>`; if(summary&&summary.parentNode)summary.parentNode.insertBefore(row,summary); else if(header&&header.parentNode)header.after(row); qs('#rt57NewComponentBtn')?.addEventListener('click',startNewComponent);}
  function clearVal(id,value=''){const el=qs('#'+id); if(!el)return; if(el.tagName==='SELECT'){if(value)el.value=value; else el.selectedIndex=el.options.length?0:-1;}else el.value=value; try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}
  function genId(){try{if(typeof generateComponentId==='function')return generateComponentId();}catch(e){} return 'CMP-'+String(Date.now()).slice(-6);}
  function startNewComponent(){const newId=genId(); try{activeComplexComponentId=newId;}catch(e){window.activeComplexComponentId=newId;} clearVal('complexScenarioName'); clearVal('complexComponentId',newId); clearVal('complexScenarioOwner'); clearVal('complexScenarioDescription'); clearVal('complexIdentifiedDate',new Date().toISOString().slice(0,10)); clearVal('complexControlEffectiveness','0'); ['complexProductGroup','complexRiskDomain','complexScenarioStatus','complexScenarioSource','complexPrimaryProduct','complexPrimaryRegulation'].forEach(id=>{const el=qs('#'+id); if(el&&el.options&&el.options.length){el.selectedIndex=0; try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}}); clearVal('complexRandomScenarioCount','1000'); try{currentComplexItems=[];}catch(e){window.currentComplexItems=[];} try{complexCostLosses=[];}catch(e){window.complexCostLosses=[];} try{complexHardFacts=[];}catch(e){window.complexHardFacts=[];} try{complexMitigations=[];}catch(e){window.complexMitigations=[];} try{complexInsurance=[];}catch(e){window.complexInsurance=[];} try{window.complexAcceptedRisks=[];}catch(e){} try{renderComplexItems();}catch(e){} try{renderCostLossTable('complexCostLossBody',complexCostLosses);}catch(e){} try{renderHardFactsTable('complexHardFactsBody',complexHardFacts);}catch(e){} try{renderMitigationTable('complexMitigationBody',complexMitigations);}catch(e){} try{renderInsuranceTable('complexInsuranceBody',complexInsurance);}catch(e){} try{renderAcceptedRiskTable('complexAcceptedRiskBody',window.complexAcceptedRisks||[],'complex');}catch(e){} try{qs('[data-rt56-tab="component"],[data-rt54-tab="component"]')?.click();}catch(e){} updateModeLabels(true); try{qs('#currentComplexEditingIndicator')?.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){} try{if(typeof strengthenSummary56==='function')strengthenSummary56();}catch(e){}}
  function updateModeLabels(forceCreate=false){const ind=qs('#currentComplexEditingIndicator'); const cid=qs('#complexComponentId')?.value||''; const name=qs('#complexScenarioName')?.value||''; let saved=false; try{saved=Array.isArray(complexScenarioComponents)&&complexScenarioComponents.some(c=>String(c.componentId||'')===String(cid));}catch(e){} const create=forceCreate||!saved; if(ind){ind.classList.toggle('rt57-create-mode',create); ind.classList.toggle('rt57-edit-mode',!create); ind.textContent=create?`Creating New Component${cid?': '+cid:''}`:`Currently Editing Component: ${name||'Saved Component'}${cid?' ('+cid+')':''}`;} const pill=qs('#rt57ComponentModePill'); if(pill)pill.textContent=create?'Create Mode: enter component details, then Add Component':'Edit Mode: changes update the selected component'; const save=qs('#addComplexScenarioBtn'); if(save)save.textContent=create?'Add Component':'Update Component';}
  const iconMap={dashboard:'<path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',single:'<path d="M6 3h9l5 5v13H6z"></path><path d="M15 3v6h6"></path><path d="M9 14h7"></path><path d="M9 18h5"></path>',complex:'<path d="M7 7h4v4H7z"></path><path d="M13 13h4v4h-4z"></path><path d="M13 3h4v4h-4z"></path><path d="M9 11v2h4"></path><path d="M15 7v6"></path>',beta:'<path d="M8 4h5a4 4 0 010 8H8"></path><path d="M8 12h6a4 4 0 010 8H8"></path><path d="M8 4v16"></path>',categories:'<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V20h-3v-.2a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H5v-3h.2a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 001-1.6V4h3v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.2v3h-.2a1.7 1.7 0 00-1.6 1z"></path>',users:'<path d="M16 21v-2a4 4 0 00-8 0v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 00-3-3.87"></path><path d="M16 3.13a4 4 0 010 7.75"></path>',saved:'<path d="M5 3h14v18H5z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path>',reports:'<path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-5"></path><path d="M12 16V8"></path><path d="M16 16v-9"></path>','portfolio-report':'<path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-5"></path><path d="M12 16V8"></path><path d="M16 16v-9"></path>',information:'<circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><path d="M12 7h.01"></path>'};
  function rebuildNavIconsAndDuplicates(){const seen={count:0}; qsa('.nav-item').forEach(btn=>{const txt=(btn.textContent||'').trim(); const view=btn.dataset.view||''; if((view==='reports'||view==='portfolio-report'||txt==='Portfolio Report')&&++seen.count>1){btn.remove();return;} if(btn.querySelector('.rt57-nav-icon'))return; const label=txt||btn.getAttribute('aria-label')||view||'Menu'; const paths=iconMap[view]||iconMap.information; btn.innerHTML=`<svg class="rt57-nav-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg><span class="rt57-nav-label">${label}</span>`;});}
  function boot(){setVersion(); addStyles(); ensureNewComponentButton(); rebuildNavIconsAndDuplicates(); updateModeLabels(false);} document.addEventListener('DOMContentLoaded',()=>{setTimeout(boot,250);setTimeout(boot,900);}); document.addEventListener('click',e=>{setTimeout(()=>{ensureNewComponentButton(); rebuildNavIconsAndDuplicates(); updateModeLabels(false);},150);},true); document.addEventListener('input',e=>{if(e.target&&e.target.closest('#view-complex'))setTimeout(()=>updateModeLabels(false),60);}); window.RiskTool57NewComponent=startNewComponent; setTimeout(boot,1200);
})();
/* ===== END PHASE 23.0.61 NEW COMPONENT CREATE + SIDEBAR CLEANUP ===== */

/* ===== PHASE 23.0.61 COMPONENT BUTTON PLACEMENT + SINGLE/BETA VISUAL ALIGNMENT ===== */
(function(){
  const PHASE = "23.0.61";
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function setVersion58(){
    try { window.RISKTOOL_RUNTIME_VERSION = PHASE; } catch(e) {}
    qsa('#appVersion,.app-version,[data-version-label]').forEach(el => el.textContent = PHASE);
    if (document.title) document.title = 'RiskTool ' + PHASE;
  }

  function inject58Styles(){
    if (qs('#rt58Styles')) return;
    const st = document.createElement('style');
    st.id = 'rt58Styles';
    st.textContent = `
      #view-complex .rt57-create-row{margin:8px 0 12px!important;}
      #view-complex > .section-header + .rt57-create-row{margin-top:8px!important;}
      #view-complex .rt57-create-row.rt58-top-create{display:flex!important;align-items:center!important;gap:12px!important;}
      #view-complex .rt57-new-component{background:#0b5bd3!important;color:#fff!important;border-color:#0b5bd3!important;}
      #view-single.rt58-workspace,#view-beta.rt58-workspace{max-width:none!important;}
      #view-single.rt58-workspace > .section-header,#view-beta.rt58-workspace > .section-header{margin-bottom:12px!important;display:grid!important;grid-template-columns:1fr auto!important;gap:8px 16px!important;align-items:start!important;}
      #view-single.rt58-workspace > .section-header h2,#view-beta.rt58-workspace > .section-header h2{font-size:26px!important;line-height:1.1!important;font-weight:800!important;color:#0f172a!important;margin:0!important;}
      #view-single.rt58-workspace > .section-header h2::after{content:' > Scenario Workspace';font-weight:800;color:#0f172a;}
      #view-beta.rt58-workspace > .section-header h2::after{content:' > Planning Workspace';font-weight:800;color:#0f172a;}
      #view-single.rt58-workspace > .section-header p,#view-beta.rt58-workspace > .section-header p{grid-column:1/-1!important;margin:0!important;color:#64748b!important;max-width:1120px!important;}
      .rt58-summary{background:#fff!important;border:1px solid #dbe4f0!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important;margin:0 0 12px!important;padding:14px 18px!important;}
      .rt58-summary h3{font-size:16px!important;margin:0 0 12px!important;color:#0f172a!important;}
      .rt58-summary-grid{display:grid!important;grid-template-columns:repeat(6,minmax(120px,1fr))!important;gap:14px!important;}
      .rt58-label{font-size:12px!important;color:#0b3b80!important;font-weight:800!important;}
      .rt58-value{font-size:14px!important;color:#0f172a!important;}
      .rt58-tabs{display:flex!important;gap:26px!important;border-bottom:1px solid #dbe4f0!important;margin:0 0 12px!important;padding:0 8px!important;overflow-x:auto!important;background:transparent!important;}
      .rt58-tab{border:0!important;background:transparent!important;padding:12px 0 10px!important;color:#25324b!important;font-weight:800!important;border-bottom:3px solid transparent!important;white-space:nowrap!important;}
      .rt58-tab.active{color:#0b5bd3!important;border-bottom-color:#0b5bd3!important;}
      .rt58-src{color:#0b5bd3!important;text-decoration:underline!important;text-underline-offset:2px!important;background:transparent!important;border:0!important;cursor:pointer!important;font-weight:700!important;}
      #view-single.rt58-workspace .card,#view-beta.rt58-workspace .card{background:#fff!important;border:1px solid #dbe4f0!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important;margin-bottom:12px!important;}
      #view-single.rt58-workspace .builder-actions,#view-beta.rt58-workspace .builder-actions{display:flex!important;justify-content:flex-end!important;gap:10px!important;padding:14px 18px 0!important;}
      @media(max-width:1180px){.rt58-summary-grid{grid-template-columns:repeat(2,minmax(120px,1fr))!important;}}
    `;
    document.head.appendChild(st);
  }

  function makeNewComponentRow(){
    const row = document.createElement('div');
    row.className = 'rt57-create-row rt58-top-create';
    row.innerHTML = `<button id="rt57NewComponentBtn" class="rt57-new-component" type="button" title="Create a new component under the selected Area / Product Family"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>New Component</span></button><span id="rt57ComponentModePill" class="rt57-mode-pill">Create or edit components here</span>`;
    return row;
  }

  function moveNewComponentButtonToHeader(){
    const view = qs('#view-complex');
    const header = qs('#view-complex > .section-header');
    if (!view || !header) return;
    let row = qs('#view-complex .rt57-create-row');
    if (!row) row = makeNewComponentRow();
    row.classList.add('rt58-top-create');
    if (header.nextElementSibling !== row) header.parentNode.insertBefore(row, header.nextElementSibling);
    const btn = qs('#rt57NewComponentBtn');
    if (btn && !btn.dataset.rt58Bound) {
      btn.dataset.rt58Bound = '1';
      btn.addEventListener('click', () => {
        if (typeof window.RiskTool57NewComponent === 'function') window.RiskTool57NewComponent();
      });
    }
  }

  function updateSummary(viewId, type){
    const view = qs('#' + viewId);
    if (!view) return;
    view.classList.add('rt58-workspace');
    const header = qs('.section-header', view);
    if (!header) return;
    let summary = qs('.rt58-summary', view);
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'rt58-summary';
      header.parentNode.insertBefore(summary, header.nextElementSibling);
    }
    const prefix = type === 'single' ? 'single' : 'beta';
    const name = qs('#' + prefix + 'ScenarioName')?.value || (type === 'single' ? 'New Single Scenario' : 'New Beta Scenario');
    const id = qs('#' + prefix + 'ScenarioId')?.value || 'Generated on save';
    const product = qs('#' + prefix + 'PrimaryProduct')?.selectedOptions?.[0]?.textContent || qs('#betaProjectOrProductName')?.value || 'Not selected';
    const regulation = qs('#' + prefix + 'PrimaryRegulation')?.selectedOptions?.[0]?.textContent || 'Not selected';
    const status = qs('#' + prefix + 'ScenarioStatus')?.value || 'Draft';
    const owner = qs('#' + prefix + 'ScenarioOwner')?.value || 'Not assigned';
    summary.innerHTML = `<h3>${type === 'single' ? 'Single Scenario Summary' : 'Beta Scenario Summary'} <button class="rt58-src" type="button" data-rt58-source="summary">(rollup)</button></h3><div class="rt58-summary-grid"><div><div class="rt58-label">Scenario ID</div><div class="rt58-value">${esc(id)}</div></div><div><div class="rt58-label">Scenario / Component</div><div class="rt58-value">${esc(name)}</div></div><div><div class="rt58-label">Product / Service</div><div class="rt58-value">${esc(product)}</div></div><div><div class="rt58-label">Regulation</div><div class="rt58-value">${esc(regulation)}</div></div><div><div class="rt58-label">Status</div><div class="rt58-value">${esc(status)}</div></div><div><div class="rt58-label">Owner</div><div class="rt58-value">${esc(owner)}</div></div></div>`;
    ensureTabs(view, type, summary);
  }

  function ensureTabs(view, type, afterEl){
    let tabs = qs('.rt58-tabs', view);
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.className = 'rt58-tabs';
      afterEl.parentNode.insertBefore(tabs, afterEl.nextElementSibling);
    }
    const labels = type === 'single'
      ? ['1. Scenario Entry','2. Evidence / Hard Facts','3. Costs / Losses','4. Mitigation / Controls','5. Insurance / Risk Transfer','6. Report']
      : ['1. Scenario Entry','2. Assumptions','3. Costs / Losses','4. Evidence / Basis','5. Outcomes','6. Promote / Save'];
    tabs.innerHTML = labels.map((label, i) => `<button class="rt58-tab ${i===0?'active':''}" type="button">${esc(label)}</button>`).join('');
  }

  function bindSourceLinks(){
    qsa('[data-rt58-source]').forEach(btn => {
      if (btn.dataset.rt58Bound) return;
      btn.dataset.rt58Bound = '1';
      btn.addEventListener('click', () => alert('This summary is populated from the scenario entry fields and calculated outputs on this screen. It is a reference panel so the single and beta screens visually match the complex workspace.'));
    });
  }

  function boot58(){
    setVersion58();
    inject58Styles();
    moveNewComponentButtonToHeader();
    updateSummary('view-single', 'single');
    updateSummary('view-beta', 'beta');
    bindSourceLinks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { setTimeout(boot58, 150); setTimeout(boot58, 800); });
  else { setTimeout(boot58, 150); setTimeout(boot58, 800); }
  document.addEventListener('click', () => setTimeout(boot58, 80), true);
  document.addEventListener('input', e => { if (e.target?.closest?.('#view-single,#view-beta,#view-complex')) setTimeout(boot58, 60); }, true);
  document.addEventListener('change', e => { if (e.target?.closest?.('#view-single,#view-beta,#view-complex')) setTimeout(boot58, 60); }, true);
})();
/* ===== END PHASE 23.0.61 COMPONENT BUTTON PLACEMENT + SINGLE/BETA VISUAL ALIGNMENT ===== */

/* ===== PHASE 23.0.61 SINGLE/BETA FACT-BASED WORKSPACE ALIGNMENT ===== */
(function(){
  function el(id){ return document.getElementById(id); }
  function num(id){ const x=el(id); if(!x) return 0; const raw=x.value || 0; return typeof parseCurrencyValue === 'function' ? parseCurrencyValue(raw) : Number(raw); }
  function set(id,val){ const x=el(id); if(x) x.value = val; }
  function text(id,val){ const x=el(id); if(x) x.textContent = val; }
  function fmt(n){ return typeof currency === 'function' ? currency(Math.round(Number(n)||0)) : ('$' + Math.round(Number(n)||0)); }
  function deriveSingleLegacyFacts(){
    const pLikely = Math.max(0, Math.min(100, Number((el('singleProbabilityLikely')||{}).value || 0)));
    const iLikely = num('singleImpactLikely') || num('singleHardCostLikely');
    set('singleLikelihood', Math.max(1, Math.min(10, Math.round(pLikely / 10) || 1)));
    const impactScale = iLikely >= 1000000 ? 10 : iLikely >= 750000 ? 9 : iLikely >= 500000 ? 8 : iLikely >= 250000 ? 7 : iLikely >= 150000 ? 6 : iLikely >= 75000 ? 5 : iLikely >= 25000 ? 4 : iLikely >= 10000 ? 3 : iLikely > 0 ? 2 : 1;
    set('singleImpact', impactScale);
    const expectedLoss = Math.round((pLikely/100) * iLikely);
    set('singleInherentRiskScore', Math.max(0, Math.min(100, Math.round((pLikely/100) * impactScale * 10))));
    text('singleSummaryId', (el('singleScenarioId')||{}).value || 'Generated on save');
    text('singleSummaryProduct', (el('singlePrimaryProduct')||{}).value || 'Not selected');
    text('singleSummaryRegulation', (el('singlePrimaryRegulation')||{}).value || 'Not selected');
    text('singleSummaryLifecycle', (el('singleScenarioStatus')||{}).value || 'Open');
    text('singleSummaryExpectedLoss', fmt(expectedLoss));
    text('singleSummaryEvidenceCount', String((window.singleHardFacts || []).length));
  }
  function updateBetaSummary(){
    text('betaSummaryId', (el('betaScenarioId')||{}).value || 'Generated on save');
    text('betaSummaryProduct', (el('betaProjectOrProductName')||{}).value || 'Not entered');
    text('betaSummaryLifecycle', (el('betaScenarioStatus')||{}).value || 'Draft');
    text('betaSummaryExpectedValue', fmt(num('betaExpectedValue')));
    text('betaSummaryP50', fmt(num('betaP50')));
    text('betaSummaryP90', fmt(num('betaP90')));
  }
  const previousUpdate = typeof window.updateInherentScores === 'function' ? window.updateInherentScores : (typeof updateInherentScores === 'function' ? updateInherentScores : null);
  window.updateInherentScores = function(){
    try { deriveSingleLegacyFacts(); } catch(e) {}
    try { if (previousUpdate) previousUpdate(); } catch(e) {}
    try { deriveSingleLegacyFacts(); updateBetaSummary(); } catch(e) {}
  };
  const previousGetSinglePayload = typeof window.getSinglePayload === 'function' ? window.getSinglePayload : (typeof getSinglePayload === 'function' ? getSinglePayload : null);
  window.getSinglePayload = function(){
    deriveSingleLegacyFacts();
    const payload = previousGetSinglePayload ? previousGetSinglePayload() : {};
    payload.probabilityMin = Number((el('singleProbabilityMin')||{}).value || 0);
    payload.probabilityLikely = Number((el('singleProbabilityLikely')||{}).value || 0);
    payload.probabilityMax = Number((el('singleProbabilityMax')||{}).value || 0);
    payload.impactMin = num('singleImpactMin');
    payload.impactLikely = num('singleImpactLikely');
    payload.impactMax = num('singleImpactMax');
    payload.evidenceQuality = (el('singleEvidenceQuality')||{}).value || 'Medium';
    payload.inherent = Number((el('singleInherentRiskScore')||{}).value || 0);
    return payload;
  };
  function wireFactInputs(){
    ['singleProbabilityMin','singleProbabilityLikely','singleProbabilityMax','singleImpactMin','singleImpactLikely','singleImpactMax','singleEvidenceQuality','singleScenarioId','singlePrimaryProduct','singlePrimaryRegulation','singleScenarioStatus','betaScenarioId','betaProjectOrProductName','betaScenarioStatus','betaExpectedValue','betaP50','betaP90'].forEach(id=>{
      const x=el(id); if(x && !x.dataset.rt59wired){ x.addEventListener('input', window.updateInherentScores); x.addEventListener('change', window.updateInherentScores); x.dataset.rt59wired='1'; }
    });
    document.querySelectorAll('.source-link').forEach(a=>{
      if(a.dataset.rt59wired) return;
      a.dataset.rt59wired='1';
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        const msg = {
          'single-probability':'Probability fields come from evidence-supported scenario assumptions. They replace the old 1-10 likelihood rating.',
          'single-impact':'Impact fields come from evidence-supported dollar ranges and hard-fact/cost-loss entries. They replace the old 1-10 impact rating.',
          'single-evidence-quality':'Evidence quality is a confidence indicator for the assumptions used in probability and impact ranges.',
          'single-rollup':'Single Scenario rollup is calculated from probability x impact, hard facts/evidence, mitigation, insurance, and accepted-risk data.',
          'beta-rollup':'Beta rollup is calculated from min/mode/max future-state ranges and simulation outputs.'
        }[this.dataset.source || ''] || 'This value is populated from the related entry form or linked table.';
        alert(msg);
      });
    });
  }
  document.addEventListener('DOMContentLoaded', function(){ wireFactInputs(); deriveSingleLegacyFacts(); updateBetaSummary(); });
  setTimeout(function(){ wireFactInputs(); deriveSingleLegacyFacts(); updateBetaSummary(); }, 500);
})();
/* ===== END PHASE 23.0.61 ===== */



/* === RT60 Dashboard + Single/Beta Workspace Alignment Patch === */
(function(){
  const RT60_VERSION='23.0.61';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function riskValue(s){return Number((s&& (s.residual||s.averageResidualRisk||s.avgResidualRisk||s.inherent))||0)}
  function saved(){try{return (typeof getSavedScenarios==='function'?getSavedScenarios():JSON.parse(localStorage.getItem('risktool.savedScenarios')||'[]'))||[]}catch(e){return[]}}
  function label(s){return s&&s.mode==='complex'?'Complex Scenario':s&&s.mode==='beta'?'Beta Scenario':'Single Scenario'}
  function view(s){return s&&s.mode==='complex'?'complex':s&&s.mode==='beta'?'beta':'single'}
  function act(v){try{if(typeof activateView==='function')return activateView(v)}catch(e){} qsa('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v)); qsa('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}
  function esc(v){return String(v||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
  function summary(s){if(!s)return 'No open scenarios are available yet. Save a single, beta, or complex scenario to generate dashboard insight.';return (s.name||'Unnamed scenario')+' is currently the highest-risk open scenario ('+label(s)+'). Current calculated risk indicator: '+riskValue(s)+'. Primary driver: '+(s.riskDomain||s.highestDriver||'not yet identified')+'. Product/service: '+(s.primaryProduct||s.productGroup||'not set')+'. Regulation: '+(s.primaryRegulation||'not set')+'. Use the scenario ID below to refresh this summary or use the action button to reopen the originating builder.'}
  function updateSummary(id){const rows=saved().filter(s=>String(s.scenarioStatus||'').toLowerCase()!=='closed'); const s=id?rows.find(x=>String(x.id||'')===String(id)):rows.sort((a,b)=>riskValue(b)-riskValue(a))[0]; const box=qs('#aiSummaryBox'); if(box)box.textContent=summary(s)}
  function openBuilder(id){const s=saved().find(x=>String(x.id||'')===String(id)); if(!s)return; try{if(typeof openScenario==='function')openScenario(id)}catch(e){} act(view(s)); updateSummary(id)}
  window.renderDashboardOpenTable=function(){const tbody=qs('#dashboardOpenScenarioBody'); if(!tbody)return; const rows=saved().filter(s=>String(s.scenarioStatus||'').toLowerCase()!=='closed'); const count=qs('#savedCount'); if(count)count.textContent=String(saved().length); if(!rows.length){tbody.innerHTML='<tr><td colspan="11">No open scenarios available.</td></tr>'; updateSummary(); return;} tbody.innerHTML=rows.map(function(s){return '<tr><td><button class="scenario-link rt60-summary-link" data-summary-id="'+esc(s.id)+'">'+esc(s.id)+'</button></td><td>'+label(s)+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.scenarioStatus)+'</td><td>'+riskValue(s)+'</td><td>'+esc(s.identifiedDate)+'</td><td>'+esc(s.productGroup)+'</td><td>'+esc(s.riskDomain||s.highestDriver)+'</td><td>'+esc(s.assignedOwnerName||s.owner)+'</td><td>'+esc(s.storageMode||'Local Browser Storage')+'</td><td><button class="btn btn-secondary small-btn rt60-open-builder" data-open-builder="'+esc(s.id)+'">Open Builder</button></td></tr>'}).join(''); qsa('[data-summary-id]',tbody).forEach(b=>b.addEventListener('click',()=>updateSummary(b.dataset.summaryId))); qsa('[data-open-builder]',tbody).forEach(b=>b.addEventListener('click',()=>openBuilder(b.dataset.openBuilder))); updateSummary()}
  function buildWorkspace(viewId,title){const viewEl=qs('#view-'+viewId); if(!viewEl||viewEl.dataset.rt60Workspace==='1')return; viewEl.dataset.rt60Workspace='1'; const h=qs('.section-header h2',viewEl); if(h)h.textContent=title+' > Scenario Workspace'; const first=qs('.card',viewEl); if(!first)return; const tabs=document.createElement('div'); tabs.className='rt60-tabs'; tabs.innerHTML=['1. Scenario Entry','2. Costs / Losses','3. Hard Facts / Evidence','4. Mitigation / Controls','5. Insurance / Risk Transfer','6. Accepted Risk'].map((t,i)=>'<button type="button" class="rt60-tab '+(i===0?'active':'')+'" data-rt60-tab="'+i+'">'+t+'</button>').join(''); first.parentNode.insertBefore(tabs,first); const panels=[first].concat(qsa('.card',viewEl).slice(1)); panels.forEach((p,i)=>{p.classList.add('rt60-panel'); if(i>0)p.classList.add('rt60-hidden')}); qsa('.rt60-tab',tabs).forEach(btn=>btn.addEventListener('click',()=>{qsa('.rt60-tab',tabs).forEach(x=>x.classList.toggle('active',x===btn)); panels.forEach((p,i)=>p.classList.toggle('rt60-hidden',String(i)!==btn.dataset.rt60Tab))}))}
  function styles(){if(qs('#rt60Styles'))return; const st=document.createElement('style'); st.id='rt60Styles'; st.textContent='#dashboardChartCard{display:none!important}.rt60-tabs{display:flex;gap:24px;border-bottom:1px solid #dbe4f0;margin:8px 0 12px;padding:0 6px;overflow-x:auto}.rt60-tab{border:0;background:transparent;padding:12px 0 10px;font-weight:800;color:#25324b;border-bottom:3px solid transparent;white-space:nowrap}.rt60-tab.active{color:#0b5bd3;border-bottom-color:#0b5bd3}.rt60-hidden{display:none!important}.rt60-summary-link{color:#0b5bd3;background:transparent;border:0;text-decoration:underline;font-weight:800;cursor:pointer}'; document.head.appendChild(st)}
  document.addEventListener('DOMContentLoaded',function(){styles();buildWorkspace('single','Single Scenario Builder');buildWorkspace('beta','Beta Scenario Builder');try{renderDashboardOpenTable()}catch(e){} const v=qs('#appVersion'); if(v)v.textContent=RT60_VERSION});
  setTimeout(function(){try{renderDashboardOpenTable()}catch(e){}},500);
})();

/* ===== PHASE 23.0.61 CATEGORY + TAB CLEANUP PATCH ===== */
(function(){
  const PHASE='23.0.61';
  const TAB_LABELS=['1. Scenario Entry','2. Costs / Losses','3. Hard Facts / Evidence','4. Mitigation / Controls','5. Insurance / Risk Transfer','6. Accepted Risk'];
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function txt(el){return (el&&el.textContent||'').replace(/\s+/g,' ').trim()}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function setVersion(){try{window.RISKTOOL_RUNTIME_VERSION=PHASE}catch(e){} qsa('#appVersion,.app-version,[data-version-label]').forEach(e=>e.textContent=PHASE)}
  function injectStyles(){
    if(qs('#rt61Styles')) return;
    const st=document.createElement('style'); st.id='rt61Styles';
    st.textContent=`#view-single .rt58-tabs,#view-beta .rt58-tabs{display:none!important}.rt61-tabs{display:flex!important;gap:24px!important;border-bottom:1px solid #dbe4f0!important;margin:8px 0 12px!important;padding:0 6px!important;overflow-x:auto!important;background:transparent!important}.rt61-tab{border:0!important;background:transparent!important;padding:12px 0 10px!important;font-weight:800!important;color:#25324b!important;border-bottom:3px solid transparent!important;white-space:nowrap!important;cursor:pointer!important}.rt61-tab.active{color:#0b5bd3!important;border-bottom-color:#0b5bd3!important}.rt61-hidden{display:none!important}#view-single .builder-actions,#view-beta .builder-actions{justify-content:flex-start!important}.rt61-action-row{display:flex!important;justify-content:flex-start!important;gap:10px!important;align-items:center!important;margin:10px 0 12px!important;padding:0!important}.rt61-action-row .btn{margin-left:0!important}.rt61-category-field{order:4!important}.rt61-info-pill{display:inline-flex;align-items:center;border:1px solid #bfdbfe;background:#eff6ff;color:#0f3d8a;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;margin-left:6px}`;
    document.head.appendChild(st);
  }
  function renameDomText(){
    if(!document.body) return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||['SCRIPT','STYLE'].includes(p.tagName))return NodeFilter.FILTER_REJECT;return /(Product Groups|Product Group|Primary Product\s*\/\s*Service)/.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{n.nodeValue=(n.nodeValue||'').replace(/Primary Product\s*\/\s*Service/g,'Category').replace(/Product Groups/g,'Category').replace(/Product Group/g,'Category')});
    qsa('input[placeholder]').forEach(el=>{el.placeholder=(el.placeholder||'').replace(/Primary Product\s*\/\s*Service|Product Groups|Product Group/g,'Category')});
  }
  function wrapperFor(id){const el=qs('#'+id); return el?el.closest('.form-grid > div, .form-stack > div, div'):null}
  function markCategory(id){const w=wrapperFor(id); if(!w)return null; w.classList.add('rt61-category-field'); const lab=w.querySelector('label'); if(lab){Array.from(lab.childNodes).forEach(n=>{if(n.nodeType===3)n.nodeValue='Category'});} return w;}
  function placeCategoryUnderArea(viewId,prefix){
    const area=wrapperFor(prefix+'ScenarioId')||wrapperFor(prefix+'AreaReviewId')||wrapperFor(prefix+'AreaGroupId')||wrapperFor('complexAreaGroupId');
    const cat=markCategory(prefix+'PrimaryProduct')||markCategory(prefix+'ProductGroup')||markCategory('complexPrimaryProduct')||markCategory('betaProjectOrProductName');
    if(area&&cat&&area.parentNode===cat.parentNode&&area.nextElementSibling!==cat) area.parentNode.insertBefore(cat,area.nextElementSibling);
  }
  function removeDeadTabs(view){
    qsa('.rt58-tabs,.rt60-tabs',view).forEach(bar=>{const t=txt(bar); if(/Assumptions|Promote\s*\/\s*Save|Outcomes|Evidence\s*\/\s*Basis|Report/.test(t)) bar.remove();});
    qsa('div,nav',view).forEach(el=>{if(el.classList.contains('rt61-tabs'))return; const t=txt(el); if(t.startsWith('1. Scenario Entry')&&/Assumptions|Promote\s*\/\s*Save|Outcomes|Evidence\s*\/\s*Basis/.test(t)&&t.length<180) el.remove();});
  }
  function directCards(view){return qsa(':scope > .card',view).filter(c=>!c.classList.contains('rt58-summary'))}
  function ensureTabs(viewId){
    const view=qs('#'+viewId); if(!view)return;
    removeDeadTabs(view);
    let tabs=qs(':scope > .rt61-tabs',view);
    const summary=qs(':scope > .rt58-summary, :scope > .rt54-summary',view);
    const header=qs(':scope > .section-header',view);
    if(!tabs){tabs=document.createElement('div'); tabs.className='rt61-tabs'; tabs.innerHTML=TAB_LABELS.map((l,i)=>`<button class="rt61-tab ${i===0?'active':''}" type="button" data-rt61-tab="${i}">${esc(l)}</button>`).join(''); (summary||header||view).parentNode.insertBefore(tabs,(summary||header||view).nextElementSibling);}
    const cards=directCards(view);
    const groups=[/Scenario|Selected Component Workspace|Component Entry/i,/Cost|Loss/i,/Hard Facts|Evidence/i,/Mitigation|Control/i,/Insurance|Risk Transfer/i,/Accepted Risk/i];
    cards.forEach((c,idx)=>{const h=txt(c.querySelector('.card-header h3,h3')||c); let g=idx===0?0:groups.findIndex((rx,i)=>i>0&&rx.test(h)); if(g<0)g=0; c.dataset.rt61Group=String(g);});
    function activate(n){qsa('.rt61-tab',tabs).forEach(b=>b.classList.toggle('active',b.dataset.rt61Tab===String(n))); cards.forEach(c=>c.classList.toggle('rt61-hidden',c.dataset.rt61Group!==String(n)));}
    if(!tabs.dataset.rt61Bound){tabs.dataset.rt61Bound='1'; qsa('.rt61-tab',tabs).forEach(b=>b.addEventListener('click',()=>activate(Number(b.dataset.rt61Tab||0))));}
    activate(Number(qs('.rt61-tab.active',tabs)?.dataset.rt61Tab||0));
  }
  function moveButtonsLeft(viewId){
    const view=qs('#'+viewId); if(!view)return; const first=directCards(view)[0]; if(!first)return;
    let row=qs(':scope > .rt61-action-row',view); if(!row){row=document.createElement('div');row.className='rt61-action-row';const tabs=qs(':scope > .rt61-tabs',view);(tabs||first).parentNode.insertBefore(row,(tabs||first).nextElementSibling);}
    const ids=viewId==='view-beta'?['loadBetaTestBtn','runBetaScenarioBtn','saveBetaScenarioBtn','promoteBetaScenarioBtn']:['loadSingleTestBtn','runScenarioBtn','saveScenarioBtn','saveSingleScenarioBtn'];
    ids.forEach(id=>{const b=qs('#'+id); if(b&&b.parentElement!==row)row.appendChild(b);});
  }
  function cleanCategoryAdmin(){
    const input=qs('#newProductGroupName'); if(input)input.placeholder='Add Category';
    const btn=qs('#addProductGroupBtn'); if(btn)btn.textContent='Add Category';
    const cnt=qs('#productGroupCount'); const stat=cnt&&cnt.closest('.stat-card'); if(stat){const s=stat.querySelector('span'); if(s)s.textContent='Category'; stat.dataset.help='Number of category values currently available.';}
  }
  function boot(){setVersion();injectStyles();renameDomText();cleanCategoryAdmin();ensureTabs('view-single');ensureTabs('view-beta');moveButtonsLeft('view-single');moveButtonsLeft('view-beta');placeCategoryUnderArea('view-single','single');placeCategoryUnderArea('view-beta','beta');placeCategoryUnderArea('view-complex','complex');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(boot,50);setTimeout(boot,500);setTimeout(boot,1200)});else{setTimeout(boot,50);setTimeout(boot,500);setTimeout(boot,1200)}
  document.addEventListener('click',()=>setTimeout(boot,80),true);
  document.addEventListener('change',e=>{if(e.target&&e.target.closest&&e.target.closest('#view-single,#view-beta,#view-complex,#view-categories'))setTimeout(boot,80)},true);
})();
/* ===== END PHASE 23.0.61 CATEGORY + TAB CLEANUP PATCH ===== */

/* ===== PHASE 23.0.62 REGRESSION FIX: NAV ACTIVE, CATEGORY SELECTS, SINGLE/BETA TAB PANELS ===== */
(function(){
  const PHASE='23.0.62';
  const CATEGORY_DEFAULTS=['ACH Processing','Card Services','Consumer Compliance','Core Processing','Deposits','Digital Banking','Lending','Loan Origination','Loan Servicing','Mortgage Servicing','Payments','Third Party','Vendor Management'];
  const TABS=['1. Scenario Entry','2. Costs / Losses','3. Hard Facts / Evidence','4. Mitigation / Controls','5. Insurance / Risk Transfer','6. Accepted Risk'];
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function text(el){return (el&&el.textContent||'').replace(/\s+/g,' ').trim()}
  function addStyle(){
    if(qs('#rt62Styles')) return;
    const st=document.createElement('style'); st.id='rt62Styles';
    st.textContent=`
      .nav-item[data-view="complex"]{background:transparent!important;color:#fff!important;}
      .nav-item.active[data-view="complex"],.nav-item.active{background:#1177f2!important;color:#fff!important;}
      #view-single .rt60-tabs,#view-beta .rt60-tabs,#view-single .rt61-tabs,#view-beta .rt61-tabs,#view-single .rt58-tabs,#view-beta .rt58-tabs{display:none!important;}
      .rt62-tabs{display:flex!important;gap:24px!important;border-bottom:1px solid #dbe4f0!important;margin:8px 0 12px!important;padding:0 6px!important;overflow-x:auto!important;background:transparent!important;}
      .rt62-tab{border:0!important;background:transparent!important;padding:12px 0 10px!important;font-weight:800!important;color:#25324b!important;border-bottom:3px solid transparent!important;white-space:nowrap!important;cursor:pointer!important;}
      .rt62-tab.active{color:#0b5bd3!important;border-bottom-color:#0b5bd3!important;}
      .rt62-hidden{display:none!important;}
      .rt62-panel{display:block;margin-bottom:12px;}
      .rt62-generated-card .card-header{border-bottom:0!important;}
      .rt62-generated-note{padding:12px 16px;color:#52637a;font-size:13px;border-top:1px solid #e6edf7;}
      .rt62-field-card .form-grid{padding:0 18px 18px!important;}
      select[id$="PrimaryProduct"],#betaPrimaryProduct{pointer-events:auto!important;opacity:1!important;background:#fff!important;}
    `;
    document.head.appendChild(st);
  }
  function setVersion(){
    try{window.RISKTOOL_RUNTIME_VERSION=PHASE}catch(e){}
    qsa('#appVersion,.app-version,[data-version-label]').forEach(el=>el.textContent=PHASE);
  }
  function getCats(){
    let vals=[];
    try{ if(Array.isArray(window.productGroups)) vals=window.productGroups; }catch(e){}
    try{ vals=vals.concat(JSON.parse(localStorage.getItem('risk_manager_product_groups_v431')||'[]')||[]); }catch(e){}
    vals=vals.concat(CATEGORY_DEFAULTS);
    return Array.from(new Set(vals.filter(Boolean).map(String))).sort((a,b)=>a.localeCompare(b));
  }
  function populateSelectSafe(sel, vals, keep){
    if(!sel) return;
    const current=keep ?? sel.value;
    const opts=vals.length?vals:CATEGORY_DEFAULTS;
    sel.innerHTML=opts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if(current && opts.includes(current)) sel.value=current;
    else if(!sel.value && opts.length) sel.value=opts[0];
    sel.disabled=false; sel.removeAttribute('disabled');
  }
  function fixCategorySelects(){
    const cats=getCats();
    ['singlePrimaryProduct','complexPrimaryProduct','riskItemProduct','complexSectionProduct'].forEach(id=>populateSelectSafe(qs('#'+id),cats));
    let betaCat=qs('#betaPrimaryProduct');
    const betaId=qs('#betaScenarioId');
    if(!betaCat && betaId){
      const wrap=document.createElement('div');
      wrap.className='rt62-beta-category-wrap';
      wrap.innerHTML='<label class="help-label" data-help="Category values come from Category Admin.">Category</label><select id="betaPrimaryProduct"></select>';
      const idWrap=betaId.closest('.form-grid > div, div');
      if(idWrap && idWrap.parentNode) idWrap.parentNode.insertBefore(wrap,idWrap.nextElementSibling);
      betaCat=qs('#betaPrimaryProduct');
    }
    populateSelectSafe(betaCat,cats);
    ['singlePrimaryProduct','complexPrimaryProduct','betaPrimaryProduct'].forEach(id=>{const el=qs('#'+id); const lab=el&&el.closest('div')?.querySelector('label'); if(lab) lab.childNodes.forEach(n=>{if(n.nodeType===3)n.nodeValue='Category';});});
  }
  function fixNavActive(){
    const activeView=qsa('.view').find(v=>v.classList.contains('active'));
    const key=activeView?activeView.id.replace(/^view-/,''):null;
    qsa('.nav-item').forEach(btn=>btn.classList.toggle('active',!!key && btn.dataset.view===key));
  }
  function firstCard(view){return qsa(':scope > .card',view).find(c=>!c.classList.contains('rt58-summary')&&!c.classList.contains('rt54-summary')&&!c.classList.contains('rt62-generated-card'))}
  function makeCard(title,span){
    const c=document.createElement('div'); c.className='card rt62-generated-card';
    c.innerHTML=`<div class="card-header"><h3>${esc(title)}</h3><span>${esc(span||'Workspace')}</span></div>`;
    return c;
  }
  function fieldWrap(id){const el=qs('#'+id); return el?el.closest('.form-grid > div, .full-span, div'):null}
  function moveFields(title, span, ids){
    const card=makeCard(title,span); card.classList.add('rt62-field-card');
    const grid=document.createElement('div'); grid.className='form-grid';
    ids.forEach(id=>{const w=fieldWrap(id); if(w) grid.appendChild(w);});
    if(!grid.children.length){ const note=document.createElement('div'); note.className='rt62-generated-note'; note.textContent='No input fields are currently configured for this section.'; card.appendChild(note); }
    else card.appendChild(grid);
    return card;
  }
  function matchingCards(view, patterns){
    return qsa(':scope > .card',view).filter(c=>patterns.some(rx=>rx.test(text(c.querySelector('.card-header h3,h3')||c))));
  }
  function clearOldWorkspace(view){
    qsa(':scope > .rt62-tabs,:scope > .rt62-action-row,:scope > .rt62-panel',view).forEach(el=>el.remove());
    qsa(':scope > .rt60-tabs,:scope > .rt61-tabs,:scope > .rt58-tabs',view).forEach(el=>el.style.display='none');
    qsa(':scope > .card',view).forEach(c=>{c.classList.remove('rt60-hidden','rt61-hidden','rt62-hidden'); c.style.display='';});
  }
  function buildScenarioWorkspace(viewId,type){
    const view=qs('#'+viewId); if(!view || view.dataset.rt62Done==='1') return;
    view.dataset.rt62Done='1';
    clearOldWorkspace(view);
    const header=qs(':scope > .section-header',view);
    const summary=qs(':scope > .rt58-summary, :scope > .rt54-summary',view);
    const tabs=document.createElement('div'); tabs.className='rt62-tabs';
    tabs.innerHTML=TABS.map((t,i)=>`<button type="button" class="rt62-tab ${i===0?'active':''}" data-tab="${i}">${esc(t)}</button>`).join('');
    const anchor=summary||header; if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(tabs,anchor.nextSibling); else view.insertBefore(tabs,view.firstChild);
    const panels=TABS.map((_,i)=>{const p=document.createElement('div'); p.className='rt62-panel '+(i?'rt62-hidden':''); p.dataset.panel=String(i); return p;});
    panels.forEach(p=>tabs.parentNode.insertBefore(p,tabs.nextSibling));
    const scenario=firstCard(view); if(scenario) panels[0].appendChild(scenario);
    if(type==='single'){
      panels[1].appendChild(moveFields('Costs / Losses Entry','Fact-based exposure inputs',['singleHardCostMin','singleHardCostLikely','singleHardCostMax','singleSoftCostMin','singleSoftCostLikely','singleSoftCostMax','singleRandomScenarioCount']));
      matchingCards(view,[/Hard Facts|Evidence/i]).forEach(c=>panels[2].appendChild(c));
      panels[3].appendChild(moveFields('Mitigation / Controls Assumptions','Control effect on exposure',['singleControlEffectiveness','singleMitigationCost']));
      matchingCards(view,[/Mitigation/i]).forEach(c=>panels[3].appendChild(c));
      matchingCards(view,[/Insurance/i]).forEach(c=>panels[4].appendChild(c));
      matchingCards(view,[/Accepted Risk/i]).forEach(c=>panels[5].appendChild(c));
    } else {
      panels[1].appendChild(moveFields('Costs / Losses Entry','Beta min / likely / max cost assumptions',['betaMin','betaMode','betaMax','betaRandomScenarioCount','betaRelativeMean','betaShapeA','betaShapeB','betaExpectedValue','betaP10','betaP50','betaP90']));
      matchingCards(view,[/Beta Scenario Output/i]).forEach(c=>panels[1].appendChild(c));
      matchingCards(view,[/Hard Facts|Evidence/i]).forEach(c=>panels[2].appendChild(c));
      panels[3].appendChild(makeCard('Mitigation / Controls','Planning controls'));
      panels[3].lastElementChild.insertAdjacentHTML('beforeend','<div class="rt62-generated-note">Mitigation/control entries for beta planning will be documented here as the beta scenario is promoted or converted into active scenario testing.</div>');
      matchingCards(view,[/Insurance/i]).forEach(c=>panels[4].appendChild(c));
      panels[5].appendChild(makeCard('Accepted Risk','Governance'));
      panels[5].lastElementChild.insertAdjacentHTML('beforeend','<div class="rt62-generated-note">Accepted-risk decisions should be documented after management review. This placeholder prevents the tab from showing unrelated fields.</div>');
    }
    panels.forEach((p,i)=>{ if(!p.children.length){ const c=makeCard(TABS[i].replace(/^\d+\.\s*/,''),'Workspace'); c.insertAdjacentHTML('beforeend','<div class="rt62-generated-note">No fields or table are currently configured for this section.</div>'); p.appendChild(c);} });
    qsa('.rt62-tab',tabs).forEach(btn=>btn.addEventListener('click',()=>{qsa('.rt62-tab',tabs).forEach(b=>b.classList.toggle('active',b===btn)); panels.forEach(p=>p.classList.toggle('rt62-hidden',p.dataset.panel!==btn.dataset.tab));}));
  }
  function patchBetaPayload(){
    if(window.__rt62BetaPayloadPatched) return; window.__rt62BetaPayloadPatched=true;
    try{
      const original=window.getBetaPayload;
      if(typeof original==='function') window.getBetaPayload=function(){const p=original.apply(this,arguments)||{}; const cat=qs('#betaPrimaryProduct')?.value; if(cat){p.primaryProduct=cat; p.category=cat;} return p;};
    }catch(e){}
  }
  function boot(){addStyle();setVersion();fixCategorySelects();buildScenarioWorkspace('view-single','single');buildScenarioWorkspace('view-beta','beta');patchBetaPayload();fixNavActive();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{setTimeout(boot,100);setTimeout(boot,700);}); else {setTimeout(boot,100);setTimeout(boot,700);}
  document.addEventListener('click',()=>setTimeout(()=>{fixNavActive();fixCategorySelects();},60),true);
  document.addEventListener('change',e=>{if(e.target&&e.target.matches&&e.target.matches('select')) setTimeout(fixCategorySelects,20)},true);
})();
/* ===== END PHASE 23.0.62 REGRESSION FIX ===== */
