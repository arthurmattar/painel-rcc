# Painel RCC 2026

## Variáveis de Ambiente necessárias no Vercel

| Variável | Descrição |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo das credenciais da Service Account do Google |
| `SHEET_ID` | ID da planilha Google Sheets (parte da URL entre `/d/` e `/edit`) |
| `SHEET_RANGE` | Intervalo de leitura (padrão: `A:Q`) |

## Como configurar o Google Service Account

1. Acesse https://console.cloud.google.com
2. Crie um projeto (ou use um existente)
3. Ative a **Google Sheets API**
4. Vá em **IAM & Admin > Service Accounts**
5. Crie uma Service Account → Gere uma chave JSON
6. Copie o conteúdo do JSON gerado como valor da variável `GOOGLE_SERVICE_ACCOUNT_JSON`
7. **Compartilhe** sua planilha com o e-mail da Service Account (permissão de Leitor)

## Estrutura esperada da planilha

A planilha deve ter uma linha de cabeçalho contendo:
- `Nome do estabelecimento WMS`
- `Data solicitada`
- `COLOCA`
- `TROCA`
- `RETIRA`
