import { query, type SDKMessage, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

export interface AutocompleteRequest {
  taskText: string;
}

export interface AutocompleteResponse {
  steps: Array<{
    content: string;
    timestamp: string;
  }>;
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
        steps: [],
        success: false,
        error: 'VITE_ANTHROPIC_API_KEY environment variable is not set. Please set it to use the autocomplete feature.'
      };
    }

    try {
      console.log('[AutocompleteService] Starting Claude Agent query...');
      const prompt = `Complete this task. Show your work in steps if needed.\n\nTask: ${taskText}\n\nProvide your output directly. For emails, include a Subject line and body. For code or documents, provide the complete content. For complex tasks, you can break it down into steps.`;

      console.log('[AutocompleteService] Node executable path:', process.execPath);
      console.log('[AutocompleteService] Current working directory:', process.cwd());
      console.log('[AutocompleteService] PATH:', process.env.PATH);
      
      const stream = query({
        prompt,
        options: {
          model: 'claude-3-5-sonnet-20241022',
          includePartialMessages: false,
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

      const steps: Array<{ content: string; timestamp: string }> = [];
      
      for await (const message of stream) {
        this.logSdkMessage(message);

        // Collect all assistant messages as steps
        if (message.type === 'assistant') {
          const raw = this.extractAssistantText(message);
          if (!raw) continue;

          // Clean up the content but don't be too aggressive
          const cleaned = this.cleanAssistantContent(raw);
          if (!cleaned || cleaned.length < 20) continue;

          steps.push({
            content: cleaned,
            timestamp: new Date().toISOString(),
          });
          console.log('[AutocompleteService] Captured step:', cleaned.substring(0, 100));
        }
      }

      console.log('[AutocompleteService] Total steps collected:', steps.length);
      
      if (steps.length === 0) {
        console.warn('[AutocompleteService] No steps extracted from model output');
        return {
          steps: [],
          success: false,
          error: 'No output steps captured from model',
        };
      }

      return {
        steps,
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
        steps: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private extractAssistantText(message: SDKMessage): string | null {
    if (message.type !== 'assistant') return null;
    const content = message.message?.content;
    if (!Array.isArray(content)) return null;
    let text = content
      .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text)
      .join('\n')
      .trim();
    
    if (!text) return null;
    
    console.log('[AutocompleteService] Raw assistant text before extraction:', text.substring(0, 200));
    
    console.log('[AutocompleteService] Final extracted text length:', text.length);
    return text || null;
  }

  private cleanAssistantContent(text: string): string | null {
    if (!text || text.trim().length === 0) return null;

    // Prefer explicit <draft> tags
    const tagMatch = text.match(/<draft>([\s\S]*?)<\/draft>/i);
    if (tagMatch) {
      return tagMatch[1].trim();
    }

    let cleaned = text.trim();

    // Remove meta-commentary at the beginning
    cleaned = cleaned.replace(/^(Let me (write|create|draft|provide)[^\n]*:?\n+|Here\'?s a [^\n]*:?\n+|I\'ve [^\n]*:?\n+)/i, '');

    // Remove meta-commentary at the end
    cleaned = cleaned.replace(/\n+(Let me (mark|know)[^\n]*|Would you like me[^\n]*|This (draft|guide)[^\n]*)$/i, '');

    return cleaned.trim() || null;
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
