import axios, { isAxiosError } from 'axios';
import {
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
} from 'n8n-workflow';

interface ChatKitCredentials {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  projectId?: string;
}

interface StoredSession {
  id: string;
  clientSecret: string;
  expiresAt?: string;
  workflowId?: string;
}

interface ChatKitState {
  session?: StoredSession;
}

const STATE_KEY = 'chatkitState';

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return `${secret.slice(0, 2)}***${secret.slice(-1)}`;
  }

  return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}

function getState(this: IExecuteFunctions): ChatKitState {
  const data = this.getWorkflowStaticData('node') as IDataObject;

  if (!data[STATE_KEY]) {
    data[STATE_KEY] = {};
  }

  const rawState = data[STATE_KEY] as IDataObject;
  const session = rawState.session as IDataObject | undefined;

  if (session?.id && session.clientSecret) {
    return {
      session: {
        id: session.id as string,
        clientSecret: session.clientSecret as string,
        expiresAt: session.expiresAt as string | undefined,
        workflowId: session.workflowId as string | undefined,
      },
    };
  }

  return {};
}

function saveState(this: IExecuteFunctions, state: ChatKitState) {
  const data = this.getWorkflowStaticData('node') as IDataObject;
  data[STATE_KEY] = state;
}

function ensureSession(this: IExecuteFunctions, itemIndex: number, state: ChatKitState): StoredSession {
  if (!state.session) {
    throw new NodeOperationError(
      this.getNode(),
      'No ChatKit session stored. Run the Session → Create operation first or provide manual credentials.',
      { itemIndex },
    );
  }

  return state.session;
}

function parseJsonParameter(
  this: IExecuteFunctions,
  name: string,
  itemIndex: number,
): IDataObject | undefined {
  const raw = this.getNodeParameter(name, itemIndex, '') as string;

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Expected a JSON object');
    }

    return parsed as IDataObject;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new NodeOperationError(this.getNode(), `Failed to parse ${name}: ${message}`, { itemIndex });
  }
}

function sanitizeResponse(payload: IDataObject): IDataObject {
  const clone = JSON.parse(JSON.stringify(payload)) as IDataObject;

  const session = clone.session as IDataObject | undefined;

  if (session?.client_secret && typeof session.client_secret === 'string') {
    session.client_secret = maskSecret(session.client_secret);
  }

  if (clone.client_secret && typeof clone.client_secret === 'string') {
    clone.client_secret = maskSecret(clone.client_secret);
  }

  return clone;
}

