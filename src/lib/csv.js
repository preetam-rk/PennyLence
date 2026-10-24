import Papa from "papaparse";
import { categorize, normalizeTransaction } from "./analytics.js";

const aliases = {
  date: ["date", "transaction date", "txn date", "posted date"],
  description: ["description", "merchant", "details", "narration", "transaction details", "name"],
  amount: ["amount", "transaction amount", "debit amount", "withdrawal", "value"],
  type: ["type", "transaction type", "dr/cr", "direction"],
  category: ["category"],
  account: ["account", "account name", "wallet"]
};

function findColumn(headers, field) {
  const normalized = headers.map(h => String(h).trim().toLowerCase());
  return normalized.findIndex(h => aliases[field]?.includes(h));
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: "greedy", transformHeader: h => h.trim(),
      complete: ({ data, errors, meta }) => {
        if (!meta.fields?.length) return reject(new Error("The CSV appears to be empty or has no header row."));
        if (errors.length && !data.length) return reject(new Error("Could not parse this CSV file."));
        const headers = meta.fields;
        const dateCol = findColumn(headers, "date");
        const descCol = findColumn(headers, "description");
        const amountCol = findColumn(headers, "amount");
        const debitCol = headers.findIndex(h => /debit|withdrawal/i.test(h));
        const creditCol = headers.findIndex(h => /credit|deposit/i.test(h));
        if (dateCol < 0 || descCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) {
          return reject(new Error("Required columns not found. Include date, description and amount, or debit/credit columns."));
        }
        const rows = [];
        const rowErrors = [];
        data.forEach((row, i) => {
          try {
            let amount, type;
            if (amountCol >= 0) {
              const raw = String(row[headers[amountCol]] ?? "").replace(/[₹,\s]/g, "");
              amount = Math.abs(Number(raw));
              const typeCol = findColumn(headers, "type");
              const rawType = typeCol >= 0 ? String(row[headers[typeCol]]).toLowerCase() : "";
              type = /income|credit|deposit|salary|cr\b/.test(rawType) ? "income" : "expense";
              if (/transfer/i.test(rawType)) type = "transfer";
              if (/refund|reversal/i.test(rawType)) type = "refund";
              if (raw.startsWith("-")) type = "expense";
            } else {
              const debit = debitCol >= 0 ? Number(String(row[headers[debitCol]] || "0").replace(/[₹,\s]/g, "")) : 0;
              const credit = creditCol >= 0 ? Number(String(row[headers[creditCol]] || "0").replace(/[₹,\s]/g, "")) : 0;
              if (credit > 0) { amount = credit; type = "income"; }
              else { amount = Math.abs(debit); type = "expense"; }
            }
            const description = row[headers[descCol]];
            const category = row[headers[findColumn(headers, "category")]] || categorize(description);
            const accountIndex = findColumn(headers, "account");
            rows.push(normalizeTransaction({
              date: row[headers[dateCol]], description, amount, type, category,
              account: accountIndex >= 0 ? row[headers[accountIndex]] : "Imported CSV"
            }));
          } catch (e) {
            rowErrors.push(`Row ${i + 2}: ${e.message}`);
          }
        });
        resolve({ rows, rowErrors, headers, totalRows: data.length });
      },
      error: err => reject(err)
    });
  });
}

export function fingerprint(t) {
  return [t.date, String(t.description).toLowerCase().replace(/\s+/g, " ").trim(),
    Number(t.amount).toFixed(2), t.type, t.account || ""].join("|");
}