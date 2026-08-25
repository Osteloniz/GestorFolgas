---
name: security-auth
description: Orienta autenticação administrativa, MFA TOTP, sessão, autorização, rate limit e proteção de dados pessoais.
---

# Segurança e autenticação

Use Better Auth para e-mail/senha, sessões e TOTP com recovery codes. Não implemente criptografia, senha ou TOTP manualmente. Não ofereça cadastro público de administrador.

Toda operação administrativa server-side deve chamar uma fronteira central `requireAdmin`; proteção visual ou de rota não substitui autorização no servidor. Cookies devem ser `HttpOnly`, `Secure` em produção e `SameSite` apropriado.

Não use matrícula como autorização administrativa. Normalize matrícula antes de consultar e aplique rate limit, respostas sem enumeração e sessão pública temporária após validação. Mascare e-mail na UI pública.

Nunca registre senha, segredo TOTP, recovery code, token de sessão, API key ou connection string.
