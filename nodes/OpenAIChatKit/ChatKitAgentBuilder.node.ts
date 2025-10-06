import axios, { isAxiosError, type AxiosRequestConfig } from 'axios';
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
}

export class ChatKitAgentBuilder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenAI ChatKit (Agent Builder)',
    name: 'chatKitAgentBuilder',
    icon: 'file:dynamics-labs.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'Interact with OpenAI Agent Builder ChatKit endpoints to manage agent sessions.',
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
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Create Session',
            value: 'createSession',
            action: 'Create a ChatKit session',
          },
          {
            name: 'Get Session',
            value: 'getSession',
            action: 'Retrieve a ChatKit session',
          },
          {
            name: 'List Sessions',
            value: 'listSessions',
            action: 'List ChatKit sessions',
          },
          {
            name: 'Cancel Session',
            value: 'cancelSession',
            action: 'Cancel an active ChatKit session',
          },
        ],
        default: 'createSession',
        description: 'The API operation to execute.',
      },
      {
        displayName: 'Workflow ID',
        name: 'workflowId',
        type: 'string',
        default: '',
        required: true,
        description: 'Identifier of the Agent Builder workflow that powers the session.',
        displayOptions: {
          show: {
            operation: ['createSession'],
          },
        },
      },
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        default: '',
        required: true,
        description:
          'Free-form identifier that scopes the session and allows reuse of other ChatKit resources for the same end user.',
        displayOptions: {
          show: {
            operation: ['createSession'],
          },
        },
      },
      {
        displayName: 'Workflow Settings',
        name: 'workflowSettings',
        type: 'collection',
        default: {},
        placeholder: 'Add workflow option',
        options: [
          {
            displayName: 'Version',
            name: 'version',
            type: 'string',
            default: '',
            description: 'Specific workflow version to run. Defaults to the latest deployed version.',
          },
          {
            displayName: 'State Variables (JSON)',
            name: 'stateVariables',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description:
              'Key/value pairs forwarded to the workflow. Provide a JSON object with primitive values.',
          },
          {
            displayName: 'Tracing',
            name: 'tracing',
            type: 'options',
            options: [
              {
                name: 'Default (Enabled)',
                value: 'default',
              },
              {
                name: 'Force Enabled',
                value: 'enabled',
              },
              {
                name: 'Disable Tracing',
                value: 'disabled',
              },
            ],
            default: 'default',
            description: 'Override the workflow tracing behavior for this session.',
          },
        ],
        displayOptions: {
          show: {
            operation: ['createSession'],
          },
        },
      },
      {
        displayName: 'ChatKit Configuration',
        name: 'chatkitConfiguration',
        type: 'collection',
        default: {},
        placeholder: 'Customize ChatKit features',
        options: [
          {
            displayName: 'Automatic Thread Titling',
            name: 'automaticThreadTitling',
            type: 'options',
            options: [
              {
                name: 'Default (Enabled)',
                value: 'default',
              },
              {
                name: 'Force Enabled',
                value: 'enabled',
              },
              {
                name: 'Disable',
                value: 'disabled',
              },
            ],
            default: 'default',
            description: 'Control automatic thread title generation.',
          },
          {
            displayName: 'History Access',
            name: 'history',
            type: 'options',
            options: [
              {
                name: 'Default (Enabled)',
                value: 'default',
              },
              {
                name: 'Force Enabled',
                value: 'enabled',
              },
              {
                name: 'Disable',
                value: 'disabled',
              },
            ],
            default: 'default',
            description: 'Decide whether previous ChatKit threads are available to the user.',
          },
          {
            displayName: 'History Recent Threads',
            name: 'recentThreads',
            type: 'number',
            typeOptions: {
              minValue: 1,
            },
            default: 0,
            description: 'Limit how many recent threads the user can access. Leave unset for unlimited.',
          },
          {
            displayName: 'File Uploads',
            name: 'fileUploads',
            type: 'options',
            options: [
              {
                name: 'Default (Disabled)',
                value: 'default',
              },
              {
                name: 'Enable',
                value: 'enabled',
              },
              {
                name: 'Disable',
                value: 'disabled',
              },
            ],
            default: 'default',
            description: 'Toggle upload support for the session.',
          },
          {
            displayName: 'File Upload Max Files',
            name: 'fileUploadMaxFiles',
            type: 'number',
            typeOptions: {
              minValue: 1,
            },
            default: 0,
            description: 'Maximum files that can be uploaded. Defaults to 10 when uploads are enabled.',
          },
          {
            displayName: 'File Upload Max File Size (MB)',
            name: 'fileUploadMaxFileSizeMb',
            type: 'number',
            typeOptions: {
              minValue: 1,
            },
            default: 0,
            description: 'Maximum upload size in megabytes. Defaults to 512 when uploads are enabled.',
          },
        ],
        displayOptions: {
          show: {
            operation: ['createSession'],
          },
        },
      },
      {
        displayName: 'Session Options',
        name: 'sessionOptions',
        type: 'collection',
        default: {},
        placeholder: 'Add session option',
        options: [
          {
            displayName: 'Expiration (Seconds)',
            name: 'expirationSeconds',
            type: 'number',
            typeOptions: {
              minValue: 1,
            },
            default: 0,
            description: 'Override how long the session stays active after creation. Defaults to 10 minutes.',
          },
          {
            displayName: 'Max Requests Per Minute',
            name: 'maxRequestsPerMinute',
            type: 'number',
            typeOptions: {
              minValue: 1,
            },
            default: 0,
            description: 'Override the per-minute request cap. Defaults to 10 when omitted.',
          },
        ],
        displayOptions: {
          show: {
            operation: ['createSession'],
          },
        },
      },
      {
        displayName: 'List Filters',
        name: 'listFilters',
        type: 'collection',
        default: {},
        placeholder: 'Add filter',
        options: [
          {
            displayName: 'Workflow ID',
            name: 'workflowId',
            type: 'string',
            default: '',
            description: 'Limit results to sessions created from a specific workflow.',
          },
          {
            displayName: 'User ID',
            name: 'userId',
            type: 'string',
            default: '',
            description: 'Only return sessions scoped to a particular user identifier.',
          },
          {
            displayName: 'Before Cursor',
            name: 'before',
            type: 'string',
            default: '',
            description: 'Paginate backward from the provided cursor.',
          },
          {
            displayName: 'After Cursor',
            name: 'after',
            type: 'string',
            default: '',
            description: 'Paginate forward from the provided cursor.',
          },
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            typeOptions: {
              minValue: 1,
              maxValue: 100,
            },
            default: 0,
            description: 'Maximum number of sessions to return (defaults to the API standard when unset).',
          },
        ],
        displayOptions: {
          show: {
            operation: ['listSessions'],
          },
        },
      },
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '',
        required: true,
        description: 'Identifier of the ChatKit session to retrieve or cancel.',
        displayOptions: {
          show: {
            operation: ['getSession', 'cancelSession'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = (await this.getCredentials('openAiChatKitApi')) as ChatKitCredentials;
    const apiKey = credentials.apiKey;

    if (!apiKey) {
      throw new NodeOperationError(this.getNode(), 'No API key returned from credentials.');
    }

    const resolveEndpoint = (suffixSegments: string[], itemIdx: number): string => {
      const rawBase = (credentials.baseUrl || 'https://api.openai.com/v1').trim();

      if (!/^https?:\/\//i.test(rawBase)) {
        throw new NodeOperationError(
          this.getNode(),
          'Base URL must include the protocol (e.g. https://api.openai.com/v1).',
          {
            itemIndex: itemIdx,
          },
        );
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(rawBase);
      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          'Base URL must be a valid URL.',
          {
            itemIndex: itemIdx,
            description: (error as Error).message,
          },
        );
      }

      const baseSegments = parsedUrl.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      let appendSegments = suffixSegments.filter(Boolean);

      const lastTwo = baseSegments.slice(-2).join('/');
      const lastOne = baseSegments.slice(-1)[0];

      if (lastTwo === 'chatkit/sessions' && appendSegments.slice(0, 2).join('/') === 'chatkit/sessions') {
        appendSegments = appendSegments.slice(2);
      } else if (lastOne === 'chatkit' && appendSegments[0] === 'chatkit') {
        appendSegments = appendSegments.slice(1);
      }

      const finalSegments = [...baseSegments, ...appendSegments];

      parsedUrl.pathname = finalSegments.length ? `/${finalSegments.join('/')}` : '/';
      parsedUrl.search = '';
      parsedUrl.hash = '';

      let url = parsedUrl.toString();
      if (finalSegments.length) {
        url = url.replace(/\/$/, '');
      }

      return url;
    };

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const operation = this.getNodeParameter('operation', itemIndex) as string;

        let requestConfig: AxiosRequestConfig = {
          url: '',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'chatkit_beta=v1',
          },
        };

        if (operation === 'createSession') {
          requestConfig.method = 'POST';
          const workflowId = this.getNodeParameter('workflowId', itemIndex) as string;
          const userId = this.getNodeParameter('userId', itemIndex) as string;
          const workflowSettings = this.getNodeParameter('workflowSettings', itemIndex, {}) as IDataObject;
          const chatkitConfigurationRaw = this.getNodeParameter('chatkitConfiguration', itemIndex, {}) as IDataObject;
          const sessionOptions = this.getNodeParameter('sessionOptions', itemIndex, {}) as IDataObject;

          const workflow: IDataObject = {
            id: workflowId,
          };

          const workflowVersion = workflowSettings.version as string | undefined;
          if (workflowVersion) {
            workflow.version = workflowVersion;
          }

          const stateVariables = workflowSettings.stateVariables as string | undefined;
          if (stateVariables) {
            try {
              const parsed = JSON.parse(stateVariables);
              if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error('State variables must be provided as a JSON object with primitive values.');
              }
              workflow.state_variables = parsed as IDataObject;
            } catch (error) {
              throw new NodeOperationError(this.getNode(), 'State variables must be valid JSON.', {
                description: (error as Error).message,
                itemIndex,
              });
            }
          }

          const tracingMode = workflowSettings.tracing as string | undefined;
          if (tracingMode && tracingMode !== 'default') {
            workflow.tracing = {
              enabled: tracingMode === 'enabled',
            } as IDataObject;
          }

          const body: IDataObject = {
            user: userId,
            workflow,
          };

          const chatkitConfiguration: IDataObject = {};

          const automaticThreadTitling = chatkitConfigurationRaw.automaticThreadTitling as string | undefined;
          if (automaticThreadTitling && automaticThreadTitling !== 'default') {
            chatkitConfiguration.automatic_thread_titling = {
              enabled: automaticThreadTitling === 'enabled',
            } as IDataObject;
          }

          const historyOption = chatkitConfigurationRaw.history as string | undefined;
          const recentThreads = chatkitConfigurationRaw.recentThreads as number | undefined;
          if ((historyOption && historyOption !== 'default') || (recentThreads && recentThreads > 0)) {
            const history: IDataObject = {};
            if (historyOption && historyOption !== 'default') {
              history.enabled = historyOption === 'enabled';
            }
            if (recentThreads && recentThreads > 0) {
              history.recent_threads = recentThreads;
            }
            chatkitConfiguration.history = history;
          }

          const fileUploadsOption = chatkitConfigurationRaw.fileUploads as string | undefined;
          const maxFiles = chatkitConfigurationRaw.fileUploadMaxFiles as number | undefined;
          const maxFileSize = chatkitConfigurationRaw.fileUploadMaxFileSizeMb as number | undefined;
          if (
            (fileUploadsOption && fileUploadsOption !== 'default') ||
            (maxFiles && maxFiles > 0) ||
            (maxFileSize && maxFileSize > 0)
          ) {
            const fileUpload: IDataObject = {};
            if (fileUploadsOption && fileUploadsOption !== 'default') {
              fileUpload.enabled = fileUploadsOption === 'enabled';
            }
            if (maxFiles && maxFiles > 0) {
              fileUpload.max_files = maxFiles;
            }
            if (maxFileSize && maxFileSize > 0) {
              fileUpload.max_file_size = maxFileSize;
            }
            chatkitConfiguration.file_upload = fileUpload;
          }

          if (Object.keys(chatkitConfiguration).length > 0) {
            body.chatkit_configuration = chatkitConfiguration;
          }

          const expirationSeconds = sessionOptions.expirationSeconds as number | undefined;
          if (expirationSeconds && expirationSeconds > 0) {
            body.expires_after = {
              anchor: 'created_at',
              seconds: expirationSeconds,
            };
          }

          const maxRequestsPerMinute = sessionOptions.maxRequestsPerMinute as number | undefined;
          if (maxRequestsPerMinute && maxRequestsPerMinute > 0) {
            body.rate_limits = {
              max_requests_per_1_minute: maxRequestsPerMinute,
            };
          }

          requestConfig = {
            ...requestConfig,
            method: 'POST',
            url: resolveEndpoint(['chatkit', 'sessions'], itemIndex),
            data: body,
          };
        } else if (operation === 'cancelSession') {
          const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
          requestConfig = {
            ...requestConfig,
            method: 'POST',
            url: resolveEndpoint(['chatkit', 'sessions', sessionId, 'cancel'], itemIndex),
          };
        } else if (operation === 'getSession') {
          const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
          requestConfig = {
            ...requestConfig,
            method: 'GET',
            url: resolveEndpoint(['chatkit', 'sessions', sessionId], itemIndex),
          };
        } else if (operation === 'listSessions') {
          const filters = this.getNodeParameter('listFilters', itemIndex, {}) as IDataObject;
          const params: IDataObject = {};

          const workflowIdFilter = filters.workflowId as string | undefined;
          if (workflowIdFilter) {
            params.workflow_id = workflowIdFilter;
          }

          const userIdFilter = filters.userId as string | undefined;
          if (userIdFilter) {
            params.user = userIdFilter;
          }

          const beforeCursor = filters.before as string | undefined;
          if (beforeCursor) {
            params.before = beforeCursor;
          }

          const afterCursor = filters.after as string | undefined;
          if (afterCursor) {
            params.after = afterCursor;
          }

          const limit = filters.limit as number | undefined;
          if (limit && limit > 0) {
            params.limit = limit;
          }

          requestConfig = {
            ...requestConfig,
            method: 'GET',
            url: resolveEndpoint(['chatkit', 'sessions'], itemIndex),
            params: Object.keys(params).length ? params : undefined,
          };
        } else {
          throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
        }

        const response = await axios(requestConfig);

        returnData.push({ json: response.data as IDataObject });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }

        if (isAxiosError(error) && error.response) {
          const responseData = error.response.data as IDataObject | undefined;
          let message = error.message;
          if (responseData) {
            if (typeof responseData === 'string') {
              message = responseData;
            } else if (typeof responseData.error === 'string') {
              message = responseData.error;
            } else if (
              responseData.error &&
              typeof (responseData.error as IDataObject).message === 'string'
            ) {
              message = (responseData.error as IDataObject).message as string;
            } else {
              message = JSON.stringify(responseData);
            }
          }

          throw new NodeOperationError(this.getNode(), message, {
            itemIndex,
          });
        }

        throw error;
      }
    }

    return [returnData];
  }
}
