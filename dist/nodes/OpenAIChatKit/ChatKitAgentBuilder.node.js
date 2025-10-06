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
class ChatKitAgentBuilder {
    constructor() {
        this.description = {
            displayName: 'OpenAI ChatKit (Agent Builder)',
            name: 'chatKitAgentBuilder',
            icon: 'file:dynamics-labs.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["operation"]}}',
            description: 'Interact with OpenAI Agent Builder ChatKit endpoints to manage agent sessions.',
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
                    description: 'Free-form identifier that scopes the session and allows reuse of other ChatKit resources for the same end user.',
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
                            description: 'Key/value pairs forwarded to the workflow. Provide a JSON object with primitive values.',
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = (await this.getCredentials('openAiChatKitApi'));
        const apiKey = credentials.apiKey;
        if (!apiKey) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No API key returned from credentials.');
        }
        const resolveEndpoint = (suffixSegments, itemIdx) => {
            const rawBase = (credentials.baseUrl || 'https://api.openai.com/v1').trim();
            if (!/^https?:\/\//i.test(rawBase)) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Base URL must include the protocol (e.g. https://api.openai.com/v1).', {
                    itemIndex: itemIdx,
                });
            }
            let parsedUrl;
            try {
                parsedUrl = new URL(rawBase);
            }
            catch (error) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Base URL must be a valid URL.', {
                    itemIndex: itemIdx,
                    description: error.message,
                });
            }
            const baseSegments = parsedUrl.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
            let appendSegments = suffixSegments.filter(Boolean);
            const lastTwo = baseSegments.slice(-2).join('/');
            const lastOne = baseSegments.slice(-1)[0];
            if (lastTwo === 'chatkit/sessions' && appendSegments.slice(0, 2).join('/') === 'chatkit/sessions') {
                appendSegments = appendSegments.slice(2);
            }
            else if (lastOne === 'chatkit' && appendSegments[0] === 'chatkit') {
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
                const operation = this.getNodeParameter('operation', itemIndex);
                let requestConfig = {
                    url: '',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'OpenAI-Beta': 'chatkit_beta=v1',
                    },
                };
                if (operation === 'createSession') {
                    requestConfig.method = 'POST';
                    const workflowId = this.getNodeParameter('workflowId', itemIndex);
                    const userId = this.getNodeParameter('userId', itemIndex);
                    const workflowSettings = this.getNodeParameter('workflowSettings', itemIndex, {});
                    const chatkitConfigurationRaw = this.getNodeParameter('chatkitConfiguration', itemIndex, {});
                    const sessionOptions = this.getNodeParameter('sessionOptions', itemIndex, {});
                    const workflow = {
                        id: workflowId,
                    };
                    const workflowVersion = workflowSettings.version;
                    if (workflowVersion) {
                        workflow.version = workflowVersion;
                    }
                    const stateVariables = workflowSettings.stateVariables;
                    if (stateVariables) {
                        try {
                            const parsed = JSON.parse(stateVariables);
                            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                                throw new Error('State variables must be provided as a JSON object with primitive values.');
                            }
                            workflow.state_variables = parsed;
                        }
                        catch (error) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'State variables must be valid JSON.', {
                                description: error.message,
                                itemIndex,
                            });
                        }
                    }
                    const tracingMode = workflowSettings.tracing;
                    if (tracingMode && tracingMode !== 'default') {
                        workflow.tracing = {
                            enabled: tracingMode === 'enabled',
                        };
                    }
                    const body = {
                        user: userId,
                        workflow,
                    };
                    const chatkitConfiguration = {};
                    const automaticThreadTitling = chatkitConfigurationRaw.automaticThreadTitling;
                    if (automaticThreadTitling && automaticThreadTitling !== 'default') {
                        chatkitConfiguration.automatic_thread_titling = {
                            enabled: automaticThreadTitling === 'enabled',
                        };
                    }
                    const historyOption = chatkitConfigurationRaw.history;
                    const recentThreads = chatkitConfigurationRaw.recentThreads;
                    if ((historyOption && historyOption !== 'default') || (recentThreads && recentThreads > 0)) {
                        const history = {};
                        if (historyOption && historyOption !== 'default') {
                            history.enabled = historyOption === 'enabled';
                        }
                        if (recentThreads && recentThreads > 0) {
                            history.recent_threads = recentThreads;
                        }
                        chatkitConfiguration.history = history;
                    }
                    const fileUploadsOption = chatkitConfigurationRaw.fileUploads;
                    const maxFiles = chatkitConfigurationRaw.fileUploadMaxFiles;
                    const maxFileSize = chatkitConfigurationRaw.fileUploadMaxFileSizeMb;
                    if ((fileUploadsOption && fileUploadsOption !== 'default') ||
                        (maxFiles && maxFiles > 0) ||
                        (maxFileSize && maxFileSize > 0)) {
                        const fileUpload = {};
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
                    const expirationSeconds = sessionOptions.expirationSeconds;
                    if (expirationSeconds && expirationSeconds > 0) {
                        body.expires_after = {
                            anchor: 'created_at',
                            seconds: expirationSeconds,
                        };
                    }
                    const maxRequestsPerMinute = sessionOptions.maxRequestsPerMinute;
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
                }
                else if (operation === 'cancelSession') {
                    const sessionId = this.getNodeParameter('sessionId', itemIndex);
                    requestConfig = {
                        ...requestConfig,
                        method: 'POST',
                        url: resolveEndpoint(['chatkit', 'sessions', sessionId, 'cancel'], itemIndex),
                    };
                }
                else if (operation === 'getSession') {
                    const sessionId = this.getNodeParameter('sessionId', itemIndex);
                    requestConfig = {
                        ...requestConfig,
                        method: 'GET',
                        url: resolveEndpoint(['chatkit', 'sessions', sessionId], itemIndex),
                    };
                }
                else if (operation === 'listSessions') {
                    const filters = this.getNodeParameter('listFilters', itemIndex, {});
                    const params = {};
                    const workflowIdFilter = filters.workflowId;
                    if (workflowIdFilter) {
                        params.workflow_id = workflowIdFilter;
                    }
                    const userIdFilter = filters.userId;
                    if (userIdFilter) {
                        params.user = userIdFilter;
                    }
                    const beforeCursor = filters.before;
                    if (beforeCursor) {
                        params.before = beforeCursor;
                    }
                    const afterCursor = filters.after;
                    if (afterCursor) {
                        params.after = afterCursor;
                    }
                    const limit = filters.limit;
                    if (limit && limit > 0) {
                        params.limit = limit;
                    }
                    requestConfig = {
                        ...requestConfig,
                        method: 'GET',
                        url: resolveEndpoint(['chatkit', 'sessions'], itemIndex),
                        params: Object.keys(params).length ? params : undefined,
                    };
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
                }
                const response = await (0, axios_1.default)(requestConfig);
                returnData.push({ json: response.data });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                if ((0, axios_1.isAxiosError)(error) && error.response) {
                    const responseData = error.response.data;
                    let message = error.message;
                    if (responseData) {
                        if (typeof responseData === 'string') {
                            message = responseData;
                        }
                        else if (typeof responseData.error === 'string') {
                            message = responseData.error;
                        }
                        else if (responseData.error &&
                            typeof responseData.error.message === 'string') {
                            message = responseData.error.message;
                        }
                        else {
                            message = JSON.stringify(responseData);
                        }
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), message, {
                        itemIndex,
                    });
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.ChatKitAgentBuilder = ChatKitAgentBuilder;
