"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiChatKitApi = void 0;
class OpenAiChatKitApi {
    constructor() {
        this.name = 'openAiChatKitApi';
        this.displayName = 'OpenAI ChatKit API';
        this.documentationUrl = 'https://platform.openai.com/docs/guides/chatkit';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                description: 'OpenAI API key with access to ChatKit (Agent Builder) beta.',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://api.openai.com',
                description: 'Override only when using a compatible proxy. Must include the protocol, e.g. https://api.openai.com.',
            },
            {
                displayName: 'Organization',
                name: 'organization',
                type: 'string',
                default: '',
                description: 'Optional OpenAI organization header forwarded as OpenAI-Organization.',
            },
            {
                displayName: 'Project',
                name: 'projectId',
                type: 'string',
                default: '',
                description: 'Optional OpenAI project header forwarded as OpenAI-Project.',
            },
        ];
    }
}
exports.OpenAiChatKitApi = OpenAiChatKitApi;
