# n8n-nodes-openai-chatkit

Custom n8n node for interacting with the OpenAI ChatKit (Agent Builder) beta without having to wire every HTTP call manually.

## Features

- **Create session** – request a short-lived `client_secret` for an Agent Builder workflow and keep it stored in the node state.
- **Refresh session** – rotate the stored `client_secret` before it expires.
- **Send message** – deliver user text (plus optional system prompt, metadata, and thread id) to the workflow and receive the full ChatKit response.
- **Manual session override** – provide an existing `session_id`/`client_secret` pair directly when you do not want to use the stored state.

The node talks straight to the OpenAI API using the ChatKit beta header, so all you need is an API key with access to the feature preview.

## Installation

```bash
npm install n8n-nodes-openai-chatkit
```

During local development you can build the project with:

```bash
npm install
npm run build
```

Copy the generated `dist` folder to your n8n custom nodes directory (usually `~/.n8n/custom/`) and restart n8n.

## Credentials

Create credentials of type **OpenAI ChatKit API** with the following fields:

- **API Key** – required. Must have access to the ChatKit beta.
- **Base URL** – optional. Defaults to `https://api.openai.com`. Override only when routing through a compatible proxy.
- **Organization / Project** – optional. Forwarded as `OpenAI-Organization` / `OpenAI-Project` headers when provided.

## Node usage

1. **Session → Create**
   - Provide the Agent Builder `workflowId` and (optionally) a `userId`, metadata JSON, or extra session options JSON.
   - The response stores `session.id`, `client_secret`, and `expires_at` in the node state and returns the masked values.

2. **Message → Send**
   - Supply the text in **Message Text** and map any incoming data from previous nodes.
   - By default the stored session is reused. Switch **Session Source** to *Provide Manually* if you want to paste a session id and client secret instead.
   - Optional fields: workflow override, thread id, role, system prompt, message metadata, and timeout.

3. **Session → Refresh** (optional)
   - Requests a new `client_secret` for the stored session and updates the node state.

4. **Session → End (Local)**
   - Clears the stored session information so the next run can start fresh.

## API calls performed

The node issues the following REST requests against the configured base URL:

- `POST /v1/chat/sessions`
- `POST /v1/chat/sessions/{session_id}/refresh`
- `POST /v1/chat/sessions/{session_id}/messages`

Each request includes the `OpenAI-Beta: chatkit_beta=v1` header required for the ChatKit preview.

## Publishing

The repository ships a GitHub Actions workflow (`.github/workflows/release.yml`) that publishes the package to npm whenever a `v*.*.*` tag is pushed. The workflow runs `npm ci`, `npm run build`, and `npm publish --provenance` using the configured `NPM_TOKEN` secret.

## License

MIT
