import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OpenAiChatKitApi implements ICredentialType {
  name = 'openAiChatKitApi';
  displayName = 'OpenAI ChatKit API';
  documentationUrl = 'https://platform.openai.com/docs/api-reference/chatkit/sessions';
  properties: INodeProperties[] = [
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
    {
      displayName: 'OpenAI-Beta Header',
      name: 'betaHeader',
      type: 'string',
      default: 'chatgpt-extensions=2024-10-01',
      description: 'Value for the <code>OpenAI-Beta</code> header required by the ChatKit beta. Update according to the value shown in the OpenAI documentation if it changes.',
    },
  ];
}
