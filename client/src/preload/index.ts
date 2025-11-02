import { contextBridge, ipcRenderer } from 'electron'

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

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  autocompleteTask: (taskText: string): Promise<AutocompleteResponse> => {
    console.log('[Preload] autocompleteTask called with:', taskText);
    return ipcRenderer.invoke('autocomplete-task', taskText);
  },
  onAutocompleteProgress: (callback: ProgressCallback) => {
    const listener = (_event: any, update: ProgressUpdate) => callback(update);
    ipcRenderer.on('autocomplete-progress', listener);
    // Return cleanup function
    return () => ipcRenderer.removeListener('autocomplete-progress', listener);
  },
  checkGmailAuth: (): Promise<boolean> => {
    return ipcRenderer.invoke('check-gmail-auth');
  },
  triggerGmailAuth: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('trigger-gmail-auth');
  },
  createGmailDraft: (draftContent: string): Promise<{ success: boolean; draftId?: string; error?: string }> => {
    console.log('[Preload] createGmailDraft called');
    return ipcRenderer.invoke('create-gmail-draft', draftContent);
  },
  fetchUnreadEmails: (maxResults: number = 5): Promise<{ success: boolean; emails: Array<{ id: string; from: string; subject: string; snippet: string; date: string }>; error?: string }> => {
    console.log('[Preload] fetchUnreadEmails called');
    return ipcRenderer.invoke('fetch-unread-emails', maxResults);
  },
  generateEmailAction: (emailContext: { subject?: string; snippet?: string; from?: string }): Promise<{ success: boolean; action?: string; error?: string }> => {
    console.log('[Preload] generateEmailAction called');
    return ipcRenderer.invoke('generate-email-action', emailContext);
  }
})

console.log('[Preload] Electron API exposed to renderer');

// For now, this can be minimal since the app uses Supabase directly
// Add IPC methods later if needed for file system access, etc.
