import autonomousLearner from '../../server/improvement/autonomous-learner.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Testing live _executeTheoryAndDotConnectingPhase with null topic...');
  const result = await autonomousLearner._executeTheoryAndDotConnectingPhase(null);
  console.log('\n--- RESULT ---');
  console.log('Title:', result.title);
  console.log('Domain:', result.domain);
  console.log('Hypothesis Preview:', result.summary?.slice(0, 150));
  console.log('Dot Connections:', result.dotConnections);
  console.log('Files:', result.files);

  const reportFile = result.files.find((f) => f.type === 'report');
  if (reportFile && fs.existsSync(reportFile.path)) {
    const content = fs.readFileSync(reportFile.path, 'utf8');
    console.log('\n--- REPORT PREVIEW (First 400 chars) ---');
    console.log(content.slice(0, 400));
  }
}

main().catch(console.error);
