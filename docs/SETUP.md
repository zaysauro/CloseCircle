# Configuração e validação

Projeto Vercel: bruno-02a0/closecircle. Domínio principal: https://closecircle-one.vercel.app.
Projeto Neon exclusivo: fancy-moon-19997073, PostgreSQL 17, aws-us-east-2.
Branches: production (br-wandering-hall-b4kg2cct) e development (br-wild-leaf-b4wypakv).

## Variáveis
- DATABASE_URL: URL pooled. Production aponta para production; Preview/Development para development.
- DATABASE_URL_UNPOOLED: conexão direta para migrations. Nunca usar banco de produção em testes.
- BETTER_AUTH_SECRET: aleatório e distinto por ambiente, nunca no Git.
- BETTER_AUTH_URL: domínio principal em Production; localhost em Development. Preview infere a URL da requisição.
- BOOTSTRAP_EMAIL: só este e-mail, com o link inicial secreto, cria a primeira conta sem convite. Depois disso, todos os cadastros exigem convite válido.
- BOOTSTRAP_TOKEN_HASH: SHA-256 do código secreto do link de primeiro acesso. O código não fica no Git e só funciona antes da primeira conta.
- RESEND_API_KEY e AUTH_EMAIL_FROM: opcionais até configurar um remetente verificado. Ativam confirmação de e-mail e recuperação de senha; precisam ser testados com entrega real.

## Desenvolvimento
1. npm ci
2. Configure .env.local a partir dos nomes em .env.example, sem comitar valores.
3. npm run db:generate para alterações sociais de schema.
4. node --import tsx scripts/auth-migration.ts gera SQL de autenticação para revisão. Não sobrescreva uma migration já aplicada; salve alterações futuras em um novo arquivo e acrescente ao runner.
5. Revise migrations e execute npm run db:migrate primeiro em branch de desenvolvimento.
6. npm run build; npm run dev.

scripts/migrate.mjs aplica arquivos revisados em ordem e registra checksum em closecircle_migrations. Não edite SQL já aplicado. Não aponta para produção automaticamente.

## Testes de isolamento
As contas são criadas somente no branch de desenvolvimento. Para gerar fixtures, defina CLOSECIRCLE_TEST_DATABASE_HOST como o hostname do DATABASE_URL de desenvolvimento e execute node --import tsx scripts/seed-test-users.ts. As credenciais aleatórias ficam em /tmp/cc-test-users.json e não são comitadas.

Depois da build, npm run test:integration inicia um servidor local temporário e testa login, cadastro, feed, fotos privadas, comentários, reações, convites, calendário, mensagens, amizades, remoção de membro e logout. Não rodar contra banco de produção. Os testes deixam dados identificados como testes no banco de desenvolvimento.

## Primeiro acesso
Abra o link de primeiro acesso fornecido na entrega, escolha Criar uma conta e use o e-mail configurado em BOOTSTRAP_EMAIL. Escolha sua própria senha. Crie um círculo e em Círculos gere um convite de uso único. Quem receber o link pode criar uma conta e confirmar a entrada no grupo na aba Círculos.

O CloseCircle não envia convites por conta própria; o responsável copia o link e o compartilha. Não há usuários ou senhas de demonstração em produção.
