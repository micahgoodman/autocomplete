import { query, type SDKMessage, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

export interface AutocompleteRequest {
  taskText: string;
}

export interface AutocompleteResponse {
  completedText: string;
  success: boolean;
  error?: string;
}

export class AutocompleteService {
  private apiKey: string | null = null;

  constructor() {
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY?.trim();
    console.log('[AutocompleteService] Constructor - API key present:', !!apiKey);
    console.log('[AutocompleteService] Constructor - API key length:', apiKey?.length || 0);
    console.log('[AutocompleteService] Constructor - API key prefix:', apiKey?.substring(0, 10) || 'none');
    
    if (apiKey) {
      this.apiKey = apiKey;
      // Ensure the SDK sees the expected key name
      process.env.ANTHROPIC_API_KEY = apiKey;
      console.log('[AutocompleteService] Claude Agent SDK ready');
    } else {
      console.warn('[AutocompleteService] No API key found in environment');
    }
  }

  async completeTask(taskText: string): Promise<AutocompleteResponse> {
    console.log('[AutocompleteService] completeTask called with:', taskText);
    console.log('[AutocompleteService] API key available:', !!this.apiKey);
    
    if (!this.apiKey) {
      console.error('[AutocompleteService] No API key set for Claude Agent SDK');
      return {
        completedText: taskText,
        success: false,
        error: 'VITE_ANTHROPIC_API_KEY environment variable is not set. Please set it to use the autocomplete feature.'
      };
    }

    try {
      console.log('[AutocompleteService] Starting Claude Agent query...');
      const prompt = `You are a helpful assistant that completes checklist items. Given a checklist item task, provide a first draft of the task.\n\nTask: ${taskText}`;

      console.log('[AutocompleteService] Node executable path:', process.execPath);
      console.log('[AutocompleteService] Current working directory:', process.cwd());
      console.log('[AutocompleteService] PATH:', process.env.PATH);
      
      const stream = query({
        prompt,
        options: {
          model: 'claude-3-5-sonnet-20241022',
          includePartialMessages: true,
          executable: 'node' as const,
          executableArgs: [],
          cwd: process.cwd(),
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: this.apiKey,
            PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin',
          },
        },
      });

      let completedText = taskText;
      for await (const message of stream) {
        this.logSdkMessage(message);

        if (message.type === 'assistant') {
          const assistantText = this.extractAssistantText(message);
          if (assistantText) {
            completedText = assistantText;
          }
        } else if (message.type === 'result' && message.subtype === 'success') {
          const successMessage = message as SDKResultMessage & { subtype: 'success' };
          const resultText = typeof successMessage.result === 'string' ? successMessage.result.trim() : '';
          if (resultText) {
            completedText = resultText;
          }
        }
      }

      console.log('[AutocompleteService] Final completed text:', completedText);
      
      return {
        completedText,
        success: true
      };
    } catch (error) {
      console.error('[AutocompleteService] Error during Claude Agent query:', error);
      console.error('[AutocompleteService] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        completedText: taskText,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private extractAssistantText(message: SDKMessage): string | null {
    if (message.type !== 'assistant') return null;
    const content = message.message?.content;
    if (!Array.isArray(content)) return null;
    const text = content
      .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text)
      .join(' ')
      .trim();
    return text || null;
  }

  private logSdkMessage(message: SDKMessage) {
    const { type } = message;
    if (type === 'assistant') {
      console.log('[AutocompleteService][SDK] Assistant message:', JSON.stringify({
        content: message.message?.content,
        parent_tool_use_id: message.parent_tool_use_id,
      }, null, 2));
    } else if (type === 'stream_event') {
      console.log('[AutocompleteService][SDK] Stream event:', JSON.stringify(message.event, null, 2));
    } else if (type === 'result') {
      const resultPayload = message as SDKResultMessage;
      console.log('[AutocompleteService][SDK] Result message:', JSON.stringify({
        subtype: resultPayload.subtype,
        result: resultPayload.subtype === 'success' ? resultPayload.result : undefined,
        usage: resultPayload.usage,
        total_cost_usd: resultPayload.total_cost_usd,
      }, null, 2));
    } else {
      console.log('[AutocompleteService][SDK] Message:', JSON.stringify(message, null, 2));
    }
  }
}

export type { SDKMessage };
