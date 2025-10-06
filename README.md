# n8n OpenAI ChatKit Custom Node

Este repositório contém um node customizado para o [n8n](https://n8n.io) que facilita a integração com o ChatKit do Agent Builder da OpenAI. O node permite criar, recuperar e listar sessões através da API pública apresentada na documentação oficial da OpenAI.

## Funcionalidades

- Criar uma nova sessão do ChatKit com instruções personalizadas, modelo padrão e configurações de ferramentas.
- Recuperar os detalhes de uma sessão existente a partir do ID.
- Listar as sessões disponíveis na sua conta.

## Estrutura do projeto

- `credentials/OpenAiChatKitApi.credentials.ts`: credenciais utilizadas para armazenar a chave de API e demais parâmetros necessários.
- `nodes/OpenAIChatKit/ChatKitAgentBuilder.node.ts`: implementação principal do node.
- `nodes/OpenAIChatKit/openai.svg`: ícone exibido pelo node no editor do n8n.

## Como utilizar

1. Instale as dependências e gere a build do node:

   ```bash
   npm install
   npm run build
   ```

2. Copie a pasta `dist` gerada para o diretório de nodes customizados do n8n (por padrão `~/.n8n/custom/`).
3. Reinicie o n8n. O node "OpenAI ChatKit" estará disponível na categoria **Transform**.
4. Crie novas credenciais do tipo **OpenAI ChatKit API** informando:
   - **API Key**: uma chave da OpenAI com acesso ao beta do Agent Builder / ChatKit.
   - **Base URL**: opcional, use apenas se estiver utilizando um proxy.
   - **OpenAI-Beta Header**: valor do cabeçalho exigido pela documentação da OpenAI (por padrão `chatgpt-extensions=2024-10-01`).

## Configuração do node

Ao usar a operação **Create Session** é possível definir:

- **Instructions**: instruções de sistema do agente.
- **Session Name**: nome amigável para identificar a sessão.
- **Default Model**: modelo que será utilizado (ex.: `gpt-4.1-mini`).
- **Metadata (JSON)**: metadados adicionais em formato JSON.
- **Tool Configuration**: habilitar busca em arquivos, web search e instruções adicionais de ferramentas.
- **Additional Fields**: incluir um identificador próprio e escolher a estratégia de merge dos metadados.

As operações **Get Session** e **List Sessions** não exigem parâmetros adicionais além das credenciais.

## Tratamento de erros

Quando o node é utilizado em fluxos com a opção "Continue On Fail" ativa, eventuais erros de chamada à API serão expostos no campo `error` do item retornado para facilitar o diagnóstico.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` caso seja adicionado futuramente.
