import * as yaml from 'js-yaml';
import { SchemaParser as ISchemaParser } from '../shared/interfaces/correlate';
import { YamlSchema, Taxonomy, SchemaField, FieldType } from '../shared/types/schema';
import { ValidationResult, ValidationError } from '../shared/types/validation';

export class SchemaParser implements ISchemaParser {
  /**
   * Parses a YAML schema string into a YamlSchema object.
   */
  public parseYamlSchema(schemaContent: string): YamlSchema {
    try {
      const parsed = yaml.load(schemaContent);
      console.log('Parsed YAML content:', JSON.stringify(parsed, null, 2));
      return this.convertToSchema(parsed, 'yaml-file');
    } catch (error) {
      console.error('Failed to parse YAML:', error);
      throw new Error(`Failed to parse YAML schema: ${error.message}`);
    }
  }

  /**
   * Parses a JSON schema string into a YamlSchema object.
   */
  public parseJsonSchema(schemaContent: string): YamlSchema {
    try {
      const parsed = JSON.parse(schemaContent);
      console.log('Parsed JSON content:', JSON.stringify(parsed, null, 2));
      return this.convertToSchema(parsed, 'json-file');
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      throw new Error(`Failed to parse JSON schema: ${error.message}`);
    }
  }

  /**
   * Converts any object structure to a YamlSchema by inferring the schema from the content.
   */
  private convertToSchema(data: any, filename: string): YamlSchema {
    console.log('Converting data to schema:', { filename, dataType: typeof data, dataKeys: Object.keys(data || {}) });
    
    // If data is already in the expected schema format, use it directly
    if (this.isValidSchema(data)) {
      console.log('Data is already a valid schema format');
      return data as YamlSchema;
    }

    // If data is an array, treat each item as a potential field
    if (Array.isArray(data)) {
      console.log('Data is an array, converting to fields');
      return {
        name: filename.replace(/\.[^/.]+$/, ""), // Remove extension
        version: "1.0.0",
        description: `Auto-generated schema from ${filename}`,
        fields: data.map((item, index) => this.inferFieldFromValue(item, `item_${index}`))
      };
    }

    // If data is an object, extract fields from its keys
    if (data && typeof data === 'object') {
      console.log('Data is an object, extracting fields from keys');
      const fields: SchemaField[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        fields.push(this.inferFieldFromValue(value, key));
      }

      return {
        name: filename.replace(/\.[^/.]+$/, ""), // Remove extension
        version: "1.0.0", 
        description: `Auto-generated schema from ${filename}`,
        fields: fields
      };
    }

    // Fallback: create a simple single-field schema
    console.log('Data is primitive, creating single-field schema');
    return {
      name: filename.replace(/\.[^/.]+$/, ""),
      version: "1.0.0",
      description: `Auto-generated schema from ${filename}`,
      fields: [this.inferFieldFromValue(data, 'value')]
    };
  }

  /**
   * Infers a SchemaField from a value by examining its type and structure.
   */
  private inferFieldFromValue(value: any, fieldName: string): SchemaField {
    let type: FieldType;
    let description: string;

    if (Array.isArray(value)) {
      type = FieldType.ARRAY;
      description = `Array field (length: ${value.length})`;
    } else if (value && typeof value === 'object') {
      type = FieldType.OBJECT;
      description = `Object field with keys: ${Object.keys(value).join(', ')}`;
    } else if (typeof value === 'boolean') {
      type = FieldType.BOOLEAN;
      description = 'Boolean field';
    } else if (typeof value === 'number') {
      type = FieldType.NUMBER;
      description = 'Number field';
    } else if (typeof value === 'string') {
      // Try to detect if it's a date
      if (this.isDateString(value)) {
        type = FieldType.DATE;
        description = 'Date field (auto-detected)';
      } else {
        type = FieldType.STRING;
        description = 'String field';
      }
    } else {
      type = FieldType.STRING;
      description = 'Unknown type, defaulted to string';
    }

    return {
      name: fieldName,
      type: type,
      description: description,
      required: false
    };
  }

  /**
   * Simple date string detection.
   */
  private isDateString(str: string): boolean {
    // Look for common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}/, // M-D-YYYY
    ];
    
    return datePatterns.some(pattern => pattern.test(str)) && !isNaN(Date.parse(str));
  }

  /**
   * Parses a schema file based on its content and file extension.
   * @param schemaContent - The raw content of the schema file
   * @param filePath - The file path to determine the format
   */
  public parseSchema(schemaContent: string, filePath: string): YamlSchema {
    console.log(`Parsing schema file: ${filePath}`);
    const extension = filePath.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'json':
        return this.parseJsonSchema(schemaContent);
      case 'yml':
      case 'yaml':
        return this.parseYamlSchema(schemaContent);
      default:
        // Try YAML first, then JSON as fallback
        try {
          return this.parseYamlSchema(schemaContent);
        } catch {
          return this.parseJsonSchema(schemaContent);
        }
    }
  }

  public extractTaxonomy(schema: YamlSchema): Taxonomy {
    const taxonomy: Taxonomy = { name: `${schema.name} Taxonomy`, terms: [] };
    schema.fields.forEach(field => {
      taxonomy.terms.push(field.name);
      if (field.type === FieldType.OBJECT && field.nestedSchema) {
        const nestedTaxonomy = this.extractTaxonomy(field.nestedSchema);
        taxonomy.terms.push(...nestedTaxonomy.terms);
      }
    });
    return taxonomy;
  }

  public validateSchema(schema: YamlSchema): ValidationResult<YamlSchema> {
    const errors: ValidationError[] = [];
    
    if (!schema.name) {
      errors.push({ message: 'Schema name is missing.' });
    }
    if (!schema.version) {
      errors.push({ message: 'Schema version is missing.' });
    }
    if (!schema.fields || schema.fields.length === 0) {
      errors.push({ message: 'Schema must have at least one field.' });
    } else {
      schema.fields.forEach((field, index) => {
        if (!field.name || !field.type) {
          errors.push({ 
            message: `Field is missing name or type: ${JSON.stringify(field)}`,
            offendingField: `fields[${index}]`
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      validatedObject: schema
    };
  }

  private isValidSchema(obj: any): obj is YamlSchema {
    return (
      obj &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'string' &&
      Array.isArray(obj.fields) &&
      obj.fields.every(
        (field: any) =>
          typeof field.name === 'string' && typeof field.type === 'string'
      )
    );
  }
} 