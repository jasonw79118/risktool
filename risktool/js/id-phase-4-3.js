
export function nextScenarioId(existingScenarios = []) {
  const year = new Date().getFullYear();
  const prefix = `RSK-${year}-`;
  const seq = existingScenarios
    .map(x => x?.scenarioId || "")
    .filter(x => x.startsWith(prefix))
    .map(x => Number(x.slice(prefix.length)))
    .filter(Number.isFinite);

  const next = (seq.length ? Math.max(...seq) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function nextMitigationId(existingMitigations = []) {
  const seq = existingMitigations
    .map(x => x?.mitigationId || "")
    .map(x => Number(String(x).replace(/^\D+/g, "")))
    .filter(Number.isFinite);

  const next = (seq.length ? Math.max(...seq) : 0) + 1;
  return `MIT-${String(next).padStart(4, "0")}`;
}
