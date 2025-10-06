"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatKitAgentBuilder = void 0;
const axios_1 = __importDefault(require("axios"));
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
                    ],
                    default: 'createSession',
                    description: 'The API operation to execute.',
                },
                {
                    displayName: 'Session ID',
                    name: 'sessionId',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'The ChatKit session identifier.',
                    displayOptions: {
                        show: {
                            operation: ['getSession'],
                        },
                    },
                },
                {
                    displayName: 'Instructions',
                    name: 'instructions',
                    type: 'string',
                    typeOptions: {
                        rows: 6,
                    },
                    default: '',
                    description: 'System level instructions that steer the behavior of the agent.',
                    displayOptions: {
                        show: {
                            operation: ['createSession'],
                        },
                    },
                },
                {
                    displayName: 'Session Name',
                    name: 'sessionName',
                    type: 'string',
                    default: '',
                    description: 'Optional friendly identifier for the session.',
                    displayOptions: {
                        show: {
                            operation: ['createSession'],
                        },
                    },
                },
                {
                    displayName: 'Default Model',
                    name: 'defaultModel',
                    type: 'string',
                    default: 'gpt-4.1-mini',
                    description: 'Model that should be used by default for this session.',
                    displayOptions: {
                        show: {
                            operation: ['createSession'],
                        },
                    },
                },
                {
                    displayName: 'Metadata (JSON)',
                    name: 'metadata',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    description: 'Arbitrary metadata to store with the session. Provide a JSON object. Example: {"customer_id": "123"}',
                    displayOptions: {
                        show: {
                            operation: ['createSession'],
                        },
                    },
                },
                {
                    displayName: 'Tool Configuration',
                    name: 'toolConfig',
                    type: 'collection',
                    default: {},
                    placeholder: 'Configure tools',
                    options: [
                        {
                            displayName: 'Enable File Search',
                            name: 'enableFileSearch',
                            type: 'boolean',
                            default: false,
                            description: 'Attach the file_search tool to the session.',
                        },
                        {
                            displayName: 'File Search Vector Store ID',
                            name: 'fileSearchVectorStoreId',
                            type: 'string',
                            default: '',
                            description: 'Vector store ID used when file search is enabled.',
                        },
                        {
                            displayName: 'Enable Web Browsing',
                            name: 'enableWebSearch',
                            type: 'boolean',
                            default: false,
                            description: 'Allow the session to issue web search queries.',
                        },
                        {
                            displayName: 'Additional Tool Instructions',
                            name: 'additionalInstructions',
                            type: 'string',
                            typeOptions: {
                                rows: 4,
                            },
                            default: '',
                            description: 'Extra instructions scoped to tool usage.',
                        },
                    ],
                    displayOptions: {
                        show: {
                            operation: ['createSession'],
                        },
                    },
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add field',
                    default: {},
                    options: [
                        {
                            displayName: 'Client Session ID',
                            name: 'clientSessionId',
                            type: 'string',
                            default: '',
                            description: 'Custom identifier that you can use to deduplicate session creation calls.',
                        },
                        {
                            displayName: 'Metadata Merge Strategy',
                            name: 'metadataMergeStrategy',
                            type: 'options',
                            options: [
                                {
                                    name: 'Replace',
                                    value: 'replace',
                                },
                                {
                                    name: 'Merge',
                                    value: 'merge',
                                },
                            ],
                            default: 'replace',
                            description: 'If set to merge the metadata sent will be deeply merged with the previous metadata instead of replacing it.',
                        },
                    ],
                    displayOptions: {
                        show: {
                            operation: ['createSession'],
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
        const baseUrl = (credentials.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
        const betaHeader = credentials.betaHeader || '';
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                let requestConfig = {
                    method: 'GET',
                    url: '',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                };
                if (betaHeader) {
                    requestConfig.headers['OpenAI-Beta'] = betaHeader;
                }
                if (operation === 'createSession') {
                    const instructions = this.getNodeParameter('instructions', itemIndex, '');
                    const sessionName = this.getNodeParameter('sessionName', itemIndex, '');
                    const defaultModel = this.getNodeParameter('defaultModel', itemIndex, '');
                    const metadata = this.getNodeParameter('metadata', itemIndex, '');
                    const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {});
                    const toolConfigRaw = this.getNodeParameter('toolConfig', itemIndex, {});
                    const body = {};
                    if (instructions) {
                        body.instructions = instructions;
                    }
                    if (sessionName) {
                        body.session_name = sessionName;
                    }
                    if (defaultModel) {
                        body.default_model = defaultModel;
                    }
                    if (metadata) {
                        try {
                            body.metadata = JSON.parse(metadata);
                        }
                        catch (error) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Metadata must be valid JSON.', {
                                description: error.message,
                                itemIndex,
                            });
                        }
                    }
                    if (additionalFields.clientSessionId) {
                        body.client_session_id = additionalFields.clientSessionId;
                    }
                    if (additionalFields.metadataMergeStrategy) {
                        body.metadata_merge_strategy = additionalFields.metadataMergeStrategy;
                    }
                    const toolConfig = {};
                    if (toolConfigRaw.enableFileSearch) {
                        toolConfig.file_search = {};
                        const vectorStoreId = toolConfigRaw.fileSearchVectorStoreId;
                        if (vectorStoreId) {
                            toolConfig.file_search.vector_store_ids = [vectorStoreId];
                        }
                    }
                    if (toolConfigRaw.enableWebSearch) {
                        toolConfig.web_search = { enabled: true };
                    }
                    if (toolConfigRaw.additionalInstructions) {
                        toolConfig.additional_instructions = toolConfigRaw.additionalInstructions;
                    }
                    if (Object.keys(toolConfig).length > 0) {
                        body.tool_config = toolConfig;
                    }
                    requestConfig = {
                        ...requestConfig,
                        method: 'POST',
                        url: `${baseUrl}/chatkit/sessions`,
                        data: body,
                    };
                }
                else if (operation === 'getSession') {
                    const sessionId = this.getNodeParameter('sessionId', itemIndex);
                    requestConfig = {
                        ...requestConfig,
                        method: 'GET',
                        url: `${baseUrl}/chatkit/sessions/${sessionId}`,
                    };
                }
                else if (operation === 'listSessions') {
                    requestConfig = {
                        ...requestConfig,
                        method: 'GET',
                        url: `${baseUrl}/chatkit/sessions`,
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
                throw error;
            }
        }
        return [returnData];
    }
}
exports.ChatKitAgentBuilder = ChatKitAgentBuilder;
