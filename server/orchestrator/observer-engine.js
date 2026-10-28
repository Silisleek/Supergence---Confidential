// SIS 1.0 — Observer Engine
// Pillar 8: Cognitive alignment, sensory inspection, and output integrity surveillance

export class ObserverEngine {
  constructor() {
    this.observations = [];
  }

  /**
   * Complete multi-dimensional observation pass
   */
  observe({ userPrompt, currentDraft, images = [], workspaceFiles = [] }) {
    const startTime = Date.now();
    const cognitive = this.observeCognitiveDrift(userPrompt, currentDraft);
    const sensory = this.observeSensory(images, workspaceFiles);
    const integrity = this.observeOutputIntegrity(currentDraft, userPrompt);

    const report = {
      timestamp: startTime,
      cognitive,
      sensory,
      integrity,
      overallHealth: Number(((cognitive.score + integrity.score) / 2).toFixed(2)),
      alertFlags: [...cognitive.flags, ...integrity.flags],
    };

    this.observations.unshift(report);
    if (this.observations.length > 50) this.observations.pop();

    return report;
  }

  /**
   * Monitor for cognitive drift from original prompt
   */
  observeCognitiveDrift(userPrompt = '', draft = '') {
    const promptTerms = (userPrompt || '').toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const draftText = (draft || '').toLowerCase();
    const flags = [];

    if (promptTerms.length === 0) return { score: 1.0, flags: [] };

    let coveredTerms = 0;
    for (const t of promptTerms) {
      if (draftText.includes(t)) coveredTerms++;
    }

    const coverage = coveredTerms / promptTerms.length;
    if (coverage < 0.35 && draft.length > 200) {
      flags.push('Potential cognitive drift: draft has low keyword alignment with user prompt');
    }

    return {
      score: Math.min(1.0, 0.4 + coverage * 0.6),
      coverage: Number(coverage.toFixed(2)),
      flags,
    };
  }

  /**
   * Observe incoming sensory inputs (images, DOM, visual media)
   */
  observeSensory(images = [], workspaceFiles = []) {
    return {
      activeImagesCount: images.length,
      workspaceArtifactsCount: workspaceFiles.length,
      sensoryGrounded: images.length > 0 || workspaceFiles.length > 0,
      imageTypes: images.map((img) =>
        typeof img === 'string' && img.startsWith('data:image/')
          ? img.slice(5, img.indexOf(';'))
          : 'image/raw',
      ),
    };
  }

  /**
   * Verify output completeness and absence of anti-patterns
   */
  observeOutputIntegrity(draft = '', userPrompt = '') {
    const flags = [];
    let score = 1.0;

    if (!draft || draft.trim().length === 0) {
      flags.push('Empty output detected');
      return { score: 0.0, flags };
    }

    if (/\/\/\s*TODO\b/i.test(draft)) {
      flags.push('Unfinished TODO placeholder comment detected in output');
      score -= 0.15;
    }

    if (/```[a-z]*\s*\n\s*```/i.test(draft)) {
      flags.push('Empty code block fence detected');
      score -= 0.1;
    }

    // Numbered list completeness check: if user asked for N items
    const listMatch = userPrompt.match(/(\d+)\s*(?:things|points|items|parts|features|pillars)/i);
    if (listMatch) {
      const requestedCount = parseInt(listMatch[1], 10);
      const enumeratedCount = (draft.match(/(?:^|\n)\s*(?:\d+[\.\)]|#+\s*\d+[\.\)])\s+/g) || [])
        .length;
      if (enumeratedCount < requestedCount * 0.7) {
        flags.push(
          `User requested ${requestedCount} items; detected only ${enumeratedCount} enumerated sections in draft`,
        );
        score -= 0.2;
      }
    }

    return {
      score: Math.max(0.1, Number(score.toFixed(2))),
      flags,
    };
  }
}

const observerEngine = new ObserverEngine();
export default observerEngine;
