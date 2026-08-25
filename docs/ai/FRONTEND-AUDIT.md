# Auditoria dirigida — configuração inicial

| Área | Classificação | Decisão |
| --- | --- | --- |
| Componentes visuais e layout administrativo | KEEP | Preservados como referência e base visual. |
| React Router/Vite | ADJUST | SPA encapsulada temporariamente no App Router; rotas serão migradas por feature. |
| Dados de negócio simulados | REMOVE | Removidos; dashboard, departamentos, colaboradores, campanhas, relatórios e formulário público consultam PostgreSQL via APIs Next.js. |
| `MockAuthProvider` e telas MFA simuladas | REBUILD | Substituir por Better Auth + TOTP na fase de autenticação. |
| Backend legado do protótipo | REMOVE | Removido; Next.js, Neon, Drizzle e Better Auth são a arquitetura vigente. |

Esta auditoria cobre apenas a configuração inicial. Cada feature exige sua própria revisão local.
