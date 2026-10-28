import { quickAI } from '../../../server/api/openrouter.js';

function stripCodeFences(text) {
  if (!text) return '';
  return text.replace(/```(?:javascript|js|html)?\n([\s\S]*?)```/gi, '$1').trim();
}

async function test() {
  const model = 'opus-4.6';
  const pKinematics = `Write a standalone JavaScript function:
function createZebraKinematics(joints)
Note: joints provides { root, torso, neck, head, tail, legFL, legFR, legBL, legBR } where each leg provides { hip, knee, fetlock }.
CRITICAL: Default torso height is 1.40 (position.y = 1.40). NEVER set position.y to 0!
Requirements:
- Returns an object with update(delta, time) and setGait(gaitName) methods.
- Supported gaits: 'walk', 'trot', 'gallop', 'rear', 'idle'.
- Helper: const lerp = (a, b, t) => a + (b - a) * t;
- In 'rear' gait:
  - Elevate torso: torso.position.y = lerp(torso.position.y, 1.62, 0.10); torso.rotation.x = lerp(torso.rotation.x, -0.74, 0.12).
  - Pawing elevated forelegs:
    legFL.hip.rotation.x = -0.52 + Math.sin(time * 5.2) * 0.28; legFL.knee.rotation.x = 0.85 + Math.cos(time * 5.2) * 0.18;
    legFR.hip.rotation.x = -0.46 + Math.cos(time * 5.2) * 0.28; legFR.knee.rotation.x = 0.72 + Math.sin(time * 5.2) * 0.18;
  - Grounded supporting hindlegs firmly planted under pelvis:
    legBL.hip.rotation.x = 0.48; legBL.knee.rotation.x = -0.32;
    legBR.hip.rotation.x = 0.48; legBR.knee.rotation.x = -0.32;
  - Arched proud neck reaching up (neck.rotation.x = -0.58), head tilted gracefully (head.rotation.x = 0.38), and tail swishing (tail.rotation.x = 0.76, tail.rotation.z = Math.sin(time * 3.5) * 0.08).
- In 'walk' gait:
  - Maintain torso.position.y at 1.40 + Math.abs(Math.sin(time * 8.4)) * 0.025 and torso.rotation.x at 0 (using lerp).
  - 4-beat diagonal sequence: FL (offset 0), BR (offset 0.5 * Math.PI), FR (offset Math.PI), BL (offset 1.5 * Math.PI).
  - Forelegs (FL/FR): hip.rotation.x = Math.sin(p) * 0.36; knee.rotation.x = Math.max(0, -Math.sin(p) * 0.45).
  - Hindlegs (BL/BR): hip.rotation.x = Math.sin(p) * 0.36; knee.rotation.x = -Math.max(0, Math.sin(p) * 0.35).
  - Subtle rhythmic neck bobbing (neck.rotation.x = -0.10 + Math.sin(time * 8.4) * 0.03) and tail sway (tail.rotation.z = Math.sin(time * 4.2) * 0.08).
- In 'trot' gait:
  - Maintain torso.position.y at 1.40 + Math.abs(Math.sin(time * 6.5)) * 0.04.
  - 2-beat diagonal pairs (FL+BR vs FR+BL) with swing amplitude 0.48; foreleg knee flexion 0.52; hindleg knee flexion -0.40.
- In 'gallop' gait:
  - Maintain torso.position.y at 1.40 + Math.abs(Math.sin(time * 9.0)) * 0.06.
  - High-speed asymmetrical stride with amplitude 0.65.
- In 'idle' gait:
  - Maintain torso.position.y at 1.40, smoothly lerp leg hips and knees toward 0; subtle breathing motion on neck (Math.sin(time * 1.8) * 0.02) and gentle tail sway.
Keep code concise, clean, under 70 lines. Absolutely ZERO ellipses (...).
Output ONLY JavaScript inside \`\`\`javascript.`;

  const res = await quickAI(
    'You are an elite Three.js & Physics Engineer. Output ONLY valid, executable JavaScript inside a single ```javascript code block. NEVER write explanations, scratchpads, planning notes, line numbers, or conversational text.',
    pKinematics,
    model,
    4000,
    0.1,
  );
  const raw = res?.text || String(res);
  console.log('RAW RESPONSE LENGTH:', raw.length);
  const codeBlockMatches = [...raw.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  console.log('NUMBER OF CODE BLOCKS FOUND:', codeBlockMatches.length);
  if (codeBlockMatches.length > 0) {
    const last = codeBlockMatches[codeBlockMatches.length - 1][1].trim();
    console.log('LAST CODE BLOCK LENGTH:', last.length);
    console.log('LAST CODE BLOCK:\n', last);
  } else {
    console.log('NO CODE BLOCK FOUND. FULL RAW:\n', raw);
  }
}

test().catch(console.error);
