# n8n_UAI

Este repositório reúne os recursos utilizados para criar e publicar nodes customizados para o n8n.

## OpenAI ChatKit Custom Node

Este pacote disponibiliza um node que facilita a integração com o ChatKit do Agent Builder da OpenAI. O node reproduz o fluxo descrito na documentação oficial — criar uma sessão autorizada para um workflow e encerrá-la quando não for mais necessária. Toda a comunicação segue os requisitos do beta `chatkit_beta=v1` documentados em [ChatKit](https://platform.openai.com/docs/guides/chatkit).

### Funcionalidades

- Criar uma nova sessão do ChatKit vinculada a um workflow do Agent Builder, informando o identificador do usuário final e customizações opcionais de workflow, limite de requisições e recursos do widget.
- Consultar detalhes de uma sessão existente a partir do identificador retornado pela API.
- Listar sessões com filtros por workflow, usuário ou cursores de paginação para auditoria ou reuso de sessões.
- Cancelar sessões ativas para encerrar o acesso do widget ao workflow quando o chat não for mais necessário.

### Estrutura do projeto

- `credentials/OpenAiChatKitApi.credentials.ts`: credenciais utilizadas para armazenar a chave de API e demais parâmetros necessários.
- `nodes/OpenAIChatKit/ChatKitAgentBuilder.node.ts`: implementação principal do node (gera requests `POST /chatkit/sessions`, `GET /chatkit/sessions/{id}`, `GET /chatkit/sessions` e `POST /chatkit/sessions/{id}/cancel`).
- `nodes/OpenAIChatKit/openai.svg`: ícone exibido pelo node no editor do n8n.

### Como utilizar

1. Instale o pacote no diretório raiz do seu n8n utilizando o prefixo oficial `n8n-nodes-*` para publicação no npm:

   ```bash
   npm install n8n-nodes-openai-chatkit
   ```

   Caso esteja desenvolvendo localmente, instale as dependências e gere a build do node:

   ```bash
   npm install
   npm run build
   ```

2. Copie a pasta `dist` gerada (ou disponível em `node_modules/n8n-nodes-openai-chatkit`) para o diretório de nodes customizados do n8n (por padrão `~/.n8n/custom/`).
3. Reinicie o n8n. O node "OpenAI ChatKit" estará disponível na categoria **Transform**.
4. Crie novas credenciais do tipo **OpenAI ChatKit API** informando:
   - **API Key**: uma chave da OpenAI com acesso ao beta do Agent Builder / ChatKit.
   - **Base URL**: opcional, use apenas se estiver utilizando um proxy. O node injeta automaticamente o cabeçalho `OpenAI-Beta: chatkit_beta=v1` exigido pela API. Informe a URL completa com protocolo (ex.: `https://api.openai.com/v1` ou `https://api.openai.com/v1/chatkit`). O node normaliza o caminho para evitar segmentos duplicados ao chamar os endpoints de sessão.

### Configuração do node

Ao usar a operação **Create Session** informe obrigatoriamente:

- **Workflow ID**: o identificador `wf_*` gerado pelo Agent Builder.
- **User ID**: um identificador livre que representa o usuário final (por exemplo um ID de dispositivo, conta ou e-mail). Esse valor é usado pelo ChatKit para compartilhar recursos dentro do mesmo escopo.

Opcionalmente, você pode ajustar:

- **Workflow Settings**: defina uma versão específica, envie variáveis de estado em JSON e altere o comportamento de tracing.
- **ChatKit Configuration**: habilite/desabilite histórico, títulos automáticos e uploads, além de limites para arquivos e quantidade de threads visíveis.
- **Session Options**: personalize o tempo de expiração (em segundos) e o limite de requisições por minuto aceito pela sessão.

A operação **Get Session** permite recuperar os metadados mais recentes de um identificador informado pelo ChatKit utilizando o endpoint `GET /chatkit/sessions/{session_id}`.

Já a operação **List Sessions** aceita filtros opcionais em **List Filters**:

- **Workflow ID**: restringe os resultados a um workflow específico (`workflow_id`).
- **User ID**: retorna somente sessões ligadas a um usuário final (`user`).
- **Before/After Cursor**: utiliza os cursores da API para navegar entre páginas de resultados.
- **Limit**: controla quantos registros são retornados em uma única chamada (padrão do ChatKit quando omitido).

Por fim, a operação **Cancel Session** requer apenas o **Session ID** retornado pela criação da sessão e encerra o chat conforme o endpoint oficial `POST /chatkit/sessions/{session_id}/cancel`.

### Tratamento de erros

Quando o node é utilizado em fluxos com a opção "Continue On Fail" ativa, eventuais erros de chamada à API serão expostos no campo `error` do item retornado para facilitar o diagnóstico. Respostas de erro retornadas pela OpenAI são repassadas diretamente para ajudar a identificar parâmetros inválidos descritos na [referência da API de sessões](https://platform.openai.com/docs/api-reference/chatkit/sessions/create).

### Publicação

O fluxo de publicação está automatizado via GitHub Actions (`.github/workflows/release.yml`). Ao criar uma tag no formato `v*.*.*`, o projeto é compilado com `tsc` e publicado no npm usando provenance.

### Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` caso seja adicionado futuramente.
