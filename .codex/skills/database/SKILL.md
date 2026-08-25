---
name: database
description: Orienta schema PostgreSQL/Neon, Drizzle, migrations, transações, índices e concorrência para persistência do sistema.
---

# Banco de dados

Use somente Drizzle ORM com PostgreSQL/Neon. Toda alteração de schema precisa de migration versionada. Use a conexão pooled em runtime serverless e a unpooled para migrations quando disponível; não mantenha conexão ou sessão como estado permanente.

Proteja invariantes no banco: matrícula única, token público único, elegibilidade única por campanha/colaborador, submissão única por campanha/colaborador e escolha única por submissão/data.

Na reserva de vagas, use uma transação e `pg_advisory_xact_lock` por campanha, departamento snapshot e data. Adquira locks de múltiplas datas em ordem crescente, recalcule ocupação dentro da transação e só então grave submissão e escolhas. Nunca use apenas `SELECT count` seguido de `INSERT` sem lock.

Não execute migrations em produção sem solicitação explícita. Seeds devem conter apenas dados fictícios.
