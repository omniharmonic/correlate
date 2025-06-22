import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CorrelationEngine } from './CorrelationEngine';
import { CorrelationMapping } from '../shared/types/correlation';
import { UserFeedback, FeedbackType } from '../shared/types/feedback';
import { FieldType } from '../shared/types/schema';

vi.mock('./LLMOrchestrator'); // Mock the dependency even if not used directly in these tests

describe('CorrelationEngine - Refinement', () => {
  let engine: CorrelationEngine;

  beforeEach(() => {
    engine = new CorrelationEngine();
  });

  const initialMappings: CorrelationMapping[] = [
    { sourceField: { name: 'title', type: FieldType.STRING }, targetField: { name: 'heading', type: FieldType.STRING }, confidence: 0.8 },
    { sourceField: { name: 'author', type: FieldType.STRING }, targetField: { name: 'writer', type: FieldType.STRING }, confidence: 0.7 },
    { sourceField: { name: 'date', type: FieldType.DATE }, targetField: { name: 'publish_date', type: FieldType.DATE }, confidence: 0.9 },
  ];

  it('should approve a mapping by setting its confidence to 1.0', () => {
    const feedback: UserFeedback[] = [{
      originalMapping: initialMappings[0],
      type: FeedbackType.APPROVE,
    }];

    const refined = engine.refineCorrelation(initialMappings, feedback);
    expect(refined[0].confidence).toBe(1.0);
    expect(refined.length).toBe(3);
  });

  it('should reject a mapping by removing it from the list', () => {
    const feedback: UserFeedback[] = [{
      originalMapping: initialMappings[1],
      type: FeedbackType.REJECT,
    }];

    const refined = engine.refineCorrelation(initialMappings, feedback);
    expect(refined.length).toBe(2);
    expect(refined.find(m => m.sourceField.name === 'author')).toBeUndefined();
  });

  it('should edit a mapping by replacing it and setting confidence to 1.0', () => {
    const correctedMapping: CorrelationMapping = {
      sourceField: { name: 'date', type: FieldType.DATE },
      targetField: { name: 'published_on', type: FieldType.DATE },
      confidence: 0.95, // This will be overwritten to 1.0
    };

    const feedback: UserFeedback[] = [{
      originalMapping: initialMappings[2],
      type: FeedbackType.EDIT,
      correctedMapping: correctedMapping,
    }];

    const refined = engine.refineCorrelation(initialMappings, feedback);
    expect(refined.length).toBe(3);
    const updatedMapping = refined.find(m => m.sourceField.name === 'date');
    expect(updatedMapping.targetField.name).toBe('published_on');
    expect(updatedMapping.confidence).toBe(1.0);
  });

  it('should handle multiple feedback items correctly', () => {
    const feedback: UserFeedback[] = [
      { originalMapping: initialMappings[0], type: FeedbackType.APPROVE },
      { originalMapping: initialMappings[1], type: FeedbackType.REJECT },
    ];

    const refined = engine.refineCorrelation(initialMappings, feedback);
    expect(refined.length).toBe(2);
    expect(refined[0].confidence).toBe(1.0);
    expect(refined.find(m => m.sourceField.name === 'author')).toBeUndefined();
  });

  it('should ignore feedback for a non-existent mapping', () => {
    const nonExistentMapping: CorrelationMapping = {
      sourceField: { name: 'tags', type: FieldType.ARRAY },
      targetField: { name: 'keywords', type: FieldType.ARRAY },
      confidence: 0.5,
    };
    const feedback: UserFeedback[] = [{
      originalMapping: nonExistentMapping,
      type: FeedbackType.APPROVE,
    }];

    const refined = engine.refineCorrelation(initialMappings, feedback);
    expect(refined).toEqual(initialMappings);
  });
}); 