# Lumna

Lumna é uma plataforma de quizzes para o ciclo básico de Medicina, feita para o Challenge FIAP 2026 com o Hospital Moinhos de Vento. São 16 quizzes e 120 questões de Anatomia, Bioquímica, Embriologia, Fisiologia, Genética, Histologia, Semiologia e Saúde Coletiva. O aluno responde uma questão por vez, vê a alternativa certa e a explicação na hora e soma XP.

- Deploy na Vercel: https://lumna-iota.vercel.app
- Repositório: https://github.com/arturviannaa/fiap-challange

## Equipe

| Nome | RM |
|---|---|
| Artur Figueiredo Vianna | 571866 |
| Cassiano Rocha Assumpção | 568632 |
| Pedro Perraro John | 573068 |

## O que tem no repositório

| Pasta | O que é |
|---|---|
| `app/` | front em React e Tailwind (Sprint 4), publicado na Vercel |
| `quiz/` | API de quizzes em Python: correção, XP, ranking e análises |
| `auth/` | API de login em C++: cadastro, sessão e recuperação de senha |
| `web/` | front da Sprint 3, em HTML, CSS e JavaScript puro |

## Front em React (`app/`)

### Tecnologias

React 19, React Router 7, Tailwind CSS 4 e Vite 8.

### Como rodar

Precisa do Node.js 20 ou mais novo.

```bash
cd app
npm install
npm run dev
```

Abre em http://localhost:5173. Para gerar a versão de produção, use `npm run build`.

Essa versão não precisa de back-end rodando nem de variável de ambiente.

### Usuário de teste

- e-mail: `aluno@lumna.com`
- senha: `teste123`

Dá para criar outra conta em "Criar conta". Ela fica salva só no navegador.

### Rotas

| Rota | Tipo | Tela |
|---|---|---|
| `/` | pública | início |
| `/entrar` | pública | login |
| `/cadastro` | pública | criar conta |
| `/quizzes` | privada | lista de quizzes com busca e filtro por disciplina |
| `/quizzes/:id` | privada | quiz, uma questão por vez com correção na hora |
| `/desempenho` | privada | XP, aproveitamento e histórico |

As rotas privadas ficam dentro do componente `RotaPrivada`. Quem não fez login vai para `/entrar` e, depois de entrar, volta para a página que tentou abrir.

### Dados (API mockada)

As 120 questões ficam em `app/public/api/quizzes.json`, o mesmo banco de questões da API em Python. O app busca esse arquivo com `fetch`, como se fosse uma API. O hook `useApi` cuida do carregamento, do erro (com botão para tentar de novo) e do resultado, e quando a busca ou o filtro não acham nada aparece a mensagem de lista vazia. As questões são de conteúdo de faculdade e não têm dado de paciente.

Login, contas criadas e histórico ficam no localStorage.

### Pastas

```
app/src/
  components/   Cabecalho, RotaPrivada, Estado, QuizCard, Formulario
  hooks/        useApi e useAuth
  pages/        Inicio, Entrar, Cadastro, Quizzes, Quiz, Desempenho, NaoEncontrada
  api.js        leitura do JSON e do localStorage
```

## Back-end (`quiz/` e `auth/`)

O jeito mais fácil é subir tudo com Docker:

```bash
docker compose up --build
```

O front da Sprint 3 abre em http://localhost:8080, o `auth` fica na porta 8092 e o `quiz` na 8093.

Sem Docker, em três terminais:

```bash
cmake -S auth -B auth/build && cmake --build auth/build -j
MODO_DEMO=1 ./auth/build/lumna-auth

cd quiz && python -m app

python -m http.server 8080 -d web
```

O `auth` precisa de g++, cmake, libssl-dev e libsqlite3-dev. O `quiz` usa só a biblioteca padrão do Python 3.12. Com `MODO_DEMO=1`, o código de recuperação de senha aparece na tela, porque não tem servidor de e-mail.

### Regras do quiz

A primeira resposta de cada questão é a que vale, e "Não sei" conta como erro. Cada acerto vale 10 XP, e quem acerta todas ganha mais 20. Só a primeira conclusão do dia em cada quiz rende XP, para ninguém subir no ranking repetindo o mesmo quiz.

A API também calcula o aproveitamento por disciplina (dominada a partir de 70%, atenção de 50% a 69% e revisar abaixo de 50%), recomenda o próximo quiz e mostra as questões que a turma mais erra.

### Rotas da API de quizzes

| Método | Rota | Para quê |
|---|---|---|
| `GET` | `/quizzes?disciplina=` | lista os quizzes |
| `GET` | `/quizzes/{id}` | um quiz, sem o gabarito |
| `POST` | `/quizzes/{id}/tentativas` | começa uma tentativa (precisa de login) |
| `POST` | `/tentativas/{id}/respostas` | responde uma questão e recebe a correção |
| `POST` | `/tentativas/{id}/concluir` | fecha a tentativa e soma o XP |
| `GET` | `/eu/resumo` | XP, aproveitamento e histórico do aluno |
| `GET` | `/eu/analise` | aproveitamento por disciplina e próximo quiz |
| `GET` | `/analise/questoes` | as 5 questões com menos acerto da turma |
| `GET` | `/ranking` | as 10 pessoas com mais XP |

Os erros voltam como `{"erro": "mensagem"}` com o status HTTP certo (400, 401, 404, 409, 422).

### Rotas da API de login

| Método | Rota | Para quê |
|---|---|---|
| `POST` | `/conta/cadastro` | cria a conta |
| `POST` | `/conta/login` | devolve o token de sessão |
| `GET` | `/conta/eu` | diz de quem é o token |
| `POST` | `/conta/sair` | encerra a sessão |
| `POST` | `/conta/recuperar-senha` | gera o código de 6 dígitos |
| `POST` | `/conta/redefinir-senha` | troca a senha com o código |

A senha é guardada com PBKDF2-SHA256, e cinco tentativas erradas seguidas bloqueiam o login por cinco minutos.

## Testes

```bash
cd quiz && python -m unittest -v
ctest --test-dir auth/build --output-on-failure
```

São 35 testes no Python e 18 no C++. O GitHub Actions roda tudo a cada pull request.

## Uso de Inteligência Artificial

Usamos um assistente de IA (Claude) para ajudar a passar as telas de HTML e JavaScript puro para componentes React com Tailwind, montar as rotas e revisar o texto deste README. A equipe revisou o código, testou os fluxos no navegador e ajustou o que precisou.
