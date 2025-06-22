import { SchemaComparator as ISchemaComparator } from '../shared/interfaces/correlate';
import { CorrelationMapping, CorrelationResult } from '../shared/types/correlation';
import { YamlSchema, SchemaField } from '../shared/types/schema';

export class SchemaComparator implements ISchemaComparator {
  public compareSchemas(source: YamlSchema, target: YamlSchema): CorrelationResult {
    const mappings: CorrelationMapping[] = [];
    const sourceFields = [...source.fields];
    const targetFields = [...target.fields];

    const unmappedSourceFields: SchemaField[] = [];
    const unmappedTargetFields: SchemaField[] = [];

    // Create a map for quick lookups of target fields
    const targetFieldMap = new Map<string, SchemaField>();
    targetFields.forEach(field => targetFieldMap.set(field.name, field));

    for (const sourceField of sourceFields) {
      const targetField = targetFieldMap.get(sourceField.name);

      if (targetField) {
        // Direct match found by name
        const confidence = this.calculateConfidence(sourceField, targetField);
        mappings.push({
          sourceField,
          targetField,
          confidence,
        });
        // Remove from map to avoid re-matching
        targetFieldMap.delete(sourceField.name);
      } else {
        // No direct match, add to unmapped
        unmappedSourceFields.push(sourceField);
      }
    }

    // Any remaining fields in the target map are unmapped
    targetFieldMap.forEach(field => unmappedTargetFields.push(field));

    return {
      mappings,
      unmappedSourceFields,
      unmappedTargetFields,
    };
  }

  private calculateConfidence(sourceField: SchemaField, targetField: SchemaField): number {
    // Simple confidence score: 1 if types match, 0.5 otherwise.
    // This can be enhanced later with more sophisticated semantic comparison.
    return sourceField.type === targetField.type ? 1.0 : 0.5;
  }
} 