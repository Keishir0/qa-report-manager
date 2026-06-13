# QA Report Manager

O **QA Report Manager** é um sistema web moderno e responsivo para gerenciamento de relatórios de testes de garantia de qualidade (QA). Ele permite registrar relatórios de bugs e testar cenários, estruturar passos de validação, gerar métricas agregadas através de um Dashboard dinâmico e exportar os relatórios e seus passos para planilhas do Excel (`.xlsx`) e documentos PDF (`.pdf`).

---

## 🛠️ Stack Utilizada

A stack de tecnologia do projeto consiste em:

- **Frontend / Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS (CSS Puro, sem bibliotecas de componentes externas)
- **Banco de Dados**: PostgreSQL rodando via Docker
- **ORM**: Prisma ORM
- **Inteligência Artificial**: SDK Oficial do Google Gemini (`@google/generative-ai` com o modelo `gemini-flash-latest`)
- **Exportações**: 
  - `xlsx` (SheetJS) para planilhas Excel
  - `jspdf` + `jspdf-autotable` para documentos PDF
- **Manipulação de Datas**: `date-fns`

---

## 📋 Pré-requisitos

Para rodar a aplicação localmente, certifique-se de possuir:

1. **Node.js** (versão 18.x ou superior)
2. **NPM** (instalado por padrão com o Node)
3. **Docker** e **Docker Compose** ativos na sua máquina (para inicialização do banco de dados)

---

## 🚀 Passo a Passo de Instalação e Execução

Siga os comandos abaixo a partir da pasta raiz do projeto (`qa-report-manager`) para preparar o ambiente:

1. **Instalar Dependências**:
   ```bash
   npm install
   ```

2. **Configurar Variáveis de Ambiente**:
   Crie ou edite o arquivo `.env` na raiz do projeto e insira as configurações de banco de dados e a chave de acesso do Google Gemini:
   ```env
   DATABASE_URL=""
   GEMINI_API_KEY="SUA_GEMINI_API_KEY"
   ```

3. **Subir Banco de Dados via Docker**:
   ```bash
   docker compose up -d
   ```

3. **Criar e Aplicar as Migrações do Prisma**:
   ```bash
   npm run db:migrate
   ```
   *Quando solicitado o nome da migração no prompt do terminal, digite **`init`** e pressione Enter.*

4. **Gerar o Prisma Client**:
   ```bash
   npm run db:generate
   ```

5. **Popular o Banco com Dados Iniciais (Seed)**:
   ```bash
   npm run db:seed
   ```
   *Isso criará o primeiro relatório de teste `QA-001` com 6 passos de exemplo.*

