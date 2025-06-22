import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMOrchestrator } from './LLMOrchestrator';
import { OllamaClient } from './OllamaClient';
import { GeminiClient } from './GeminiClient';
import { CorrelationPrompt } from '../shared/interfaces/correlate';
import { YamlSchema, FieldType, SchemaField } from '../shared/types/schema';
import { CorrelationResult } from '../shared/types/correlation';

// Mock the clients
vi.mock('./OllamaClient');
vi.mock('./GeminiClient');

describe('LLMOrchestrator', () => {
  const MockOllamaClient = OllamaClient as vi.MockedClass<typeof OllamaClient>;
  const MockGeminiClient = GeminiClient as vi.MockedClass<typeof GeminiClient>;

  const correlationPrompt: CorrelationPrompt = {
    sourceSchema: { name: 's', version: '1', fields: [] },
    targetSchema: { name: 't', version: '1', fields: [] },
  };

  const ollamaSuccess: CorrelationResult = { mappings: [{ sourceField: { name: 'a', type: FieldType.STRING }, targetField: { name: 'b', type: FieldType.STRING }, confidence: 1 }], unmappedSourceFields: [], unmappedTargetFields: [] };
  const geminiSuccess: CorrelationResult = { mappings: [{ sourceField: { name: 'c', type: FieldType.STRING }, targetField: { name: 'd', type: FieldType.STRING }, confidence: 1 }], unmappedSourceFields: [], unmappedTargetFields: [] };

  beforeEach(() => {
    // Clear all mocks before each test
    MockOllamaClient.mockClear();
    MockGeminiClient.mockClear();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('should use the primary client (Ollama) when it succeeds', async () => {
    MockOllamaClient.prototype.correlateSchemata.mockResolvedValue(ollamaSuccess);
    const orchestrator = new LLMOrchestrator();
    const result = await orchestrator.processCorrelation(correlationPrompt);

    expect(result).toEqual(ollamaSuccess);
    expect(MockOllamaClient.prototype.correlateSchemata).toHaveBeenCalledOnce();
    expect(MockGeminiClient).not.toHaveBeenCalled();
  });

  it('should fall back to the Gemini client when Ollama fails and API key is present', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    MockOllamaClient.prototype.correlateSchemata.mockRejectedValue(new Error('Ollama failed'));
    MockGeminiClient.prototype.correlateSchemata.mockResolvedValue(geminiSuccess);

    const orchestrator = new LLMOrchestrator();
    const result = await orchestrator.processCorrelation(correlationPrompt);

    expect(result).toEqual(geminiSuccess);
    expect(MockOllamaClient.prototype.correlateSchemata).toHaveBeenCalledOnce();
    expect(MockGeminiClient.prototype.correlateSchemata).toHaveBeenCalledOnce();
    expect(MockGeminiClient).toHaveBeenCalledWith('test-key');
  });

  it('should throw an error if Ollama fails and no Gemini API key is present', async () => {
    delete process.env.GEMINI_API_KEY;
    MockOllamaClient.prototype.correlateSchemata.mockRejectedValue(new Error('Ollama failed'));

    const orchestrator = new LLMOrchestrator();

    await expect(orchestrator.processCorrelation(correlationPrompt)).rejects.toThrow('Primary LLM client failed and no fallback is configured.');
    expect(MockGeminiClient).not.toHaveBeenCalled();
  });

  it('should throw an error if both Ollama and Gemini clients fail', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    MockOllamaClient.prototype.correlateSchemata.mockRejectedValue(new Error('Ollama failed'));
    MockGeminiClient.prototype.correlateSchemata.mockRejectedValue(new Error('Gemini failed'));

    const orchestrator = new LLMOrchestrator();

    await expect(orchestrator.processCorrelation(correlationPrompt)).rejects.toThrow('Both primary and fallback LLM clients failed to process the correlation.');
    expect(MockGeminiClient).toHaveBeenCalledWith('test-key');
  });
}); 