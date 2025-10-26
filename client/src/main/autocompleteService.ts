import {
	query,
	type SDKMessage,
	type SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';
import path from 'path';

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
		console.log(
			'[AutocompleteService] Constructor - API key present:',
			!!apiKey
		);
		console.log(
			'[AutocompleteService] Constructor - API key length:',
			apiKey?.length || 0
		);
		console.log(
			'[AutocompleteService] Constructor - API key prefix:',
			apiKey?.substring(0, 10) || 'none'
		);
		this.apiKey = apiKey ?? null;
	}

	async completeTask(taskText: string): Promise<AutocompleteResponse> {
		console.log('[AutocompleteService] completeTask called with:', taskText);
		console.log('[AutocompleteService] API key available:', !!this.apiKey);

		if (!this.apiKey) {
			console.error('[AutocompleteService] No API key set for Claude Agent SDK');
			return {
				steps: [],
				success: false,
				error: 'VITE_ANTHROPIC_API_KEY environment variable is not set. Please set it to use the autocomplete feature.',
			};
		}

		// Wrap the entire operation in a timeout
		const TIMEOUT_MS = 60000; // 60 second timeout
		const timeoutPromise = new Promise<AutocompleteResponse>((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Autocomplete request timed out after ${TIMEOUT_MS / 1000} seconds`));
			}, TIMEOUT_MS);
		});

		const taskPromise = this.runAutocompleteTask(taskText);

		try {
			return await Promise.race([taskPromise, timeoutPromise]);
		} catch (error) {
			console.error('[AutocompleteService] Error in completeTask:', error);
			return {
				steps: [],
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
	}

	private isEmailTask(taskText: string): boolean {
		const emailKeywords = [
			'email', 'e-mail', 'gmail', 'send', 'reply', 'forward',
			'draft', 'compose', 'inbox', 'message', 'mail',
			'@', 'recipient', 'subject:', 'cc:', 'bcc:',
			'attachment', 'filter', 'label'
		];
		
		const lowerTask = taskText.toLowerCase();
		return emailKeywords.some(keyword => lowerTask.includes(keyword));
	}

	private async runAutocompleteTask(taskText: string): Promise<AutocompleteResponse> {
		try {
			console.log('[AutocompleteService] Starting Claude Agent query...');
			const prompt = `Complete this task. Show your work in steps if needed.\n\nTask: ${taskText}\n\nProvide your output directly. For emails, include a Subject line and body. For code or documents, provide the complete content. For complex tasks, you can break it down into steps.`;

			const needsGmail = this.isEmailTask(taskText);
			console.log('[AutocompleteService] Task requires Gmail tools:', needsGmail);

			let queryOptions: any = {
				model: 'claude-3-5-sonnet-20241022',
				includePartialMessages: false,
				permissionMode: 'bypassPermissions', // Auto-approve all tool uses including MCP tools
			};

			if (needsGmail) {
				// Set up MCP server for Gmail tasks using the correct SDK configuration
				const mcpServerPath = path.join(
					__dirname,
					'../../../mcp-server/dist/index.js'
				);
				
				const fs = require('fs');
				if (!fs.existsSync(mcpServerPath)) {
					console.error('[AutocompleteService] MCP server file not found at:', mcpServerPath);
					return {
						steps: [],
						success: false,
						error: `Gmail MCP server not found at ${mcpServerPath}. Please build the MCP server first.`,
					};
				}

				// Check if Gmail is authenticated
				const credentialsPath = path.join(
					path.dirname(mcpServerPath),
					'..',
					'credentials.json'
				);
				
				if (!fs.existsSync(credentialsPath)) {
					console.warn('[AutocompleteService] Gmail credentials not found at:', credentialsPath);
					return {
						steps: [],
						success: false,
						error: 'Gmail not authenticated. Please authenticate Gmail first using the Auth modal.',
					};
				}

				// Find Node.js executable
				const { execSync } = require('child_process');
				let nodePath = 'node'; // Default to 'node' in PATH
				
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

				console.log('[AutocompleteService] Using Gmail MCP server');
				console.log('[AutocompleteService] MCP server path:', mcpServerPath);
				console.log('[AutocompleteService] Node command:', nodePath);
				console.log('[AutocompleteService] Credentials exist:', fs.existsSync(credentialsPath));

				// Use the correct SDK configuration format for MCP servers
				queryOptions.mcpServers = {
					gmail: {
						type: 'stdio',
						command: nodePath,
						args: [mcpServerPath],
						env: {
							...process.env,
							PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin',
						},
					},
				};
				
				console.log('[AutocompleteService] MCP server configured in mcpServers option');
			} else {
				console.log('[AutocompleteService] Using Claude directly (no Gmail tools needed)');
			}

			const stream = query({
				prompt,
				options: queryOptions,
			});

			const steps: Array<{ content: string; timestamp: string }> = [];
			let messageCount = 0;
			let hasReceivedAnyMessage = false;

			console.log('[AutocompleteService] Starting to consume stream...');
			console.log('[AutocompleteService] Waiting for messages from', needsGmail ? 'MCP server' : 'Claude API', '...');

			try {
				for await (const message of stream) {
					hasReceivedAnyMessage = true;
					messageCount++;
					console.log('[AutocompleteService] Received message #', messageCount, 'type:', message.type);
					this.logSdkMessage(message);

					// Check for error messages
					if ((message as any).error) {
						console.error('[AutocompleteService] Error in message:', (message as any).error);
					}

					// Collect all assistant messages as steps
					if (message.type === 'assistant') {
						const raw = this.extractAssistantText(message);
						if (!raw) {
							console.log('[AutocompleteService] No text extracted from assistant message');
							continue;
						}

						// Clean up the content but don't be too aggressive
						const cleaned = this.cleanAssistantContent(raw);
						if (!cleaned || cleaned.length < 20) {
							console.log('[AutocompleteService] Cleaned content too short or empty');
							continue;
						}

						steps.push({
							content: cleaned,
							timestamp: new Date().toISOString(),
						});
						console.log('[AutocompleteService] Captured step:', cleaned.substring(0, 100));
					}

					// Check for result messages which indicate the stream is done
					if (message.type === 'result') {
						console.log('[AutocompleteService] Received result message, stream should complete soon');
						const resultMsg = message as any;
						if (resultMsg.subtype === 'error') {
							console.error('[AutocompleteService] Result error:', resultMsg);
						}
					}
				}
			} catch (streamError) {
				console.error('[AutocompleteService] Error consuming stream:', streamError);
				if (!hasReceivedAnyMessage) {
					throw new Error(`Stream failed to produce any messages. ${needsGmail ? 'MCP server may have failed to start or respond.' : 'API connection issue.'} Original error: ${streamError instanceof Error ? streamError.message : String(streamError)}`);
				}
				throw streamError;
			}

			if (!hasReceivedAnyMessage) {
				console.error('[AutocompleteService] Stream completed without receiving any messages');
				return {
					steps: [],
					success: false,
					error: needsGmail 
						? 'MCP server did not respond. The server may have started but failed to communicate with Claude.'
						: 'No response from Claude API. Check your API key and network connection.',
				};
			}

			console.log('[AutocompleteService] Stream completed. Total messages:', messageCount);
			console.log('[AutocompleteService] Total steps collected:', steps.length);

			if (steps.length === 0) {
				console.warn('[AutocompleteService] No steps extracted from model output');
				return {
					steps: [],
					success: false,
					error: 'No output steps captured from model. The model may not have generated any content.',
				};
			}

			return {
				steps,
				success: true,
			};
		} catch (error) {
			console.error('[AutocompleteService] Error during Claude Agent query:', error);
			console.error('[AutocompleteService] Error details:', {
				name: error instanceof Error ? error.name : 'Unknown',
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});

			return {
				steps: [],
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			};
		}
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

		// Look for structured content (markdown headings, lists, etc.)
		// This is likely the actual draft, not meta-commentary
		const hasStructure =
			/^#{1,3}\s+/m.test(cleaned) ||
			/^\d+\.\s+/m.test(cleaned) ||
			/^[-*]\s+/m.test(cleaned);

		if (hasStructure) {
			// Extract from first heading to last substantive content, removing meta bookends
			const lines = cleaned.split('\n');
			let firstContentLine = -1;
			let lastContentLine = -1;

			const metaLineRe =
				/^(Let me|I\'?ve|I have|Would you like|This (draft|guide)|The draft)/i;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				if (!line) continue;

				// Skip meta lines at the start
				if (firstContentLine === -1 && metaLineRe.test(line)) continue;

				// Found first real content line (heading, list, or substantive text)
				if (
					firstContentLine === -1 &&
					(line.startsWith('#') ||
						/^\d+\./.test(line) ||
						/^[-*]/.test(line) ||
						line.length > 40)
				) {
					firstContentLine = i;
				}

				// Track last non-meta line
				if (firstContentLine !== -1 && !metaLineRe.test(line)) {
					lastContentLine = i;
				}
			}

			if (firstContentLine !== -1 && lastContentLine !== -1) {
				cleaned = lines
					.slice(firstContentLine, lastContentLine + 1)
					.join('\n')
					.trim();
			}
		}

		// Remove common prefixes like "Here's a draft:" or "Draft:"
		cleaned = cleaned.replace(
			/^(Here\'?s a draft[^:]*:|Draft[^:]*:|Here is[^:]*:|Let me write[^:]*:)\s*/i,
			''
		);

		// Drop obvious meta sentences at the start and end
		cleaned = cleaned
			.replace(
				/^(I\'?ve|I have|Would you like me|Let me (know|mark|write))[^\n]*\n?/gi,
				''
			)
			.trim();
		cleaned = cleaned
			.replace(
				/\n?(Let me mark this task|Would you like me to)[^\n]*$/gi,
				''
			)
			.trim();

		// Choose the most draft-like blocks using heuristics
		const blocks = cleaned
			.split(/\n\s*\n/)
			.map((b) => b.trim())
			.filter(Boolean);
		if (blocks.length === 0) return cleaned.trim() || null;

		const metaRe =
			/(I\'?ve|I have|Would you like me|this draft|the draft is|I can revise|let me (know|mark))/i;
		const greetRe = /^\s*(Hi|Hello|Dear)\b/m;
		const subjectRe = /Subject:\s*/i;
		const bodyRe = /Body:\s*/i;
		const signoffRe = /(Best|Regards|Sincerely),?/i;
		const headingRe = /^#{1,3}\s+/m;
		const listRe = /^\s*(\d+\.|-|•|\*)/m;

		function score(block: string): number {
			let s = 0;
			if (subjectRe.test(block)) s += 3;
			if (bodyRe.test(block)) s += 3;
			if (greetRe.test(block)) s += 3;
			if (headingRe.test(block)) s += 4; // Strong signal for structured content
			if (listRe.test(block)) s += 2;
			if (signoffRe.test(block)) s += 1;
			if (metaRe.test(block)) s -= 5;
			s += Math.min(Math.floor(block.length / 120), 3); // favor substantive content
			return s;
		}

		// Check if this looks like structured email content (Subject/Body)
		const hasEmailStructure = blocks.some(b => subjectRe.test(b)) && 
		                          (blocks.some(b => bodyRe.test(b)) || blocks.some(b => greetRe.test(b)));

		if (hasEmailStructure) {
			// Keep all non-meta blocks for email-structured content
			const contentBlocks = blocks.filter(b => score(b) > 0);
			if (contentBlocks.length > 0) {
				return contentBlocks.join('\n\n');
			}
		}

		// For other content, keep all high-scoring blocks (score > 0)
		const goodBlocks = blocks.filter(b => score(b) > 0);
		if (goodBlocks.length > 0) {
			// If we have multiple good blocks, keep them all
			return goodBlocks.join('\n\n');
		}

		// Fallback: return the cleaned content or null
		return cleaned.trim() || null;
	}

	private extractAssistantText(message: SDKMessage): string | null {
		if (message.type !== 'assistant') return null;
		const m: any = (message as any)?.message;
		if (!m) return null;
		const c = (m as any).content;
		if (typeof c === 'string') return c.trim();
		if (Array.isArray(c)) {
			const text = c
				.map((part: any) => {
					if (typeof part === 'string') return part;
					if (typeof part?.text === 'string') return part.text;
					if (part?.type === 'text' && typeof part.text === 'string') return part.text;
					if (part?.type === 'output_text' && typeof (part as any).output_text === 'string') return (part as any).output_text;
					return '';
				})
				.join('');
			return text.trim() || null;
		}
		if (c && typeof (c as any).text === 'string') return (c as any).text.trim();
		return null;
	}

	private isLikelyDraft(text: string): boolean {
		// Reject if it's mostly meta-commentary
		const commentarySignals =
			/(I\'?ve|I have|Would you like me|this draft|the draft is|I can revise|let me (know|mark))/i.test(
				text
			);
		if (commentarySignals && text.length < 200) return false; // Short text with commentary = not a draft

		// Accept if it has strong draft signals
		const positive = [
			/Subject:\s*/i,
			/^Hi\b|^Hello\b|^Dear\b/m,
			/^#{1,3}\s+/m, // Markdown headings
			/^##?\s+Step\s+\d+/m, // Numbered steps with headings
			/^\d+\.\s+[A-Z]/m, // Numbered lists starting with capital letter
		];
		return positive.some((re) => re.test(text));
	}

	private logSdkMessage(message: SDKMessage) {
		const { type } = message;
		if (type === 'assistant') {
			console.log(
				'[AutocompleteService][SDK] Assistant message:',
				JSON.stringify(
					{
						content: message.message?.content,
						parent_tool_use_id: message.parent_tool_use_id,
					},
					null,
					2
				)
			);
		} else if (type === 'stream_event') {
			console.log(
				'[AutocompleteService][SDK] Stream event:',
				JSON.stringify(message.event, null, 2)
			);
		} else if (type === 'result') {
			const resultPayload = message as SDKResultMessage;
			console.log(
				'[AutocompleteService][SDK] Result message:',
				JSON.stringify(
					{
						subtype: resultPayload.subtype,
						result:
							resultPayload.subtype === 'success'
								? resultPayload.result
								: undefined,
						usage: resultPayload.usage,
						total_cost_usd: resultPayload.total_cost_usd,
					},
					null,
					2
				)
			);
		} else {
			console.log(
				'[AutocompleteService][SDK] Message:',
				JSON.stringify(message, null, 2)
			);
		}
	}
}

export type { SDKMessage };
