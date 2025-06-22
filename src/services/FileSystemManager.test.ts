import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileSystemManager } from './FileSystemManager';
import { dialog } from 'electron';
import { vol } from 'memfs';

// Mock the dependencies
vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('fs/promises', () => vol.promises);

describe('FileSystemManager', () => {
  let manager: FileSystemManager;

  beforeEach(() => {
    manager = new FileSystemManager();
    vol.reset(); // Reset the in-memory file system before each test
  });

  describe('selectDirectoryDialog', () => {
    it('should return the selected directory path', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/path'],
      });
      const result = await manager.selectDirectoryDialog();
      expect(result).toBe('/fake/path');
    });

    it('should return null if the dialog is canceled', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });
      const result = await manager.selectDirectoryDialog();
      expect(result).toBeNull();
    });
  });

  describe('readMarkdownFiles', () => {
    it('should find and parse all markdown files in a directory', async () => {
      // Setup the in-memory file system
      vol.fromJSON({
        '/test/doc1.md': '---\ntitle: Doc 1\n---\nContent 1',
        '/test/doc2.md': '---\ntitle: Doc 2\n---\nContent 2',
        '/test/subdir/doc3.md': '---\ntitle: Doc 3\n---\nContent 3',
        '/test/other.txt': 'ignore this',
      });

      const docs = await manager.readMarkdownFiles('/test');
      expect(docs.length).toBe(3);
      
      const doc1 = docs.find(d => d.filePath.endsWith('doc1.md'));
      expect(doc1.frontmatter.title).toBe('Doc 1');
      expect(doc1.content.trim()).toBe('Content 1');
    });

    it('should return an empty array if no markdown files are found', async () => {
      vol.fromJSON({
        '/test/other.txt': 'ignore this',
      });
      const docs = await manager.readMarkdownFiles('/test');
      expect(docs).toEqual([]);
    });
  });

  describe('detectAndParseSchema', () => {
    it('should find and parse the schema.yml file', async () => {
      const schemaContent = `
name: Test Schema
version: '1.0'
fields:
  - name: title
    type: string
`;
      vol.fromJSON({
        '/test/schema.yml': schemaContent,
      });

      const schema = await manager.detectAndParseSchema('/test');
      expect(schema).not.toBeNull();
      expect(schema.name).toBe('Test Schema');
      expect(schema.fields[0].name).toBe('title');
    });

    it('should return null if no schema file is found', async () => {
      vol.fromJSON({
        '/test/doc.md': 'content',
      });
      const schema = await manager.detectAndParseSchema('/test');
      expect(schema).toBeNull();
    });
  });
}); 