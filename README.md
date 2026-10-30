# CloseCircle

Rede social fechada para pequenos círculos: momentos, fotos, conversas e planos entre as suas pessoas.

Next.js 15 / React 19 / TypeScript / Tailwind 4 / Neon PostgreSQL / Drizzle / Better Auth.

## Recursos
Cadastro aberto sem convite, círculos privados com adição direta de amigos pelo @, feed unificado com fotos, comentários e reações, amizades, mensagens diretas e de grupo, calendário, notificações e perfis. Interface responsiva com navegação para celular.

A autorização é verificada no servidor, inclusive na entrega de fotos e leitura de mensagens. Conteúdo privado não é armazenado em cache offline.

## Rodar
npm ci; configure .env.local com os nomes de .env.example; npm run build; npm run dev.

Consulte [configuração](docs/SETUP.md) e [plano/pendências](docs/ROADMAP.md). Migrations devem ser revisadas e testadas no branch de desenvolvimento antes de produção. Nunca comite credenciais.

O cadastro e a criação de círculos não dependem de convites nem do envio de e-mails. O usuário pode gerar uma chave de recuperação em Meu perfil e usá-la para redefinir a senha. Confirmação e recuperação por e-mail continuam opcionais e exigem RESEND_API_KEY e AUTH_EMAIL_FROM.
