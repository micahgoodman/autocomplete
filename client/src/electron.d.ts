export interface AutocompleteResponse {
  completedText: string;
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  autocompleteTask: (taskText: string) => Promise<AutocompleteResponse>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
