/**
 * Represents a parsed Markdown document.
 */
export interface Document {
  /**
   * The YAML frontmatter of the document, parsed as a key-value object.
   */
  frontmatter: Record<string, any>;

  /**
   * The Markdown content of the document, excluding the frontmatter.
   */
  content: string;

  /**
   * The original file path of the document.
   */
  filePath: string;
} 