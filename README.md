# Kanban System 🚀

Um sistema Kanban moderno, full-stack, com backend em Node.js e banco de dados SQLite, servindo um Frontend minimalista em arquivo único.

## ✨ Funcionalidades
- **Backend Node.js:** API RESTful construída com Express.js, manipulando autenticação e persistência de dados.
- **Banco de Dados SQLite:** Persistência relacional nativa no arquivo `database.sqlite`, garantindo integridade das tarefas e usuários.
- **Autenticação JWT:** Sistema de Login/Registro completo com criptografia de senhas (bcryptjs) e validação de tokens JWT reais.
- **Gestão de Tarefas (Drag and Drop):** Interface fluida no frontend para arrastar cards entre colunas (A Fazer, Fazendo, Concluído).
- **Métricas em Tempo Real:** Dashboard que contabiliza suas tarefas ativas, concluídas e atrasadas.
- **Auditoria de Dados:** Acompanhe a data exata em que tarefas e conta foram criadas, modificadas ou finalizadas usando o painel de auditoria.
- **Design Responsivo:** Funciona perfeitamente em Desktops e adota um layout vertical scrollável em dispositivos Mobile.
- **Modo Escuro:** Interface estilizada em dark mode nativo para maior conforto visual.

## 🛠️ Tecnologias
- **Frontend:** HTML5, CSS3, JavaScript (ES6+ Vanilla)
- **Backend:** Node.js, Express.js
- **Segurança:** jsonwebtoken, bcryptjs, cors
- **Banco de Dados:** SQLite (pacotes `sqlite3` e `sqlite`)

## 📦 Como Instalar e Rodar o Projeto

Este projeto utiliza um servidor Node.js real para hospedar o banco de dados e servir a interface web.

### Passo 1: Instalar dependências
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado. No seu terminal, dentro da pasta do projeto, rode:
```bash
npm install
```

### Passo 2: Iniciar o Servidor
Para criar automaticamente o banco de dados SQLite e iniciar a aplicação, rode:
```bash
node server.js
```

### Passo 3: Acessar a Aplicação
O servidor iniciará na porta 3000 (ou na porta definida no seu ambiente). Abra o navegador e acesse:
**http://localhost:3000**

## 🔒 Segurança e Dados
- Todas as senhas cadastradas são transformadas em Hash usando o algoritmo `bcrypt` antes de serem armazenadas no SQLite.
- As chamadas da API são protegidas via Middleware que exige um `Bearer Token` JWT. O frontend intercepta e envia esse token guardado no seu Local Storage para validar a sessão no Backend.

---
*Projeto arquitetado focando em clean code e separação client-server.*
