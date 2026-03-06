# Permissoes e Roles

O acesso e controlado por combinacao de papel funcional e escopo organizacional.

## Como o acesso e decidido

1. Papel do usuario (role) define permissoes base.
2. Escopo organizacional define onde pode ver/editar.
3. Grants adicionais podem ampliar acesso por no.

## Permissoes funcionais comuns

- Gerenciar usuarios
- Gerenciar configuracoes
- Visualizar mapa estrategico
- Visualizar objetivos
- Visualizar KRs

## Escopo organizacional

- `viewableNodeIds`: nos que o usuario pode visualizar.
- `editableNodeIds`: nos que o usuario pode editar.

## Regras praticas

- Mesmo com role forte, sem escopo o usuario nao enxerga dados.
- Admin de configuracao normalmente possui acesso global no tenant.
- Grants por role ou usuario permitem excecoes controladas.
