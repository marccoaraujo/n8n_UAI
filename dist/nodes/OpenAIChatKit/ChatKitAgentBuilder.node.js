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
const n8n_workflow_1 = require("n8n-workflow");
const STATE_KEY = 'chatkitState';
function maskSecret(secret) {
    if (secret.length <= 8) {
        return `${secret.slice(0, 2)}***${secret.slice(-1)}`;
    }
    return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}
function getState() {
    const data = this.getWorkflowStaticData('node');
    if (!data[STATE_KEY]) {
        data[STATE_KEY] = {};
    }
    const rawState = data[STATE_KEY];
    const session = rawState.session;
    if (session?.id && session.clientSecret) {
        return {
            session: {
                id: session.id,
                clientSecret: session.clientSecret,
                expiresAt: session.expiresAt,
                workflowId: session.workflowId,
            },
        };
    }
    return {};
}
function saveState(state) {
    const data = this.getWorkflowStaticData('node');
    data[STATE_KEY] = state;
}
function ensureSession(itemIndex, state) {
    if (!state.session) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No ChatKit session stored. Run the Session → Create operation first or provide manual credentials.', { itemIndex });
    }
    return state.session;
}
function parseJsonParameter(name, itemIndex) {
    const raw = this.getNodeParameter(name, itemIndex, '');
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Expected a JSON object');
        }
        return parsed;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to parse ${name}: ${message}`, { itemIndex });
    }
}
function sanitizeResponse(payload) {
    const clone = JSON.parse(JSON.stringify(payload));
    const session = clone.session;
    if (session?.client_secret && typeof session.client_secret === 'string') {
        session.client_secret = maskSecret(session.client_secret);
    }
    if (clone.client_secret && typeof clone.client_secret === 'string') {
        clone.client_secret = maskSecret(clone.client_secret);
    }
    return clone;
}
async function chatKitRequest(itemIndex, method, endpoint, body, timeout) {
    const credentials = (await this.getCredentials('openAiChatKitApi'));
    if (!credentials?.apiKey) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'OpenAI ChatKit credentials are required.', {
            itemIndex,
        });
    }
    const baseUrlString = credentials.baseUrl?.trim() || 'https://api.openai.com';
    let url;
    try {
        let endpointValue;
        if (endpoint instanceof URL) {
            endpointValue = endpoint.toString();
        }
        else if (Array.isArray(endpoint)) {
            endpointValue = endpoint.join('/');
        }
        else {
            endpointValue = endpoint;
        }
        if (typeof endpointValue !== 'string') {
            throw new Error('Endpoint must be a string or URL.');
        }
        const trimmedEndpoint = endpointValue.trim();
        if (!trimmedEndpoint) {
            throw new Error('Endpoint path is empty');
        }
        let endpointPath = trimmedEndpoint;
        if (!/^https?:\/\//i.test(endpointPath)) {
            endpointPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
        }
        url = new URL(endpointPath, baseUrlString).toString();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid base URL';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to resolve ChatKit URL: ${message}`, {
            itemIndex,
        });
    }
    try {
        const trimmedEndpoint = endpoint.trim();
        if (!trimmedEndpoint) {
            throw new Error('Endpoint path is empty');
        }
        let endpointPath = trimmedEndpoint;
        if (!/^https?:\/\//i.test(endpointPath)) {
            endpointPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
        }
        url = new URL(endpointPath, baseUrlString).toString();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid base URL';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to resolve ChatKit URL: ${message}`, {
            itemIndex,
        });
    }
    try {
        const baseUrl = new URL(baseUrlString);
        const baseSegments = baseUrl.pathname
            .split('/')
            .map((segment) => segment.trim())
            .filter((segment) => segment.length > 0);
        const endpointSegments = endpoint
            .split('/')
            .map((segment) => segment.trim())
            .filter((segment) => segment.length > 0);
        let overlap = 0;
        for (let candidate = Math.min(baseSegments.length, endpointSegments.length); candidate > 0; candidate -= 1) {
            const baseSuffix = baseSegments.slice(baseSegments.length - candidate);
            const endpointPrefix = endpointSegments.slice(0, candidate);
            const matches = baseSuffix.every((segment, index) => segment === endpointPrefix[index]);
            if (matches) {
                overlap = candidate;
                break;
            }
        }
        const combinedPathSegments = [...baseSegments, ...endpointSegments.slice(overlap)];
        baseUrl.pathname = combinedPathSegments.length > 0 ? `/${combinedPathSegments.join('/')}` : '/';
        url = baseUrl.toString();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid base URL';
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to resolve ChatKit URL: ${message}`, {
            itemIndex,
        });
    }
    try {
        baseUrl = new URL(baseUrlString);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid ChatKit base URL. Please include the protocol (e.g. https://).', {
            itemIndex,
        });
    }
    const basePath = baseUrl.pathname.replace(/\/+$/u, '');
    const endpoints = Array.isArray(endpoint) ? endpoint : [endpoint];
    let storedError;
    for (let index = 0; index < endpoints.length; index++) {
        const candidate = endpoints[index];
        const endpointPath = candidate.startsWith('/') ? candidate : `/${candidate}`;
        let finalPath;
        if (!basePath || endpointPath === basePath || endpointPath.startsWith(`${basePath}/`)) {
            finalPath = endpointPath;
        }
        else {
            finalPath = `${basePath}/${endpointPath.replace(/^\/+/, '')}`;
        }
        finalPath = finalPath.replace(/\/+/gu, '/');
        if (!finalPath.startsWith('/')) {
            finalPath = `/${finalPath}`;
        }
        const url = `${baseUrl.origin}${finalPath}`;
        try {
            const response = await axios_1.default.request({
                method,
                url,
                data: body,
                timeout,
                headers: {
                    Authorization: `Bearer ${credentials.apiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'chatkit_beta=v1',
                    ...(credentials.organization ? { 'OpenAI-Organization': credentials.organization } : {}),
                    ...(credentials.projectId ? { 'OpenAI-Project': credentials.projectId } : {}),
                },
            });
            return response.data ?? {};
        }
        catch (error) {
            if ((0, axios_1.isAxiosError)(error)) {
                const status = error.response?.status;
                const description = typeof error.response?.data === 'string'
                    ? error.response?.data
                    : JSON.stringify(error.response?.data ?? {});
                const nodeError = new n8n_workflow_1.NodeOperationError(this.getNode(), `ChatKit request failed${status ? ` (HTTP ${status})` : ''}: ${error.message}`, {
                    itemIndex,
                    description,
                });
                if (status === 404 && index < endpoints.length - 1) {
                    storedError = nodeError;
                    continue;
                }
                throw nodeError;
            }
            throw error;
        }
    }
    if (storedError) {
        throw storedError;
    }
    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'ChatKit request failed: no valid endpoint responded.', {
        itemIndex,
    });
}
class ChatKitAgentBuilder {
    constructor() {
        this.description = {
            displayName: 'OpenAI ChatKit',
            name: 'chatKitAgentBuilder',
            icon: 'file:dynamics-labs.svg',
            group: ['transform'],
            version: 1,
            description: 'Talk to Agent Builder workflows through the ChatKit beta.',
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
                            name: 'Message',
                            value: 'message',
                        },
                    ],
                    default: 'session',
                    noDataExpression: true,
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    options: [
                        {
                            name: 'Create',
                            value: 'create',
                            action: 'Create a ChatKit session',
                            description: 'Generate a short-lived client secret for the selected workflow',
                            routing: {
                                request: {
                                    method: 'POST',
                                },
                            },
                            displayOptions: {
                                show: {
                                    resource: ['session'],
                                },
                            },
                        },
                        {
                            name: 'Refresh',
                            value: 'refresh',
                            action: 'Refresh the stored session',
                            displayOptions: {
                                show: {
                                    resource: ['session'],
                                },
                            },
                        },
                        {
                            name: 'End (Local)',
                            value: 'end',
                            action: 'Clear the stored session',
                            displayOptions: {
                                show: {
                                    resource: ['session'],
                                },
                            },
                        },
                        {
                            name: 'Send Message',
                            value: 'send',
                            action: 'Send a message to the workflow',
                            displayOptions: {
                                show: {
                                    resource: ['message'],
                                },
                            },
                        },
                    ],
                    default: 'create',
                    noDataExpression: true,
                },
                {
                    displayName: 'Workflow ID',
                    name: 'workflowId',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'Agent Builder workflow to target.',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    description: 'Optional user identifier to bind to the session.',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Session Metadata (JSON)',
                    name: 'sessionMetadata',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    description: 'Optional metadata object forwarded to the workflow.',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Session Options (JSON)',
                    name: 'sessionOptions',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    description: 'Advanced session options, e.g. expiration overrides.',
                    displayOptions: {
                        show: {
                            resource: ['session'],
                            operation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Session Source',
                    name: 'sessionSource',
                    type: 'options',
                    options: [
                        {
                            name: 'Use Stored Session',
                            value: 'stored',
                        },
                        {
                            name: 'Provide Manually',
                            value: 'manual',
                        },
                    ],
                    default: 'stored',
                    description: 'Choose whether to reuse the stored session or supply credentials explicitly.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Session ID',
                    name: 'manualSessionId',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'Session identifier returned by ChatKit.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                            sessionSource: ['manual'],
                        },
                    },
                },
                {
                    displayName: 'Client Secret',
                    name: 'manualClientSecret',
                    type: 'string',
                    typeOptions: {
                        password: true,
                    },
                    default: '',
                    required: true,
                    description: 'Client secret returned when creating or refreshing the session.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                            sessionSource: ['manual'],
                        },
                    },
                },
                {
                    displayName: 'Workflow ID',
                    name: 'messageWorkflowId',
                    type: 'string',
                    default: '',
                    description: 'Override the workflow id associated with the stored session.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Thread ID',
                    name: 'threadId',
                    type: 'string',
                    default: '',
                    description: 'Provide a thread id to continue an existing conversation. Leave empty for a new thread.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Role',
                    name: 'messageRole',
                    type: 'options',
                    options: [
                        {
                            name: 'User',
                            value: 'user',
                        },
                        {
                            name: 'Assistant',
                            value: 'assistant',
                        },
                        {
                            name: 'System',
                            value: 'system',
                        },
                    ],
                    default: 'user',
                    description: 'Role attached to the outgoing message.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Message Text',
                    name: 'inputText',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    required: true,
                    description: 'Message content delivered to the workflow.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'System Prompt',
                    name: 'systemPrompt',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    description: 'Optional system-level instructions appended to the message.',
                    displayOptions: {
                        show: {
                            resource: ['message'],
                            operation: ['send'],
                        },
                    },
                },
                {
                    displayName: 'Message Metadata (JSON)',
                    name: 'messageMetadata',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    description: 'Optional metadata forwarded with the message.',
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
                    description: 'Maximum time to wait for the ChatKit API response.',
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
        const state = getState.call(this);
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const resource = this.getNodeParameter('resource', itemIndex);
            const operation = this.getNodeParameter('operation', itemIndex);
            if (resource === 'session') {
                if (operation === 'create') {
                    const workflowId = this.getNodeParameter('workflowId', itemIndex).trim();
                    if (!workflowId) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Workflow ID is required to create a session.', {
                            itemIndex,
                        });
                    }
                    const userId = this.getNodeParameter('userId', itemIndex, '').trim();
                    const metadata = parseJsonParameter.call(this, 'sessionMetadata', itemIndex);
                    const options = parseJsonParameter.call(this, 'sessionOptions', itemIndex);
                    const body = {
                        workflow: { id: workflowId },
                        ...(userId ? { user: userId } : {}),
                        ...(metadata ? { metadata } : {}),
                        ...(options ? { session_options: options } : {}),
                    };
                    const response = await chatKitRequest.call(this, itemIndex, 'POST', ['/v1/chatkit/sessions', '/v1/chat/sessions'], body);
                    const sessionPayload = response.session ?? response;
                    const sessionId = sessionPayload.id;
                    const clientSecret = (sessionPayload.client_secret ?? sessionPayload.clientSecret);
                    if (!sessionId || !clientSecret) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Session creation response did not include id and client_secret.', { itemIndex });
                    }
                    const stored = {
                        id: sessionId,
                        clientSecret,
                        expiresAt: sessionPayload.expires_at ?? undefined,
                        workflowId,
                    };
                    state.session = stored;
                    saveState.call(this, state);
                    const output = {
                        workflowId,
                        session: {
                            id: sessionId,
                            client_secret: maskSecret(clientSecret),
                            expires_at: stored.expiresAt,
                        },
                        raw: sanitizeResponse(response),
                    };
                    returnData.push({ json: output });
                    continue;
                }
                if (operation === 'refresh') {
                    const session = ensureSession.call(this, itemIndex, state);
                    const endpoint = [
                        `/v1/chatkit/sessions/${encodeURIComponent(session.id)}/refresh`,
                        `/v1/chat/sessions/${encodeURIComponent(session.id)}/refresh`,
                    ];
                    const body = {
                        client_secret: session.clientSecret,
                    };
                    const response = await chatKitRequest.call(this, itemIndex, 'POST', endpoint, body);
                    const sessionPayload = response.session ?? response;
                    const clientSecret = (sessionPayload.client_secret ?? sessionPayload.clientSecret);
                    if (!clientSecret) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Refresh response did not include a client_secret.', {
                            itemIndex,
                        });
                    }
                    state.session = {
                        id: session.id,
                        clientSecret,
                        expiresAt: sessionPayload.expires_at ?? session.expiresAt,
                        workflowId: session.workflowId,
                    };
                    saveState.call(this, state);
                    const output = {
                        workflowId: session.workflowId,
                        session: {
                            id: session.id,
                            client_secret: maskSecret(clientSecret),
                            expires_at: state.session.expiresAt,
                        },
                        raw: sanitizeResponse(response),
                    };
                    returnData.push({ json: output });
                    continue;
                }
                if (operation === 'end') {
                    delete state.session;
                    saveState.call(this, state);
                    returnData.push({ json: { message: 'Cleared stored ChatKit session.' } });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported session operation: ${operation}`, { itemIndex });
            }
            if (resource === 'message') {
                if (operation !== 'send') {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported message operation: ${operation}`, { itemIndex });
                }
                const source = this.getNodeParameter('sessionSource', itemIndex, 'stored');
                let sessionId;
                let clientSecret;
                let workflowId = this.getNodeParameter('messageWorkflowId', itemIndex, '').trim();
                if (source === 'stored') {
                    const stored = ensureSession.call(this, itemIndex, state);
                    sessionId = stored.id;
                    clientSecret = stored.clientSecret;
                    if (!workflowId) {
                        workflowId = stored.workflowId ?? '';
                    }
                }
                else {
                    sessionId = this.getNodeParameter('manualSessionId', itemIndex).trim();
                    clientSecret = this.getNodeParameter('manualClientSecret', itemIndex).trim();
                    if (!sessionId || !clientSecret) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Session ID and Client Secret are required when providing manual credentials.', { itemIndex });
                    }
                }
                if (!workflowId) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Workflow ID is required to send a message. Provide it on the node or create a new session.', { itemIndex });
                }
                const inputText = this.getNodeParameter('inputText', itemIndex).trim();
                if (!inputText) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Message Text is required.', { itemIndex });
                }
                const role = this.getNodeParameter('messageRole', itemIndex, 'user');
                const systemPrompt = this.getNodeParameter('systemPrompt', itemIndex, '').trim();
                const threadId = this.getNodeParameter('threadId', itemIndex, '').trim();
                const metadata = parseJsonParameter.call(this, 'messageMetadata', itemIndex);
                const timeout = this.getNodeParameter('timeoutMs', itemIndex, 30000);
                const messageContent = [
                    {
                        type: 'input_text',
                        text: inputText,
                    },
                ];
                const payload = {
                    client_secret: clientSecret,
                    workflow: { id: workflowId },
                    messages: [
                        {
                            role,
                            content: messageContent,
                        },
                    ],
                    ...(threadId ? { thread_id: threadId } : {}),
                    ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
                    ...(metadata ? { metadata } : {}),
                };
                const endpoint = [
                    `/v1/chatkit/sessions/${encodeURIComponent(sessionId)}/messages`,
                    `/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
                ];
                const response = await chatKitRequest.call(this, itemIndex, 'POST', endpoint, payload, timeout);
                const sanitized = sanitizeResponse(response);
                if (source === 'stored') {
                    const sessionPayload = response.session ?? undefined;
                    if (sessionPayload?.client_secret) {
                        state.session = {
                            id: sessionId,
                            clientSecret: sessionPayload.client_secret,
                            expiresAt: sessionPayload.expires_at ?? state.session?.expiresAt,
                            workflowId,
                        };
                        saveState.call(this, state);
                    }
                }
                returnData.push({ json: sanitized });
                continue;
            }
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, { itemIndex });
        }
        return [returnData];
    }
}
exports.ChatKitAgentBuilder = ChatKitAgentBuilder;
