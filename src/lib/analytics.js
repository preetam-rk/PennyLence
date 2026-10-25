export const CATEGORIES = [
  "Food", "Transport", "Shopping", "Subscriptions", "Utilities",
  "Rent/EMI", "Health", "Education", "Entertainment", "Salary",
  "Transfer", "Refund", "Other", "Uncategorized"
];

const rules = [
  [/swiggy|zomato|restaurant|cafe|coffee|food delivery/i, "Food"],
  [/uber|ola|rapido|metro|bus|fuel|petrol|taxi/i, "Transport"],
  [/netflix|spotify|prime video|hotstar|subscription|youtube premium/i, "Subscriptions"],
  [/amazon|flipkart|myntra|shopping|retail/i, "Shopping"],
  [/electricity|bescom|water bill|broadband|internet bill/i, "Utilities"],
  [/rent|home loan|emi/i, "Rent/EMI"],
  [/pharmacy|hospital|clinic|medical/i, "Health"],
  [/college|tuition|course fee|udemy/i, "Education"],
  [/movie|cinema|gaming|steam/i, "Entertainment"],
  [/salary|payroll/i, "Salary"],
  [/refund|reversal/i, "Refund"],
  [/transfer|imps|neft|own account/i, "Transfer"]
];

export function categorize(description = "") {
  return rules.find(([pattern]) => pattern.test(description))?.[1] ?? "Uncategorized";
}

export function normalizeTransaction(raw) {
  const description = String(raw.description ?? raw.merchant ?? raw.name ?? "").trim();
  const rawAmount = Number(raw.amount);
  if (!description) throw new Error("Description is required.");
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) throw new Error("Amount must be greater than zero.");
  const date = String(raw.date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error("Date must be a valid YYYY-MM-DD date.");
  }
  const type = ["income", "expense", "transfer", "refund"].includes(String(raw.type).toLowerCase())
    ? String(raw.type).toLowerCase() : "expense";
  return {
    date,
    description,
    amount: Math.round(rawAmount * 100) / 100,
    type,
    category: String(raw.category || categorize(description)),
    account: String(raw.account || "Unspecified"),
    notes: String(raw.notes || "")
  };
}

export function calculateSummary(transactions) {
  const valid = transactions.filter(t => t.type !== "transfer");
  const income = valid.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = valid.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const refunds = valid.filter(t => t.type === "refund").reduce((s, t) => s + Number(t.amount), 0);
  const netSpend = Math.max(0, expenses - refunds);
  return { income, expenses, refunds, netSpend, cashFlow: income - expenses + refunds, count: transactions.length };
}

export function categoryTotals(transactions) {
  const totals = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    totals[t.category || "Uncategorized"] = (totals[t.category || "Uncategorized"] || 0) + Number(t.amount);
  });
  return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

function merchantKey(description = "") {
  return description.toLowerCase()
    .replace(/\b(upi|payment|debit|card|transaction|subscription|online|india|pvt|ltd|limited|com)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function detectRecurring(transactions) {
  const groups = new Map();
  transactions.filter(t => t.type === "expense").forEach(t => {
    const key = merchantKey(t.description);
    if (key.length < 3) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  });
  const output = [];
  for (const [key, items] of groups.entries()) {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 3) continue;
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((Date.parse(sorted[i].date) - Date.parse(sorted[i - 1].date)) / 86400000);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const monthly = avgGap >= 25 && avgGap <= 35;
    const weekly = avgGap >= 5 && avgGap <= 9;
    const yearly = avgGap >= 350 && avgGap <= 380;
    if (!monthly && !weekly && !yearly) continue;
    const amounts = sorted.map(t => Number(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const similarAmounts = amounts.every(a => Math.abs(a - avgAmount) / Math.max(avgAmount, 1) <= 0.25);
    if (!similarAmounts) continue;
    const monthlyCost = monthly ? avgAmount : weekly ? avgAmount * 52 / 12 : avgAmount / 12;
    output.push({
      key, name: sorted[sorted.length - 1].description,
      frequency: monthly ? "Monthly" : weekly ? "Weekly" : "Yearly",
      amount: avgAmount, monthlyCost, annualCost: monthlyCost * 12,
      occurrences: sorted.length, confidence: sorted.length >= 4 ? "Higher" : "Possible",
      dates: sorted.map(t => t.date)
    });
  }
  return output.sort((a, b) => b.annualCost - a.annualCost);
}

export function detectAnomalies(transactions) {
  const expenses = transactions.filter(t => t.type === "expense");
  const alerts = [];
  expenses.forEach(t => {
    const history = expenses.filter(x =>
      x.id !== t.id && x.category === t.category &&
      x.date < t.date && Math.abs((Date.parse(t.date) - Date.parse(x.date)) / 86400000) <= 120
    ).map(x => Number(x.amount)).sort((a, b) => a - b);
         
if (history.length < 2) return;

const mid = Math.floor(history.length / 2);
   const median = history.length % 2 === 0
   ? (history[mid - 1] + history[mid]) / 2
   : history[mid];

   const threshold = Math.max(1000, median * 2);

    if (Number(t.amount) > threshold) {
      alerts.push({
        id: t.id, transaction: t,
        median, ratio: median > 0 ? Number(t.amount) / median : null,
        message: `${t.description} was ₹${Number(t.amount).toLocaleString("en-IN")} — higher than 3× your category median (₹${median.toLocaleString("en-IN")}) and above the ₹1,000 review floor.`
      });
    }
  });
  return alerts.sort((a, b) => Number(b.transaction.amount) - Number(a.transaction.amount));
}

export function buildInsights(transactions) {
  const cats = categoryTotals(transactions);
  const recurring = detectRecurring(transactions);
  const alerts = detectAnomalies(transactions);
  const insights = [];
  if (cats[0]) insights.push({
    title: `${cats[0].name} is your largest expense category`,
    detail: `You have spent ₹${cats[0].value.toLocaleString("en-IN")} in this category in the imported dataset.`
  });
  if (recurring.length) {
    const monthly = recurring.reduce((sum, r) => sum + r.monthlyCost, 0);
    insights.push({
      title: `${recurring.length} possible recurring payment pattern${recurring.length === 1 ? "" : "s"}`,
      detail: `Estimated combined cost: ₹${monthly.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month if these payments continue.`
    });
  }
  if (alerts.length) insights.push({
    title: `${alerts.length} transaction${alerts.length === 1 ? "" : "s"} worth reviewing`,
    detail: "These amounts are unusually high compared with earlier transactions in the same category. They are not necessarily fraudulent."
  });
  if (!insights.length) insights.push({
    title: "Add more transaction history",
    detail: "Import a few months of data to improve recurring-payment and unusual-spending discovery."
  });
  return insights;
}

export function compareMonthlySpending(transactions, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentStart = new Date(year, month, 1);
  const previousStart = new Date(year, month - 1, 1);

  const getMonthTotal = (start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return transactions
      .filter((t) => {
        const date = new Date(`${t.date}T00:00:00`);
        return t.type === "expense" && !Number.isNaN(date.getTime()) && date >= start && date < end;
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  };

  const current = getMonthTotal(currentStart);
  const previous = getMonthTotal(previousStart);
  const change = current - previous;
  const percentage = previous > 0 ? (change / previous) * 100 : null;
  return {
    current, previous, change, percentage,
    direction: change > 0 ? "increase" : change < 0 ? "decrease" : "unchanged",
    hasPreviousData: previous > 0
  };
}
