# CloseCircle — plano e estado

Rede social independente da Kumo, organizada em pequenos círculos privados. Next.js / React / TypeScript / Tailwind, Neon PostgreSQL, Drizzle e Better Auth, hospedagem Vercel.

## Entregue nesta etapa
- Banco exclusivo CloseCircle; branches production e development; credenciais por ambiente.
- Cadastro fechado por convite e criação inicial restrita a BOOTSTRAP_EMAIL; login, sessão, logout e rate limiting persistido no banco.
- Perfil com nome, identificador e biografia; amizades por identificador exato e aceite.
- Criação de círculos; convites aleatórios de uso único, expiração de 7 dias e revogação; remoção de integrantes e saída do grupo.
- Feed cronológico, texto, fotos PNG/JPEG/WebP de até 2 MB; comentários e múltiplas reações.
- Exclusão de publicação pelo autor, incluindo suas interações e imagens.
- Conversas privadas entre amigos e conversas do círculo; atualização a cada 8 segundos enquanto abertas.
- Agenda compartilhada por círculo; criação e exclusão pelo criador.
- Notificações internas de eventos e solicitações de amizade; marcação de leitura.
- Interface desktop com lateral/feed/painel direito e navegação inferior no celular; manifesto para abertura como app.
- Autorização no servidor para conteúdo, imagens e mensagens; remoção de integrante corta novas leituras do círculo. Nenhum cache offline de conteúdo privado.
- Fluxos de confirmação de e-mail e recuperação implementados, ativados quando o serviço de envio estiver configurado.

## Dependência externa pendente
Configurar RESEND_API_KEY e AUTH_EMAIL_FROM com remetente verificado. Sem essas credenciais, a confirmação de e-mail não é exigida e a recuperação informa indisponibilidade. Cadastro continua restrito por convite; a primeira conta deve usar o e-mail de bootstrap. Não afirmar que o envio de e-mail está operacional antes de testar entrega real.

## Etapas posteriores do planejamento original
- CloseCircle Work: organizações isoladas, equipes, comunicados e escalas.
- Português e japonês (a interface atual está em português).
- Políticas de retenção e moderação; exportação/exclusão de conta.
- Uploads de vídeo/documentos e armazenamento de objetos para escala. As fotos atuais são armazenadas de forma privada no Postgres, com limite de 2 MB por publicação.
- Notificações push, presença e WebSockets; mensagens atuais usam polling.
- Avatar personalizado e stickers do histórico do app iOS: ainda não portados para web.

Nenhum limite numérico de integrantes foi recuperado do plano; esta versão não inventa um teto para os círculos.
