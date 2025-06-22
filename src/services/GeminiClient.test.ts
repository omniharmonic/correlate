import { describe, it, expect, vi } from 'vitest';
import { GeminiClient } from './GeminiClient';
import { YamlSchema, FieldType, SchemaField } from '../shared/types/schema';
import { CorrelationPrompt } from '../shared/interfaces/correlate';
import { CorrelationMapping } from '../shared/types/correlation';
import { GoogleGenerativeAI } from '@google/generative-ai';

vi.mock('@google/generative-ai');

describe('GeminiClient', () => {
  const MockGoogleGenerativeAI = GoogleGenerativeAI as vi.MockedClass<typeof GoogleGenerativeAI>;
  let mockGenerateContent: vi.Mock;

  const setupMocks = () => {
    mockGenerateContent = vi.fn();
    MockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: mockGenerateContent,
      })),
    } as any));
  };

  const sourceSchema: YamlSchema = {
    name: 'Source',
    version: '1.0',
    fields: [{ name: 'title', type: FieldType.STRING }],
  };

  const targetSchema: YamlSchema = {
    name: 'Target',
    version: '1.0',
    fields: [{ name: 'heading', type: FieldType.STRING }],
  };

  const correlationPrompt: CorrelationPrompt = {
    sourceSchema,
    targetSchema,
  };

  it('should throw an error if API key is not provided', () => {
    expect(() => new GeminiClient('')).toThrow('Gemini API key was not provided to the constructor.');
    expect(() => new GeminiClient(null)).toThrow('Gemini API key was not provided to the constructor.');
  });

  it('should call the Gemini API with the correct prompt', async () => {
    setupMocks();
    const client = new GeminiClient('test-api-key');
    const mockResponse = {
      response: {
        text: () => JSON.stringify({ mappings: [] }),
      },
    };
    mockGenerateContent.mockResolvedValue(mockResponse);

    await client.correlateSchemata(correlationPrompt);

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    const fullPrompt = mockGenerateContent.mock.calls[0][0];
    expect(fullPrompt).toContain('You are an expert');
  });

  it('should parse and return the correlation result', async () => {
    setupMocks();
    const client = new GeminiClient('test-api-key');
    const expectedResult = { mappings: [{ sourceField: { name: 'title' }, targetField: { name: 'heading' }, confidence: 0.8 }] };
    const mockResponse = {
      response: { text: () => JSON.stringify(expectedResult) },
    };
    mockGenerateContent.mockResolvedValue(mockResponse);

    const result = await client.correlateSchemata(correlationPrompt);
    expect(result.mappings).toEqual(expectedResult.mappings);
  });
  
  it('should throw an error if the Gemini API call fails', async () => {
    setupMocks();
    const client = new GeminiClient('test-api-key');
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    await expect(client.correlateSchemata(correlationPrompt)).rejects.toThrow('Failed to correlate schemas using Gemini.');
  });
}); 