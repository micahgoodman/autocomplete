import { contextBridge, ipcRenderer } from 'electron'

export interface AutocompleteResponse {
  completedText: string;
  success: boolean;
  error?: string;
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  autocompleteTask: (taskText: string): Promise<AutocompleteResponse> => {
    console.log('[Preload] autocompleteTask called with:', taskText);
    return ipcRenderer.invoke('autocomplete-task', taskText);
  },
  checkGmailAuth: (): Promise<boolean> => {
    return ipcRenderer.invoke('check-gmail-auth');
  },
  triggerGmailAuth: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('trigger-gmail-auth');
  }
})

console.log('[Preload] Electron API exposed to renderer');

// For now, this can be minimal since the app uses Supabase directly
// Add IPC methods later if needed for file system access, etc.
