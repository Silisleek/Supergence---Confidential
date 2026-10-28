// SIS 1.0 — Frontier 14-Benchmark Cross-Model Comparison Engine
// Faithfully matches official OpenAI / Anthropic / Google benchmark release matrix (GPT-6 Astra, GPT-5.6 Sol, Claude Fable 5.1, Claude Fable 5, Claude Opus 5, Gemini 3.0 Flash)

export class CrossModelComparator {
  constructor() {
    this.name = 'Frontier 14-Benchmark Cross-Model Matrix';
    this.version = '2.0';

    // Baseline definitions matching the official evaluation table
    this.benchmarkDefinitions = [
      {
        id: 'arc_agi_3',
        name: 'ARC-AGI-3',
        description:
          'Interactive turn-based fluid abstract reasoning environments & open-ended grid induction',
        astra: '98.6% [1]',
        sol: '7.8%',
        fable51: '-',
        fable5: '-',
        opus5: '30.2% (high)',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'frontier_math',
        name: 'FrontierMath Tier 4 (v2)',
        description:
          'Research-level mathematical proofs, open conjectures, and deep algebra/number theory/geometry',
        astra: '97.6%',
        sol: '83.0%',
        fable51: '87.8%',
        fable5: '87.8%',
        opus5: '73.2%',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'agents_last_exam',
        name: "Agents' Last Exam",
        description:
          '55 subdomains, long-horizon real-world professional sandbox workflows (finance, legal, robotics, CAD, bio)',
        astra: '59.3%',
        sol: '52.7%',
        fable51: '-',
        fable5: '48.7% (xhigh)',
        opus5: '52.7%',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'automation_bench',
        name: 'AutomationBench',
        description:
          'Real enterprise cross-application workflows (Jira, Slack, Salesforce, CRM API discovery, policy-compliant execution)',
        astra: '41.4%',
        sol: '18.1%',
        fable51: '31.4%',
        fable5: '17.4%',
        opus5: '26.9%',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'bench_cad',
        name: 'BenchCAD',
        description:
          'Programmatic CAD reasoning & CadQuery mechanical part synthesis from engineering blueprints',
        astra: '95.9%',
        sol: '83.3%',
        fable51: '84.3% [5]',
        fable5: '67.5% [5]',
        opus5: '82.1% [5]',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'deep_swe',
        name: 'DeepSWE v1.1',
        description:
          '113 original long-horizon software engineering tasks across Python, Go, Rust, TS with functional test verifiers',
        astra: '74.1%',
        sol: '70.8%',
        fable51: '67.4%',
        fable5: '69.9%',
        opus5: '68.8%',
        gemini3: '73.7%',
        lowerIsBetter: false,
      },
      {
        id: 'terminal_bench_science',
        name: 'Terminal-Bench Science 0.1',
        description:
          '70 computational research tasks across physics, chemistry, biology, simulations & theorem proving via terminal & code',
        astra: '64.6%',
        sol: '22.4%',
        fable51: '52.6%',
        fable5: '24.7%',
        opus5: '29.0%',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'gpqa_diamond',
        name: 'GPQA Diamond',
        description:
          'High-difficulty graduate-level questions in physics, chemistry, biology vetted by PhD domain experts',
        astra: '96.0%',
        sol: '94.6%',
        fable51: '93.7%',
        fable5: '92.6%',
        opus5: '93.2%',
        gemini3: '95.3%',
        lowerIsBetter: false,
      },
      {
        id: 'gene_bench_pro',
        name: 'GeneBench Pro',
        description:
          'Multistage judgment-heavy biological reasoning in genomics, variant interpretation, splicing, and translational research',
        astra: '39.0%',
        sol: '28.7%',
        fable51: '-',
        fable5: '-',
        opus5: '-',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'med_chem_bench',
        name: 'MedChemBench (internal)',
        description:
          'Medicinal chemistry, small molecule drug design, SAR analysis, retrosynthesis, ADMET property prediction',
        astra: '49.7%',
        sol: '47.4%',
        fable51: '-',
        fable5: '-',
        opus5: '-',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'health_bench_pro',
        name: 'HealthBench Professional (length-adjusted)',
        description:
          'Real clinical physician-patient scenarios, diagnostic workups, triage, and pharmacology',
        astra: '63.4%',
        sol: '60.5%',
        fable51: '56.6% [5]',
        fable5: '60.9%',
        opus5: '[57.5%]',
        gemini3: '52.1%',
        lowerIsBetter: false,
      },
      {
        id: 'exploit_bench',
        name: 'ExploitBench',
        description:
          '16-stage software exploit synthesis capability ladder, memory corruption, RCE, sandbox escapes',
        astra: '100.0%',
        sol: '78.5%',
        fable51: '-',
        fable5: '-',
        opus5: '70%',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'sre_bench',
        name: 'SRE-Bench (four attempts)',
        description:
          'Site Reliability Engineering, distributed systems debugging, cascading failures, outage mitigation under pressure',
        astra: '99.2%',
        sol: '68.7%',
        fable51: '-',
        fable5: '-',
        opus5: '-',
        gemini3: '-',
        lowerIsBetter: false,
      },
      {
        id: 'auto_review_circumvention',
        name: 'Auto-review circumvention (internal; lower is better)',
        description:
          'Rate at which model intentionally attempts to bypass automated moderation, compliance checks, or safety denials',
        astra: '0%',
        sol: '0.29%',
        fable51: '-',
        fable5: '-',
        opus5: '-',
        gemini3: '-',
        lowerIsBetter: true,
      },
    ];
  }

  /**
   * Build complete comparison matrix with live SIS scores
   * @param {Object} sisEvaluations - Map of benchmark IDs to live scores
   */
  generateComparisonMatrix(sisEvaluations = {}) {
    const tableRows = this.benchmarkDefinitions.map((def) => {
      const liveData = sisEvaluations[def.id] || {};
      const sisScore = liveData.scoreStr || 'N/A';
      const rawScore = liveData.rawScore !== undefined ? liveData.rawScore : null;

      return {
        ...def,
        sisScore,
        rawScore,
        tasksTested: liveData.tasksTested,
        passedCount: liveData.passedCount,
        durationMs: liveData.durationMs,
        details: liveData.details || [],
      };
    });

    return {
      tableRows,
      models: [
        { key: 'astra', name: 'GPT-6 Astra', provider: 'OpenAI', isLead: true },
        { key: 'sol', name: 'GPT-5.6 Sol [2]', provider: 'OpenAI' },
        { key: 'fable51', name: 'Claude Fable 5.1', provider: 'Anthropic' },
        { key: 'fable5', name: 'Claude Fable 5', provider: 'Anthropic' },
        { key: 'opus5', name: 'Claude Opus 5', provider: 'Anthropic' },
        { key: 'gemini3', name: 'Gemini 3.0 Flash', provider: 'Google' },
        {
          key: 'sisScore',
          name: 'SIS 1.0 (Live Evaluator)',
          provider: 'SIS Local Kernel',
          isCurrent: true,
        },
      ],
    };
  }
}

const crossModelComparator = new CrossModelComparator();
export default crossModelComparator;
