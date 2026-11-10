# Mapa da Mulher Carioca Digital

Aplicação Next.js App Router, publicada na Vercel, com dados públicos do BigQuery.

## Arquitetura de publicação

- `app/page.tsx` é um **Server Component** com `revalidate = 86400` (ISR).
- `lib/bigquery-static.ts` consulta o BigQuery **somente no servidor**, usando a variável `BIGQUERY_SERVICE_ACCOUNT_JSON`, e armazena o resultado com tags de cache.
- `app/RadarClient.tsx` recebe os dados já prontos e faz apenas a interação local (trocar eixo, selecionar indicador, mostrar gráfico); **não chama APIs ou BigQuery ao abrir a página**.
- O HTML da página é pré-gerado e armazenado pelo Next.js/Vercel. Na falta de webhook, o ISR poderá revalidar após 24 horas de cache.
- `app/api/revalidate/route.ts` permite invalidar o cache sob demanda **após uma carga validada no BigQuery**, sem novo deploy.

## Configuração segura na Vercel

- `BIGQUERY_SERVICE_ACCOUNT_JSON`: JSON completo de conta de serviço do projeto `rj-spm-rio`, restrito a leitura dos dados e execução de queries.
- `REVALIDATE_SECRET`: string aleatória, com **mínimo de 32 caracteres**, cadastrada apenas como variável de ambiente de servidor.

Não use variáveis `NEXT_PUBLIC_` para credenciais e nunca publique chaves, tokens ou o arquivo JSON no GitHub.

## Revalidação após publicar dados

O futuro serviço de ingestão deve chamar a rota **somente depois do sucesso da carga/validação**:

```http
POST /api/revalidate
Authorization: Bearer <REVALIDATE_SECRET>
Content-Type: application/json

{"eixo":"01"}
```

Resposta esperada: `{"ok":true,...}`. A próxima visita à página regenerará a versão cacheada. Para invalidar catálogo e todos os eixos implementados, use `{"eixo":"todos"}`.

Se `REVALIDATE_SECRET` ainda não estiver configurado, a rota retorna 503 e o sistema continua utilizando revalidação periódica de 24 h.

## Dados e tabelas

- `projeto_mapa_mulher.indicadores`: catálogo central (há fallback temporário para `indicador` durante a renomeação).
- `projeto_mapa_mulher.eixo_01_visao_geral`: valores do eixo 01.
- Identificadores no código: `1.2.1`, `1.2.2`, `2.1.11` (normalização dos IDs antigos com traço enquanto durar a transição).

As tabelas dos demais eixos e a ingestão automatizada ainda serão adicionadas gradualmente.

## Desenvolvimento

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as credenciais somente no seu ambiente.
3. `npm run dev`
4. `npm run build` para verificar prerenderização e ISR; no ambiente de build será necessário acesso ao BigQuery.

## Arquivos principais

- `app/page.tsx`: página estática com ISR.
- `app/RadarClient.tsx`: filtros e visualização interativos.
- `lib/bigquery-static.ts`: consultas cacheadas.
- `app/api/revalidate/route.ts`: webhook de atualização sob demanda.
- `app/globals.css`: estilos.
