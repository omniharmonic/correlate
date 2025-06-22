// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { CorrelateAPI } from './shared/types/api';
import { YamlSchema } from './shared/types/schema';

const correlateApi: CorrelateAPI = {
  correlateSchemas: async (source, target) => {
    const response = await ipcRenderer.invoke('correlate:run', source, target);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  selectDirectory: async () => {
    const response = await ipcRenderer.invoke('fs:selectDirectory');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  getSchemas: async (sourcePath, targetPath) => {
    const response = await ipcRenderer.invoke('fs:getSchemas', sourcePath, targetPath);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  processDocuments: async (sourcePath, targetPath, approvedTranslations) => {
    const response = await ipcRenderer.invoke('fs:processDocuments', sourcePath, targetPath, approvedTranslations);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  // Vector store methods
  generateEmbeddings: async (directoryPath) => {
    const response = await ipcRenderer.invoke('vector:generateEmbeddings', directoryPath);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  indexDocuments: async (embeddings) => {
    const response = await ipcRenderer.invoke('vector:indexDocuments', embeddings);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  findRelatedDocuments: async (documentPath, config) => {
    const response = await ipcRenderer.invoke('vector:findRelatedDocuments', documentPath, config);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  addWikiLinksToDocument: async (documentPath, relatedDocs) => {
    const response = await ipcRenderer.invoke('vector:addWikiLinksToDocument', documentPath, relatedDocs);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  getVectorStoreStats: async () => {
    const response = await ipcRenderer.invoke('vector:getStats');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  clearVectorStore: async () => {
    const response = await ipcRenderer.invoke('vector:clearStore');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  exportEmbeddings: async (libraryPath) => {
    const response = await ipcRenderer.invoke('vector:exportEmbeddings', libraryPath);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  importEmbeddings: async () => {
    const response = await ipcRenderer.invoke('vector:importEmbeddings');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
  getCacheStats: async () => {
    const response = await ipcRenderer.invoke('vector:getCacheStats');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
};

contextBridge.exposeInMainWorld('correlateAPI', correlateApi);
