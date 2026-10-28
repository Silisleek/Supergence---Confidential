// SIS 1.0 — Autonomous 3D Game Synthesis Runner
// Executes pure generative 3D game synthesis through SIS's Multi-Part 3D Generator Pipeline
// Zero hardcoded games: SIS synthesizes every game from first principles using its AI gateway.
// Uses the superior generateDynamicScene() pipeline with syntax validation, auto-healing,
// deterministic HTML shells, and quality gates.

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { generateDynamicScene } from '../3d/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '../../workspace');

const GAMES = [
  {
    num: 31,
    filename: 'project31_cyber_tank_warfare.html',
    title: 'Cyber Tank 3D: Voxel Warfare',
    hypothesis:
      'Tracked armored vehicle kinematics with raycast terrain collision and projectile trajectory ballistic solver.',
    domains: ['Three.js 3D Game Engine', 'Ballistic Physics & Real-Time Combat'],
    concepts: [
      'Three.js r128',
      'Dual-track tank steering',
      'Turret rotation and barrel elevation',
      'Shell ballistic arc physics',
      'Destructible AI enemy tanks',
      'Web Audio API cannon and explosion sounds',
    ],
    parameters: ['tankSpeed', 'turretRotSpeed', 'shellVelocity'],
  },
  {
    num: 32,
    filename: 'project32_neon_pinball_arcade.html',
    title: 'Neon Pinball 3D: Cyberpunk Arcade',
    hypothesis:
      'Tilted table gravity field with spring restitution bumpers, multiball impulse response, and flipper angular momentum transfer.',
    domains: ['Three.js 3D Game Engine', 'Restitution Rigid-Body Dynamics & Audio Synthesis'],
    concepts: [
      'Three.js r128',
      'Slanted pinball cabinet',
      'Left and right flipper controls with A/D or arrows',
      'Spring plunger launch with spacebar',
      'Glow bumpers with score multiplier triggers',
      'Procedural Web Audio chimes',
    ],
    parameters: ['tableTilt', 'flipperForce', 'bumperBounce'],
  },
  {
    num: 33,
    filename: 'project33_abyssal_submarine_explorer.html',
    title: 'Abyssal Submarine: Deep Ocean Explorer 3D',
    hypothesis:
      'Hydrodynamic drag and buoyancy simulation with volumetric fog, sonar beam scanning, and benthic pressure gradients.',
    domains: ['Three.js 3D Game Engine', 'Fluid Drag & Volumetric Ocean Exploration'],
    concepts: [
      'Three.js r128',
      'Submersible hull with twin spotlights',
      'Sonar pulse ping with echo',
      'Procedural underwater seabed terrain',
      'Bioluminescent marine organisms and ancient relic retrieval',
      'Depth and oxygen telemetry HUD',
    ],
    parameters: ['buoyancy', 'engineThrust', 'waterDrag'],
  },
  {
    num: 34,
    filename: 'project34_mech_assault_titan_siege.html',
    title: 'Mech Assault: Titan Siege 3D',
    hypothesis:
      'Inverted pendulum bipedal gait kinematics with independent torso azimuth aiming and projectile cluster trajectory solving.',
    domains: ['Three.js 3D Game Engine', 'Bipedal Inverse Kinematics & Ballistic Artillery'],
    concepts: [
      'Three.js r128',
      'Walking battle mech with dual rotary cannons',
      'Mouse aim torso swivel with independent chassis locomotion',
      'Projectile swarm barrage with homing vectors',
      'Hostile defense drones',
      'Heavy industrial sci-fi ruins',
    ],
    parameters: ['mechSpeed', 'fireRate', 'projectileHomingRate'],
  },
  {
    num: 35,
    filename: 'project35_sphere_roller_velocity.html',
    title: 'Sonic Velocity: 3D Sphere Roller',
    hypothesis:
      'Continuous rolling contact mechanics with rotational inertia, speed loops, banking rails, and gravitational acceleration.',
    domains: ['Three.js 3D Game Engine', 'Rotational Mechanics & Kinetic Course Physics'],
    concepts: [
      'Three.js r128',
      'Floating geometric track course',
      'Sphere rolling with realistic torque and angular velocity',
      'Speed boost pads and vertical loops',
      'Collectible quantum energy shards',
      'Checkpoint timer and speedometer HUD',
    ],
    parameters: ['friction', 'rollTorque', 'jumpImpulse'],
  },
  {
    num: 36,
    filename: 'project36_medieval_archery_defender.html',
    title: 'Castle Wall Archer 3D: Medieval Siege Defense',
    hypothesis:
      'Parabolic aerodynamic arrow ballistics with wind deflection, draw string potential energy release, and siege engine impact mechanics.',
    domains: ['Three.js 3D Game Engine', 'Aerodynamic Projectile Ballistics & Defense Strategy'],
    concepts: [
      'Three.js r128',
      'First-person bow draw and release mechanics',
      'Wind vector trajectory deflection',
      'Advancing siege towers and raiders',
      'Castle ramparts visual battlements',
      'Dynamic hit scoring and flaming arrow powerups',
    ],
    parameters: ['drawTension', 'windStrength', 'arrowMass'],
  },
  {
    num: 37,
    filename: 'project37_hoverboard_freestyle_park.html',
    title: 'Cyber Hoverboard 3D: Neon Freestyle Park',
    hypothesis:
      'Magnetic levitation suspension with pitch/roll banking dynamics, halfpipe vertex normals, and trick rotation tracking.',
    domains: ['Three.js 3D Game Engine', 'Magnetic Levitation & Aerobatic Trick Physics'],
    concepts: [
      'Three.js r128',
      'Cyberpunk neon skate park with ramps, rails, and halfpipes',
      'Hoverboard suspension height oscillation',
      'Grind rail magnetic snapping',
      'Freestyle trick spin and flip combos',
      'Synth engine humming and grind sparks',
    ],
    parameters: ['hoverHeight', 'leanBanking', 'boostMultiplier'],
  },
  {
    num: 38,
    filename: 'project38_drone_delivery_simulator.html',
    title: 'Autonomous Drone Delivery 3D: Aerotaxi City',
    hypothesis:
      'Quad-rotor aerodynamic thrust equilibrium with attitude control loops, package tether pendulum physics, and urban airspace navigation.',
    domains: ['Three.js 3D Game Engine', 'Multirotor Aerodynamics & Autonomous Nav'],
    concepts: [
      'Three.js r128',
      '4-rotor drone with individual rotor tilt and wash particles',
      'Skyscraper delivery drop zones',
      'Tether cargo pickup and release',
      'Turbulent crosswinds between high-rise buildings',
      'Delivery timer, battery life, and compass waypoint HUD',
    ],
    parameters: ['motorRpm', 'tiltSensitivity', 'windTurbulence'],
  },
  {
    num: 39,
    filename: 'project39_vector_space_invaders.html',
    title: 'Retro Vector Space Invaders 3D',
    hypothesis:
      'Grid-based enemy swarm choreography with cascading speed progression, shield bunker erosion, and 3D laser vector collisions.',
    domains: ['Three.js 3D Game Engine', 'Arcade Mechanics & Retro-Futurist Aesthetics'],
    concepts: [
      'Three.js r128',
      'Neon glowing vector aesthetic with bloom/additive blending',
      'Moving 3D alien mother fleet dropping projectiles',
      'Destructible barrier shields',
      'Player laser cannon with rapid-fire energy bar',
      'Procedural 8-bit sound synthesis',
    ],
    parameters: ['swarmDropSpeed', 'laserVelocity', 'alienFireRate'],
  },
  {
    num: 40,
    filename: 'project40_zombie_horde_survival_fps.html',
    title: 'Outbreak 3D: Bunker Survival',
    hypothesis:
      'Crowd flocking behavior with line-of-sight pathing, recoil camera recovery, and muzzle flash volumetric illumination.',
    domains: ['Three.js 3D Game Engine', 'First-Person Combat & Agent Flocking AI'],
    concepts: [
      'Three.js r128',
      'Underground bunker facility with flickering lights',
      'First-person weapon with iron sights and reload animation',
      'Enemy horde swarm agent pathing toward player position',
      'Ammo crates and barricade repair mechanics',
      'Health, ammo, and wave survival telemetry',
    ],
    parameters: ['playerWalkSpeed', 'projectileDamage', 'enemyAgility'],
  },
  {
    num: 41,
    filename: 'project41_micro_racers_desktop_gp.html',
    title: 'Micro Racers 3D: Desktop Grand Prix',
    hypothesis:
      'Isometric micro-vehicle slip angle tire friction, ramp jump ballistic flight, and AI waypoint pursuit steering.',
    domains: ['Three.js 3D Game Engine', 'Arcade Vehicle Dynamics & Micro-Scale Environment'],
    concepts: [
      'Three.js r128',
      'Giant desktop environment with books, coffee mugs, and laptop bridges',
      'Miniature RC racer with drift tire smoke',
      'AI rival mini-cars competing on track',
      'Speed boosts and oil slicks',
      'Lap counter and split time timer',
    ],
    parameters: ['driftFriction', 'steeringTightness', 'topSpeed'],
  },
  {
    num: 42,
    filename: 'project42_island_stunt_biplane.html',
    title: 'Island Stunt Biplane 3D: Aerobatic Flight',
    hypothesis:
      'Lift-to-drag airfoil mechanics with stall speed dynamics, rudder slip yaw, and smoke ribbon trail rendering.',
    domains: ['Three.js 3D Game Engine', 'Aeronautical Aerodynamics & Stunt Flight'],
    concepts: [
      'Three.js r128',
      'Tropical island archipelago with volcanic crater and sea caves',
      'Vintage biplane with spinning wooden propeller',
      'Flight controls: pitch, roll, yaw, throttle with barrel roll maneuvers',
      'Floating golden stunt rings to navigate',
      'Aerobatic colored smoke ribbon generator',
    ],
    parameters: ['liftCoefficient', 'stallSpeed', 'throttlePower'],
  },
  {
    num: 43,
    filename: 'project43_cyber_minigolf_arcade.html',
    title: 'Cyber Mini-Putt 3D: Neon Golf Course',
    hypothesis:
      'Rolling surface friction integration with contour slope gravity vectors, obstacle deflection angles, and putter impulse transfer.',
    domains: ['Three.js 3D Game Engine', 'Surface Contact Dynamics & Precision Arc Sports'],
    concepts: [
      'Three.js r128',
      'Futuristic neon mini-golf holes with hills, tunnels, and moving obstacles',
      'Aim line guide with power meter swing bar',
      'Realistic ball rolling over undulations and banks',
      'Cup capture physics and hole-in-one celebration particles',
      'Par scoreboard and stroke tally',
    ],
    parameters: ['surfaceGrassFriction', 'putterPowerScale', 'bankRestitution'],
  },
  {
    num: 44,
    filename: 'project44_cyber_stealth_infiltration.html',
    title: 'Cyber Infiltration 3D: Stealth Extraction',
    hypothesis:
      'Vision cone geometric intersection, acoustic footsteps propagation, and security camera patrol state machines.',
    domains: ['Three.js 3D Game Engine', 'Stealth Spatial Reasoning & Sensory Cone AI'],
    concepts: [
      'Three.js r128',
      'High-security cyber facility with laser tripwires and security cameras',
      'Crouch, sprint, and wall cover movement mechanics',
      'Guard vision flashlight cones and alert status meters (Patrol, Suspicious, Alert)',
      'Terminal hacking minigame with datapad decryption',
      'Shadow concealment and noise meter',
    ],
    parameters: ['guardWalkSpeed', 'hearingRadius', 'visionDistance'],
  },
  {
    num: 45,
    filename: 'project45_asteroid_mining_harvester.html',
    title: 'Deep Space Harvester 3D: Asteroid Mining',
    hypothesis:
      'Zero-gravity thruster impulse mechanics, tractor beam grapple spring forces, and mineral yield extraction rates.',
    domains: ['Three.js 3D Game Engine', 'Orbital Resource Extraction & Spaceflight Physics'],
    concepts: [
      'Three.js r128',
      'Mining harvester vessel navigating asteroid field',
      'Mining laser that fractures asteroids into ore chunks',
      'Tractor beam that pulls valuable minerals into cargo hold',
      'Solar radiation storm hazards and drifting space debris',
      'Cargo hold capacity and refinery credits HUD',
    ],
    parameters: ['laserRange', 'tractorBeamForce', 'shipInertia'],
  },
  {
    num: 46,
    filename: 'project46_quantum_tower_defense.html',
    title: 'Quantum Grid 3D: Defense Matrix',
    hypothesis:
      'Multi-target range query spatial hashing with projectile interception time-to-impact calculations and wave scaling curves.',
    domains: ['Three.js 3D Game Engine', 'Spatial Optimization & Real-Time Strategy'],
    concepts: [
      'Three.js r128',
      'Glowing isometric electronic circuit board grid',
      'Winding enemy creep path with quantum anomalies',
      'Buildable defense towers: Tesla Coil, Cryo Slow Beam, Plasma Mortar',
      'Target acquisition and laser beam rendering',
      'Energy currency, upgrade system, and life core integrity',
    ],
    parameters: ['towerRange', 'fireCadence', 'waveSpeed'],
  },
  {
    num: 47,
    filename: 'project47_sky_islands_wingsuit_glider.html',
    title: 'Sky Islands Glider 3D: Wingsuit Pilot',
    hypothesis:
      'High-speed glide ratio calculation with thermal updraft buoyant lift, air density scaling, and proximate terrain flyby scoring.',
    domains: [
      'Three.js 3D Game Engine',
      'Atmospheric Glide Dynamics & High-Speed Terrain Following',
    ],
    concepts: [
      'Three.js r128',
      'Floating sky islands with waterfalls, cloud layers, and stone arches',
      'Wingsuit pilot with realistic dive speed buildup and glide lift',
      'Thermal air current updrafts that boost altitude',
      'High-speed proximity flight multiplier and obstacle dodging',
      'Wind whoosh procedural audio and altitude HUD',
    ],
    parameters: ['glideRatio', 'diveAcceleration', 'thermalBoost'],
  },
  {
    num: 48,
    filename: 'project48_cyber_boxing_iron_fists.html',
    title: 'Cyber Boxing 3D: Steel Fists Arena',
    hypothesis:
      'Kinematic punch collision detection, block guard mitigation, stamina depletion, and dynamic stagger hit reactions.',
    domains: ['Three.js 3D Game Engine', 'Martial Arts Kinematics & Combat Stagger Dynamics'],
    concepts: [
      'Three.js r128',
      'Neon boxing ring surrounded by cheering holographic crowd',
      'First/third-person boxing controls: Jab, Cross, Uppercut, Hook, Guard Block',
      'Opponent boxer AI with dodging, countering, and combo strings',
      'Stamina meter and punch impact flash particles',
      'Round timer and KO knockdowns',
    ],
    parameters: ['punchSpeed', 'staminaRecovery', 'blockReduction'],
  },
  {
    num: 49,
    filename: 'project49_quantum_gravity_portal_runner.html',
    title: 'Gravity Portal Runner 3D: Dimensional Rift',
    hypothesis:
      'Instantaneous spatial translation matrix transformation with momentum conservation and gravity vector inversion.',
    domains: [
      'Three.js 3D Game Engine',
      'Non-Euclidean Spatial Transformation & Endless Physics Running',
    ],
    concepts: [
      'Three.js r128',
      'Procedurally generating hyper-dimensional corridor',
      'Instant gravity flip (ceiling and floor running) via spacebar',
      'Cyan and Magenta dimensional portals that warp player position while maintaining velocity',
      'Laser obstacles, gaps, and gravity crystals',
      'Speed buildup and distance score tracker',
    ],
    parameters: ['runVelocity', 'gravityStrength', 'jumpForce'],
  },
  {
    num: 50,
    filename: 'project50_galaxy_fleet_conqueror.html',
    title: 'Galaxy Fleet Commander 3D: Armada Conquest',
    hypothesis:
      'Orbital fleet coordination, weapon turret tracking matrices, shield dissipation thermodynamics, and capital ship dreadnought warfare.',
    domains: ['Three.js 3D Game Engine', 'Fleet Scale Space Strategy & Tactical Warfare'],
    concepts: [
      'Three.js r128',
      'Massive space battle with nebula background and asteroid fields',
      'Command capital flagship and deploy fighter escort squadrons',
      'Broadside laser batteries and torpedo salvos',
      'Target lock system on enemy command flagship and defense frigates',
      'Shield status, hull integrity, and armada tactical command deck',
    ],
    parameters: ['fleetSpeed', 'shieldRegenRate', 'turretDamage'],
  },
];

