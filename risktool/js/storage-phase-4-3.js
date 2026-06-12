
import { STORAGE_KEY, DEFAULT_DATA, EMPTY_ACCEPTED_RISK } from "./schema-phase-4-3.js";
import { nextScenarioId } from "./id-phase-4-3.js";

export function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return migrateTo43(parsed);
  } catch (err) {
    console.error("[risktool] failed reading data", err);
    return structuredClone(DEFAULT_DATA);
  }
}

export function writeData(data) {
  data.meta = data.meta || {};
  data.meta.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function loadSeedsIntoCategories(data, seeds) {
  const out = structuredClone(data);
  out.categories = out.categories || {};
  for (const [key, values] of Object.entries(seeds)) {
    const existing = new Set(out.categories[key] || []);
    values.forEach(v => existing.add(v));
    out.categories[key] = [...existing];
  }
  return out;
}

export function migrateTo43(input) {
  const data = structuredClone(DEFAULT_DATA);
  data.version = "4.3";
  data.categories = {
    ...data.categories,
    ...(input.categories || {})
  };
  data.settings = { ...(input.settings || {}) };
  data.meta = { ...(input.meta || {}), createdByVersion: "4.3" };

  const scenarios = Array.isArray(input.scenarios) ? input.scenarios : [];
  data.scenarios = scenarios.map((s, idx) => {
    const scenario = {
      scenarioId: s.scenarioId || "",
      scenarioType: s.scenarioType || s.type || "single",
      title: s.title || s.name || "",
      description: s.description || "",
      productGroup: s.productGroup || "",
      riskDomain: s.riskDomain || "",
      scenarioStatus: s.scenarioStatus || "Open",
      scenarioSource: s.scenarioSource || "",
      disposition: s.disposition || "Mitigate",
      scenarioOwner: s.scenarioOwner || s.owner || "",
      identifiedDate: s.identifiedDate || "",
      targetMitigationDate: s.targetMitigationDate || "",
      reviewDate: s.reviewDate || "",
      closedDate: s.closedDate || "",
      acceptedRiskFlag: !!s.acceptedRiskFlag,
      createdAt: s.createdAt || new Date().toISOString(),
      lastUpdated: s.lastUpdated || new Date().toISOString(),
      mitigations: Array.isArray(s.mitigations) ? s.mitigations : [],
      acceptedRisk: {
        ...structuredClone(EMPTY_ACCEPTED_RISK),
        ...(s.acceptedRisk || {})
      },
      attachments: Array.isArray(s.attachments) ? s.attachments : []
    };

    if (!scenario.scenarioId) {
      scenario.scenarioId = nextScenarioId(scenarios.slice(0, idx));
    }
    scenario.acceptedRiskFlag = !!scenario.acceptedRisk?.isAccepted || !!scenario.acceptedRiskFlag;
    return scenario;
  });

  return data;
}
