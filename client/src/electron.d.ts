export interface AutocompleteResponse {
  steps: Array<{
    content: string;
    timestamp: string;
  }>;
  success: boolean;
  error?: string;
  isEmailTask?: boolean;
  isSimpleDraft?: boolean;
}

export interface ProgressUpdate {
  type: 'step' | 'status' | 'error';
  content?: string;
  message?: string;
  timestamp: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export interface UnreadEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export interface ElectronAPI {
  autocompleteTask: (taskText: string) => Promise<AutocompleteResponse>;
  onAutocompleteProgress: (callback: ProgressCallback) => () => void;
  checkGmailAuth: () => Promise<boolean>;
  triggerGmailAuth: () => Promise<{ success: boolean }>;
  createGmailDraft: (draftContent: string) => Promise<{ success: boolean; draftId?: string; error?: string; message?: string }>;
  fetchUnreadEmails: (maxResults?: number) => Promise<{ success: boolean; emails: UnreadEmail[]; error?: string }>;
  generateEmailAction: (emailContext: { subject?: string; snippet?: string; from?: string }) => Promise<{ success: boolean; action?: string; error?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
