import { dialog } from 'electron';
import { glob } from 'glob';
import fs from 'fs/promises';
import matter from 'gray-matter';
import path from 'path';
import { Document } from '../shared/types/document';
import { YamlSchema } from '../shared/types/schema';
import { SchemaParser } from './SchemaParser';

export class FileSystemManager {
  private schemaParser: SchemaParser;

  constructor() {
    this.schemaParser = new SchemaParser();
  }

  /**
   * Opens a native dialog for the user to select a directory.
   * @returns A promise that resolves to the selected directory path, or null if canceled.
   */
  public async selectDirectoryDialog(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }

  /**
   * Reads and parses a single Markdown file.
   * @param filePath - The full path to the Markdown file.
   * @returns A promise that resolves to a Document object.
   */
  private async parseMarkdownFile(filePath: string): Promise<Document> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    return {
      filePath,
      frontmatter: data,
      content,
    };
  }

  /**
   * Recursively scans a directory for Markdown files and parses them.
   * @param directoryPath - The path to the directory to scan.
   * @returns A promise that resolves to an array of Document objects.
   */
  public async readMarkdownFiles(directoryPath: string): Promise<Document[]> {
    console.log(`📁 Searching for markdown files in: ${directoryPath}`);
    
    // Get all markdown files with absolute paths
    const filePaths = await glob('**/*.md', { cwd: directoryPath, absolute: true });
    console.log(`📄 Found ${filePaths.length} markdown files:`, filePaths);
    
    if (filePaths.length === 0) {
      console.log(`ℹ️ No markdown files found in ${directoryPath}`);
      return [];
    }
    
    const documentPromises = filePaths.map(filePath => {
      console.log(`📖 Processing file: ${filePath}`);
      return this.parseMarkdownFile(filePath);
    });

    try {
      const documents = await Promise.all(documentPromises);
      console.log(`✅ Successfully processed ${documents.length} documents`);
      return documents;
    } catch (error) {
      console.error(`❌ Error processing documents:`, error);
      throw error;
    }
  }

  /**
   * Detects and parses schema files in a directory.
   * First looks for files matching common schema naming patterns, then falls back to any JSON/YAML file.
   * @param directoryPath - The directory to search in.
   * @returns A promise that resolves to the parsed YamlSchema, or null if not found.
   */
  public async detectAndParseSchema(directoryPath: string): Promise<YamlSchema | null> {
    console.log(`🔍 Searching for schema files in: ${directoryPath}`);
    
    // First, try specific schema file patterns
    const specificSchemaPatterns = [
      'schema.{yml,yaml,json}',
      'Schema.{yml,yaml,json}',
      '*-schema.{yml,yaml,json}',
      '*_schema.{yml,yaml,json}',
      '*Schema.{yml,yaml,json}',
      'config.{yml,yaml,json}',
      '.schema.{yml,yaml,json}',
      'schema/*.{yml,yaml,json}'
    ];

    // Try specific patterns first
    for (const pattern of specificSchemaPatterns) {
      try {
        const files = await glob(pattern, { cwd: directoryPath });
        console.log(`📁 Pattern "${pattern}" found files:`, files);
        
        for (const file of files) {
          const filePath = path.resolve(directoryPath, file);
          console.log(`📄 Attempting to parse: ${filePath}`);
          
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`📝 File content length: ${content.length} characters`);
            console.log(`📝 File content preview:`, content.substring(0, 200) + '...');
            
            const schema = this.schemaParser.parseSchema(content, file);
            console.log(`✅ Successfully parsed schema from: ${filePath}`);
            console.log(`📋 Schema summary:`, {
              name: schema.name,
              version: schema.version,
              fieldCount: schema.fields.length,
              fields: schema.fields.map(f => ({ name: f.name, type: f.type }))
            });
            return schema;
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse ${filePath}:`, parseError.message);
            // Continue to next file
          }
        }
      } catch (globError) {
        console.warn(`⚠️ Glob pattern "${pattern}" failed:`, globError.message);
        // Continue to next pattern
      }
    }

    // If no specific schema files found, try any JSON/YAML file
    console.log(`🔄 No specific schema files found, trying any JSON/YAML files...`);
    const fallbackPatterns = ['*.json', '*.yml', '*.yaml'];
    
    for (const pattern of fallbackPatterns) {
      try {
        const files = await glob(pattern, { cwd: directoryPath });
        console.log(`📁 Fallback pattern "${pattern}" found files:`, files);
        
        // Sort files to prefer shorter names (likely to be schema files)
        const sortedFiles = files.sort((a, b) => a.length - b.length);
        
        for (const file of sortedFiles) {
          const filePath = path.resolve(directoryPath, file);
          console.log(`📄 Attempting to parse fallback file: ${filePath}`);
          
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`📝 File content length: ${content.length} characters`);
            console.log(`📝 File content preview:`, content.substring(0, 200) + '...');
            
            const schema = this.schemaParser.parseSchema(content, file);
            console.log(`✅ Successfully parsed schema from fallback file: ${filePath}`);
            console.log(`📋 Schema summary:`, {
              name: schema.name,
              version: schema.version,
              fieldCount: schema.fields.length,
              fields: schema.fields.map(f => ({ name: f.name, type: f.type }))
            });
            return schema;
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse fallback file ${filePath}:`, parseError.message);
            // Continue to next file
          }
        }
      } catch (globError) {
        console.warn(`⚠️ Fallback pattern "${pattern}" failed:`, globError.message);
        // Continue to next pattern
      }
    }

    console.log(`❌ No parseable schema files found in: ${directoryPath}`);
    return null;
  }

  /**
   * Lists all potential schema files found in a directory for debugging purposes.
   * @param directoryPath - The directory to search in.
   * @returns A promise that resolves to an array of found file paths.
   */
  public async listPotentialSchemaFiles(directoryPath: string): Promise<string[]> {
    const schemaPatterns = [
      // Specific schema patterns
      'schema.{yml,yaml,json}',
      'Schema.{yml,yaml,json}',
      '*-schema.{yml,yaml,json}',
      '*_schema.{yml,yaml,json}',
      '*Schema.{yml,yaml,json}',
      'config.{yml,yaml,json}',
      'config/*.{yml,yaml,json}',
      '.schema.{yml,yaml,json}',
      'schema/*.{yml,yaml,json}',
      // Any JSON/YAML files (fallback)
      '*.yml',
      '*.yaml',
      '*.json'
    ];

    const allFoundFiles: string[] = [];
    
    for (const pattern of schemaPatterns) {
      try {
        const files = await glob(pattern, { cwd: directoryPath });
        // Convert relative paths to absolute paths
        const fullPaths = files.map(f => path.join(directoryPath, f));
        allFoundFiles.push(...fullPaths);
      } catch (error) {
        console.warn(`Error searching for pattern ${pattern}:`, error.message);
      }
    }

    // Remove duplicates and sort by preference
    const uniqueFiles = [...new Set(allFoundFiles)];
    
    return uniqueFiles.sort((a, b) => {
      const aName = path.basename(a).toLowerCase();
      const bName = path.basename(b).toLowerCase();
      
      // Prioritize files with 'schema' in the name
      const aHasSchema = aName.includes('schema');
      const bHasSchema = bName.includes('schema');
      if (aHasSchema && !bHasSchema) return -1;
      if (!aHasSchema && bHasSchema) return 1;
      
      // Then prioritize by extension preference
      const extOrder = { '.json': 1, '.yml': 2, '.yaml': 3 };
      const aExt = path.extname(a) as keyof typeof extOrder;
      const bExt = path.extname(b) as keyof typeof extOrder;
      const aOrder = extOrder[aExt] || 999;
      const bOrder = extOrder[bExt] || 999;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Finally, prioritize shorter filenames
      return aName.length - bName.length;
    });
  }

  public async getSchemasFromDirectories(sourcePath: string, targetPath: string): Promise<{ sourceSchema: YamlSchema, targetSchema: YamlSchema }> {
    console.log(`Searching for schemas in source: ${sourcePath} and target: ${targetPath}`);
    
    // First, list all potential files for debugging
    const sourceFiles = await this.listPotentialSchemaFiles(sourcePath);
    const targetFiles = await this.listPotentialSchemaFiles(targetPath);
    
    console.log(`Source directory files:`, sourceFiles);
    console.log(`Target directory files:`, targetFiles);

    const sourceSchema = await this.detectAndParseSchema(sourcePath);
    if (!sourceSchema) {
      throw new Error(`Schema file not found in source directory: ${sourcePath}. Found files: ${sourceFiles.join(', ')}`);
    }

    const targetSchema = await this.detectAndParseSchema(targetPath);
    if (!targetSchema) {
      throw new Error(`Schema file not found in target directory: ${targetPath}. Found files: ${targetFiles.join(', ')}`);
    }

    return { sourceSchema, targetSchema };
  }

  /**
   * Reads and parses a single Markdown file by its path.
   * @param filePath - The full path to the Markdown file.
   * @returns A promise that resolves to a Document object.
   */
  public async readSingleMarkdownFile(filePath: string): Promise<Document> {
    return this.parseMarkdownFile(filePath);
  }

  /**
   * Writes a Document object to a Markdown file.
   * @param filePath - The full path where to write the file.
   * @param document - The Document object to write.
   * @returns A promise that resolves when the file is written.
   */
  public async writeMarkdownFile(filePath: string, document: Document): Promise<void> {
    console.log(`💾 Writing markdown file: ${filePath}`);
    
    // Construct frontmatter
    const frontmatterContent = Object.keys(document.frontmatter).length > 0 
      ? matter.stringify(document.content, document.frontmatter)
      : document.content;
    
    await fs.writeFile(filePath, frontmatterContent, 'utf-8');
    console.log(`✅ Successfully wrote file: ${filePath}`);
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   * @param directoryPath - The path to the directory.
   * @returns A promise that resolves when the directory exists.
   */
  public async ensureDirectoryExists(directoryPath: string): Promise<void> {
    try {
      await fs.access(directoryPath);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(directoryPath, { recursive: true });
      console.log(`📁 Created directory: ${directoryPath}`);
    }
  }
}
