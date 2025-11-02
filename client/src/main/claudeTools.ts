import { createGmailDraft, DraftEmailParams } from './gmailService';

/**
 * Claude Agent SDK Custom Tools
 * These tools are registered with Claude and can be called during task execution
 */

export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, any>;
		required: string[];
	};
}

export interface ToolExecutionResult {
	success: boolean;
	content?: string;
	error?: string;
}

/**
 * Gmail Draft Tool Definition
 * Tells Claude how to use the gmail_create_draft tool
 */
export const gmailDraftTool: ToolDefinition = {
	name: 'gmail_create_draft',
	description: 'Creates a draft email in Gmail. The draft will appear in the user\'s Gmail Drafts folder and can be reviewed before sending.',
	input_schema: {
		type: 'object',
		properties: {
			to: {
				type: 'string',
				description: 'Recipient email address (e.g., "john@example.com")',
			},
			subject: {
				type: 'string',
				description: 'Email subject line',
			},
			body: {
				type: 'string',
				description: 'Email body content (plain text)',
			},
			cc: {
				type: 'string',
				description: 'Optional CC recipients (comma-separated if multiple)',
			},
			bcc: {
				type: 'string',
				description: 'Optional BCC recipients (comma-separated if multiple)',
			},
		},
		required: ['to', 'subject', 'body'],
	},
};

/**
 * Execute Gmail Draft Tool
 * Called when Claude wants to create a draft
 */
export async function executeGmailDraftTool(input: any): Promise<ToolExecutionResult> {
	try {
		console.log('[ClaudeTools] Executing gmail_create_draft tool:', input);
		
		// Validate input
		if (!input.to || !input.subject || !input.body) {
			return {
				success: false,
				error: 'Missing required fields: to, subject, or body',
			};
		}
		
		// Parse CC and BCC if provided
		const params: DraftEmailParams = {
			to: input.to,
			subject: input.subject,
			body: input.body,
		};
		
		if (input.cc) {
			params.cc = input.cc.split(',').map((email: string) => email.trim());
		}
		
		if (input.bcc) {
			params.bcc = input.bcc.split(',').map((email: string) => email.trim());
		}
		
		// Create the draft
		const result = await createGmailDraft(params);
		
		if (result.success) {
			return {
				success: true,
				content: `Gmail draft created successfully!`,
			};
		} else {
			return {
				success: false,
				error: result.error || 'Failed to create draft',
			};
		}
	} catch (error) {
		console.error('[ClaudeTools] Error executing gmail_create_draft:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
}

/**
 * Get all available tools
 */
export function getAllTools(): ToolDefinition[] {
	return [gmailDraftTool];
}

/**
 * Execute a tool by name
 */
export async function executeTool(toolName: string, input: any): Promise<ToolExecutionResult> {
	switch (toolName) {
		case 'gmail_create_draft':
			return await executeGmailDraftTool(input);
		default:
			return {
				success: false,
				error: `Unknown tool: ${toolName}`,
			};
	}
}
