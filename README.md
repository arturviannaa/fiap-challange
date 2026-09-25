# fiap-challange · Anamnea Quizzes

Projeto do **Challenge FIAP 2026**: o módulo de quizzes da [Anamnea](https://www.anamnea.com.br) separado em três serviços, cada um numa linguagem.

| Parte | Linguagem | O que faz |
|---|---|---|
| `auth/` | **C++** | Cadastro, login, sessão e recuperação de senha |
| `quiz/` | **Python** | Banco de questões, correção, XP e ranking |
| `web/` | **HTML, CSS e JS puros** | A interface, seguindo o design system da Anamnea |

## Equipe

- Artur Figueiredo Vianna
- Cassiano Rocha Assumpção
- Pedro Perraro John

## Fluxo de trabalho

Cada funcionalidade nasce numa branch própria (`feat/…`, `fix/…`, `ci/…`, `docs/…`), passa pelos testes e entra na `main` por pull request revisado por outra pessoa da equipe.
