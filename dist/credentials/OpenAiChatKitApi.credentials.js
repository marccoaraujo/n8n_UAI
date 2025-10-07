"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiChatKitApi = void 0;
class OpenAiChatKitApi {
    constructor() {
        this.name = 'openAiChatKitApi';
        this.displayName = 'OpenAI ChatKit Proxy API';
        this.documentationUrl = 'https://platform.openai.com/docs/guides/chatkit';
        this.properties = [
            {
                displayName: 'Server Proxy Base URL',
                name: 'serverProxyBaseUrl',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'https://api.example.com/chatkit',
                description: 'HTTPS endpoint of your backend proxy that orchestrates ChatKit requests on behalf of n8n.',
            },
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                default: '',
                typeOptions: {
                    password: true,
                },
                description: 'Optional token forwarded as a Bearer Authorization header to your proxy.',
            },
            {
                displayName: 'Project ID',
                name: 'projectId',
                type: 'string',
                default: '',
                description: 'Optional project identifier forwarded using the X-Project-Id header.',
            },
            {
                displayName: 'Organization',
                name: 'organization',
                type: 'string',
                default: '',
                description: 'Optional organization identifier forwarded using the X-Organization-Id header.',
            },
        ];
    }
}
exports.OpenAiChatKitApi = OpenAiChatKitApi;
