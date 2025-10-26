import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { config } from 'dotenv'
import { AutocompleteService } from './autocompleteService'
import { spawn } from 'child_process'
import fs from 'fs'

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
const autocompleteService = new AutocompleteService()

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
ipcMain.handle('autocomplete-task', async (_event, taskText: string) => {
  console.log('[Main] Received autocomplete-task request for:', taskText);
  const result = await autocompleteService.completeTask(taskText);
  console.log('[Main] Autocomplete result:', result.success ? 'Success' : 'Failed');
  return result;
});

ipcMain.handle('check-gmail-auth', async () => {
  const credentialsPath = path.join(__dirname, '../../../mcp-server/credentials.json');
  return fs.existsSync(credentialsPath);
});

ipcMain.handle('trigger-gmail-auth', async () => {
  return new Promise((resolve, reject) => {
    const mcpServerPath = path.join(__dirname, '../../../mcp-server');
    const scriptPath = path.join(mcpServerPath, 'dist', 'index.js');
    console.log('[Main] Starting Gmail authentication via Node:', scriptPath);

    const env = {
      ...process.env,
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin',
    } as NodeJS.ProcessEnv;

    const authProcess = spawn('node', [scriptPath, 'auth'], {
      cwd: mcpServerPath,
      stdio: 'pipe',
      shell: false,
      env,
    });

    let outputBuffer = '';
    let resolved = false;

    // Capture stdout to detect authentication completion
    authProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      console.log('[Main] Auth output:', output);

      // Check for success message
      if (output.includes('Authentication completed successfully') && !resolved) {
        resolved = true;
        console.log('[Main] Gmail authentication completed successfully');
        resolve({ success: true });
      }
    });

    authProcess.stderr?.on('data', (data) => {
      console.error('[Main] Auth error:', data.toString());
    });

    authProcess.on('close', (code) => {
      if (resolved) {
        // Already resolved, nothing to do
        return;
      }

      // Only reject if process failed
      if (code !== 0) {
        console.error('[Main] Gmail authentication failed with code:', code);
        resolved = true;
        reject(new Error(`Authentication failed with code ${code}`));
      } else {
        // Process exited successfully - assume auth completed
        console.log('[Main] Auth process exited successfully');
        resolved = true;
        resolve({ success: true });
      }
    });

    authProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        console.error('[Main] Failed to start authentication:', error);
        reject(error);
      }
    });
  });
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
