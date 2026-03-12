
// AI briefing export file generator

function exportAIBriefing(scenario){

  const lines = [];

  lines.push("TITLE");
  lines.push(scenario.name);
  lines.push("");

  lines.push("EXECUTIVE SUMMARY");
  lines.push("Annual exposure range: $" + scenario.rangeLow + " to $" + scenario.rangeHigh);
  lines.push("Most likely annual loss: $" + scenario.rangeMedian);
  lines.push("");

  lines.push("SCENARIO");
  lines.push(scenario.description || "");
  lines.push("");

  lines.push("FINANCIAL EXPOSURE");
  lines.push("Hard Cost: $" + scenario.hardCostExpected);
  lines.push("Soft Cost: $" + scenario.softCostExpected);
  lines.push("Total Expected Loss: $" + scenario.expectedLoss);
  lines.push("");

  lines.push("MITIGATION");
  lines.push("Mitigation Cost: $" + scenario.mitigationCost);
  lines.push("Risk Reduction: $" + scenario.riskReductionValue);
  lines.push("");

  lines.push("TIME HORIZON EXPOSURE");
  scenario.horizonRows.forEach(h=>{
    lines.push(h.horizonLabel + ": $" + h.withoutMitigation);
  });

  const blob = new Blob([lines.join("\n")], {type: "text/plain"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "risk_ai_briefing.txt";
  link.click();
}
