import { CorrelationMapping } from './correlation';

export enum FeedbackType {
  APPROVE = 'approve',
  REJECT = 'reject',
  EDIT = 'edit',
}

/**
 * Represents a single piece of user feedback on a correlation mapping.
 */
export interface UserFeedback {
  /**
   * The original mapping that the user is providing feedback on.
   */
  originalMapping: CorrelationMapping;

  /**
   * The type of feedback provided by the user.
   */
  type: FeedbackType;

  /**
   * The corrected mapping provided by the user.
   * This is only present if the feedback type is 'edit'.
   */
  correctedMapping?: CorrelationMapping;
} 