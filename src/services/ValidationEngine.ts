import { Document } from '../shared/types/document';
import { YamlSchema } from '../shared/types/schema';
import { ValidationResult, ValidationError } from '../shared/types/validation';

export class ValidationEngine {

  /**
   * Validates a translated document's frontmatter against a target schema.
   * For now, it checks if all required fields in the schema are present in the frontmatter.
   * @param translatedDoc - The document with translated frontmatter.
   * @param targetSchema - The schema to validate against.
   * @returns A validation result indicating success or failure.
   */
  public validateDocument(translatedDoc: Document, targetSchema: YamlSchema): ValidationResult<Document> {
    const errors: ValidationError[] = [];

    for (const schemaField of targetSchema.fields) {
      if (schemaField.required) {
        if (!Object.prototype.hasOwnProperty.call(translatedDoc.frontmatter, schemaField.name)) {
          errors.push({
            message: `Missing required field: '${schemaField.name}'`,
            offendingField: schemaField.name,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: [], // Warnings are not implemented in this version.
      validatedObject: translatedDoc,
    };
  }
} 