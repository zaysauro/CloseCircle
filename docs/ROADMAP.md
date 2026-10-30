# CloseCircle — plano e estado

Rede social independente da Kumo, organizada em pequenos círculos privados. Next.js / React / TypeScript / Tailwind, Neon PostgreSQL, Drizzle e Better Auth, hospedagem Vercel.

## Entregue
- Cadastro aberto por e-mail e senha, sem convite nem link inicial secreto; login, sessão, logout, confirmação de senha no formulário e rate limiting persistido no banco.
- Feed geral cronológico com as publicações de todos os círculos do usuário, filtro por círculo e identificação da origem de cada post. Paginação por data + id, inclusive em posts com a mesma data.
- Cada publicação tem um círculo de destino explícito. O feed geral não torna posts visíveis a pessoas de fora dos círculos.
- Criação de círculos por qualquer usuário autenticado. O responsável pode adicionar amigos com amizade aceita pelo @, sem gerar convites. Quem entrar passa a ver o histórico do grupo.
- Convites com validade de 7 dias, uso único e revogação continuam como recurso opcional. Remoção de membros corta novas leituras de posts, fotos e chat, inclusive pelo feed geral.
- Perfil com nome, identificador e biografia; amizades por identificador exato e aceite.
- Fotos PNG/JPEG/WebP de até 2 MB; comentários, múltiplas reações e exclusão pelo autor.
- Conversas privadas entre amigos e conversas do círculo, atualizadas a cada 8 segundos enquanto abertas.
- Agenda por círculo e notificações internas para eventos, amizades e adição direta a grupos.
- Recuperação da senha por chave, independente de e-mail. O usuário confirma a senha atual para gerar a chave; guarda-a fora do site. No banco fica apenas o hash. Ao recuperar a conta, a chave é substituída e as sessões anteriores são encerradas. Tentativas têm limite persistido no banco.
- Interface responsiva, navegação inferior no celular e manifesto de app. Sem cache offline de conteúdo privado.
- Neon exclusivo com produção/desenvolvimento separados; migrations revisadas, histórico com checksum e índices do feed.

## Dependência externa pendente
Confirmação e recuperação POR E-MAIL exigem RESEND_API_KEY e AUTH_EMAIL_FROM com remetente verificado. Sem o serviço, o cadastro funciona normalmente e a recuperação usa a chave previamente salva. Sem acesso à senha, à chave ou a um canal de e-mail configurado, não há recuperação automática. Não afirmar que endereços foram verificados ou que e-mails estão sendo entregues antes de testar a entrega real.

## Etapas posteriores
- CloseCircle Work: organizações, equipes, comunicados e escalas.
- Japonês; interface atual em português.
- Políticas de retenção e moderação; exportação/exclusão de conta.
- Vídeos/documentos e armazenamento de objetos para escala. Fotos atuais em Postgres com limite de 2 MB por publicação.
- Push, presença, WebSockets, avatar personalizado e stickers.

Nenhum limite numérico de integrantes foi recuperado do plano; esta versão não inventa um teto para os círculos.
