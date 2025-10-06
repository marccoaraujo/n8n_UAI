"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiChatKitApi = void 0;
class OpenAiChatKitApi {
    constructor() {
        this.name = 'openAiChatKitApi';
        this.displayName = 'OpenAI ChatKit API';
        this.documentationUrl = 'https://platform.openai.com/docs/api-reference/chatkit/sessions';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                default: '',
                required: true,
                description: 'Your OpenAI API key with access to the Agent Builder / ChatKit beta.',
                typeOptions: {
                    password: true,
                },
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://api.openai.com/v1',
                description: 'Override the default OpenAI API base URL if you are using a proxy.',
            },
        ];
    }
}
exports.OpenAiChatKitApi = OpenAiChatKitApi;
