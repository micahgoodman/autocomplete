export interface AutocompleteResponse {
  steps: Array<{
    content: string;
    timestamp: string;
  }>;
  success: boolean;
  error?: string;
  isEmailTask?: boolean;
}

export interface ProgressUpdate {
  type: 'step' | 'status' | 'error';
  content?: string;
  message?: string;
  timestamp: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export interface ElectronAPI {
  autocompleteTask: (taskText: string) => Promise<AutocompleteResponse>;
  onAutocompleteProgress: (callback: ProgressCallback) => () => void;
  checkGmailAuth: () => Promise<boolean>;
  triggerGmailAuth: () => Promise<{ success: boolean }>;
  createGmailDraft: (draftContent: string) => Promise<{ success: boolean; draftId?: string; error?: string; message?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
