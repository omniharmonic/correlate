/**
 * Represents the result of a translation operation for a single tag or field.
 * This is a placeholder and may be expanded later.
 */
import { Document } from './document';
import { ValidationResult } from './validation';

export interface TranslatedTag {
  originalValue: any;
  translatedValue: any;
}

export interface TranslationResult {
  translatedDocument: Document;
  validation: ValidationResult<any>;
}

export interface TranslationSample {
  sourceTag: string;
  translatedTag: string;
} 