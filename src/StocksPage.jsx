
import { useMemo, useState } from "react";
import {
  Wallet,
  Search,
  TrendingUp,
  ExternalLink,
  ArrowUpRight,
  Info,
} from "lucide-react";
import "./stocks.css";

const stocks = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    exchange: "NSE",
    demoPerformance: "+12.4%",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    exchange: "NSE",
    demoPerformance: "+8.2%",
  },
  {
    symbol: "INFY",
    name: "Infosys",
    exchange: "NSE",
    demoPerformance: "+6.7%",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    exchange: "NSE",
    demoPerformance: "+4.1%",
  },
  {
    symbol: "ITC",
    name: "ITC Limited",
    exchange: "BSE",
    demoPerformance: "+5.3%",
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    exchange: "BSE",
    demoPerformance: "+9.6%",
  },
];

const platforms = [
  {
    name: "Groww",
    description: "Stocks and investment platform",
    url: "https://groww.in/stocks",
  },
  {
    name: "Zerodha",
    description: "Kite trading platform",
    url: "https://kite.zerodha.com/",
  },
  {
    name: "Upstox",
    description: "Online trading platform",
    url: "https://upstox.com/",
  },
];

export default function StocksPage({ transactions = [], monthlyIncome = 0 }) {
  const [budget, setBudget] = useState("");
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);

  const estimatedSavings = useMemo(() => {
    const income = Number(monthlyIncome || 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return Math.max(0, income - expenses);
  }, [transactions, monthlyIncome]);

  const filteredStocks = stocks.filter((stock) =>
    `${stock.name} ${stock.symbol}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const investAmount = Number(budget || 0);

  return (
    <div className="stocks-page">
      <header className="stocks-header">
        <div>
          <span className="eyebrow">PENNYLENS INVEST</span>
          <h1>Stocks</h1>
          <p>Explore stocks and choose your preferred investment platform.</p>
        </div>
      </header>

      <section className="stocks-savings-card">
        <div className="stocks-savings-icon">
          <Wallet size={23} />
        </div>
        <div className="stocks-savings-content">
          <span>Estimated available balance</span>
          <h2>
            ₹{estimatedSavings.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </h2>
          <p>
            This is an estimate from your entered income and recorded expenses,
            not a verified bank balance.
          </p>
        </div>
      </section>

      <section className="stocks-budget-card">
        <h2>How much do you want to invest?</h2>
        <p>Choose an amount that fits your own budget.</p>
        <div className="stocks-budget-row">
          <label htmlFor="stocks-budget">Amount (₹)</label>
          <input
            id="stocks-budget"
            type="number"
            min="0"
            max={estimatedSavings || undefined}
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder="Enter amount"
          />
        </div>
        {investAmount > estimatedSavings && (
          <p className="stocks-warning">
            This amount is higher than your estimated available balance.
          </p>
        )}
      </section>

      <section className="stocks-list-section">
        <div className="stocks-section-heading">
          <div>
            <h2>Explore stocks</h2>
            <p>Choose a stock to view available broker platforms.</p>
          </div>
        </div>

        <label className="stocks-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by company or symbol"
          />
        </label>

        <div className="stocks-grid">
          {filteredStocks.map((stock) => (
            <button
              className={`stocks-card ${
                selectedStock?.symbol === stock.symbol ? "selected" : ""
              }`}
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              type="button"
            >
              <div className="stocks-card-top">
                <span className="stocks-symbol">{stock.symbol}</span>
                <span className="stocks-exchange">{stock.exchange}</span>
              </div>
              <h3>{stock.name}</h3>
              <div className="stocks-performance">
                <TrendingUp size={16} />
                <span>{stock.demoPerformance}</span>
                <small>DEMO ONLY</small>
              </div>
              <span className="stocks-select-link">
                Choose stock <ArrowUpRight size={15} />
              </span>
            </button>
          ))}
        </div>

        <p className="stocks-demo-notice">
          <Info size={16} />
          All performance figures above are illustrative demo values, not
          verified historical or live stock data. Do not use them to make
          investment decisions.
        </p>
      </section>

      {selectedStock && (
        <section className="stocks-platform-section">
          <div>
            <span className="eyebrow">SELECTED STOCK</span>
            <h2>
              {selectedStock.name} ({selectedStock.symbol})
            </h2>
            <p>
              Choose a platform to continue. You may need to search for this
              stock after opening the platform.
            </p>
          </div>

          <div className="stocks-platform-grid">
            {platforms.map((platform) => (
              <a
                className="stocks-platform-card"
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                key={platform.name}
              >
                <span>
                  <strong>{platform.name}</strong>
                  <small>{platform.description}</small>
                </span>
                <ExternalLink size={17} />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
