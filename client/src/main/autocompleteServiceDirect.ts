import Anthropic from '@anthropic-ai/sdk';
import { getAllTools, executeTool } from './claudeTools';
import { checkGmailAuth } from './gmailService';

/**
 * Alternative AutocompleteService using Anthropic SDK directly
 * This version uses the standard Anthropic API with tool support
 * instead of the claude-agent-sdk
 */

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
	isEmailTask?: boolean;
}

export interface ProgressUpdate {
	type: 'status' | 'step';
	content?: string;
	message?: string;
	timestamp: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export class AutocompleteServiceDirect {
	private anthropic: Anthropic;

	constructor() {
		const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error('VITE_ANTHROPIC_API_KEY not found in environment variables');
		}
		this.anthropic = new Anthropic({ apiKey });
	}

	private isEmailTask(taskText: string): boolean {
		const emailKeywords = ['email', 'gmail', 'draft', 'send', 'mail', 'message', 'compose'];
		const lowerText = taskText.toLowerCase();
		return emailKeywords.some(keyword => lowerText.includes(keyword));
	}

	async completeTask(taskText: string, onProgress?: ProgressCallback): Promise<AutocompleteResponse> {
		try {
			console.log('[AutocompleteServiceDirect] Starting task:', taskText);

			const needsGmail = this.isEmailTask(taskText);
			console.log('[AutocompleteServiceDirect] Needs Gmail:', needsGmail);

			// Send initial status
			if (onProgress) {
				onProgress({
					type: 'status',
					message: needsGmail ? 'Preparing email draft...' : 'Processing task...',
					timestamp: new Date().toISOString(),
				});
			}

			// Check Gmail auth if needed
			if (needsGmail && !checkGmailAuth()) {
				throw new Error('Google OAuth credentials not configured');
			}

			// Build messages
			const messages: Anthropic.Messages.MessageParam[] = [
				{
					role: 'user',
					content: needsGmail
						? `Draft an email for this task. Provide the complete email draft with recipient, subject and body.\n\nTask: ${taskText}\n\nFormat your response as:\nTo: [recipient email address]\nSubject: [subject line]\n\nBody:\n[email body content]\n\nIMPORTANT: You must extract or infer the recipient email address from the task. If the task mentions a person's name, include their email address in the "To:" field.`
						: taskText,
				},
			];

			const steps: Array<{ content: string; timestamp: string }> = [];
			let continueLoop = true;

			while (continueLoop) {
				console.log('[AutocompleteServiceDirect] Creating message...');

				const params: Anthropic.Messages.MessageCreateParams = {
					model: 'claude-haiku-4-5',
					max_tokens: 4096,
					messages,
				};

				// Don't use tools for email tasks - just generate draft text for review
				// Tools would create the draft immediately, but we want user to review first
				// The draft will be created when user clicks "Approve"

				const response = await this.anthropic.messages.create(params);
				console.log('[AutocompleteServiceDirect] Response:', JSON.stringify(response, null, 2));

				// Process response content
				for (const block of response.content) {
					if (block.type === 'text') {
						const timestamp = new Date().toISOString();
						steps.push({
							content: block.text,
							timestamp,
						});

						if (onProgress) {
							onProgress({
								type: 'step',
								content: block.text,
								timestamp,
							});
						}
					} else if (block.type === 'tool_use') {
						console.log('[AutocompleteServiceDirect] Tool use requested:', block.name);

						// Execute the tool
						const toolResult = await executeTool(block.name, block.input);
						console.log('[AutocompleteServiceDirect] Tool result:', toolResult);

						// Add tool result as a step
						if (toolResult.success && toolResult.content) {
							const timestamp = new Date().toISOString();
							steps.push({
								content: toolResult.content,
								timestamp,
							});

							if (onProgress) {
								onProgress({
									type: 'step',
									content: toolResult.content,
									timestamp,
								});
							}
						}

						// Add tool result to messages for next iteration
						messages.push({
							role: 'assistant',
							content: response.content,
						});

						messages.push({
							role: 'user',
							content: [
								{
									type: 'tool_result',
									tool_use_id: block.id,
									content: toolResult.success
										? toolResult.content || 'Tool executed successfully'
										: `Error: ${toolResult.error}`,
								},
							],
						});

						// Continue the conversation
						break;
					}
				}

				// Check if we should continue
				if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
					continueLoop = false;
				} else if (response.stop_reason === 'tool_use') {
					// Continue to get Claude's response after tool use
					continueLoop = true;
				} else {
					continueLoop = false;
				}
			}

			return {
				steps,
				success: true,
				isEmailTask: needsGmail,
			};
		} catch (error) {
			console.error('[AutocompleteServiceDirect] Error:', error);
			return {
				steps: [],
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}