6. **Iniciar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   *Acesse a aplicação no navegador em [http://localhost:3000](http://localhost:3000).*

---

## ⚙️ Scripts NPM Disponíveis

Abaixo está a lista de comandos configurados no `package.json` para facilitar o gerenciamento do projeto:

| Comando | Descrição |
|:---|:---|
| `npm run dev` | Inicia o servidor de desenvolvimento local do Next.js. |
| `npm run build` | Compila o projeto gerando uma build de produção otimizada. |
| `npm run start` | Executa o servidor de produção com a build otimizada. |
| `npm run lint` | Executa o linter do Next.js para análise estática do código. |
| `npm run db:generate` | Gera o Prisma Client com os tipos do schema atualizados. |
| `npm run db:migrate` | Cria e aplica migrações de desenvolvimento do banco de dados. |
| `npm run db:deploy` | Aplica migrações pendentes em produção. |
| `npm run db:push` | Sincroniza o banco de dados diretamente com o schema do Prisma sem migrações. |
| `npm run db:seed` | Executa o script de inserção de dados iniciais do banco (`prisma/seed.ts`). |
| `npm run db:studio` | Abre o editor visual de banco de dados do Prisma no navegador. |
| `npm run auth:create-admin` | Cria ou redefine a conta administrativa pelas variáveis `ADMIN_*`. |
| `npm run auth:create-user` | Cria ou redefine uma conta pelas variáveis `USER_*`. |

---

## Autenticação e permissões

As senhas são armazenadas com `scrypt` e salt individual. O navegador recebe
somente um cookie de sessão `HttpOnly`, enquanto o banco guarda o hash do token.
Após 5 tentativas inválidas, o login fica bloqueado por 15 minutos.

Perfis disponíveis:

- `VIEWER`: consulta e exporta relatórios.
- `QA`: também cria e edita relatórios e passos e usa a geração por IA.
- `ADMIN`: também administra webhooks, configurações e pendências do SNDesk.

Administradores também podem cadastrar contas pela tela **Usuários** no menu
lateral. O comando `npm run auth:create-user` continua disponível para
recuperação administrativa pelo terminal.

Para criar ou redefinir uma conta:

```env
USER_NAME="Pessoa QA"
USER_EMAIL="qa@empresa.com"
USER_PASSWORD="senha-com-8-ou-mais"
USER_ROLE="QA"
```

```bash
npm run auth:create-user
```

Alterar a senha por esse comando encerra as sessões existentes da conta.

Antes de publicar uma versão com mudanças no banco, execute
`npm run db:deploy` contra o banco de produção. O comando `npm run build` não
altera mais o schema automaticamente.

Se o banco de produção já existia antes destas migrations e era atualizado por
`prisma db push`, marque as migrations correspondentes ao schema já existente
com `npx prisma migrate resolve --applied <nome-da-migration>` antes do primeiro
`db:deploy`. Não marque uma migration cuja estrutura ainda não exista no banco.

---

## Integracao SNDesk para Pendencias de Teste

As rotas administrativas da integração exigem uma sessão com perfil `ADMIN`.
A tela **Pendencias** permite salvar no banco o domínio, token da API SNDesk,
status, modelos de mensagem e flags de envio.

O `SNDESK_API_TOKEN` fica salvo no banco, mas nunca e retornado pelo endpoint de
configuracao; a interface mostra apenas se existe token configurado. Placeholders
disponiveis nos modelos: `{codigo_teste}`, `{id_chamado}`, `{status_geral}`,
`{resumo}` e `{passos}`.

As variaveis `SNDESK_BASE_URL`, `SNDESK_API_TOKEN`, `SNDESK_PENDING_STATUS_IDS`,
`SNDESK_DEFAULT_USER_ID`, `SNDESK_APPROVE_STATUS_ID`, `SNDESK_REJECT_STATUS_ID`,
`SNDESK_VISIBLE_CLIENT`, `SNDESK_EMAIL_CLIENT`, `SNDESK_EMAIL_TECHNICIAN`,
`SNDESK_APPROVE_TEMPLATE` e `SNDESK_REJECT_TEMPLATE` continuam aceitas como
fallback de ambiente, mas o uso normal e configurar pela tela.

---

## 📁 Estrutura de Pastas Comentada

Abaixo está disposta a estrutura organizacional de diretórios do projeto:

```text
qa-report-manager/
├── prisma/
│   ├── schema.prisma          # Definição das tabelas TestReport e TestStep
│   └── seed.ts                # Dados iniciais para popular o banco PostgreSQL
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Route Handlers (Back-end)
│   │   │   ├── ai/            # Geração e estruturação de dados de teste via IA
│   │   │   │   └── generate/  # Rota POST que consome a API do Google Gemini
│   │   │   ├── dashboard/     # Rota GET para buscar estatísticas do Dashboard
│   │   │   ├── reports/       # Rota GET (filtros) e POST (criação com code autoincrement)
│   │   │   │   └── [id]/      # Rota GET, PUT (partial update) e DELETE (cascade) de relatórios
│   │   │   └── steps/         # Rota POST para criar passos
│   │   │       └── [id]/      # Rota PUT (partial update) e DELETE de passos individuais
│   │   ├── reports/
│   │   │   ├── [id]/          # Detalhes de um relatório específico, edição e passos
│   │   │   └── new/           # Página de criação de novos relatórios
│   │   ├── globals.css        # Importação do Tailwind CSS e classes de estilo reutilizáveis
│   │   ├── layout.tsx         # Estrutura do layout com Sidebar fixa esquerda e área principal
│   │   └── page.tsx           # Página do Dashboard (Server Component)
│   ├── components/            # Componentes React
│   │   ├── reports/           # Componentes específicos de negócio
│   │   │   ├── ReportForm.tsx # Formulário para criar/editar relatórios
│   │   │   ├── StepForm.tsx   # Formulário para criar passos de teste
│   │   │   └── StepRow.tsx    # Linha de passo com suporte a visualização e edição inline
│   │   └── ui/                # Componentes genéricos de UI
│   │       ├── Sidebar.tsx    # Barra de navegação lateral fixa
│   │       ├── StatusBadge.tsx# Emblema com indicadores de status
│   │       └── Toast.tsx      # Banner flutuante temporário para feedback de sucesso/erro
│   ├── lib/
│   │   ├── export.ts          # Lógicas de exportação cliente-side para Excel e PDF
│   │   └── prisma.ts          # Singleton do PrismaClient para evitar vazamento de conexões
│   └── types/
│       └── index.ts           # Interfaces, enums e constantes de select do TypeScript
├── docker-compose.yml         # Container do banco de dados PostgreSQL 15-alpine
├── .env                       # String de conexão do banco de dados (DATABASE_URL)
├── next.config.js             # Configurações do Next.js
├── postcss.config.js          # Configurações do PostCSS
├── tailwind.config.js         # Configurações do Tailwind CSS (Fontes e Cor Brand)
└── tsconfig.json              # Configurações do compilador TypeScript e Alias @/*
```

---

## 🌟 Funcionalidades Implementadas

1. **Dashboard Consolidado (Home `/`)**:
   - Visualização quantitativa total e filtrada por status de testes (*Passou*, *Falhou*, *Bloqueado*).
   - Tabela simplificada listando os últimos 5 relatórios ordenados pela data de criação.
2. **Listagem com Filtros (`/reports`)**:
   - Filtros dinâmicos que recarregam a listagem reativamente: por data de início/fim, branch de teste, status do relatório e tipo de teste.
   - Limpeza rápida de filtros e exclusão física direta com confirmação via modal do navegador.
3. **Criação de Relatório (`/reports/new`)**:
   - Formulário com validações inline robustas (ex: impede a data de teste ser futura).
   - Geração automática e sequencial de código no formato `QA-XXX` (Ex: `QA-001`, `QA-002`, `QA-003`).
4. **Detalhes do Teste (`/reports/[id]`)**:
   - Visualização rica das notas, descrição do bug e informações gerais.
   - Edição inline dos dados principais do relatório (alternando em tempo real com o formulário).
   - Gerenciamento completo de passos: tabela de passos ordenada por `stepNumber` com edição inline de cada passo individual e formulário rápido para adicionar novos passos (com validação para impedir número de passo repetido).
5. **Notificações em Toast**:
   - Feedbacks visuais e animados nas cores verde (sucesso) e vermelho (erro) que somem automaticamente após 3 segundos de exibição, eliminando o uso de diálogos do sistema (`alert`).
6. **Controle de 404 Dinâmico**:
   - Tentativas de acesso direto a IDs inválidos na rota `/reports/[id]` realizam redirecionamento automático para a lista geral exibindo notificação flutuante de erro.
7. **Exportação Excel (`.xlsx`)**:
   - Gera e inicia o download de planilha com duas abas estruturadas: a de "Resumo" com dados gerais e a de "Passos" compilando todas as validações com vínculos. Largura de colunas auto-ajustável.
8. **Exportação PDF (`.pdf`)**:
   - Documento otimizado com cabeçalho contendo a data e período de geração e rodapé contendo paginação (`Página X de Y`).
   - Dados gerais impressos em duas colunas e tabela de passos formatada com cores e formatação condicional de status (Verde, Vermelho, Laranja).
9. **Preenchimento Inteligente com IA**:
   - Painel assistente no formulário de criação de relatórios (`/reports/new`).
   - Permite colar um relato informal de bug/teste em linguagem natural.
   - A IA do Gemini analisa o texto, preenche automaticamente os campos de cabeçalho do formulário e gera toda a lista ordenada de passos do teste correspondentes para que o QA revise antes de submeter ao banco.

---

## 🖥️ Descrição das Telas

### 1. Dashboard (Página Inicial)
- **Cards de Métricas**: Painéis no topo nas cores correspondentes aos status para rápida tomada de decisão sobre o software.
- **Relatórios Recentes**: Tabela com os últimos 5 testes realizados, indicando o número de passos vinculados em cada um e link direto para detalhes. Exibe um estado vazio com ilustrações SVG e botão call-to-action para cadastrar o primeiro teste caso o banco esteja limpo.

### 2. Filtro e Listagem Geral
- **Filtros**: Painel expansível contendo inputs de datas e selects contendo as opções predefinidas dos tipos TypeScript.
- **Tabela**: Exibe código, data de teste formatada, sistema correspondente, branch de execução, menu de caminho, funcionalidade testada, o tipo de teste, emblema indicador de status e ações rápidas (Visualizar e Excluir).

### 3. Formulário de Novo Teste
- **Inputs**: Caixa de data nativa, caixas de seleção padronizadas, inputs de texto e áreas de texto grandes para descrição e observações detalhadas. Exibe aviso em vermelho imediatamente abaixo de qualquer campo obrigatório que tenha sido ignorado.

### 4. Visualização e Gestão de Passos
- **Card Principal**: Mostra as informações completas do teste. Ao clicar em "Editar", a interface é substituída pelo formulário preenchido com o código `QA-XXX` exibido como somente leitura.
- **Tabela de Passos**: Renderiza cada passo cadastrado. A edição inline abre campos de texto direto na respectiva linha da tabela, permitindo modificação rápida sem perda de contexto. O formulário "Adicionar Passo" abaixo da tabela preenche automaticamente o próximo número de passo.
