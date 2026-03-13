
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
    rows.push({ scenarioNumber: i + 1, sampledValue: Math.round(value) });
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
