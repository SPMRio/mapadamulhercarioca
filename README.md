# Mapa da Mulher Carioca 2026

Site de dados do Mapa da Mulher Carioca 2026.

A interface final recuperada usa Next.js App Router e consulta a base consolidada no Google Sheets pela rota `/api/sheets`.

## Rodar localmente

1. `npm install`
2. Copie `.env.example` para `.env.local`
3. Preencha a credencial Google
4. `npm run dev`

## Estrutura

- `app/page.tsx`: dashboard
- `app/globals.css`: identidade visual e responsividade
- `app/api/sheets/route.ts`: leitura da planilha
- `app/layout.tsx`: layout e metadados

A credencial da conta de serviço deve ficar apenas no ambiente do servidor/Vercel e nunca deve ser commitada.
