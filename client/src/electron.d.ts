export interface AutocompleteResponse {
  steps: Array<{
    content: string;
    timestamp: string;
  }>;
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  autocompleteTask: (taskText: string) => Promise<AutocompleteResponse>;
  checkGmailAuth: () => Promise<boolean>;
  triggerGmailAuth: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
