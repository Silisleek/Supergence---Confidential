import { taskLearning } from '../services/taskLearning.js';
import library from '../services/learningLibrary.js';

export class InternetLearningEngine {
  constructor() {
    this.name = 'Cross-domain Source Learning';
    this.intervalId = null;
  }
  setBroadcast(fn) {
    this.broadcast = fn;
    taskLearning.listeners.add((snapshot) =>
      fn('internet-learning-status', {
        status: snapshot.running ? 'studying' : 'updated',
        studies: snapshot.studies.map(({ id, topic, status }) => ({ id, topic, status })),
      }),
    );
  }
  setBrain(brain) {
    this.brain = brain;
  }
  async initialize() {
    return { initialized: true, state: this.getStatus() };
  }
  start(intervalMs = 4 * 60 * 1000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(
      () =>
        this.runAutonomousCycle().catch((error) => console.warn('[SourceLearning]', error.message)),
      intervalMs,
    );
    this.intervalId.unref();
  }
  stop() {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
  generateCurriculumQueries() {
    return taskLearning.state.studies
      .filter((study) => study.status === 'queued')
      .map((study) => ({
        domain: study.plan?.taskFamily || 'unclassified',
        query: study.topic,
        topic: study.topic,
      }));
  }
  async runAutonomousCycle(topic) {
    if (topic) taskLearning.enqueue({ topic });
    await taskLearning.drain();
    return this.getStatus();
  }
  async learnOnDemand(text) {
    return library.search(String(text || '').slice(0, 4000));
  }
  getRecentLearnedKnowledge(limit = 4) {
    return taskLearning
      .snapshot()
      .studies.filter((study) => study.status === 'studied')
      .slice(0, limit)
      .map((study) => ({
        topic: study.topic,
        domain: study.plan.taskFamily,
        timestamp: Date.parse(study.completedAt),
        sourcesCount:
          study.sources?.filter((source) => source.fetchStatus >= 200 && source.fetchStatus < 300)
            .length || 0,
      }));
  }
  getStatus() {
    const studies = taskLearning.state.studies;
    const learned = this.getRecentLearnedKnowledge(50);
    return {
      enabled: Boolean(this.intervalId),
      isSearching: taskLearning.running,
      lastLearnedTopic: learned[0]?.topic || null,
      totalSearches: studies.some(
        (study) => study.sources?.length && !Array.isArray(study.searchQueries),
      )
        ? null
        : studies.reduce((sum, study) => sum + (study.searchQueries?.length || 0), 0),
      totalLearnings: studies.filter((study) => study.status === 'studied').length,
      rulesFormulated: 0,
      lastCycleAt: learned[0]?.timestamp || null,
      recentTopics: learned.slice(0, 5),
      state: { learnedTopics: learned },
      limitation:
        'Only explicitly queued studies use the network. Sources become cited references, never mandatory operating rules or proof of mastery.',
    };
  }
}
export default new InternetLearningEngine();
