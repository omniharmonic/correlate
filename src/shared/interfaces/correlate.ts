import { YamlSchema, Taxonomy, SchemaField } from '../types/schema';
import { CorrelationMapping, CorrelationResult } from '../types/correlation';
import { ValidationResult } from '../types/validation';
import { TranslationResult } from '../types/translation';

// Using a generic Document type for now. This can be expanded later.
export interface Document {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
}

export interface TranslatedDocument extends Document {
  translationResult: TranslationResult;
}

export interface Tag {
    name: string;
    value: any;
}

export interface TranslatedTag extends Tag {
    originalName: string;
}

export interface SchemaParser {
  parseYamlSchema(schema: string): YamlSchema;
  parseJsonSchema(schema: string): YamlSchema;
  parseSchema(schemaContent: string, filePath: string): YamlSchema;
  extractTaxonomy(schema: YamlSchema): Taxonomy;
  validateSchema(schema: YamlSchema): ValidationResult<YamlSchema>;
}

export interface SchemaComparator {
  compareSchemas(source: YamlSchema, target: YamlSchema): CorrelationResult;
}

export interface CorrelationPrompt {
    sourceSchema: YamlSchema;
    targetSchema: YamlSchema;
}

export interface TranslationPrompt {
    tags: Tag[];
    correlation: CorrelationMapping[];
}

export interface LLMClient {
  correlateSchemata(prompt: CorrelationPrompt): Promise<CorrelationResult>;
  translateTags(prompt: TranslationPrompt): Promise<TranslatedTag[]>;
}

export interface UserFeedback {
    mapping: CorrelationMapping;
    isCorrect: boolean;
}

export interface CorrelationEngine {
  generateCorrelation(source: YamlSchema, target: YamlSchema): Promise<CorrelationMapping[]>;
  refineCorrelation(mapping: CorrelationMapping[], feedback: UserFeedback): CorrelationMapping[];
}

export interface TranslationEngine {
  translateDocument(doc: Document, mapping: CorrelationMapping[]): TranslatedDocument;
  translateTags(tags: Tag[], mapping: CorrelationMapping[]): TranslatedTag[];
}

export interface ValidationEngine {
  validateTranslation(translation: TranslatedDocument): ValidationResult<TranslatedDocument>;
}

export interface FileSystemManager {
  selectDirectoryDialog(): Promise<string | null>;
  readMarkdownFiles(directoryPath: string): Promise<Document[]>;
  writeMarkdownFile(filePath: string, content: string): Promise<void>;
} 