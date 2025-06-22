import { SchemaField } from './schema';

/**
 * Represents a function that can transform a value from a source field to a target field.
 */
export type TransformFunction = (value: any) => any;

/**
 * Represents a single mapping between a source field and a target field.
 */
export interface CorrelationMapping {
  sourceField: SchemaField;
  targetField: SchemaField;
  /**
   * A value between 0 and 1 indicating the confidence of the mapping.
   */
  confidence: number;
  /**
   * A function to transform the value from the source field to the target field.
   */
  transform?: TransformFunction;
  /**
   * Optional suggestions for alternative mappings.
   */
  suggestions?: AlternativeMapping[];
}

/**
 * Represents an alternative mapping suggestion.
 */
export interface AlternativeMapping {
  targetField: SchemaField;
  confidence: number;
}

/**
 * The result of a correlation process between two schemas.
 */
export interface CorrelationResult {
  mappings: CorrelationMapping[];
  unmappedSourceFields: SchemaField[];
  unmappedTargetFields: SchemaField[];
} 