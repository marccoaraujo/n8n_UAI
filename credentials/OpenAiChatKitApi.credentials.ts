import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OpenAiChatKitApi implements ICredentialType {
  name = 'openAiChatKitApi';

  displayName = 'OpenAI ChatKit API';

  documentationUrl = 'https://platform.openai.com/docs/guides/chatkit';

  properties: INodeProperties[] = [
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
