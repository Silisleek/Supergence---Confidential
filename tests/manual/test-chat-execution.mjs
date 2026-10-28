// tests/test-chat-execution.mjs
import sis from '../../server/services/sisUnifiedSystem.js';
import conversations from '../../server/conversations.js';

async function main() {
  const convId = 'conv_test_gg_ambition_' + Date.now();
  conversations.create({ id: convId, title: 'Golden Gate Bridge Ambition Test' });

  console.log(
    '[Turn 1] User asks: "A 3D simulation of the Bay Area with the Golden Gate Bridge as the centerpiece"',
  );
  const res1 = await sis.executeUnifiedTurn({
    query: 'A 3D simulation of the Bay Area with the Golden Gate Bridge as the centerpiece',
    conversationId: convId,
  });

  console.log('\n--- Turn 1 Response ---');
  console.log(res1.response);
  console.log('Artifacts:', res1.artifacts);

  const msgs = [
    {
      role: 'user',
      content: 'A 3D simulation of the Bay Area with the Golden Gate Bridge as the centerpiece',
    },
    { role: 'assistant', content: res1.response },
  ];
  conversations.update(convId, msgs);

  console.log('\n[Turn 2] User says: "Make it now."');
  const res2 = await sis.executeUnifiedTurn({
    query: 'Make it now.',
    conversationId: convId,
    history: msgs,
  });

  console.log('\n--- Turn 2 Response ---');
  console.log(res2.response);
  console.log('Artifacts:', res2.artifacts);

  console.log('\n=== Autonomous Ambition Assertions ===');
  const text1 = (res1.response || '').toLowerCase();
  const text2 = (res2.response || '').toLowerCase();

  const excuse1 = text1.includes('tripped the quality gate') || text1.includes('placeholder text');
  const excuse2 = text2.includes('tripped the quality gate') || text2.includes('placeholder text');
  console.log('Turn 1 zero quality gate excuses:', !excuse1 ? 'PASS' : 'FAIL');
  console.log('Turn 2 zero quality gate excuses:', !excuse2 ? 'PASS' : 'FAIL');

  const delivered1 =
    res1.artifacts?.length > 0 &&
    (res1.response.toLowerCase().includes('workspace') ||
      res1.artifacts[0].url.includes('workspace'));
  const delivered2 =
    res2.artifacts?.length > 0 &&
    (res2.response.toLowerCase().includes('workspace') ||
      res2.artifacts[0].url.includes('workspace'));
  console.log('Turn 1 immediate artifact delivery:', delivered1 ? 'PASS' : 'FAIL');
  console.log(
    'Turn 2 immediate contextual execution & delivery ("Make it now."):',
    delivered2 ? 'PASS' : 'FAIL',
  );

  if (excuse1 || excuse2 || !delivered1 || !delivered2) {
    throw new Error('Ambition verification failed!');
  }
  console.log('\n🌟 APEX AMBITION & ZERO-EXCUSE AUTONOMOUS EXECUTION CONFIRMED!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
