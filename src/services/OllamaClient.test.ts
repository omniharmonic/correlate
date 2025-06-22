import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from './OllamaClient';
import { YamlSchema, FieldType, SchemaField } from '../shared/types/schema';
import { CorrelationPrompt } from '../shared/interfaces/correlate';
import { CorrelationMapping } from '../shared/types/correlation';
import { Ollama } from 'ollama';

vi.mock('ollama');

describe('OllamaClient', () => {
  let client: OllamaClient;
  let mockChat: vi.Mock;

  beforeEach(() => {
    // We are mocking the Ollama module, so we can cast the mocked constructor.
    const MockOllama = Ollama as vi.MockedClass<typeof Ollama>;
    // Clear any previous mock implementations
    MockOllama.mockClear();
    // Instantiate our client, which will use the mocked Ollama constructor
    client = new OllamaClient();
    // Get the instance of the mocked Ollama class
    const mockOllamaInstance = MockOllama.mock.instances[0];
    // Get the chat method from the instance
    mockChat = mockOllamaInstance.chat as vi.Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('should call ollama.chat with the correct prompt structure', async () => {
    const mockResponse = {
      message: {
        content: JSON.stringify({ mappings: [], unmappedSourceFields: [], unmappedTargetFields: [] }),
      },
    };
    mockChat.mockResolvedValue(mockResponse);

    await client.correlateSchemata(correlationPrompt);

    expect(mockChat).toHaveBeenCalledOnce();
    const callArgs = mockChat.mock.calls[0][0];
    
    expect(callArgs.model).toBe('llama3');
    expect(callArgs.format).toBe('json');
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe('system');
    expect(callArgs.messages[1].role).toBe('user');
    expect(callArgs.messages[1].content).toContain(JSON.stringify(sourceSchema, null, 2));
    expect(callArgs.messages[1].content).toContain(JSON.stringify(targetSchema, null, 2));
  });

  it('should parse and return the correlation result from the Ollama response', async () => {
    const expectedResult = {
      mappings: [{ sourceField: { name: 'title' }, targetField: { name: 'heading' }, confidence: 0.8 }] as CorrelationMapping[],
      unmappedSourceFields: [] as SchemaField[],
      unmappedTargetFields: [] as SchemaField[],
    };
    const mockResponse = {
      message: {
        content: JSON.stringify(expectedResult),
      },
    };
    mockChat.mockResolvedValue(mockResponse);

    const result = await client.correlateSchemata(correlationPrompt);

    expect(result).toEqual(expectedResult);
  });

  it('should throw an error if the Ollama API call fails', async () => {
    mockChat.mockRejectedValue(new Error('API Error'));

    await expect(client.correlateSchemata(correlationPrompt)).rejects.toThrow('Failed to correlate schemas using Ollama.');
  });
}); 