import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SHEET_ID;
    const range = process.env.SHEET_RANGE || "A:Q"; // colunas A a Q

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    // Encontra a linha de cabeçalho (que contém "Nome do estabelecimento WMS")
    let headerRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some((cell) => String(cell).includes("Nome do estabelecimento"))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return res.status(200).json({ rows: [] });
    }

    // Mapeando índices das colunas pelo cabeçalho
    const headers = rows[headerRowIndex];
    const colGerador = headers.findIndex((h) =>
      String(h).toLowerCase().includes("nome do estabelecimento")
    );
    const colData = headers.findIndex((h) =>
      String(h).toLowerCase().includes("data solicitada")
    );
    const colColoca = headers.findIndex((h) =>
      String(h).toUpperCase() === "COLOCA"
    );
    const colTroca = headers.findIndex((h) =>
      String(h).toUpperCase() === "TROCA"
    );
    const colRetira = headers.findIndex((h) =>
      String(h).toUpperCase() === "RETIRA"
    );

    // Linhas de dados (depois do cabeçalho)
    const dataRows = rows.slice(headerRowIndex + 1);

    const result = dataRows
      .filter((row) => row[colGerador] && row[colData])
      .map((row) => {
        const rawDate = row[colData] || "";
        // Normaliza data para DD/MM/YYYY
        let date = rawDate;
        if (rawDate.includes("/")) {
          const parts = rawDate.split("/");
          if (parts[2] && parts[2].length === 4) {
            // já está DD/MM/YYYY
            date = rawDate;
          } else if (parts[0] && parts[0].length <= 2) {
            // MM/DD/YYYY → DD/MM/YYYY
            date = `${parts[1].padStart(2, "0")}/${parts[0].padStart(2, "0")}/${parts[2]}`;
          }
        }

        return [
          row[colGerador] || "",
          date,
          parseInt(row[colTroca]) || 0,
          parseInt(row[colRetira]) || 0,
          parseInt(row[colColoca]) || 0,
        ];
      })
      .filter(([g, d]) => g && d);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.status(200).json({ rows: result });
  } catch (err) {
    console.error("Sheets API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
