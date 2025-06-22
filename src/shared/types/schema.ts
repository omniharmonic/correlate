import { ValidationResult } from './validation';

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

export interface Constraint {
  type: 'required' | 'unique' | 'minLength' | 'maxLength' | 'pattern';
  value?: any;
}

export interface SchemaField {
  name: string;
  type: FieldType;
  description?: string;
  constraints?: Constraint[];
  nestedSchema?: YamlSchema;
  required?: boolean;
}

export interface YamlSchema {
  name: string;
  version: string;
  description?: string;
  fields: SchemaField[];
}

export interface Taxonomy {
  name: string;
  terms: string[];
} 