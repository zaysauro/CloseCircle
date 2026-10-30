# Configuração e validação

Projeto Vercel: bruno-02a0/closecircle. Domínio principal: https://closecircle-one.vercel.app.
Projeto Neon exclusivo: fancy-moon-19997073, PostgreSQL 17, aws-us-east-2.
Branches: production (br-wandering-hall-b4kg2cct) e development (br-wild-leaf-b4wypakv).

## Variáveis
- DATABASE_URL: URL pooled. Production aponta para production; Preview/Development para development.
- DATABASE_URL_UNPOOLED: conexão direta para migrations. Nunca usar banco de produção em testes.
- BETTER_AUTH_SECRET: aleatório e distinto por ambiente, nunca no Git.
- BETTER_AUTH_URL: domínio principal em Production; localhost em Development. Preview infere a URL da requisição.
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
Depois da build, defina CLOSECIRCLE_TEST_DATABASE_HOST com o hostname pooled do branch de desenvolvimento e execute npm run test:integration. O teste recusa executar se o hostname esperado não corresponder ao DATABASE_URL. As contas são criadas pelo cadastro público, sem depender de fixtures ou de convites. Credenciais e chaves de recuperação não são comitadas nem incluídas no relatório.

Os testes cobrem cadastro, login, feed geral, filtros, paginação com timestamps iguais, fotos privadas, comentários, reações, convites opcionais, calendário, mensagens, amizades, adição direta de amigos, remoção de membros, recuperação de senha com rotação da chave, invalidação de sessões e limites de tentativas. Dados identificados como testes permanecem somente no banco de desenvolvimento.

## Primeiro acesso
Abra /entrar?cadastro=1, informe nome e e-mail, escolha e confirme sua senha. Não é necessário receber convite, usar um e-mail específico ou confirmar um código de bootstrap. As antigas variáveis BOOTSTRAP_EMAIL e BOOTSTRAP_TOKEN_HASH não são mais usadas.

Crie seu primeiro círculo. Na aba Amigos, copie seu @ e troque identificadores com as outras pessoas. Após o aceite da amizade, o responsável adiciona o amigo diretamente ao círculo pelo @. Convites opcionais também continuam funcionando.

O feed geral abre por padrão com Todos os círculos selecionado. O formulário deixa explícito qual grupo receberá o post. Somente integrantes desse grupo podem ler o conteúdo.

Em Meu perfil, gere e guarde a chave de recuperação fora do CloseCircle. O código é exibido somente ao gerar; para substituir, é preciso confirmar a senha atual. Em /recuperar-conta, o usuário informa e-mail, chave e nova senha; o sistema invalida as sessões antigas e devolve uma chave nova. Se uma execução for interrompida durante a recuperação, a trava permite nova tentativa após 10 minutos. A chave nunca aparece em links nem em logs.

Não há contas de demonstração ou credenciais de teste publicadas em produção.
