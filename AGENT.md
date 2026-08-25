# Orquestrador do projeto

Use a documentação aprovada como fonte de verdade; o frontend e os mocks são apenas referência. Em tarefas não triviais, carregue `.codex/skills/project-context/SKILL.md` e apenas as skills adicionais do domínio afetado:

- campanhas e fluxo do colaborador: `business-rules`;
- PostgreSQL, Neon, Drizzle, migrations e concorrência: `database`;
- login, sessão, MFA, autorização e rate limit: `security-auth`;
- telas, componentes e acessibilidade: `ui-ux`;
- criação ou alteração de testes: `testing`;
- conclusão de uma etapa: `validation-review`.

Antes de reutilizar uma área relevante do protótipo, classifique-a localmente como `KEEP`, `ADJUST`, `REBUILD` ou `REMOVE`. Faça mudanças incrementais e preserve integridade histórica, validação server-side e PT-BR na interface.
