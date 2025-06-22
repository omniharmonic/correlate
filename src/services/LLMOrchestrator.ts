import { CorrelationPrompt, LLMClient } from '../shared/interfaces/correlate';
import { CorrelationResult } from '../shared/types/correlation';
import { OllamaClient } from './OllamaClient';
import { GeminiClient } from './GeminiClient';

export class LLMOrchestrator {
  private primaryClient: LLMClient;
  private fallbackClient: LLMClient;

  constructor() {
    this.primaryClient = new OllamaClient();
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (geminiApiKey) {
      this.fallbackClient = new GeminiClient(geminiApiKey);
    }
  }

  public async processCorrelation(request: CorrelationPrompt): Promise<CorrelationResult> {
    try {
      // First, try the primary client (Ollama)
      return await this.primaryClient.correlateSchemata(request);
    } catch (error) {
      console.warn('Primary LLM client (Ollama) failed. Attempting fallback.', error);
      
      // If the primary fails and a fallback exists, use it
      if (this.fallbackClient) {
        try {
          return await this.fallbackClient.correlateSchemata(request);
        } catch (fallbackError) {
          console.error('Fallback LLM client (Gemini) also failed.', fallbackError);
          throw new Error('Both primary and fallback LLM clients failed to process the correlation.');
        }
      }
      
      // If no fallback client is configured, rethrow the original error
      throw new Error('Primary LLM client failed and no fallback is configured.');
    }
  }
} 