import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CorrelationEngine } from './CorrelationEngine';
import { LLMOrchestrator } from './LLMOrchestrator';
import { YamlSchema, FieldType, SchemaField } from '../shared/types/schema';
import { CorrelationResult } from '../shared/types/correlation';

vi.mock('./LLMOrchestrator');

describe('CorrelationEngine', () => {
  let engine: CorrelationEngine;
  const MockLLMOrchestrator = LLMOrchestrator as vi.MockedClass<typeof LLMOrchestrator>;

  beforeEach(() => {
    MockLLMOrchestrator.mockClear();
    engine = new CorrelationEngine();
  });

  const sourceSchema: YamlSchema = {
    name: 'Source',
    version: '1.0',
    fields: [{ name: 'author', type: FieldType.STRING }],
  };

  const targetSchema: YamlSchema = {
    name: 'Target',
    version: '1.0',
    fields: [{ name: 'creator', type: FieldType.STRING }],
  };

  it('should call the LLMOrchestrator with the correct prompt', async () => {
    const mockResult: CorrelationResult = { mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] };
    MockLLMOrchestrator.prototype.processCorrelation.mockResolvedValue(mockResult);

    await engine.generateCorrelation(sourceSchema, targetSchema);

    expect(MockLLMOrchestrator.prototype.processCorrelation).toHaveBeenCalledOnce();
    const expectedPrompt = {
      sourceSchema,
      targetSchema,
    };
    expect(MockLLMOrchestrator.prototype.processCorrelation).toHaveBeenCalledWith(expectedPrompt);
  });

  it('should return the result from the LLMOrchestrator on success', async () => {
    const mockResult: CorrelationResult = {
      mappings: [{
        sourceField: { name: 'author', type: FieldType.STRING },
        targetField: { name: 'creator', type: FieldType.STRING },
        confidence: 0.9,
      }],
      unmappedSourceFields: [],
      unmappedTargetFields: [],
    };
    MockLLMOrchestrator.prototype.processCorrelation.mockResolvedValue(mockResult);

    const result = await engine.generateCorrelation(sourceSchema, targetSchema);
    expect(result).toEqual(mockResult);
  });

  it('should throw an error if the LLMOrchestrator fails', async () => {
    MockLLMOrchestrator.prototype.processCorrelation.mockRejectedValue(new Error('Orchestrator Error'));

    await expect(engine.generateCorrelation(sourceSchema, targetSchema)).rejects.toThrow('Failed to generate correlation.');
  });

  it('should hit the cache on the second call for the same schemas', async () => {
    const mockResult: CorrelationResult = { mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] };
    MockLLMOrchestrator.prototype.processCorrelation.mockResolvedValue(mockResult);

    // First call - should call the LLM
    await engine.generateCorrelation(sourceSchema, targetSchema);
    expect(MockLLMOrchestrator.prototype.processCorrelation).toHaveBeenCalledTimes(1);

    // Second call - should hit the cache
    const result = await engine.generateCorrelation(sourceSchema, targetSchema);
    expect(result).toEqual(mockResult);
    expect(MockLLMOrchestrator.prototype.processCorrelation).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should not hit the cache for different schemas', async () => {
    const mockResult1: CorrelationResult = { mappings: [{ sourceField: { name: 'a', type: FieldType.STRING }, targetField: { name: 'b', type: FieldType.STRING }, confidence: 1 }], unmappedSourceFields: [], unmappedTargetFields: [] };
    const mockResult2: CorrelationResult = { mappings: [{ sourceField: { name: 'c', type: FieldType.STRING }, targetField: { name: 'd', type: FieldType.STRING }, confidence: 1 }], unmappedSourceFields: [], unmappedTargetFields: [] };
    MockLLMOrchestrator.prototype.processCorrelation
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2);

    const differentTargetSchema: YamlSchema = { ...targetSchema, name: 'DifferentTarget' };

    // First call
    await engine.generateCorrelation(sourceSchema, targetSchema);
    expect(MockLLMOrchestrator.prototype.processCorrelation).toHaveBeenCalledTimes(1);

    // Second call with different schema
    await engine.generateCorrelation(sourceSchema, differentTargetSchema);
    expect(MockLLMOrchestrator.prototype.processCorrelation).toHaveBeenCalledTimes(2);
  });
}); 