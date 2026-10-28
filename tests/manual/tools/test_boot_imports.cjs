const t0 = Date.now();
function logStep(name) {
  console.log(`[${Date.now() - t0}ms] ${name}`);
}

async function run() {
  logStep('start');
  await import('../../../server/orchestrator/brain.js');
  logStep('brain imported');
  await import('../../../server/systems/manager.js');
  logStep('systems manager imported');
  await import('../../../server/services/openclawController.js');
  logStep('openclawController imported');
  await import('../../../server/services/sisUnifiedSystem.js');
  logStep('sisUnifiedSystem imported');
  console.log('All core modules imported successfully!');
}

run();
