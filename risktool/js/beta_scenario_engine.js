
function runBetaScenarioSimulation(betaInputs, randomScenarioCount) {

  const allowed=[100,500,1000,10000,100000];
  const iterations = allowed.includes(Number(randomScenarioCount)) ? Number(randomScenarioCount) : 1000;

  const min = Number(betaInputs.min||0);
  const mode = Number(betaInputs.mode||min);
  const max = Number(betaInputs.max||mode);

  const rows=[];
  const values=[];

  for(let i=0;i<iterations;i++){
    const v = min + Math.random()*(max-min);

    rows.push({
      scenarioNumber:i+1,
      sampledValue:Math.round(v)
    });

    values.push(v);
  }

  values.sort((a,b)=>a-b);

  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  const p10 = values[Math.floor(values.length*0.10)];
  const p50 = values[Math.floor(values.length*0.50)];
  const p90 = values[Math.floor(values.length*0.90)];

  return {
    iterations,
    expectedValue:Math.round(avg),
    p10:Math.round(p10),
    p50:Math.round(p50),
    p90:Math.round(p90),
    randomOutcomeRows:rows
  };
}
