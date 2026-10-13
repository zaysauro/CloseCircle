# CloseCircle Web

Rede social privada baseada em círculos, amizades, mensagens e eventos colaborativos.

## Stack
Next.js 15, React 19, TypeScript, Tailwind CSS 4, Neon PostgreSQL, Drizzle ORM.

## Início rápido
1. `npm install`
2. Copie `.env.example` para `.env.local` e configure as variáveis localmente (não faça commit).
3. `npm run dev`
4. `npm run build` para verificar a compilação.

## Banco
`npx drizzle-kit generate` cria migrations. **Não execute migrações em produção sem revisão.**

## Estado atual
Landing responsiva e esquema inicial de dados. Login e operações sociais ainda não estão habilitados: nenhuma tela demonstra dados falsos ou permite acesso sem autorização. Configure Neon e autenticação antes de implementar o feed privado.

## Segurança
Toda consulta privada deverá verificar sessão e participação no círculo no servidor. Não basta esconder conteúdo na interface. Nunca colocar `DATABASE_URL` ou segredos no Git.