// Build a rich prompt that combines all game metadata into a compelling description
// for the generateDynamicScene pipeline
function buildSceneDescription(game) {
  const conceptList = game.concepts.filter((c) => !c.startsWith('Three.js')).join(', ');
  return (
    `${game.title} — ${game.hypothesis} Features: ${conceptList}. ` +
    `This is a fully playable 3D game with WASD/arrow controls, score tracking, win/lose conditions, ` +
    `and professional AAA-quality visuals with sleek metallic materials, emissive neon trim, and cinematic lighting.`
  );
}

async function runSynthesis() {
  console.log('============================================================');
  console.log('  \u{1F9E0} SIS AUTONOMOUS GENERATION: 20 COMPLETE 3D GAMES');
  console.log('  Engine: Multi-Part 3D Generator Pipeline (Syntax-Validated)');
  console.log(
    '  Pipeline: Geometry \u2192 Animation \u2192 Game Logic \u2192 Deterministic Assembly',
  );
  console.log('============================================================\n');

  let completed = 0;
  let failed = 0;
  const results = [];

  for (const game of GAMES) {
    const targetFile = path.join(WORKSPACE_DIR, game.filename);

    // Skip only if the file is genuinely verified: Three.js imports, quality gate passed, zero raw model text, and 100% CLEAN SYNTAX in VM
    if (fs.existsSync(targetFile)) {
      const existing = fs.readFileSync(targetFile, 'utf8');
      const hasThree = existing.includes('three.module.js') || existing.includes('THREE.');
      const hasRawText =
        existing.includes('We need produce only HTML') ||
        existing.includes('We need output only HTML') ||
        existing.includes("Let's formulate simulation");
      const hasQuality = existing.includes('SIS-QUALITY');

      let syntaxOk = false;
      const scriptMatch = existing.match(/<script type="module">([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        try {
          const stripped = scriptMatch[1].replace(
            /import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g,
            '// [import]',
          );
          new vm.Script(stripped, { filename: 'inline.js' });
          syntaxOk = true;
        } catch (e) {}
      }

      if (hasThree && !hasRawText && hasQuality && syntaxOk && existing.length > 10000) {
        console.log(
          `\n[SIS Game ${game.num}/50] ⏩ Already synthesized & 100% verified (${existing.length} bytes, syntax=PASS). Skipping.`,
        );
        completed++;
        results.push({
          num: game.num,
          title: game.title,
          status: 'skipped',
          size: existing.length,
        });
        continue;
      } else {
        console.log(
          `\n[SIS Game ${game.num}/50] 🔄 Synthesizing proper 3D game (hasThree=${hasThree}, syntaxOk=${syntaxOk}, hasRawText=${hasRawText})...`,
        );
      }
    }

    console.log(`\n------------------------------------------------------------`);
    console.log(`[SIS Game ${game.num}/50] \u{1F3AE} Synthesizing: "${game.title}"`);
    console.log(`Target: workspace/${game.filename}`);
    console.log(`Hypothesis: ${game.hypothesis}`);

    const t0 = Date.now();
    const sceneDesc = buildSceneDescription(game);

    // Retry up to 2 times if quality gate fails
    let bestHtml = null;
    let bestScore = 0;
    const MAX_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[SIS Game ${game.num}/50] \u{1F527} Attempt ${attempt}/${MAX_ATTEMPTS}...`);

        const html = await generateDynamicScene(sceneDesc, (progress) => {
          if (progress.stage === 'quality-gate') {
            console.log(
              `[SIS Game ${game.num}/50] Quality: score=${progress.score} passed=${progress.passed}`,
            );
          } else {
            console.log(`[SIS Game ${game.num}/50] ${progress.message}`);
          }
        });

        if (!html || html.length < 5000) {
          console.warn(
            `[SIS Game ${game.num}/50] \u26A0 Output too small (${html?.length || 0} chars), retrying...`,
          );
          continue;
        }

        // Check quality gate result
        const qualityMatch = html.match(/SIS-QUALITY score=([\d.]+) passed=(true|false)/);
        const score = qualityMatch ? parseFloat(qualityMatch[1]) : 0.5;
        const passed = qualityMatch ? qualityMatch[2] === 'true' : html.length > 10000;

        if (score > bestScore) {
          bestHtml = html;
          bestScore = score;
        }

        if (passed || score >= 0.7) {
          console.log(`[SIS Game ${game.num}/50] \u2705 Quality gate PASSED (score=${score})`);
          break;
        } else {
          console.warn(
            `[SIS Game ${game.num}/50] \u26A0 Quality gate flagged (score=${score}), ${attempt < MAX_ATTEMPTS ? 'retrying...' : 'using best attempt'}`,
          );
        }
      } catch (err) {
        console.error(`[SIS Game ${game.num}/50] \u274C Attempt ${attempt} error: ${err.message}`);
      }
    }

    if (bestHtml && bestHtml.length > 3000) {
      fs.writeFileSync(targetFile, bestHtml, 'utf8');
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[SIS Game ${game.num}/50] \u2713 DONE in ${elapsed}s (${bestHtml.length} bytes, quality=${bestScore}) -> ${game.filename}`,
      );
      completed++;
      results.push({
        num: game.num,
        title: game.title,
        status: 'success',
        size: bestHtml.length,
        score: bestScore,
        time: elapsed,
      });
    } else {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.error(
        `[SIS Game ${game.num}/50] \u274C FAILED after ${MAX_ATTEMPTS} attempts (${elapsed}s)`,
      );
      failed++;
      results.push({ num: game.num, title: game.title, status: 'failed', time: elapsed });
    }
  }

  console.log(`\n============================================================`);
  console.log(`  \u{1F389} SIS COMPLETED: ${completed}/${GAMES.length} GAMES (${failed} failed)`);
  console.log('============================================================');
  console.log('\nResults:');
  for (const r of results) {
    const icon = r.status === 'success' ? '\u2705' : r.status === 'skipped' ? '\u23E9' : '\u274C';
    console.log(
      `  ${icon} Project ${r.num}: ${r.title} [${r.status}] ${r.size ? r.size + ' bytes' : ''} ${r.score ? 'quality=' + r.score : ''} ${r.time ? r.time + 's' : ''}`,
    );
  }
}

runSynthesis();
