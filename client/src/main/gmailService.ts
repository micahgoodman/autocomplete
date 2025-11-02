import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import fs from 'fs';
import { app, shell } from 'electron';
import http from 'http';

/**
 * Gmail Service for creating drafts using Google Gmail API
 * Handles OAuth authentication and draft creation
 */

const SCOPES = [
	'https://www.googleapis.com/auth/gmail.compose',
	'https://www.googleapis.com/auth/gmail.modify',
];

// Token storage path
const TOKEN_PATH = path.join(app.getPath('userData'), 'gmail-token.json');

export interface DraftEmailParams {
	to: string | string[];
	subject: string;
	body: string;
	cc?: string | string[];
	bcc?: string | string[];
}

export interface DraftCreationResult {
	success: boolean;
	draftId?: string;
	error?: string;
}

/**
 * Create OAuth2 client with credentials from environment variables
 */
function createOAuth2Client(): OAuth2Client {
	const clientId = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
	const clientSecret = process.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET;
	
	if (!clientId || !clientSecret) {
		throw new Error('Google OAuth credentials not found in environment variables');
	}
	
	// Redirect URI for desktop app
	const redirectUri = 'http://localhost:3000/oauth2callback';
	
	return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Load saved token from disk
 */
function loadSavedToken(oauth2Client: OAuth2Client): boolean {
	try {
		if (fs.existsSync(TOKEN_PATH)) {
			const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
			oauth2Client.setCredentials(token);
			console.log('[GmailService] Loaded saved token');
			return true;
		}
	} catch (error) {
		console.error('[GmailService] Error loading saved token:', error);
	}
	return false;
}

/**
 * Save token to disk for future use
 */
function saveToken(oauth2Client: OAuth2Client): void {
	try {
		const credentials = oauth2Client.credentials;
		fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
		console.log('[GmailService] Token saved to', TOKEN_PATH);
	} catch (error) {
		console.error('[GmailService] Error saving token:', error);
	}
}

/**
 * Perform OAuth flow to get new token
 */
async function getNewToken(oauth2Client: OAuth2Client): Promise<void> {
	return new Promise((resolve, reject) => {
		const authUrl = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
		});
		
		console.log('[GmailService] Authorize this app by visiting:', authUrl);
		console.log('[GmailService] Opening browser for OAuth...');
		
		// Open browser for OAuth using Electron's shell
		shell.openExternal(authUrl);
		
		// Start local server to receive OAuth callback
		const server = http.createServer(async (req: any, res: any) => {
			if (req.url?.startsWith('/oauth2callback')) {
				const url = new URL(req.url, 'http://localhost:3000');
				const code = url.searchParams.get('code');
				
				if (code) {
					res.writeHead(200);
					res.end('Authentication successful! You can close this window.');
					server.close();
					
					try {
						const { tokens } = await oauth2Client.getToken(code);
						oauth2Client.setCredentials(tokens);
						saveToken(oauth2Client);
						resolve();
					} catch (error) {
						reject(error);
					}
				} else {
					res.writeHead(400);
					res.end('No code provided');
					server.close();
					reject(new Error('No code provided'));
				}
			}
		});
		
		server.listen(3000, () => {
			console.log('[GmailService] OAuth callback server listening on port 3000');
		});
	});
}

/**
 * Get authenticated Gmail client
 */
async function getAuthenticatedClient(): Promise<OAuth2Client> {
	const oauth2Client = createOAuth2Client();
	
	// Try to load saved token
	const hasToken = loadSavedToken(oauth2Client);
	
	if (!hasToken) {
		console.log('[GmailService] No saved token found, initiating OAuth flow...');
		await getNewToken(oauth2Client);
	}
	
	return oauth2Client;
}

/**
 * Create a MIME email message
 */
function createMimeMessage(params: DraftEmailParams): string {
	const { to, subject, body, cc, bcc } = params;
	
	// Convert arrays to comma-separated strings
	const toStr = Array.isArray(to) ? to.join(', ') : to;
	const ccStr = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : '';
	const bccStr = bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : '';
	
	// Build email headers
	const headers = [
		`To: ${toStr}`,
		cc && `Cc: ${ccStr}`,
		bcc && `Bcc: ${bccStr}`,
		`Subject: ${subject}`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=utf-8',
		'',
		body,
	];
	
	// Filter out undefined/null values and join
	return headers.filter(Boolean).join('\r\n');
}

/**
 * Encode message to base64url format
 */
function encodeMessage(message: string): string {
	return Buffer.from(message)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/**
 * Create a Gmail draft
 */
export async function createGmailDraft(params: DraftEmailParams): Promise<DraftCreationResult> {
	try {
		console.log('[GmailService] Creating Gmail draft...', {
			to: params.to,
			subject: params.subject,
			bodyLength: params.body.length,
			bodyPreview: params.body.substring(0, 100),
		});
		
		// Get authenticated client
		const auth = await getAuthenticatedClient();
		
		// Create Gmail API client
		const gmail = google.gmail({ version: 'v1', auth });
		
		// Create MIME message
		const mimeMessage = createMimeMessage(params);
		console.log('[GmailService] MIME message created:');
		console.log(mimeMessage);
		console.log('[GmailService] MIME message length:', mimeMessage.length);
		
		const encodedMessage = encodeMessage(mimeMessage);
		console.log('[GmailService] Encoded message length:', encodedMessage.length);
		
		// Create draft
		const response = await gmail.users.drafts.create({
			userId: 'me',
			requestBody: {
				message: {
					raw: encodedMessage,
				},
			},
		});
		
		const draftId = response.data.id;
		console.log('[GmailService] Draft created successfully:', draftId);
		
		return {
			success: true,
			draftId: draftId || undefined,
		};
	} catch (error) {
		console.error('[GmailService] Error creating draft:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
}

/**
 * Check if Gmail authentication is available
 */
export function checkGmailAuth(): boolean {
	try {
		const clientId = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
		const clientSecret = process.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET;
		return !!(clientId && clientSecret);
	} catch {
		return false;
	}
}
