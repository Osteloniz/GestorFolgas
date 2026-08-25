---
name: business-rules
description: Aplica regras de campanhas, elegibilidade, disponibilidade, múltiplas folgas e alterações administrativas do sistema de compensação.
---

# Regras de negócio

Uma campanha pode representar vários feriados e exige exatamente `max_choices_per_employee` datas por envio. Cada colaborador faz um único envio por campanha e não o altera depois; um administrador pode alterar ou criar escolhas excepcionais somente com justificativa e auditoria.

Calcule o status efetivo com período e cancelamento explícito. Uma data válida exige campanha aberta, elegibilidade, período de folgas, participação do departamento, regra semanal/exceção e capacidade. Exceção por data prevalece sobre regra semanal.

Use snapshots de matrícula, nome, e-mail e departamento para elegibilidade, submissões e histórico. Não altere dados históricos ao atualizar o cadastro atual.

Conflitos de capacidade devem preservar escolhas ainda válidas no client e retornar erro de domínio previsível.
