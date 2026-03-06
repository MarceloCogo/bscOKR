# Integracao Entra e SCIM

Esta secao cobre autenticacao via Microsoft Entra ID e provisionamento de usuarios via SCIM.

## SSO com Microsoft Entra ID

- O fluxo de conexao e feito por administrador em **Admin > Configuracao**.
- O consentimento administrativo vincula tenant Entra ao tenant da plataforma.
- O login Microsoft nao exige slug no fluxo padrao.

## SCIM

- Endpoint base: `/api/scim/v2`
- Provisionamento recomendado via Enterprise Application (non-gallery) no Entra.
- Usuarios atribuidos na app do Entra podem ser criados/atualizados/desativados no sistema.

## Regras de seguranca

- Token SCIM e sensivel e deve ser armazenado com seguranca.
- Rotacao de token invalida o token anterior.
- Logs de eventos SCIM ficam disponiveis para auditoria operacional.

## Troubleshooting rapido

- Erro de conexao no provisioning: validar URL SCIM e token.
- Falha no login Microsoft: validar app, tenant e consentimento.
- Usuario sem acesso: validar atribuicao no Entra e permissao no sistema.
