---
name: validation-review
description: Revisa a conclusão de mudanças relevantes quanto a segurança, integridade, regressões e verificações obrigatórias.
---

# Validação final

Antes de concluir, confirme que a documentação permaneceu como fonte de verdade, mocks não definiram domínio, a mudança ficou no escopo, a UI segue PT-BR e toda regra crítica também existe no servidor/banco.

Execute `npm run lint`, `npm run typecheck`, testes relevantes e `npm run build`. Revise migrations e dados sensíveis; não exponha stack trace, SQL, tabelas ou segredos ao client.

Registre no handoff o que mudou, checks executados, migration pendente/aplicada e qualquer limitação remanescente.
