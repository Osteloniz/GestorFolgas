---
name: project-context
description: Orienta qualquer tarefa não trivial no Sistema de Compensação de Feriados e resolve conflitos entre documentação, protótipo e mocks.
---

# Contexto do projeto

Este é um sistema interno pequeno, não um SaaS. A ordem de autoridade é: documentação funcional, regras aprovadas, especificação técnica, solicitação atual, código existente e mocks.

Antes de mudar uma área do frontend, audite apenas os arquivos afetados e classifique-os como `KEEP`, `ADJUST`, `REBUILD` ou `REMOVE`. Reaproveite UI somente quando estiver coerente. Não derive schema ou regras de negócio dos mocks.

Implemente por fases pequenas. Priorize integridade, segurança, regra de negócio, UX e performance, nessa ordem. Não inclua funcionalidades fora do escopo inicial.
