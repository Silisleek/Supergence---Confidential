import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configureDefaultProvider,
  getDefaultModel,
  getFallbackModel,
  getProviderConfig,
  resolveClientAndModel,
  DEFAULT_MODEL,
} from '../../server/api/provider.js';

test('Provider settings lifecycle: dynamically updates default client and models at runtime', () => {
  const initialConfig = getProviderConfig();
  assert.ok(initialConfig.baseURL, 'Initial config should have a baseURL');

  const updated = configureDefaultProvider({
    baseURL: 'http://127.0.0.1:29999/v1',
    apiKey: 'test-lifecycle-key',
    defaultModel: 'test-model-alpha',
    fallbackModel: 'test-model-beta,test-model-gamma',
  });

  assert.equal(updated.baseURL, 'http://127.0.0.1:29999/v1');
  assert.equal(updated.defaultModel, 'test-model-alpha');
  assert.equal(updated.fallbackModel, 'test-model-beta,test-model-gamma');
  assert.deepEqual(updated.fallbackModels, ['test-model-beta', 'test-model-gamma']);

  // Verify getters and live bindings
  assert.equal(getDefaultModel(), 'test-model-alpha');
  assert.equal(getFallbackModel(), 'test-model-beta,test-model-gamma');

  // Verify resolution uses the newly configured client and model
  const resolved = resolveClientAndModel();
  assert.equal(resolved.isCustom, false);
  assert.equal(resolved.baseURL, 'http://127.0.0.1:29999/v1');
  assert.equal(resolved.model, 'test-model-alpha');
  assert.ok(resolved.client, 'Client instance should be created with new baseURL');

  // Restore initial config to avoid side effects on other tests
  configureDefaultProvider({
    baseURL: initialConfig.baseURL,
    defaultModel: initialConfig.defaultModel,
    fallbackModel: initialConfig.fallbackModel,
  });
});
