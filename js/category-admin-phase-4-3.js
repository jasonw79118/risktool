
export const CATEGORY_KEYS = [
  { key: "productGroups", label: "Product Group" },
  { key: "riskDomains", label: "Risk Domain" },
  { key: "scenarioStatuses", label: "Scenario Status" },
  { key: "scenarioSources", label: "Scenario Source" },
  { key: "riskAcceptanceAuthorities", label: "Risk Acceptance Authority" }
];

export function renderCategoryAdmin(categories, targetEl) {
  targetEl.innerHTML = `
    <div class="rm-grid">
      ${CATEGORY_KEYS.map(item => `
        <section class="rm-card" data-category-key="${item.key}">
          <h3>${item.label}</h3>
          <ul class="rm-list">
            ${(categories[item.key] || []).map(v => `<li>${escapeHtml(v)}</li>`).join("")}
          </ul>
        </section>
      `).join("")}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
