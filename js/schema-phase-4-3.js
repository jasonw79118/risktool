
export const STORAGE_KEY = "riskManagerData";

export const EMPTY_ACCEPTED_RISK = {
  isAccepted: false,
  authority: "",
  acceptedByName: "",
  acceptedDate: "",
  decisionLogic: "",
  rationale: "",
  reviewDate: "",
  attachments: []
};

export const EMPTY_MITIGATION = () => ({
  mitigationId: "",
  title: "",
  description: "",
  owner: "",
  targetDate: "",
  status: "Planned",
  notes: "",
  attachments: []
});

export const EMPTY_SCENARIO = (scenarioType = "single") => ({
  scenarioId: "",
  scenarioType,
  title: "",
  description: "",
  productGroup: "",
  riskDomain: "",
  scenarioStatus: "Open",
  scenarioSource: "",
  disposition: "Mitigate",
  scenarioOwner: "",
  identifiedDate: "",
  targetMitigationDate: "",
  reviewDate: "",
  closedDate: "",
  acceptedRiskFlag: false,
  createdAt: "",
  lastUpdated: "",
  mitigations: [],
  acceptedRisk: structuredClone(EMPTY_ACCEPTED_RISK),
  attachments: []
});

export const DEFAULT_DATA = {
  version: "4.3",
  categories: {
    productGroups: [],
    riskDomains: [],
    scenarioStatuses: [],
    scenarioSources: [],
    riskAcceptanceAuthorities: []
  },
  scenarios: [],
  settings: {},
  meta: {
    createdByVersion: "4.3",
    lastUpdated: ""
  }
};
