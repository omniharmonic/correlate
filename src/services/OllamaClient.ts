import { Ollama } from 'ollama';
import { LLMClient, CorrelationPrompt, TranslatedTag, TranslationPrompt } from '../shared/interfaces/correlate';
import { CorrelationResult } from '../shared/types/correlation';

export class OllamaClient implements LLMClient {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
  }

  public async correlateSchemata(prompt: CorrelationPrompt): Promise<CorrelationResult> {
    const systemPrompt = `
You are an expert at understanding and correlating data schemas.
You will be given a source schema and a target schema in JSON format.
Your task is to analyze both schemas and provide a correlation mapping.
The mapping should identify which fields in the source schema correspond to which fields in the target schema.

Output only a valid JSON object with the following structure:
{
  "mappings": [
    {
      "sourceField": { "name": "field_name" },
      "targetField": { "name": "field_name" },
      "confidence": 0.0-1.0,
      "suggestions": [
        { "targetField": { "name": "suggestion_name" }, "confidence": 0.0-1.0 }
      ]
    }
  ],
  "unmappedSourceFields": [{ "name": "field_name" }],
  "unmappedTargetFields": [{ "name": "field_name" }]
}
Confidence should be 1.0 for a perfect match in name and meaning, and lower otherwise.
`;

    const userMessage = `
Source Schema:
${JSON.stringify(prompt.sourceSchema, null, 2)}

Target Schema:
${JSON.stringify(prompt.targetSchema, null, 2)}
`;

    try {
      const response = await this.ollama.chat({
        model: 'llama3', // Using a default model, can be configured later
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        format: 'json',
      });

      // The response content should be a JSON string.
      const content = response.message.content;
      const result = JSON.parse(content);

      // TODO: Add validation to ensure the result matches the CorrelationResult interface
      return result as CorrelationResult;

    } catch (error) {
      console.error('Error correlating schemas with Ollama:', error);
      throw new Error('Failed to correlate schemas using Ollama.');
    }
  }

  public async translateTags(prompt: TranslationPrompt): Promise<TranslatedTag[]> {
    const systemPrompt = `
You are an expert at translating tags and metadata between different schema formats.
You will be given a list of tags from a source document and a correlation mapping.
Your task is to translate the source tags to target schema format based on the provided mappings.

Output only a valid JSON array with the following structure:
[
  {
    "originalName": "source_field_name",
    "name": "target_field_name",
    "value": "translated_value"
  }
]

Rules:
- Only translate tags that have a mapping with confidence >= 0.5
- Preserve the original value unless transformation is needed
- If no mapping exists for a tag, skip it
`;

    const mappingsInfo = prompt.correlation.map(mapping => ({
      source: mapping.sourceField.name,
      target: mapping.targetField.name,
      confidence: mapping.confidence
    }));

    const userMessage = `
Tags to translate:
${JSON.stringify(prompt.tags, null, 2)}

Available mappings:
${JSON.stringify(mappingsInfo, null, 2)}
`;

    try {
      const response = await this.ollama.chat({
        model: 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        format: 'json',
      });

      const content = response.message.content;
      const translatedTags = JSON.parse(content);
      
      // Validate and transform to TranslatedTag format
      return translatedTags.map((tag: any) => ({
        name: tag.name,
        value: tag.value,
        originalName: tag.originalName
      }));

    } catch (error) {
      console.error('Error translating tags with Ollama:', error);
      throw new Error('Failed to translate tags using Ollama.');
    }
  }
} 