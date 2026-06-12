
export function filterScenarios(scenarios, filters = {}) {
  return scenarios.filter(s => {
    if (filters.status && s.scenarioStatus !== filters.status) return false;
    if (filters.productGroup && s.productGroup !== filters.productGroup) return false;
    if (filters.riskDomain && s.riskDomain !== filters.riskDomain) return false;
    if (filters.source && s.scenarioSource !== filters.source) return false;
    if (filters.acceptedRisk === "yes" && !s.acceptedRiskFlag) return false;
    if (filters.acceptedRisk === "no" && s.acceptedRiskFlag) return false;
    if (filters.scenarioType && s.scenarioType !== filters.scenarioType) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [s.scenarioId, s.title, s.productGroup, s.riskDomain, s.scenarioOwner]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function renderScenarioTable(scenarios, targetEl) {
  targetEl.innerHTML = `
    <table class="rm-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Scenario</th>
          <th>Type</th>
          <th>Product Group</th>
          <th>Risk Domain</th>
          <th>Status</th>
          <th>Source</th>
          <th>Disposition</th>
          <th>Owner</th>
          <th>Accepted Risk</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        ${scenarios.map(row => `
          <tr data-scenario-id="${escapeHtml(row.scenarioId)}">
            <td>${escapeHtml(row.scenarioId)}</td>
            <td>${escapeHtml(row.title)}</td>
            <td><span class="rm-badge">${escapeHtml(row.scenarioType)}</span></td>
            <td>${escapeHtml(row.productGroup || "")}</td>
            <td>${escapeHtml(row.riskDomain || "")}</td>
            <td><span class="rm-badge rm-status">${escapeHtml(row.scenarioStatus || "")}</span></td>
            <td>${escapeHtml(row.scenarioSource || "")}</td>
            <td>${escapeHtml(row.disposition || "")}</td>
            <td>${escapeHtml(row.scenarioOwner || "")}</td>
            <td>${row.acceptedRiskFlag ? "Yes" : "No"}</td>
            <td>${escapeHtml(formatDate(row.lastUpdated))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function formatDate(value) {
  if (!value) return "";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
