/**
 * Represents a single validation error.
 */
export interface ValidationError {
  message: string;
  offendingField?: string;
}

/**
 * Represents a single validation warning.
 */
export interface ValidationWarning {
  message: string;
  offendingField?: string;
}

/**
 * Represents the result of a validation operation.
 * @template T - The type of the object that was validated.
 */
export interface ValidationResult<T> {
  isValid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  validatedObject: T;
} 