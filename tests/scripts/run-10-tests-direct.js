import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:20128/v1';
const API_KEY = process.env.LOCAL_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';

// Use the working fast model
const MODEL = 'flm/nemotron-3.5-lightning';

const prompts = [
  {
    name: 'astro-invasion-fps.html',
    message:
      'Create a complete Three.js r128 FPS: Astro Invasion. Spacecraft cockpit, enemy UFO waves, laser weapons, shield energy, particle explosions, 3D models, HUD showing health/ammo/score/radar. Single HTML file. No explanation - just working code.',
  },
  {
    name: 'physics-sandbox.html',
    message:
      'Create a complete Three.js r128 physics sandbox. Interactive objects (boxes, spheres, cylinders), gravity slider, friction controls, collision detection, soft-body cloth sim, real-time physics stats. CDN Three.js r128. Single file. No explanation.',
  },
  {
    name: 'procedural-terrain.html',
    message:
      'Three.js r128 procedural terrain: heightmap chunks, biome coloring, water, day/night, weather (rain/fog/snow), trees/rocks, first-person controls. Single HTML file. No explanation.',
  },
  {
    name: 'web-adventure.html',
    message:
      'Three.js r128 fantasy adventure: dungeon exploration, inventory, NPC dialogue, puzzles, quests, torch lighting, sound zones. Single HTML file. No explanation.',
  },
  {
    name: 'space-simulator.html',
    message:
      'Three.js r128 space sim: procedural planets, orbital mechanics, ship controls, asteroid mining, resources, stars, warp drive. Single HTML file. No explanation.',
  },
  {
    name: 'voxel-world.html',
    message:
      'Three.js r128 voxel world: block terrain, day/night, weather, crafting, mining/building, caves, trees, inventory. Single HTML file. No explanation.',
  },
  {
    name: 'puzzle-platformer.html',
    message:
      'Three.js r128 puzzle platformer: character movement, jumping, moving platforms, collectibles, levels, checkpoints, particles. Single HTML file. No explanation.',
  },
  {
    name: 'racing-game.html',
    message:
      'Three.js r128 racing: anti-gravity cars, looping track, speed boosts, particle trails, lap timing, neon aesthetic. Single HTML file. No explanation.',
  },
  {
    name: 'tower-defense.html',
    message:
      'Three.js r128 tower defense: curved path, laser/cannon/missile towers, enemy waves, upgrades, particles. Single HTML file. No explanation.',
  },
  {
    name: 'survival-horror.html',
    message:
      'Three.js r128 horror: first-person, flashlight, fog, chasing enemy AI, heartbeat sounds, jump scares. Single HTML file. No explanation.',
  },
];

async function callAIWithRetry(prompt, maxTokens = 12000, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }));
        const errMsg = JSON.stringify(err);

        if (
          errMsg.includes('rate_limit') ||
          errMsg.includes('exhausted') ||
          response.status === 429
        ) {
          const waitTime = Math.min(5000 * (attempt + 1), 30000);
          console.log(`    Rate limited, waiting ${waitTime / 1000}s...`);
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err) {
      if (
        attempt < retries &&
        (err.message.includes('timeout') || err.message.includes('connect'))
      ) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('All retries exhausted');
}

async function runTests() {
  console.log('=== Running 10 Direct 3D Game Prompts Against Supergence LLM ===');
  console.log(`Model: ${MODEL}\n`);
  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const { name, message } = prompts[i];
    console.log(`\n[PROMPT ${i + 1}/10] ${name}`);
    console.log(`Prompt: ${message.substring(0, 80)}...`);

    try {
      const startTime = Date.now();
      const response = await callAIWithRetry(message);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const filePath = path.join('workspace', name);
      fs.writeFileSync(filePath, response);

      const fileSize = fs.statSync(filePath).size;
      console.log(`✅ SUCCESS - ${fileSize} bytes in ${elapsed}s`);
      console.log(`   File saved: workspace/${name}`);

      results.push({
        name,
        success: true,
        size: fileSize,
        time: elapsed,
        url: `http://localhost:3008/workspace/${name}`,
        prompt: message,
      });
    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
      results.push({
        name,
        success: false,
        error: error.message,
        prompt: message,
      });
    }
  }

  console.log('\n\n=== TEST RESULTS SUMMARY ===');
  let successCount = 0;
  let totalSize = 0;
  let totalTime = 0;

  results.forEach((r, i) => {
    if (r.success) {
      successCount++;
      totalSize += r.size;
      totalTime += parseFloat(r.time);
      console.log(`\n${i + 1}. ${r.name}: ✅ SUCCESS`);
      console.log(`   Size: ${r.size} bytes`);
      console.log(`   Time: ${r.time}s`);
      console.log(`   URL: ${r.url}`);
      console.log(`   Prompt: ${r.prompt}`);
      console.log(`   Output: File saved to workspace/${r.name}`);
    } else {
      console.log(`\n${i + 1}. ${r.name}: ❌ FAILED`);
      console.log(`   Error: ${r.error}`);
      console.log(`   Prompt: ${r.prompt}`);
    }
  });

  console.log('\n\n=== FINAL STATISTICS ===');
  console.log(`Total Tests: 10`);
  console.log(`Successful: ${successCount}/10`);
  console.log(`Total Size Generated: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`Total Time: ${totalTime.toFixed(1)}s`);
  console.log(`Average Time: ${(totalTime / 10).toFixed(1)}s`);

  fs.writeFileSync('test-results-10-games.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to test-results-10-games.json');
}

runTests().catch(console.error);
