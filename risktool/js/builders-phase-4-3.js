
export const SINGLE_SCENARIO_FIELDS = [
  "title",
  "description",
  "productGroup",
  "riskDomain",
  "scenarioStatus",
  "scenarioSource",
  "disposition",
  "scenarioOwner",
  "identifiedDate",
  "targetMitigationDate",
  "reviewDate",
  "closedDate"
];

export const COMPLEX_SCENARIO_FIELDS = [
  ...SINGLE_SCENARIO_FIELDS,
  "overallRiskSummary",
  "crossFunctionalImpacts",
  "committeeNotes"
];

export function labelClass(hasHelp = false) {
  return hasHelp ? "help-label" : "";
}

export function acceptedRiskRequiredFields(data) {
  if (!data?.acceptedRisk?.isAccepted) return [];
  return ["authority", "acceptedDate", "decisionLogic"];
}