async function chatKitRequest(
  this: IExecuteFunctions,
  itemIndex: number,
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string | URL | string[],
  body?: IDataObject,
  timeout?: number,
): Promise<IDataObject> {
  const credentials = (await this.getCredentials('openAiChatKitApi')) as ChatKitCredentials | undefined;

  if (!credentials?.apiKey) {
    throw new NodeOperationError(this.getNode(), 'OpenAI ChatKit credentials are required.', {
      itemIndex,
    });
  }

  const baseUrlString = credentials.baseUrl?.trim() || 'https://api.openai.com';
  let url: string;

  try {
    let endpointValue: string;

    if (endpoint instanceof URL) {
      endpointValue = endpoint.toString();
    } else if (Array.isArray(endpoint)) {
      endpointValue = endpoint.join('/');
    } else {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid base URL';
    throw new NodeOperationError(this.getNode(), `Failed to resolve ChatKit URL: ${message}`, {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid base URL';
    throw new NodeOperationError(this.getNode(), `Failed to resolve ChatKit URL: ${message}`, {
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

    for (
      let candidate = Math.min(baseSegments.length, endpointSegments.length);
      candidate > 0;
      candidate -= 1
    ) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid base URL';
    throw new NodeOperationError(this.getNode(), `Failed to resolve ChatKit URL: ${message}`, {
      itemIndex,
    });
  }

  try {
    baseUrl = new URL(baseUrlString);
  } catch (error) {
    throw new NodeOperationError(this.getNode(), 'Invalid ChatKit base URL. Please include the protocol (e.g. https://).', {
      itemIndex,
    });
  }

  const basePath = baseUrl.pathname.replace(/\/+$/u, '');
  const endpoints = Array.isArray(endpoint) ? endpoint : [endpoint];
  let storedError: NodeOperationError | undefined;

  for (let index = 0; index < endpoints.length; index++) {
    const candidate = endpoints[index];
    const endpointPath = candidate.startsWith('/') ? candidate : `/${candidate}`;

    let finalPath: string;

    if (!basePath || endpointPath === basePath || endpointPath.startsWith(`${basePath}/`)) {
      finalPath = endpointPath;
    } else {
      finalPath = `${basePath}/${endpointPath.replace(/^\/+/, '')}`;
    }

    finalPath = finalPath.replace(/\/+/gu, '/');
    if (!finalPath.startsWith('/')) {
      finalPath = `/${finalPath}`;
    }

    const url = `${baseUrl.origin}${finalPath}`;

    try {
      const response = await axios.request<IDataObject>({
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
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const description = typeof error.response?.data === 'string'
          ? error.response?.data
          : JSON.stringify(error.response?.data ?? {});

        const nodeError = new NodeOperationError(
          this.getNode(),
          `ChatKit request failed${status ? ` (HTTP ${status})` : ''}: ${error.message}`,
          {
            itemIndex,
            description,
          },
        );

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

  throw new NodeOperationError(this.getNode(), 'ChatKit request failed: no valid endpoint responded.', {
    itemIndex,
  });
}

export class ChatKitAgentBuilder implements INodeType {
  description: INodeTypeDescription = {
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

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const state = getState.call(this);

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const resource = this.getNodeParameter('resource', itemIndex) as string;
      const operation = this.getNodeParameter('operation', itemIndex) as string;

      if (resource === 'session') {
        if (operation === 'create') {
          const workflowId = (this.getNodeParameter('workflowId', itemIndex) as string).trim();

          if (!workflowId) {
            throw new NodeOperationError(this.getNode(), 'Workflow ID is required to create a session.', {
              itemIndex,
            });
          }

          const userId = (this.getNodeParameter('userId', itemIndex, '') as string).trim();
          const metadata = parseJsonParameter.call(this, 'sessionMetadata', itemIndex);
          const options = parseJsonParameter.call(this, 'sessionOptions', itemIndex);

          const body: IDataObject = {
            workflow: { id: workflowId },
            ...(userId ? { user: userId } : {}),
            ...(metadata ? { metadata } : {}),
            ...(options ? { session_options: options } : {}),
          };

          const response = await chatKitRequest.call(
            this,
            itemIndex,
            'POST',
            ['/v1/chatkit/sessions', '/v1/chat/sessions'],
            body,
          );
          const sessionPayload = (response.session as IDataObject | undefined) ?? response;

          const sessionId = sessionPayload.id as string | undefined;
          const clientSecret = (sessionPayload.client_secret ?? sessionPayload.clientSecret) as string | undefined;

          if (!sessionId || !clientSecret) {
            throw new NodeOperationError(
              this.getNode(),
              'Session creation response did not include id and client_secret.',
              { itemIndex },
            );
          }

          const stored: StoredSession = {
            id: sessionId,
            clientSecret,
            expiresAt: (sessionPayload.expires_at as string | undefined) ?? undefined,
            workflowId,
          };

          state.session = stored;
          saveState.call(this, state);

          const output: IDataObject = {
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
          const body: IDataObject = {
            client_secret: session.clientSecret,
          };

          const response = await chatKitRequest.call(this, itemIndex, 'POST', endpoint, body);
          const sessionPayload = (response.session as IDataObject | undefined) ?? response;
          const clientSecret = (sessionPayload.client_secret ?? sessionPayload.clientSecret) as string | undefined;

          if (!clientSecret) {
            throw new NodeOperationError(this.getNode(), 'Refresh response did not include a client_secret.', {
              itemIndex,
            });
          }

          state.session = {
            id: session.id,
            clientSecret,
            expiresAt: (sessionPayload.expires_at as string | undefined) ?? session.expiresAt,
            workflowId: session.workflowId,
          };
          saveState.call(this, state);

          const output: IDataObject = {
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

        throw new NodeOperationError(this.getNode(), `Unsupported session operation: ${operation}`, { itemIndex });
      }

      if (resource === 'message') {
        if (operation !== 'send') {
          throw new NodeOperationError(this.getNode(), `Unsupported message operation: ${operation}`, { itemIndex });
        }

        const source = this.getNodeParameter('sessionSource', itemIndex, 'stored') as string;
        let sessionId: string;
        let clientSecret: string;
        let workflowId = (this.getNodeParameter('messageWorkflowId', itemIndex, '') as string).trim();

        if (source === 'stored') {
          const stored = ensureSession.call(this, itemIndex, state);
          sessionId = stored.id;
          clientSecret = stored.clientSecret;
          if (!workflowId) {
            workflowId = stored.workflowId ?? '';
          }
        } else {
          sessionId = (this.getNodeParameter('manualSessionId', itemIndex) as string).trim();
          clientSecret = (this.getNodeParameter('manualClientSecret', itemIndex) as string).trim();

          if (!sessionId || !clientSecret) {
            throw new NodeOperationError(
              this.getNode(),
              'Session ID and Client Secret are required when providing manual credentials.',
              { itemIndex },
            );
          }
        }

        if (!workflowId) {
          throw new NodeOperationError(
            this.getNode(),
            'Workflow ID is required to send a message. Provide it on the node or create a new session.',
            { itemIndex },
          );
        }

        const inputText = (this.getNodeParameter('inputText', itemIndex) as string).trim();

        if (!inputText) {
          throw new NodeOperationError(this.getNode(), 'Message Text is required.', { itemIndex });
        }

        const role = this.getNodeParameter('messageRole', itemIndex, 'user') as string;
        const systemPrompt = (this.getNodeParameter('systemPrompt', itemIndex, '') as string).trim();
        const threadId = (this.getNodeParameter('threadId', itemIndex, '') as string).trim();
        const metadata = parseJsonParameter.call(this, 'messageMetadata', itemIndex);
        const timeout = this.getNodeParameter('timeoutMs', itemIndex, 30000) as number;

        const messageContent: IDataObject[] = [
          {
            type: 'input_text',
            text: inputText,
          },
        ];

        const payload: IDataObject = {
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
          const sessionPayload = (response.session as IDataObject | undefined) ?? undefined;

          if (sessionPayload?.client_secret) {
            state.session = {
              id: sessionId,
              clientSecret: sessionPayload.client_secret as string,
              expiresAt: (sessionPayload.expires_at as string | undefined) ?? state.session?.expiresAt,
              workflowId,
            };
            saveState.call(this, state);
          }
        }

        returnData.push({ json: sanitized });
        continue;
      }

      throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, { itemIndex });
    }

    return [returnData];
  }
}
