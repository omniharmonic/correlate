import { CorrelateAPI } from './shared/types/api';

declare global {
  interface Window {
    correlateAPI: CorrelateAPI;
  }
} 