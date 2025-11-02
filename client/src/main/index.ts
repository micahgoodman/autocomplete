import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { config } from 'dotenv'
import { AutocompleteService } from './autocompleteService'
import { AutocompleteServiceDirect } from './autocompleteServiceDirect'
import { spawn } from 'child_process'
import fs from 'fs'
import { checkGmailAuth, createGmailDraft } from './gmailService'

// Determine if running in development mode
const isDev = process.env.NODE_ENV === 'development'

// Load environment variables from .env file
if (isDev) {
  // In development, load from .env.development
  const envPath = path.join(__dirname, '../../.env.development')
  console.log('[Main] Loading .env from:', envPath)
  const result = config({ path: envPath })
  if (result.error) {
    console.error('[Main] Error loading .env file:', result.error)
  } else {
    console.log('[Main] Environment variables loaded successfully')
    console.log('[Main] VITE_ANTHROPIC_API_KEY present:', !!process.env.VITE_ANTHROPIC_API_KEY)
  }
} else {
  // In production, load from .env (if exists)
  config()
}

// Initialize autocomplete service AFTER loading environment variables
// Create autocomplete service instance
// Using AutocompleteServiceDirect which uses standard Anthropic API with tool support
const autocompleteService = new AutocompleteServiceDirect()

function createWindow() {
  // In development, electron-vite serves from different paths
  const preloadPath = isDev
    ? path.join(__dirname, '../preload/index.mjs')  // electron-vite uses .mjs in dev
    : path.join(__dirname, '../preload/index.js');
  
  console.log('[Main] Preload path:', preloadPath);
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false  // Disable sandbox to allow preload script to work
    }
  })

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// IPC handlers
ipcMain.handle('autocomplete-task', async (event, taskText: string) => {
  console.log('[Main] Received autocomplete-task request for:', taskText);
  
  // Create progress callback that sends updates via IPC
  const onProgress = (update: any) => {
    console.log('[Main] Sending progress update:', update.type);
    event.sender.send('autocomplete-progress', update);
  };
  
  const result = await autocompleteService.completeTask(taskText, onProgress);
  console.log('[Main] Autocomplete result:', result.success ? 'Success' : 'Failed');
  return result;
});

ipcMain.handle('check-gmail-auth', async () => {
  // Check if OAuth credentials are configured
  const hasAuth = checkGmailAuth();
  console.log('[Main] Gmail authentication available:', hasAuth);
  return hasAuth;
});

ipcMain.handle('trigger-gmail-auth', async () => {
  // Check if credentials are set
  if (!checkGmailAuth()) {
    return {
      success: false,
      error: 'Google OAuth credentials not configured. Please set VITE_GOOGLE_OAUTH_CLIENT_ID and VITE_GOOGLE_OAUTH_CLIENT_SECRET in your environment variables.',
    };
  }
  
  console.log('[Main] Google OAuth credentials are configured');
  console.log('[Main] OAuth flow will trigger automatically when creating first email draft');
  
  return {
    success: true,
    message: 'Google OAuth credentials configured. Browser will open for authentication when you create your first Gmail draft.',
  };
});

ipcMain.handle('create-gmail-draft', async (_event, draftContent: string) => {
  console.log('[Main] Received create-gmail-draft request');
  
  try {
    // Parse the draft content to extract recipient, subject and body
    const toMatch = draftContent.match(/To:\s*(.+?)(?:\n|$)/i);
    const to = toMatch ? toMatch[1].trim() : '';
    
    const subjectMatch = draftContent.match(/Subject:\s*(.+?)(?:\n|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
    
    // Extract body - everything after "Body:" label
    let body = '';
    
    // Try to find explicit "Body:" marker (with optional newline)
    const bodyMatch = draftContent.match(/Body:\s*\n([\s\S]+)/i);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    } else {
      // Try without newline requirement
      const bodyMatchNoNewline = draftContent.match(/Body:\s*(.+[\s\S]*)/i);
      if (bodyMatchNoNewline) {
        body = bodyMatchNoNewline[1].trim();
      } else if (subjectMatch) {
        // If no "Body:" marker at all, take everything after subject line
        const afterSubject = draftContent.substring(subjectMatch.index! + subjectMatch[0].length).trim();
        // Remove "Body:" if it's at the start
        body = afterSubject.replace(/^Body:\s*/i, '').trim();
      }
    }
    
    console.log('[Main] Parsed email - To:', to);
    console.log('[Main] Parsed email - Subject:', subject);
    console.log('[Main] Parsed email - Body length:', body.length);
    console.log('[Main] Parsed email - Body preview:', body.substring(0, 200));
    console.log('[Main] Full draft content:', draftContent);
    
    if (!to) {
      return {
        success: false,
        error: 'No recipient email address found in draft. Please include "To: email@example.com" in the draft.',
      };
    }
    
    // Use Gmail API directly to create draft
    console.log('[Main] Using Gmail API to create draft');
    
    const result = await createGmailDraft({
      to,
      subject,
      body,
    });
    
    if (result.success) {
      return {
        success: true,
        draftId: result.draftId,
        message: `Gmail draft created successfully!`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create Gmail draft',
      };
    }
  } catch (error) {
    console.error('[Main] Error in create-gmail-draft:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
