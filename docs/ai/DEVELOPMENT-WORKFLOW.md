# Fluxo de desenvolvimento

1. Identifique a regra e a área afetada.
2. Carregue `project-context` e somente as skills pertinentes.
3. Audite o trecho herdado como `KEEP`, `ADJUST`, `REBUILD` ou `REMOVE`.
4. Faça a menor alteração coerente, com validação server-side para regras críticas.
5. Gere migration para mudanças de schema e adicione testes proporcionais ao risco.
6. Execute o checklist de validação e documente limitações.

## Ambientes

- Desenvolvimento completo: `npm run dev` com `.env.local` e banco Neon de desenvolvimento.
- Produção: Vercel + Neon, com segredos configurados somente nas plataformas.
- Não use o banco de produção durante desenvolvimento.

## Banco

- Gere migrations com `npm run db:generate`.
- Revise o SQL gerado antes de executar `npm run db:migrate`.
- Não use `db:push` em produção.
