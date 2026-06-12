
// Board packet generator

function generateBoardPacket(scenario){

  const report = [];

  report.push("BOARD RISK BRIEF");
  report.push("Scenario: " + scenario.name);
  report.push("Product Group: " + scenario.productGroup);
  report.push("Primary Regulation: " + scenario.primaryRegulation);
  report.push("");

  report.push("EXECUTIVE SUMMARY");
  report.push("Estimated annual exposure range: $" + scenario.rangeLow + " - $" + scenario.rangeHigh);
  report.push("Most likely annual impact: $" + scenario.rangeMedian);
  report.push("Mitigation Cost: $" + scenario.mitigationCost);
  report.push("Risk Reduction Value: $" + scenario.riskReductionValue);
  report.push("");

  report.push("SCENARIO DESCRIPTION");
  report.push(scenario.description || "");
  report.push("");

  report.push("FINANCIAL MODEL");
  report.push("Expected Hard Cost: $" + scenario.hardCostExpected);
  report.push("Expected Soft Cost: $" + scenario.softCostExpected);
  report.push("Expected Annual Loss: $" + scenario.expectedLoss);
  report.push("Residual Loss After Mitigation: $" + scenario.residualExpectedLoss);
  report.push("");

  if(Array.isArray(scenario.items)){
    report.push("COMPLEX SCENARIO RISK ITEMS");
    scenario.items.forEach((item,i)=>{
      report.push((i+1) + ". " + item.name);
      report.push("Likelihood: " + item.likelihood + " Impact: " + item.impact);
      report.push("Explanation: " + (item.description || ""));
      report.push("");
    });
  }

  if(Array.isArray(scenario.mitigations)){
    report.push("MITIGATION FACTORS");
    scenario.mitigations.forEach((m,i)=>{
      report.push((i+1) + ". " + m.name);
      report.push("Explanation: " + (m.description || ""));
      report.push("");
    });
  }

  return report.join("\n");
}
