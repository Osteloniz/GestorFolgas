---
name: testing
description: Define a estratégia de testes unitários, integração e E2E para regras críticas do sistema de compensação.
---

# Testes

Priorize testes unitários para status, regras semanais, precedência de exceções, quantidade de escolhas, datas duplicadas, período, capacidade, override e normalização de matrícula.

Use testes de integração para elegibilidade, submissão única, alterações auditadas e snapshots. O teste de concorrência da última vaga é obrigatório: com capacidade 1, duas requisições simultâneas devem produzir exatamente um sucesso e um conflito.

E2E deve cobrir o fluxo público completo e o fluxo administrativo com MFA, alteração e histórico. Evite cobertura artificial sem valor de risco.
