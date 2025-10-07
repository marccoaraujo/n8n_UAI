# n8n_UAI

Este repositório reúne os recursos utilizados para criar e publicar nodes customizados para o n8n.

## OpenAI ChatKit Custom Node

O pacote `n8n-nodes-openai-chatkit` expõe um nó voltado ao fluxo recomendado para conversar com workflows criados no Agent Builder usando o ChatKit. O objetivo é separar explicitamente o gerenciamento da sessão, a continuidade da conversa (thread) e o envio de mensagens para reduzir erros de expiração ou roteamento.

### Principais capacidades

- **Sessão**: criar, renovar automaticamente (quando próximo da expiração) e encerrar localmente as credenciais curtas (`client_secret`) utilizadas pelo widget.
- **Thread**: definir um identificador específico ou gerar novos threads sob demanda, permitindo controlar quando uma conversa deve continuar ou recomeçar.
- **Mensagem**: enviar o texto do usuário para o workflow selecionado, opcionalmente com prompt de sistema, metadados customizados e modo de retorno configurável.

Toda a comunicação é feita via um **backend proxy** controlado por você. Esse proxy protege a chave da OpenAI, aplica regras de segurança e traduz as chamadas para os endpoints oficiais descritos em [ChatKit](https://platform.openai.com/docs/guides/chatkit).

### Estrutura do projeto

- `credentials/OpenAiChatKitApi.credentials.ts`: definição das credenciais utilizadas pelo n8n para acessar seu proxy.
- `nodes/OpenAIChatKit/ChatKitAgentBuilder.node.ts`: implementação do nó com os recursos de sessão, thread e mensagem.
- `nodes/OpenAIChatKit/dynamics-labs.svg`: logotipo exibido no editor do n8n.
- `dist/`: saída compilada pronta para publicação/instalação.

### Instalação

1. Instale o pacote no ambiente do n8n:

   ```bash
   npm install n8n-nodes-openai-chatkit
   ```

   Durante o desenvolvimento local, utilize:

   ```bash
   npm install
   npm run build
   ```

2. Copie a pasta `dist` gerada para o diretório de nodes customizados do n8n (por padrão `~/.n8n/custom/`).
3. Reinicie o n8n. O nó "OpenAI ChatKit" aparecerá na categoria **Transform**.

### Configuração das credenciais

Crie credenciais do tipo **OpenAI ChatKit Proxy API** com as seguintes propriedades:

- **Server Proxy Base URL (obrigatório)**: URL (com protocolo) do seu backend proxy, por exemplo `https://api.seudominio.com/chatkit`.
- **API Key (opcional)**: token encaminhado como `Authorization: Bearer <token>` para o proxy.
- **Project ID / Organization (opcionais)**: encaminhados nos cabeçalhos `X-Project-Id` e `X-Organization-Id`, úteis caso o proxy utilize esses valores para roteamento.

A chave real da OpenAI deve permanecer no backend proxy; o n8n nunca envia o segredo diretamente para a OpenAI.

### Recursos e operações

O nó expõe três recursos principais:

#### 1. Session

- **Create**: recebe `workflowId` (obrigatório), `userId` (opcional) e `metadata` em JSON. Grava `session.id`, `client_secret` e `expires_at` no armazenamento estático do nó para reutilização futura.
- **Refresh**: usa a sessão armazenada para solicitar um novo `client_secret`. Ideal para cenários onde o segredo esteja próximo da expiração.
- **End (Local)**: remove do armazenamento interno os dados de sessão e thread, forçando a criação de novas credenciais em execuções seguintes.

#### 2. Thread

- **Set**: persiste um `threadId` fornecido manualmente, útil quando você deseja continuar uma conversa existente.
- **New**: gera automaticamente um novo `thread_<uuid>` (ou com o prefixo informado) e o salva para as próximas mensagens.

#### 3. Message

- **Send**: envia a mensagem do usuário para o workflow. A operação:
  - Garante que exista uma sessão válida (executando `Refresh` automaticamente caso a expiração esteja a menos de 60 segundos, se a opção "Auto Refresh Session" estiver habilitada).
  - Resolve o `threadId` seguindo a estratégia escolhida (`auto-persist`, `provided`, `new`).
  - Encaminha `inputText`, `systemPrompt` opcional, `metadata` em JSON e o `returnMode` desejado (`final_only`, `stream_emulated`, `both`).
  - Retorna a resposta sanitizada do proxy, incluindo sessão mascarada, thread utilizado e o payload bruto para depuração.

### Fluxos sugeridos

1. **Primeiro contato**
   - `Session → Create`
   - `Thread → New`
   - `Message → Send` com `threadStrategy = auto-persist`

2. **Mensagens subsequentes na mesma conversa**
   - Apenas `Message → Send` (o nó reaproveita sessão/thread do armazenamento).

3. **Forçar nova conversa**
   - `Thread → New` (ou `Message → Send` com `threadStrategy = new`)

### Tratamento de erros

- Falhas retornadas pelo proxy ou pela OpenAI são propagadas com a mensagem original e o payload bruto em `raw` quando disponíveis.
- Quando "Continue On Fail" estiver ativo em um fluxo do n8n, utilize o campo `error` dos itens para identificar rapidamente respostas HTTP 4xx/5xx.

### Publicação

O workflow `.github/workflows/release.yml` publica automaticamente o pacote no npm sempre que uma tag `v*.*.*` é criada. O processo roda `npm ci`, `npm run build` e `npm publish --provenance`.

### Licença

Distribuído sob a licença MIT. Caso o arquivo `LICENSE` seja adicionado futuramente, consulte-o para os detalhes completos.
