"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatKitAgentBuilder = void 0;
const axios_1 = __importStar(require("axios"));
const crypto_1 = require("crypto");
const n8n_workflow_1 = require("n8n-workflow");
const SESSION_REFRESH_THRESHOLD_MS = 60000;
const CHATKIT_STATE_KEY = 'chatkitState';
function maskClientSecret(secret) {
    if (!secret) {
        return secret;
    }
    if (secret.length <= 8) {
        return `${secret.slice(0, 2)}***${secret.slice(-1)}`;
    }
    return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}
function ensurePersistedState() {
    const staticData = this.getWorkflowStaticData('node');
    if (!staticData[CHATKIT_STATE_KEY]) {
        staticData[CHATKIT_STATE_KEY] = {};
    }
    return staticData[CHATKIT_STATE_KEY];
}
function savePersistedState(state) {
    const staticData = this.getWorkflowStaticData('node');
    staticData[CHATKIT_STATE_KEY] = state;
}
function resolveUrl(baseUrl, endpoint) {
    const trimmedBase = baseUrl.replace(/\/+$/u, '');
    const trimmedEndpoint = endpoint.replace(/^\/+/, '');
    return `${trimmedBase}/${trimmedEndpoint}`;
}
function sanitizePayload(payload) {
    const clone = JSON.parse(JSON.stringify(payload));
    const session = clone.session;
    if (session) {
        if (typeof session.client_secret === 'string') {
            session.client_secret = maskClientSecret(session.client_secret);
        }
        if (typeof session.clientSecret === 'string') {
            session.clientSecret = maskClientSecret(session.clientSecret);
        }
    }
    return clone;
}
function parseJsonObjectParameter(paramName, itemIndex) {
    const raw = this.getNodeParameter(paramName, itemIndex, '');
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Expected a JSON object.');
        }
        return parsed;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to parse ${paramName}: ${message}`, {
            itemIndex,
        });
    }
}
async function proxyRequest(itemIndex, method, endpoint, body, timeout) {
    const credentials = (await this.getCredentials('openAiChatKitApi'));
    if (!credentials?.serverProxyBaseUrl) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'The ChatKit credentials must include a Server Proxy Base URL.', {
            itemIndex,
        });
    }
    let baseUrl;
    try {
        const resolved = new URL(credentials.serverProxyBaseUrl);
        baseUrl = resolved.toString();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid URL';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Invalid Server Proxy Base URL: ${message}`, {
            itemIndex,
        });
    }
    const url = resolveUrl(baseUrl, endpoint);
    const headers = {
        'Content-Type': 'application/json',
    };
    if (credentials.apiKey) {
        headers.Authorization = `Bearer ${credentials.apiKey}`;
    }
    if (credentials.projectId) {
        headers['X-Project-Id'] = credentials.projectId;
    }
    if (credentials.organization) {
        headers['X-Organization-Id'] = credentials.organization;
    }
    const requestConfig = {
        method,
        url,
        headers,
        data: body,
        timeout,
    };
    try {
        const response = await axios_1.default.request(requestConfig);
        return (response.data ?? {});
    }
    catch (error) {
        if ((0, axios_1.isAxiosError)(error)) {
            const responseData = error.response?.data;
            const errorMessage = (typeof responseData === 'object' && responseData?.error && typeof responseData.error === 'string'
                ? responseData.error
                : undefined) ||
                (typeof responseData === 'object' && responseData?.message && typeof responseData.message === 'string'
                    ? responseData.message
                    : undefined) ||
                error.message;
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `ChatKit request failed: ${errorMessage}`, {
                itemIndex,
                description: typeof responseData === 'string'
                    ? responseData
                    : responseData
                        ? JSON.stringify(responseData)
                        : undefined,
            });
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `ChatKit request failed: ${message}`, {
            itemIndex,
        });
    }
}
function ensureSessionForMessaging(itemIndex, state) {
    if (!state.session) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No ChatKit session is stored. Run the Session → Create operation before sending messages.', {
            itemIndex,
        });
    }
    return state.session;
}
function determineThreadId(itemIndex, strategy, state, threadIdParam, prefixParam) {
    if (strategy === 'auto-persist') {
        if (state.thread?.id) {
            return { threadId: state.thread.id, persist: false };
        }
        return { threadId: `thread_${(0, crypto_1.randomUUID)()}`, persist: true };
    }
    if (strategy === 'provided') {
        if (!threadIdParam) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Thread ID must be provided when using the Provided strategy.', {
                itemIndex,
            });
        }
        return { threadId: threadIdParam, persist: false };
    }
    const prefix = prefixParam?.trim() || 'thread';
    return { threadId: `${prefix}_${(0, crypto_1.randomUUID)()}`, persist: true };
}
async function refreshSessionIfNeeded(itemIndex, state, timeout) {
    const session = ensureSessionForMessaging.call(this, itemIndex, state);
    if (!session.expiresAt) {
        return session;
    }
    const expiresAtMs = new Date(session.expiresAt).getTime();
    const needsRefresh = expiresAtMs - Date.now() <= SESSION_REFRESH_THRESHOLD_MS;
    if (!needsRefresh) {
        return session;
    }
    const refreshed = (await proxyRequest.call(this, itemIndex, 'POST', 'session/refresh', {
        sessionId: session.id,
    }, timeout));
    const refreshedSession = refreshed.session;
    if (!refreshedSession?.id || typeof refreshedSession.client_secret !== 'string') {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'The refresh response did not include a session id and client_secret.', { itemIndex });
    }
    const updatedSession = {
        id: refreshedSession.id,
        clientSecret: refreshedSession.client_secret,
        expiresAt: refreshedSession.expires_at ?? session.expiresAt,
        workflowId: session.workflowId,
        userId: session.userId,
    };
    state.session = updatedSession;
    savePersistedState.call(this, state);
    return updatedSession;
}
class ChatKitAgentBuilder {
    constructor() {
        this.description = {
            displayName: 'OpenAI ChatKit (Agent Builder)',
            name: 'chatKitAgentBuilder',
            icon: 'file:dynamics-labs.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
            description: 'Coordinate ChatKit sessions, threads, and messages for Agent Builder workflows.',
            defaults: {
                name: 'OpenAI ChatKit',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'openAiChatKitApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    options: [
                        {
                            name: 'Session',
                            value: 'session',
                        },
                        {
                            name: 'Thread',
                            value: 'thread',
                        },
                        {
                            name: 'Message',
                            value: 'message',
                        },
                    ],
                    default: 'message',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                        },
                    },
                    options: [
                        {
                            name: 'Create',
                            value: 'create',
                            action: 'Create a ChatKit session',
                        },
                        {
                            name: 'Refresh',
                            value: 'refresh',
                            action: 'Refresh the stored ChatKit session',
                        },
                        {
                            name: 'End (Local)',
                            value: 'endLocal',
                            action: 'End the stored ChatKit session locally',
                        },
                    ],
                    default: 'create',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['thread'],
                        },
                    },
                    options: [
                        {
                            name: 'Set',
                            value: 'set',
                            action: 'Store a specific thread id for future messages',
                        },
                        {
                            name: 'New',
                            value: 'new',
                            action: 'Generate a new thread id',
                        },
                    ],
                    default: 'set',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                        },
                    },
                    options: [
                        {
                            name: 'Send',
                            value: 'send',
                            action: 'Send a message to the configured workflow',
                        },
                    ],
                    default: 'send',
                },
                {
                    displayName: 'Mode',
                    name: 'mode',
                    type: 'options',
                    options: [
                        {
                            name: 'ChatKit',
                            value: 'chatkit',
                            description: 'Use a proxy that forwards requests to the ChatKit REST endpoints',
                        },
                        {
                            name: 'Agents SDK (Preview)',
                            value: 'agentsSdk',
                            description: 'Reserved for future code-first integrations',
                        },
                    ],
                    default: 'chatkit',
                    description: 'Select how the node connects to your Agent Builder workflow.',
                },
                {
                    displayName: 'Workflow ID',
                    name: 'workflowId',
                    type: 'string',
                    default: '',
                    description: 'Identifier of the Agent Builder workflow that should process the conversation.',
                    displayOptions: {
                        show: {
                            mode: ['chatkit'],
                            resource: ['session', 'message'],
                        },
                    },
                },
                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    description: 'Optional identifier tying the session to an end user.',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Metadata (JSON)',
                    name: 'sessionMetadata',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    description: 'Additional metadata forwarded to your proxy when creating a session.',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Thread ID',
                    name: 'threadId',
                    type: 'string',
                    default: '',
                    description: 'Thread identifier to store for subsequent messages.',
                    displayOptions: {
                        show: {
                            resource: ['thread'],
                            operation: ['set'],
                        },
                    },
                },
                {
                    displayName: 'Prefix',
                    name: 'threadPrefix',
                    type: 'string',
                    default: 'thread',
                    description: 'Optional prefix applied when generating a new thread id.',
                    displayOptions: {
                        show: {
                            resource: ['thread'],
                            operation: ['new'],
                        },
                    },
                },
                {
                    displayName: 'Auto Refresh Session',
                    name: 'autoRefreshSession',
                    type: 'boolean',
                    default: true,
                    description: 'Refresh the stored session automatically when it is close to expiring.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Thread Strategy',
                    name: 'threadStrategy',
                    type: 'options',
                    options: [
                        {
                            name: 'Auto Persist',
                            value: 'auto-persist',
                            description: 'Reuse the stored thread id or generate one automatically on the first message.',
                        },
                        {
                            name: 'Provided',
                            value: 'provided',
                            description: 'Use the thread id supplied by the workflow input.',
                        },
                        {
                            name: 'New',
                            value: 'new',
                            description: 'Force a brand new thread id and overwrite the stored one.',
                        },
                    ],
                    default: 'auto-persist',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Thread ID',
                    name: 'messageThreadId',
                    type: 'string',
                    default: '',
                    description: 'Thread id used when the strategy is set to Provided.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                            threadStrategy: ['provided'],
                        },
                    },
                },
                {
                    displayName: 'Thread Prefix',
                    name: 'messageThreadPrefix',
                    type: 'string',
                    default: 'thread',
                    description: 'Prefix used when the strategy is set to New.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                            threadStrategy: ['new'],
                        },
                    },
                },
                {
                    displayName: 'Input Text',
                    name: 'inputText',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    description: 'Message text that should be delivered to the workflow.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                    required: true,
                },
                {
                    displayName: 'System Prompt',
                    name: 'systemPrompt',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    description: 'Optional system level instructions that accompany the message.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Metadata (JSON)',
                    name: 'messageMetadata',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    description: 'Custom key/value metadata forwarded with the message.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Return Mode',
                    name: 'returnMode',
                    type: 'options',
                    options: [
                        {
                            name: 'Final Only',
                            value: 'final_only',
                            description: 'Return only the final assistant message.',
                        },
                        {
                            name: 'Stream Emulated',
                            value: 'stream_emulated',
                            description: 'Return a simulated stream of updates from the workflow.',
                        },
                        {
                            name: 'Both',
                            value: 'both',
                            description: 'Return both streaming-style updates and the final output.',
                        },
                    ],
                    default: 'final_only',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Timeout (ms)',
                    name: 'timeoutMs',
                    type: 'number',
                    typeOptions: {
                        minValue: 1000,
                    },
                    default: 30000,
                    description: 'Abort the request if no response is received within this duration.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const resource = this.getNodeParameter('resource', itemIndex);
                const operation = this.getNodeParameter('operation', itemIndex);
                const mode = this.getNodeParameter('mode', itemIndex);
                if (mode !== 'chatkit') {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Only ChatKit mode is currently supported. Agents SDK mode will be available in a future update.', { itemIndex });
                }
                const state = ensurePersistedState.call(this);
                if (resource === 'session') {
                    if (operation === 'create') {
                        const workflowId = this.getNodeParameter('workflowId', itemIndex).trim();
                        if (!workflowId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Workflow ID is required to create a session.', {
                                itemIndex,
                            });
                        }
                        const userId = this.getNodeParameter('userId', itemIndex, '').trim();
                        const metadata = parseJsonObjectParameter.call(this, 'sessionMetadata', itemIndex);
                        const payload = {
                            workflowId,
                            ...(userId ? { userId } : {}),
                            ...(metadata ? { metadata } : {}),
                        };
                        const response = await proxyRequest.call(this, itemIndex, 'POST', 'session', payload);
                        const session = response.session;
                        if (!session?.id || typeof session.client_secret !== 'string') {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Session creation failed: response did not include id and client_secret.', { itemIndex });
                        }
                        const expiresAt = session.expires_at ?? undefined;
                        const persistedSession = {
                            id: session.id,
                            clientSecret: session.client_secret,
                            expiresAt,
                            workflowId,
                            userId: userId || undefined,
                        };
                        state.session = persistedSession;
                        savePersistedState.call(this, state);
                        const output = {
                            workflowId,
                            userId: userId || undefined,
                            session: {
                                id: session.id,
                                client_secret: maskClientSecret(session.client_secret),
                                expires_at: expiresAt,
                            },
                            raw: sanitizePayload(response),
                        };
                        returnData.push({ json: output });
                        continue;
                    }
                    if (operation === 'refresh') {
                        const session = ensureSessionForMessaging.call(this, itemIndex, state);
                        const response = await proxyRequest.call(this, itemIndex, 'POST', 'session/refresh', {
                            sessionId: session.id,
                        });
                        const refreshedSession = response.session;
                        if (!refreshedSession?.id || typeof refreshedSession.client_secret !== 'string') {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Session refresh failed: response did not include id and client_secret.', { itemIndex });
                        }
                        const updatedSession = {
                            id: refreshedSession.id,
                            clientSecret: refreshedSession.client_secret,
                            expiresAt: refreshedSession.expires_at ?? session.expiresAt,
                            workflowId: session.workflowId,
                            userId: session.userId,
                        };
                        state.session = updatedSession;
                        savePersistedState.call(this, state);
                        const output = {
                            workflowId: session.workflowId,
                            userId: session.userId,
                            session: {
                                id: refreshedSession.id,
                                client_secret: maskClientSecret(refreshedSession.client_secret),
                                expires_at: updatedSession.expiresAt,
                            },
                            raw: sanitizePayload(response),
                        };
                        returnData.push({ json: output });
                        continue;
                    }
                    if (operation === 'endLocal') {
                        delete state.session;
                        delete state.thread;
                        savePersistedState.call(this, state);
                        returnData.push({
                            json: {
                                ended: true,
                                message: 'Cleared the stored ChatKit session and thread information.',
                            },
                        });
                        continue;
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported session operation: ${operation}`, {
                        itemIndex,
                    });
                }
                if (resource === 'thread') {
                    if (operation === 'set') {
                        const threadId = this.getNodeParameter('threadId', itemIndex).trim();
                        if (!threadId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Thread ID is required.', { itemIndex });
                        }
                        state.thread = { id: threadId };
                        savePersistedState.call(this, state);
                        returnData.push({ json: { thread: { id: threadId } } });
                        continue;
                    }
                    if (operation === 'new') {
                        const prefix = this.getNodeParameter('threadPrefix', itemIndex).trim() || 'thread';
                        const threadId = `${prefix}_${(0, crypto_1.randomUUID)()}`;
                        state.thread = { id: threadId };
                        savePersistedState.call(this, state);
                        returnData.push({ json: { thread: { id: threadId } } });
                        continue;
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported thread operation: ${operation}`, {
                        itemIndex,
                    });
                }
                if (resource === 'message') {
                    if (operation !== 'send') {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported message operation: ${operation}`, {
                            itemIndex,
                        });
                    }
                    const workflowId = this.getNodeParameter('workflowId', itemIndex, '').trim();
                    const session = ensureSessionForMessaging.call(this, itemIndex, state);
                    if (workflowId && session.workflowId && session.workflowId !== workflowId) {
                        session.workflowId = workflowId;
                    }
                    const resolvedWorkflowId = session.workflowId || workflowId;
                    if (!resolvedWorkflowId) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Workflow ID is required to send a message. Provide it on the node or recreate the session.', { itemIndex });
                    }
                    const autoRefresh = this.getNodeParameter('autoRefreshSession', itemIndex, true);
                    const timeout = this.getNodeParameter('timeoutMs', itemIndex, 30000);
                    let activeSession = session;
                    if (autoRefresh) {
                        activeSession = await refreshSessionIfNeeded.call(this, itemIndex, state, timeout);
                    }
                    const strategy = this.getNodeParameter('threadStrategy', itemIndex, 'auto-persist');
                    const providedThreadId = this.getNodeParameter('messageThreadId', itemIndex, '').trim();
                    const threadPrefix = this.getNodeParameter('messageThreadPrefix', itemIndex, '').trim();
                    const { threadId, persist } = determineThreadId.call(this, itemIndex, strategy, state, providedThreadId, threadPrefix);
                    if (persist) {
                        state.thread = { id: threadId };
                        savePersistedState.call(this, state);
                    }
                    const inputText = this.getNodeParameter('inputText', itemIndex).trim();
                    if (!inputText) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Input Text is required to send a message.', {
                            itemIndex,
                        });
                    }
                    const systemPrompt = this.getNodeParameter('systemPrompt', itemIndex, '').trim();
                    const metadata = parseJsonObjectParameter.call(this, 'messageMetadata', itemIndex);
                    const returnMode = this.getNodeParameter('returnMode', itemIndex, 'final_only');
                    const payload = {
                        workflowId: resolvedWorkflowId,
                        sessionId: activeSession.id,
                        clientSecret: activeSession.clientSecret,
                        threadId,
                        message: {
                            role: 'user',
                            input_text: inputText,
                            ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
                            ...(metadata ? { metadata } : {}),
                        },
                        returnMode,
                        ...(activeSession.userId ? { userId: activeSession.userId } : {}),
                    };
                    const response = await proxyRequest.call(this, itemIndex, 'POST', 'message/send', payload, timeout);
                    const sanitized = sanitizePayload(response);
                    if (sanitized.session && typeof sanitized.session.client_secret === 'string') {
                        const sessionPayload = response.session;
                        state.session = {
                            id: sessionPayload.id,
                            clientSecret: response.session.client_secret,
                            expiresAt: sessionPayload.expires_at ?? activeSession.expiresAt,
                            workflowId: resolvedWorkflowId,
                            userId: activeSession.userId,
                        };
                        savePersistedState.call(this, state);
                    }
                    if (!persist) {
                        const threadResponse = response.thread;
                        if (threadResponse?.id) {
                            state.thread = { id: threadResponse.id };
                            savePersistedState.call(this, state);
                        }
                    }
                    returnData.push({ json: sanitized });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, {
                    itemIndex,
                });
            }
            catch (error) {
                if (error instanceof n8n_workflow_1.NodeOperationError) {
                    throw error;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex });
            }
        }
        return [returnData];
    }
}
exports.ChatKitAgentBuilder = ChatKitAgentBuilder;
