# Configuração de produção

1. Crie um projeto Neon exclusivo chamado closecircle.
2. Copie a URL de conexão pooled do Neon para a variável `DATABASE_URL` na Vercel (Production, Preview e Development com bancos separados).
3. Gere `BETTER_AUTH_SECRET` com pelo menos 32 bytes aleatórios e configure na Vercel.
4. Configure `BETTER_AUTH_URL` com a URL HTTPS de produção.
5. Configure as tabelas de autenticação usando o CLI oficial do Better Auth (revise a migração antes de aplicá-la).
6. Gere e revise as migrações do Drizzle para as tabelas sociais.
7. Teste criação de conta, sessão, logout e isolamento de dados antes de convidar usuários.

Não envie segredos por chat nem comite arquivos .env. A aplicação ainda não implementa verificação de e-mail, recuperação de senha, uploads, políticas de retenção ou moderação. Não liberar cadastro público até que essas proteções sejam adicionadas.
