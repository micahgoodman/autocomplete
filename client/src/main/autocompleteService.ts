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
	completedText: string;
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

		if (apiKey) {
			this.apiKey = apiKey;
			// Ensure the SDK sees the expected key name
			process.env.ANTHROPIC_API_KEY = apiKey;
			console.log('[AutocompleteService] Claude Agent SDK ready');
		} else {
			console.warn(
				'[AutocompleteService] No API key found in environment'
			);
		}
	}

	async completeTask(taskText: string): Promise<AutocompleteResponse> {
		console.log(
			'[AutocompleteService] completeTask called with:',
			taskText
		);
		console.log('[AutocompleteService] API key available:', !!this.apiKey);

		if (!this.apiKey) {
			console.error(
				'[AutocompleteService] No API key set for Claude Agent SDK'
			);
			return {
				completedText: taskText,
				success: false,
				error: 'VITE_ANTHROPIC_API_KEY environment variable is not set. Please set it to use the autocomplete feature.',
			};
		}

		try {
			console.log('[AutocompleteService] Starting Claude Agent query...');
			const prompt = `Complete this checklist item by providing ONLY the draft content.\n\nTask: ${taskText}\n\nReturn your answer wrapped exactly between <draft> and </draft> tags with no other commentary, preface, or follow-up. Do NOT include code fences. If it's an email, include an optional Subject line and the email body. Example format:\n<draft>\nSubject: ...\n\nHi ...\n...\n</draft>`;

			// Set up MCP server path (relative to client directory)
			// Use the compiled dist/index.js file
			const mcpServerPath = path.join(
				__dirname,
				'../../../mcp-server/dist/index.js'
			);
			console.log(
				'[AutocompleteService] MCP server path:',
				mcpServerPath
			);
			console.log(
				'[AutocompleteService] Node executable path:',
				process.execPath
			);
			console.log(
				'[AutocompleteService] Current working directory:',
				process.cwd()
			);

			const stream = query({
				prompt,
				options: {
					model: 'claude-3-5-sonnet-20241022',
					includePartialMessages: false,
					executable: 'node' as const,
					executableArgs: [mcpServerPath],
					cwd: process.cwd(),
					env: {
						...process.env,
						ANTHROPIC_API_KEY: this.apiKey,
						PATH:
							process.env.PATH ||
							'/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin',
					},
				},
			});

			let completedText = taskText;
			let hasLockedDraft = false;

			for await (const message of stream) {
				this.logSdkMessage(message);

				// Only use assistant message content (ignore result message as it contains meta-commentary)
				if (message.type === 'assistant') {
					if (hasLockedDraft) continue;
					const raw = this.extractAssistantText(message);
					if (!raw) continue;

					const cleaned = this.extractDraftBody(raw);
					if (!cleaned) continue;

					if (this.isLikelyDraft(cleaned)) {
						completedText = cleaned;
						hasLockedDraft = true;
						console.log(
							'[AutocompleteService] Locked draft from assistant message'
						);
					} else {
						console.log(
							'[AutocompleteService] Assistant text rejected by heuristics'
						);
					}
				}
			}

			console.log(
				'[AutocompleteService] Final completed text:',
				completedText
			);

			if (!hasLockedDraft) {
				console.warn(
					'[AutocompleteService] No clean draft extracted; returning failure'
				);
				return {
					completedText: taskText,
					success: false,
					error: 'No clean draft extracted from model output',
				};
			}

			return {
				completedText,
				success: true,
			};
		} catch (error) {
			console.error(
				'[AutocompleteService] Error during Claude Agent query:',
				error
			);
			console.error('[AutocompleteService] Error details:', {
				name: error instanceof Error ? error.name : 'Unknown',
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});

			return {
				completedText: taskText,
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Unknown error occurred',
			};
		}
	}

	private extractAssistantText(message: SDKMessage): string | null {
		if (message.type !== 'assistant') return null;
		const content = message.message?.content;
		if (!Array.isArray(content)) return null;
		let text = content
			.filter(
				(block: any) =>
					block?.type === 'text' && typeof block.text === 'string'
			)
			.map((block: any) => block.text)
			.join('\n')
			.trim();

		if (!text) return null;

		console.log(
			'[AutocompleteService] Raw assistant text before extraction:',
			text.substring(0, 200)
		);

		console.log(
			'[AutocompleteService] Final extracted text length:',
			text.length
		);
		return text || null;
	}

	private extractDraftBody(text: string): string | null {
		// Prefer explicit <draft> tags
		const tagMatch = text.match(/<draft>([\s\S]*?)<\/draft>/i);
		if (tagMatch) {
			return tagMatch[1].trim();
		}

		// Fallback to markdown code blocks (but not if it's just bash commands)
		const codeBlockMatch = text.match(/```[^\n]*\n([\s\S]*?)```/);
		if (
			codeBlockMatch &&
			!/^(bash|sh|shell)$/i.test(
				codeBlockMatch[0].match(/```([^\n]*)/)?.[1] || ''
			)
		) {
			return codeBlockMatch[1].trim();
		}

		// Look for structured content (markdown headings, lists, etc.)
		// This is likely the actual draft, not meta-commentary
		const hasStructure =
			/^#{1,3}\s+/m.test(text) ||
			/^\d+\.\s+/m.test(text) ||
			/^[-*]\s+/m.test(text);

		if (hasStructure) {
			// Extract from first heading to last substantive content, removing meta bookends
			const lines = text.split('\n');
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
				return lines
					.slice(firstContentLine, lastContentLine + 1)
					.join('\n')
					.trim();
			}
		}

		// Remove common prefixes like "Here's a draft:" or "Draft:"
		let cleaned = text.replace(
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

		// Choose the most draft-like block using heuristics
		const blocks = cleaned
			.split(/\n\s*\n/)
			.map((b) => b.trim())
			.filter(Boolean);
		if (blocks.length === 0) return cleaned || null;

		const metaRe =
			/(I\'?ve|I have|Would you like me|this draft|the draft is|I can revise|let me (know|mark))/i;
		const greetRe = /^\s*(Hi|Hello|Dear)\b/m;
		const subjectRe = /Subject:\s*/i;
		const signoffRe = /(Best|Regards|Sincerely),?/i;
		const headingRe = /^#{1,3}\s+/m;
		const listRe = /^\s*(\d+\.|-|•|\*)/m;

		function score(block: string): number {
			let s = 0;
			if (subjectRe.test(block)) s += 3;
			if (greetRe.test(block)) s += 3;
			if (headingRe.test(block)) s += 4; // Strong signal for structured content
			if (listRe.test(block)) s += 2;
			if (signoffRe.test(block)) s += 1;
			if (metaRe.test(block)) s -= 5;
			s += Math.min(Math.floor(block.length / 120), 3); // favor substantive content
			return s;
		}

		let best = blocks[0];
		let bestScore = score(best);
		for (let i = 1; i < blocks.length; i++) {
			const b = blocks[i];
			const sc = score(b);
			if (sc > bestScore) {
				best = b;
				bestScore = sc;
			}
		}

		// Require at least a minimal score to avoid commentary
		if (bestScore <= 0 && cleaned) return cleaned;
		return best || cleaned || null;
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
