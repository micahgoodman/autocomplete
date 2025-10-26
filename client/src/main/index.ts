import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { config } from 'dotenv'
import { AutocompleteService } from './autocompleteService'

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
