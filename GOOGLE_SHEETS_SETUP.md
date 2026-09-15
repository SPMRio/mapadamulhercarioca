# Conexão Google Sheets — Mapa da Mulher Carioca

O projeto lê a planilha no servidor por meio de uma **Google Service Account**. A chave nunca deve ir para o navegador nem para o GitHub.

## 1. Google Cloud

1. Crie ou selecione um projeto exclusivo do Mapa da Mulher Carioca.
2. Em **APIs & Services > Library**, habilite **Google Sheets API**.
3. Em **IAM & Admin > Service Accounts**, crie uma Service Account, por exemplo:
   - Nome: `mapa-mulher-carioca-site`
4. Abra a Service Account > **Keys > Add key > Create new key > JSON**.
5. Guarde o JSON em local seguro. Não faça commit dele.

## 2. Compartilhar a planilha

No JSON, copie o valor de `client_email`, parecido com:

`mapa-mulher-carioca-site@SEU-PROJETO.iam.gserviceaccount.com`

Abra a planilha oficial do Mapa no Google Sheets > **Compartilhar** > adicione esse e-mail como **Leitor**.

Também é possível compartilhar a pasta do Drive com a Service Account. Para esta aplicação, compartilhar diretamente a planilha é mais simples e reduz o escopo de acesso.

## 3. Pegar o Spreadsheet ID

Abra a planilha oficial. A URL terá este formato:

`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

Copie somente o trecho `SPREADSHEET_ID`.

## 4. Variáveis de ambiente

Local (`.env.local`) ou Vercel:

```env
SPREADSHEET_ID=COLE_AQUI_O_ID_DA_PLANILHA
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Como alternativa, o JSON completo pode ser codificado em base64 e salvo em:

```env
GOOGLE_SERVICE_ACCOUNT_JSON_B64=...
```

Nunca exponha essas variáveis com prefixo `NEXT_PUBLIC_`.

## 5. Estrutura esperada da planilha

O endpoint `/api/sheets` lê:

- `_indicadores!A:M`
- `dados!A:P`

A aba `dados` usa os campos explícitos de tipo/escala. O backend mantém `Valor` como valor original e passa `Tipo de dado` + `Escala` para o frontend decidir a exibição.

Linhas com `Publicar = NÃO` não são enviadas para o site.

## 6. Teste

Com as variáveis configuradas:

```bash
npm install
npm run dev
```

Abra:

`http://localhost:3000/api/sheets`

A resposta deve começar com:

```json
{"ok":true,...}
```

Se retornar 403, confira se a planilha foi compartilhada com o `client_email` exato da Service Account.

Se retornar 404, confira o `SPREADSHEET_ID`.
