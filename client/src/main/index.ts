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

ipcMain.handle('create-gmail-draft', async (_event, draftContent: string) => {
  console.log('[Main] Received create-gmail-draft request');
  
  try {
    // Parse the draft content to extract recipient, subject and body
    const toMatch = draftContent.match(/To:\s*(.+?)(?:\n|$)/i);
    const to = toMatch ? toMatch[1].trim() : '';
    
    const subjectMatch = draftContent.match(/Subject:\s*(.+?)(?:\n|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
    
    // Extract body - everything after "Body:" or after the subject line
    let body = draftContent;
    const bodyMatch = draftContent.match(/Body:\s*\n([\s\S]+)/i);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    } else if (subjectMatch) {
      // If no explicit "Body:" marker, take everything after the subject line
      body = draftContent.substring(subjectMatch.index! + subjectMatch[0].length).trim();
    }
    
    console.log('[Main] Parsed email - To:', to);
    console.log('[Main] Parsed email - Subject:', subject);
    console.log('[Main] Parsed email - Body preview:', body.substring(0, 100));
    
    if (!to) {
      return {
        success: false,
        error: 'No recipient email address found in draft. Please include "To: email@example.com" in the draft.',
      };
    }
    
    // Use Claude Agent SDK to call the MCP server's draft_email tool
    // Must use dynamic import for ES modules
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    
    const mcpServerPath = path.join(__dirname, '../../../mcp-server/dist/index.js');
    
    if (!fs.existsSync(mcpServerPath)) {
      console.error('[Main] MCP server file not found at:', mcpServerPath);
      return {
        success: false,
        error: `Gmail MCP server not found at ${mcpServerPath}. Please build the MCP server first.`,
      };
    }
    
    // Find Node.js executable
    const { execSync } = require('child_process');
    let nodePath = 'node';
    
    try {
      const foundPath = execSync('which node', { encoding: 'utf8' }).trim();
      if (foundPath && fs.existsSync(foundPath)) {
        nodePath = foundPath;
      }
    } catch (error) {
      const commonPaths = [
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node',
        '/usr/bin/node',
      ];
      for (const commonPath of commonPaths) {
        if (fs.existsSync(commonPath)) {
          nodePath = commonPath;
          break;
        }
      }
    }
    
    console.log('[Main] Using MCP server to create draft');
    
    const prompt = `Create a Gmail draft with the following details:
To: ${to}
Subject: ${subject}
Body: ${body}

Use the draft_email tool to create this draft. Make sure to include the "to" parameter with the email address "${to}".`;
    
    const stream = query({
      prompt,
      options: {
        model: 'claude-3-5-sonnet-20241022',
        includePartialMessages: false,
        permissionMode: 'bypassPermissions',
        mcpServers: {
          gmail: {
            type: 'stdio',
            command: nodePath,
            args: [mcpServerPath],
            env: {
              ...process.env,
              PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin',
            },
          },
        },
      },
    });
    
    let draftId: string | undefined;
    let hasError = false;
    let errorMessage = '';
    
    for await (const message of stream) {
      console.log('[Main] MCP message type:', message.type);
      console.log('[Main] Full message:', JSON.stringify(message, null, 2));
      
      if (message.type === 'assistant') {
        const content = (message as any).message?.content;
        console.log('[Main] Assistant content:', JSON.stringify(content, null, 2));
        
        if (typeof content === 'string') {
          console.log('[Main] Content is string:', content);
          const idMatch = content.match(/draft created successfully with ID:\s*(\S+)/i);
          if (idMatch) {
            draftId = idMatch[1];
            console.log('[Main] Draft created with ID:', draftId);
          }
        } else if (Array.isArray(content)) {
          for (const part of content) {
            console.log('[Main] Content part:', JSON.stringify(part, null, 2));
            if (part.type === 'text' && typeof part.text === 'string') {
              console.log('[Main] Text content:', part.text);
              const idMatch = part.text.match(/draft created successfully with ID:\s*(\S+)/i);
              if (idMatch) {
                draftId = idMatch[1];
                console.log('[Main] Draft created with ID:', draftId);
              }
            }
            // Also check for tool_result which contains the actual MCP response
            if (part.type === 'tool_result' && part.content) {
              console.log('[Main] Tool result content:', JSON.stringify(part.content, null, 2));
              const resultText = Array.isArray(part.content) 
                ? part.content.map((c: any) => c.text || '').join('')
                : typeof part.content === 'string' ? part.content : '';
              console.log('[Main] Tool result text:', resultText);
              const idMatch = resultText.match(/draft created successfully with ID:\s*(\S+)/i);
              if (idMatch) {
                draftId = idMatch[1];
                console.log('[Main] Draft created with ID from tool result:', draftId);
              }
            }
          }
        }
      }
      
      // Also check stream_event messages which might contain tool results
      if (message.type === 'stream_event') {
        const event = (message as any).event;
        console.log('[Main] Stream event:', JSON.stringify(event, null, 2));
        
        // Check if this is a message_delta with content
        if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta') {
          const text = event.delta.text;
          console.log('[Main] Stream text delta:', text);
          const idMatch = text.match(/draft created successfully with ID:\s*(\S+)/i);
          if (idMatch) {
            draftId = idMatch[1];
            console.log('[Main] Draft created with ID from stream:', draftId);
          }
        }
      }
      
      if ((message as any).error) {
        hasError = true;
        errorMessage = (message as any).error;
        console.error('[Main] Error creating draft:', errorMessage);
      }
    }
    
    if (hasError) {
      return {
        success: false,
        error: errorMessage || 'Failed to create Gmail draft',
      };
    }
    
    if (draftId) {
      return {
        success: true,
        draftId,
      };
    }
    
    // Treat as success even if the draft ID wasn't surfaced by the tool output
    return {
      success: true,
      // Provide a friendly message for the renderer to show
      message: 'Success! Please check your drafts',
    };
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
