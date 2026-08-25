# Sistema de Compensação de Feriados

Aplicação Next.js para gestão de campanhas de compensação de feriados. O protótipo visual herdado está temporariamente encapsulado no App Router enquanto os mocks são substituídos por services e persistência reais, feature a feature.

## Pré-requisitos

1. Node.js 22 ou versão compatível com o Next.js declarado no projeto.
2. Copie `.env.example` para `.env.local` e preencha somente as credenciais do ambiente de desenvolvimento.
3. Instale as dependências com `npm install`.

## Desenvolvimento local

```bash
npm run dev
```

Abra a URL exibida pelo Next.js (por padrão `http://localhost:3000`).

## Publicação na Vercel

O projeto é uma aplicação Next.js independente. Importe o repositório na Vercel, configure as variáveis de `.env.example` no ambiente desejado e use os comandos padrão detectados para Next.js.

Antes da primeira publicação, aplique as migrations ao banco de produção por um ambiente controlado com `npm run db:migrate`. A aplicação não executa migrations automaticamente durante o build.

## Banco de dados

O runtime usa `DATABASE_URL` (preferencialmente pooled). As migrations usam `DATABASE_URL_UNPOOLED` quando configurada e caem para `DATABASE_URL` caso contrário.

```bash
npm run db:generate
npm run db:migrate
```

Revise a migration gerada antes de aplicá-la. A configuração inicial não executa migrations automaticamente em banco conectado.

Os dados administrativos são carregados diretamente do PostgreSQL. Em um banco vazio, o fluxo inicial é:

1. Entre com o administrador inicial.
2. Cadastre departamentos em **Configurações → Departamentos**.
3. Cadastre colaboradores individualmente ou use **Colaboradores → Importar XLSX**.
4. Crie e publique uma campanha.

O formulário público valida a elegibilidade no servidor e registra as escolhas em transação, com controle de concorrência por campanha, departamento e data.

### Importação de colaboradores

A importação aceita arquivos `.xlsx` de até 5 MB e 2.000 linhas, com as colunas `MATRÍCULA`, `NOME`, `EMAIL` e `DEPARTAMENTO`. O departamento deve existir previamente e pode ser informado pelo nome ou código. A tela apresenta uma prévia, bloqueia inconsistências e só então cria ou atualiza os colaboradores em uma única transação.

### E-mail transacional

`RESEND_API_KEY` e `EMAIL_FROM` estão reservadas para a fase de notificações. Configurar essas variáveis, por si só, ainda não envia mensagens: o serviço de confirmação via Resend precisa ser integrado ao fluxo de submissão e ao histórico `EmailDelivery`.

## Administrador inicial

O cadastro público está desabilitado. Para criar o primeiro administrador em um banco vazio, execute o seed em terminal interativo:

```bash
npm run auth:seed-master -- admin@exemplo.com "Nome do administrador"
```

A senha é solicitada em prompt oculto. O QR TOTP e os recovery codes são gravados em `.secrets/`, que é ignorada pelo Git. Remova esses arquivos depois de cadastrá-los e armazená-los em local seguro.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Consulte `docs/ai/DEVELOPMENT-WORKFLOW.md` para o fluxo incremental e `docs/ai/VALIDATION-CHECKLIST.md` antes de concluir uma etapa.
