# Checklist de validação

- [ ] Mudança alinhada à documentação e às regras aprovadas.
- [ ] Frontend afetado classificado e mocks não usados como fonte de verdade.
- [ ] Entrada e autorização validadas no servidor.
- [ ] Constraints, índices, transação e concorrência revisados quando aplicável.
- [ ] Histórico e snapshots preservados.
- [ ] Nenhum segredo ou PII desnecessária em client/logs.
- [ ] Estados de erro, loading, vazio e conflito tratados em PT-BR.
- [ ] Acessibilidade e mobile revisados quando há UI.
- [ ] `npm run lint` aprovado.
- [ ] `npm run typecheck` aprovado.
- [ ] `npm test` e testes relevantes aprovados.
- [ ] `npm run build` aprovado.
- [ ] Migration revisada e status de aplicação informado.
