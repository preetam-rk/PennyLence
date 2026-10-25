import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Check,
  ChevronDown, CircleHelp, CreditCard, FileUp, LayoutDashboard, Lightbulb,
  LogOut, Menu, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2,
  Upload, Wallet, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import { auth, db, hasFirebase } from "./lib/firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, runTransaction } from "firebase/firestore";
import {
  buildInsights, calculateSummary, CATEGORIES, categoryTotals,
  detectAnomalies, detectRecurring, normalizeTransaction, compareMonthlySpending
} from "./lib/analytics.js";
import { fingerprint, parseCsvFile } from "./lib/csv.js";

const money = n => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const palette = ["#8b9cf7", "#6bc7ae", "#f5bd69", "#ed8c9a", "#8cc8e8", "#c4a5ed", "#d4d9e2"];

const demo = [
  ["2026-08-01","Monthly Salary",30000,"income","Salary"],
  ["2026-08-02","Swiggy",320,"expense","Food"],["2026-08-04","Uber",180,"expense","Transport"],
  ["2026-08-05","Netflix",199,"expense","Subscriptions"],["2026-08-06","Electricity Bill",1150,"expense","Utilities"],
  ["2026-08-08","Restaurant",450,"expense","Food"],["2026-08-10","Gym Membership",1000,"expense","Health"],
  ["2026-08-12","Amazon",850,"expense","Shopping"],["2026-08-15","Swiggy",280,"expense","Food"],
  ["2026-08-18","Uber",210,"expense","Transport"],["2026-08-20","Grocery Store",1250,"expense","Food"],
  ["2026-08-22","Phone Bill",599,"expense","Utilities"],["2026-08-25","Swiggy",390,"expense","Food"],
  ["2026-09-01","Monthly Salary",30000,"income","Salary"],
  ["2026-09-02","Swiggy",360,"expense","Food"],["2026-09-04","Uber",160,"expense","Transport"],
  ["2026-09-05","Netflix",199,"expense","Subscriptions"],["2026-09-06","Electricity Bill",1250,"expense","Utilities"],
  ["2026-09-08","Restaurant",420,"expense","Food"],["2026-09-10","Gym Membership",1000,"expense","Health"],
  ["2026-09-12","Amazon",1200,"expense","Shopping"],["2026-09-15","Swiggy",310,"expense","Food"],
  ["2026-09-18","Uber",200,"expense","Transport"],["2026-09-20","Grocery Store",1400,"expense","Food"],
  ["2026-09-22","Phone Bill",599,"expense","Utilities"],["2026-09-25","Swiggy",410,"expense","Food"],
  ["2026-10-01","Monthly Salary",30000,"income","Salary"],
  ["2026-10-02","Swiggy",450,"expense","Food"],["2026-10-04","Uber",190,"expense","Transport"],
  ["2026-10-05","Netflix",199,"expense","Subscriptions"],["2026-10-06","Electricity Bill",1300,"expense","Utilities"],
  ["2026-10-08","Restaurant",2500,"expense","Food"],["2026-10-10","Gym Membership",1000,"expense","Health"],
  ["2026-10-12","Amazon",2500,"expense","Shopping"],["2026-10-15","Swiggy",380,"expense","Food"],
  ["2026-10-18","Uber",220,"expense","Transport"],["2026-10-20","Grocery Store",1550,"expense","Food"],
  ["2026-10-22","Phone Bill",599,"expense","Utilities"]
].map((r, i) => ({ id: `demo-${i}`, date:r[0], description:r[1], amount:r[2], type:r[3], category:r[4], account:"Demo account", notes:"", is_demo:true }));

const nav = [
  ["Overview", LayoutDashboard], ["Transactions", CreditCard],
  ["Recurring expenses", RefreshCw], ["Discoveries", Sparkles]
];

function AuthScreen({ onDemo, onSignedIn }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (!hasFirebase) throw new Error("Firebase is not configured yet. Add your Firebase web configuration to the .env file.");
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        onSignedIn(credential.user);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        onSignedIn(credential.user);
      }
    } catch (e) { setError(e.message || "Authentication failed."); }
    finally { setBusy(false); }
  }
  return <div className="auth-wrap">
    <div className="auth-art">
      <div className="brand"><span className="brand-mark"><Wallet size={22}/></span><span>PennyLens</span></div>
      <div className="auth-copy"><span className="eyebrow">YOUR MONEY, IN FOCUS</span><h1>See the story<br/>behind your spending.</h1><p>Bring transactions together. Discover recurring costs. Make clearer financial decisions.</p></div>
      <div className="auth-mini"><div><span>Recurring costs found</span><strong>₹1,798<span>/mo</span></strong></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
      <p className="auth-foot">Private by design · Built for financial clarity</p>
    </div>
    <div className="auth-panel"><div className="auth-form">
      <span className="eyebrow">{mode === "signin" ? "WELCOME BACK" : "GET STARTED"}</span>
      <h2>{mode === "signin" ? "Sign in to PennyLens" : "Create your account"}</h2>
      <p className="muted">Your financial overview, all in one place.</p>
      <form onSubmit={submit}>
        <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={mode==="signin"?"current-password":"new-password"}/></label>
        {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
        <button className="primary full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="auth-switch">{mode==="signin"?"New to PennyLens?":"Already have an account?"} <button className="text-button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setMessage("");}}>{mode==="signin"?"Create account":"Sign in"}</button></p>
      <div className="auth-separator"><span>OR</span></div>
      <button className="secondary full" onClick={onDemo}>Explore with sample data <ArrowUpRight size={16}/></button>
      <p className="tiny muted center">{hasFirebase ? "Your data is saved to your authenticated account." : "Demo mode is available now. Configure Firebase for cloud accounts."}</p>
    </div></div>
  </div>;
}

function StatCard({ title, value, note, icon: Icon, tone="blue", trend }) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}><Icon size={18}/></span></div><div className="stat-value">{value}</div><div className="stat-note">{trend && <span className="trend"><ArrowUpRight size={13}/>{trend}</span>} {note}</div></div>;
}

function TransactionModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { date:today(), description:"", amount:"", type:"expense", category:"", account:"Personal account", notes:"" });
  const [error, setError] = useState("");
  function change(key, value) { setForm(old=>({...old,[key]:value})); }
  function submit(e) {
    e.preventDefault();
    try { onSave(normalizeTransaction({...form, amount:form.amount, category:form.category || undefined})); onClose(); }
    catch (e) { setError(e.message); }
  }
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal">
    <div className="modal-head"><div><span className="eyebrow">TRANSACTION</span><h2>{initial ? "Edit transaction" : "Add transaction"}</h2></div><button className="icon-button" onClick={onClose}><X/></button></div>
    <form onSubmit={submit} className="modal-form">
      <label>Description<input value={form.description} onChange={e=>change("description",e.target.value)} placeholder="e.g. Grocery store" required/></label>
      <div className="form-grid"><label>Amount (₹)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>change("amount",e.target.value)} required/></label><label>Date<input type="date" value={form.date} onChange={e=>change("date",e.target.value)} required/></label></div>
      <label>Transaction type<select value={form.type} onChange={e=>change("type",e.target.value)}><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="transfer">Transfer between own accounts</option></select></label>
      <label>Category<select value={form.category || ""} onChange={e=>change("category",e.target.value)}><option value="">Auto-suggest from description</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Account or wallet<input value={form.account || ""} onChange={e=>change("account",e.target.value)} placeholder="e.g. Bank account"/></label>
      <label>Notes (optional)<input value={form.notes || ""} onChange={e=>change("notes",e.target.value)} placeholder="Add context"/></label>
      {error && <div className="notice error">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">{initial?"Save changes":"Add transaction"}</button></div>
    </form>
  </div></div>;
}

function addFrequency(dateText, frequency) {
  const date = new Date(`${dateText}T12:00:00`);
  if (frequency === "Weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "Yearly") date.setFullYear(date.getFullYear() + 1);
  else {
    const day = date.getDate();
    date.setMonth(date.getMonth() + 1, 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function AppShell({ user, demoMode, onSignOut }) {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState("Overview");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const [period, setPeriod] = useState("all");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [incomeSaved, setIncomeSaved] = useState(false);
  const [bills, setBills] = useState([]);
  const [billForm, setBillForm] = useState({name:"", amount:"", frequency:"Monthly", nextDueDate:today(), category:"Rent/EMI"});
  const [editingBillId, setEditingBillId] = useState(null);
  const [setupLoaded, setSetupLoaded] = useState(false);

  async function load() {
    if (demoMode) { setTransactions(demo); return; }
    if (!hasFirebase || !user) return;
    setBusy(true);
    try {
      const q = query(collection(db, "transactions"), where("user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      rows.sort((a,b) => (b.date || "").localeCompare(a.date || ""));
      setTransactions(rows);
    } catch (error) { setNotice(`Could not load transactions: ${error.message}`); }
    setBusy(false);
  }
  useEffect(()=>{ load(); }, [user?.uid, demoMode]);

  async function loadBillSetup() {
    if (demoMode) { setSetupLoaded(true); return; }
    if (!user || !db) return;
    try {
      const profileRef = doc(db, "users", user.uid, "settings", "profile");
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const profile = profileSnap.data();
        setMonthlyIncome(profile.monthlyIncome == null ? "" : String(profile.monthlyIncome));
        setIncomeSaved(true);
      } else {
        setMonthlyIncome(""); setIncomeSaved(false); setPage("Recurring expenses");
      }
      const billSnap = await getDocs(collection(db, "users", user.uid, "recurringBills"));
      setBills(billSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nextDueDate||"").localeCompare(b.nextDueDate||"")));
    } catch (error) { setNotice(`Could not load recurring bills: ${error.message}`); }
    finally { setSetupLoaded(true); }
  }
  useEffect(()=>{ loadBillSetup(); }, [user?.uid, demoMode]);

  async function saveIncome(e) {
    e?.preventDefault?.();
    const value = Number(monthlyIncome);
    if (!Number.isFinite(value) || value <= 0) { setNotice("Enter a monthly income greater than ₹0."); return; }
    if (demoMode) { setIncomeSaved(true); setNotice("Income saved for this demo session only."); return; }
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), {monthlyIncome:value, updatedAt:serverTimestamp()}, {merge:true});
      setIncomeSaved(true); setNotice("Monthly income saved.");
    } catch (error) { setNotice(`Could not save income: ${error.message}`); }
  }

  async function saveBill(e) {
    e.preventDefault();
    const name = billForm.name.trim(), amount = Number(billForm.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(billForm.nextDueDate)) { setNotice("Enter a bill name, a valid amount, and its next due date."); return; }
    const data = {name, amount, frequency:billForm.frequency, nextDueDate:billForm.nextDueDate, category:billForm.category || "Other", active:true, updatedAt:serverTimestamp()};
    try {
      if (demoMode) {
        setBills(old=>editingBillId?old.map(b=>b.id===editingBillId?{...b,...data,updatedAt:undefined}:b):[...old,{...data,id:crypto.randomUUID()}]);
      } else if (user && db) {
        if (editingBillId) {
          await updateDoc(doc(db,"users",user.uid,"recurringBills",editingBillId),data);
          await setDoc(doc(db,"users",user.uid,"recurringBills",editingBillId,"occurrences",billForm.nextDueDate),{dueDate:billForm.nextDueDate,status:"unpaid",amount,updatedAt:serverTimestamp()},{merge:true});
        } else {
          const billRef=await addDoc(collection(db,"users",user.uid,"recurringBills"),{...data,createdAt:serverTimestamp()});
          await setDoc(doc(db,"users",user.uid,"recurringBills",billRef.id,"occurrences",billForm.nextDueDate),{dueDate:billForm.nextDueDate,status:"unpaid",amount,createdAt:serverTimestamp()});
        }
        await loadBillSetup();
      }
      if (demoMode) setBills(old=>old.map(b=>({...b,updatedAt:undefined})));
      setBillForm({name:"",amount:"",frequency:"Monthly",nextDueDate:today(),category:"Rent/EMI"}); setEditingBillId(null); setNotice("Recurring bill saved.");
    } catch (error) { setNotice(`Could not save bill: ${error.message}`); }
  }

  async function removeBill(id) {
    if (!confirm("Delete this recurring bill? Existing transactions will be kept.")) return;
    try {
      if (demoMode) setBills(old=>old.filter(b=>b.id!==id));
      else await deleteDoc(doc(db,"users",user.uid,"recurringBills",id));
      setBills(old=>old.filter(b=>b.id!==id)); setNotice("Recurring bill deleted. Historical transactions were kept.");
    } catch (error) { setNotice(`Could not delete bill: ${error.message}`); }
  }

  async function markBillPaid(bill) {
    const dueDate = bill.nextDueDate || today();
    const transactionId = `bill_${bill.id}_${dueDate}`;
    const transactionData = {date:today(), description:`${bill.name} (recurring bill)`, amount:Number(bill.amount), type:"expense", category:bill.category||"Other", account:"Personal account", notes:`Recurring bill due ${dueDate}`, user_id:user?.uid, recurringBillId:bill.id, recurringBillDueDate:dueDate, updatedAt:serverTimestamp(), createdAt:serverTimestamp()};
    try {
      if (demoMode) {
        if (transactions.some(t=>t.id===transactionId)) { setNotice("This bill occurrence is already recorded as paid."); return; }
        const nextDueDate=addFrequency(dueDate,bill.frequency);
        setTransactions(old=>[{...transactionData,id:transactionId},...old]);
        setBills(old=>old.map(b=>b.id===bill.id?{...b,nextDueDate}:b));
      } else {
        const billRef=doc(db,"users",user.uid,"recurringBills",bill.id);
        const transactionRef=doc(db,"transactions",transactionId);
        const occurrenceRef=doc(db,"users",user.uid,"recurringBills",bill.id,"occurrences",dueDate);
        await runTransaction(db, async tx=>{
          const billSnap=await tx.get(billRef);
          const existing=await tx.get(transactionRef);
          const occurrenceSnap=await tx.get(occurrenceRef);
          if (existing.exists() || (occurrenceSnap.exists() && occurrenceSnap.data().status==="paid")) throw new Error("This bill occurrence has already been recorded as paid.");
          if (!billSnap.exists()) throw new Error("This recurring bill no longer exists.");
          const current=billSnap.data();
          const currentDue=current.nextDueDate || dueDate;
          if (currentDue!==dueDate) throw new Error("This bill's due date changed. Refresh and try again.");
          const nextDueDate=addFrequency(dueDate,current.frequency);
          const nextOccurrenceRef=doc(db,"users",user.uid,"recurringBills",bill.id,"occurrences",nextDueDate);
          tx.set(transactionRef,{...transactionData, user_id:user.uid, recurringBillDueDate:dueDate});
          tx.set(occurrenceRef,{dueDate,status:"paid",amount:Number(current.amount),paidAt:serverTimestamp(),transactionId},{merge:true});
          tx.set(nextOccurrenceRef,{dueDate:nextDueDate,status:"unpaid",amount:Number(current.amount),createdAt:serverTimestamp()},{merge:true});
          tx.update(billRef,{nextDueDate,updatedAt:serverTimestamp()});
        });
        setTransactions(old=>[{...transactionData,id:transactionId},...old]);
        await loadBillSetup();
      }
      setNotice(`${bill.name} marked paid and one expense transaction was created.`);
    } catch (error) { setNotice(error.message?.includes("already been recorded")?error.message:`Could not record payment: ${error.message}`); }
  }

  async function saveTransaction(raw, existingId) {
    const normalized = normalizeTransaction(raw);

    // Warn before saving an expense that would leave monthly income unable to cover bills.
    if (normalized.type === "expense" && incomeSaved && Number(monthlyIncome) > 0 && !existingId) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
      const expensesThisMonth = transactions
        .filter(t => t.type === "expense" && t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const unpaidBills = bills
        .filter(b => b.active !== false && (b.nextDueDate || "") <= monthEnd)
        .reduce((sum, b) => sum + Number(b.amount || 0), 0);
      const projectedAfterExpense = Number(monthlyIncome) - expensesThisMonth - unpaidBills - normalized.amount;
      if (projectedAfterExpense < 0) {
        const proceed = confirm(`Spending warning: this expense may leave insufficient money for unpaid bills.

Monthly income: ${money(monthlyIncome)}
Expenses so far: ${money(expensesThisMonth)}
Unpaid bills: ${money(unpaidBills)}
New expense: ${money(normalized.amount)}
Projected balance: ${money(projectedAfterExpense)}

Save this expense anyway?`);
        if (!proceed) return;
      }
    }

    if (demoMode) {
      setTransactions(old=>existingId ? old.map(t=>t.id===existingId?{...normalized,id:existingId}:t) : [{...normalized,id:crypto.randomUUID()},...old]);
      setNotice("Transaction saved in demo mode."); return;
    }
    if (!hasFirebase || !user) return;
    const payload = {...normalized, user_id:user.uid, updatedAt:serverTimestamp()};
    try {
      let saved;
      if (existingId) {
        await updateDoc(doc(db, "transactions", existingId), payload);
        saved = {...normalized, id:existingId, user_id:user.uid};
      } else {
        const ref = await addDoc(collection(db, "transactions"), {...payload, createdAt:serverTimestamp()});
        saved = {...normalized, id:ref.id, user_id:user.uid};
      }
      setTransactions(old=>existingId?old.map(t=>t.id===existingId?saved:t):[saved,...old]);
      setNotice("Transaction saved.");
    } catch (error) { setNotice(`Save failed: ${error.message}`); }
  }
  async function deleteTransaction(id) {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    if (!demoMode) {
      try { await deleteDoc(doc(db, "transactions", id)); } catch (error) { setNotice(`Delete failed: ${error.message}`); return; }
    }
    setTransactions(old=>old.filter(t=>t.id!==id)); setNotice("Transaction deleted.");
  }
  async function importFile(file) {
    if (!file) return;
    setBusy(true); setNotice(""); setImportErrors([]);
    try {
      const parsed = await parseCsvFile(file);
      const known = new Set(transactions.map(fingerprint));
      const fresh = [];
      let duplicates = 0;
      parsed.rows.forEach(t=>{ const fp=fingerprint(t); if(known.has(fp)){duplicates++;return;} known.add(fp);fresh.push(t); });
      if (!fresh.length) { setNotice(`No new transactions to import. ${duplicates} possible duplicates skipped.`); setImportErrors(parsed.rowErrors.slice(0,8)); return; }
      if (demoMode) {
        setTransactions(old=>[...fresh.map(t=>({...t,id:crypto.randomUUID()})),...old]);
      } else {
        const payload = fresh.map(t=>({...t,user_id:user.uid,createdAt:serverTimestamp()}));
        const saved = await Promise.all(payload.map(async item => {
          const ref = await addDoc(collection(db, "transactions"), item);
          const { createdAt, ...plain } = item;
          return {...plain, id:ref.id};
        }));
        setTransactions(old=>[...saved,...old]);
      }
      setNotice(`Imported ${fresh.length} transaction(s). ${duplicates} possible duplicate(s) skipped.`);
      setImportErrors(parsed.rowErrors.slice(0,8));
    } catch(e) { setNotice(`Import failed: ${e.message}`); }
    finally { setBusy(false); }
  }

  const summary = useMemo(()=>calculateSummary(transactions),[transactions]);
  const cats = useMemo(()=>categoryTotals(transactions),[transactions]);
  const recurring = useMemo(()=>detectRecurring(transactions),[transactions]);
  const anomalies = useMemo(()=>detectAnomalies(transactions).filter(a=>!dismissed.includes(a.id)),[transactions,dismissed]);
  const insights = useMemo(()=>buildInsights(transactions),[transactions]);
  const chartData = useMemo(()=>{
    const map = new Map();
    transactions.forEach(t=>{ if(t.type!=="expense")return; const month=t.date.slice(0,7); map.set(month,(map.get(month)||0)+Number(t.amount)); });
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6).map(([month,spending])=>({month:new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN",{month:"short"}),spending}));
  },[transactions]);
  const filtered = useMemo(()=>transactions.filter(t=>{
    const q=search.toLowerCase();
    return (t.description||"").toLowerCase().includes(q) && (filter==="all"||t.type===filter);
  }).sort((a,b)=>b.date.localeCompare(a.date)),[transactions,search,filter]);
  const monthKey = today().slice(0,7);
  const monthExpenses = transactions.filter(t=>t.type==="expense" && (t.date||"").slice(0,7)===monthKey).reduce((sum,t)=>sum+Number(t.amount||0),0);
  const monthEnd = `${monthKey}-31`;
  const unpaidBillsThisMonth = bills.filter(b=>b.active!==false && (b.nextDueDate||"") <= monthEnd).reduce((sum,b)=>sum+Number(b.amount||0),0);
  const incomeNumber = Number(monthlyIncome||0);
  const projectedRemaining = incomeNumber-monthExpenses-unpaidBillsThisMonth;
  const sameDayAlerts = useMemo(()=>{
    const groups=new Map();
    transactions.filter(t=>t.type==="expense").forEach(t=>{
      const key=`${t.date}|${t.category||"Uncategorized"}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(t);
    });
    return [...groups.entries()].filter(([,items])=>items.length>=2).map(([key,items])=>({id:key,date:items[0].date,category:items[0].category||"Uncategorized",count:items.length,total:items.reduce((sum,t)=>sum+Number(t.amount||0),0)})).sort((a,b)=>b.date.localeCompare(a.date));
  },[transactions]);
  const userName = demoMode ? "Demo explorer" : (user?.email?.split("@")[0] || "Your account");

  return <div className="app-layout">
    <aside className={`sidebar ${mobileNav?"show":""}`}>
      <div className="brand"><span className="brand-mark"><Wallet size={21}/></span><span>PennyLens</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>{setPage(label);setMobileNav(false);}}><Icon size={18}/><span>{label}</span>{label==="Discoveries"&&anomalies.length>0&&<i className="nav-count">{anomalies.length}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={18}/><div><strong>Your money, your view</strong><span>{demoMode?"Sample data only":"Private account data"}</span></div></div><button className="nav-item" onClick={onSignOut}><LogOut size={18}/><span>{demoMode?"Exit demo":"Sign out"}</span></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(v=>!v)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div><div className="top-actions"><span className={`mode-pill ${demoMode?"demo":"cloud"}`}><i/>{demoMode?"Demo mode":"Cloud synced"}</span><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{userName}</strong><span>{demoMode?"Sample workspace":user?.email}</span></div></div></header>
      <div className="content">
        {notice && <div className="notice info notice-bar"><span>{notice}</span><button className="icon-button small" onClick={()=>setNotice("")}><X size={16}/></button></div>}
        {importErrors.length>0&&<div className="notice warning"><strong>Some rows were not imported</strong><ul>{importErrors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
        {busy&&<div className="loading-line"><span/> Working…</div>}
        {page==="Overview"&&<Overview transactions={transactions} summary={summary} cats={cats} chartData={chartData} recurring={recurring} anomalies={anomalies} insights={insights} onGo={setPage} onAdd={()=>setModal({kind:"add"})} sameDayAlerts={sameDayAlerts} incomeNumber={incomeNumber} monthExpenses={monthExpenses} unpaidBillsThisMonth={unpaidBillsThisMonth} projectedRemaining={projectedRemaining}/>}
        {page==="Transactions"&&<TransactionsPage rows={filtered} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onAdd={()=>setModal({kind:"add"})} onEdit={t=>setModal({kind:"edit",transaction:t})} onDelete={deleteTransaction} onImport={importFile}/>}
        {page==="Recurring expenses"&&<RecurringPage recurring={recurring} bills={bills} monthlyIncome={monthlyIncome} setMonthlyIncome={setMonthlyIncome} incomeSaved={incomeSaved} onSaveIncome={saveIncome} billForm={billForm} setBillForm={setBillForm} editingBillId={editingBillId} setEditingBillId={setEditingBillId} onSaveBill={saveBill} onDeleteBill={removeBill} onMarkPaid={markBillPaid} demoMode={demoMode}/>}
        {page==="Discoveries"&&<DiscoveriesPage anomalies={anomalies} insights={insights} onDismiss={id=>setDismissed(old=>[...old,id])} onTransactions={()=>setPage("Transactions")}/>}
        <footer className="footer"><span>© 2026 PennyLens</span><span><ShieldCheck size={13}/> Insights are estimates, not financial advice.</span></footer>
      </div>
    </main>
    {modal&&<TransactionModal initial={modal.transaction} onClose={()=>setModal(null)} onSave={raw=>saveTransaction(raw,modal.transaction?.id)}/>}
  </div>;
}

function PageHeader({eyebrow,title,description,action}) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({transactions,summary,cats,chartData,recurring,anomalies,insights,onGo,onAdd,sameDayAlerts,incomeNumber,monthExpenses,unpaidBillsThisMonth,projectedRemaining}) {
  const monthlyComparison = compareMonthlySpending(transactions);
  return <><PageHeader eyebrow="YOUR FINANCIAL SNAPSHOT" title="Good money starts with clarity." description="A clear view of what came in, what went out, and what deserves a closer look." action={<button className="primary" onClick={onAdd}><Plus size={17}/> Add transaction</button>}/>
    {(sameDayAlerts.length>0 || (incomeNumber>0 && (projectedRemaining<=0 || (projectedRemaining/incomeNumber)<=0.2))) && <section className="panel spending-risk-panel"><div className="panel-head"><div><h3><AlertTriangle size={17}/> Spending alerts</h3><p>Based on today's category activity and your saved income/bills</p></div></div>
      {sameDayAlerts.slice(0,4).map(a=><div className="notice warning" key={a.id}><AlertTriangle size={17}/><span><strong>Repeated {a.category} spending:</strong> {a.count} transactions on {a.date}, totaling {money(a.total)}. Review whether these purchases were planned.</span></div>)}
      {incomeNumber>0 && (projectedRemaining<=0 || (projectedRemaining/incomeNumber)<=0.2) && <div className={`notice ${projectedRemaining<=0?"error":"warning"}`}><AlertTriangle size={17}/><span><strong>{projectedRemaining<=0?"Bill commitments may exceed available income":"Low remaining budget"}.</strong> Monthly income {money(incomeNumber)}, expenses so far {money(monthExpenses)}, unpaid bills due this month {money(unpaidBillsThisMonth)}. Estimated remaining after commitments: {money(projectedRemaining)}. {projectedRemaining<=0?"Consider postponing nonessential purchases or reducing discretionary spending.":"Consider limiting optional spending until upcoming bills are paid."}</span></div>}
    </section>}
    <div className="stat-grid">
      <StatCard title="Total income" value={money(summary.income)} note="Recorded inflows" icon={ArrowDownRight} tone="green"/>
      <StatCard title="Total expenses" value={money(summary.expenses)} note="Before refunds" icon={ArrowUpRight} tone="rose"/>
      <StatCard title="Net cash flow" value={money(summary.cashFlow)} note="Income − expenses + refunds" icon={Wallet} tone="blue"/>
      <StatCard title="Recurring estimate" value={`${money(recurring.reduce((s,r)=>s+r.monthlyCost,0))}/mo`} note={`${recurring.length} likely pattern(s)`} icon={RefreshCw} tone="amber"/>
    </div>
    <section className="panel monthly-comparison-panel">
      <div className="panel-head"><div><h3>Monthly spending comparison</h3><p>This month vs. last month</p></div></div>
      <div className="monthly-comparison-grid">
        <div className="comparison-metric"><span>This month</span><strong>{money(monthlyComparison.current)}</strong></div>
        <div className="comparison-metric"><span>Last month</span><strong>{money(monthlyComparison.previous)}</strong></div>
        <div className="comparison-metric"><span>Change</span><strong className={monthlyComparison.change > 0 ? "comparison-up" : monthlyComparison.change < 0 ? "comparison-down" : ""}>{monthlyComparison.change > 0 ? "+" : ""}{money(monthlyComparison.change)}</strong>
          {monthlyComparison.hasPreviousData && <small>{Math.abs(monthlyComparison.percentage).toFixed(1)}% {monthlyComparison.direction === "increase" ? "increase" : monthlyComparison.direction === "decrease" ? "decrease" : "no change"}</small>}
        </div>
      </div>
      {!monthlyComparison.hasPreviousData && <p className="comparison-note">Add expense transactions from last month to compare your spending.</p>}
    </section>
    <div className="dashboard-grid">
      <section className="panel spending-panel"><div className="panel-head"><div><h3>Spending overview</h3><p>Expense transactions by month</p></div><span className="chart-legend"><i/> Spending</span></div>
        {chartData.length?<div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:10,right:8,left:0,bottom:0}}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c8cf4" stopOpacity={0.28}/><stop offset="95%" stopColor="#7c8cf4" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf4"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#8490a3",fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8490a3",fontSize:11}} tickFormatter={v=>v>=1000?`${v/1000}k`:v} width={38}/><Tooltip formatter={v=>money(v)} contentStyle={{borderRadius:12,border:"1px solid #e7eaf1",boxShadow:"0 8px 24px #17243b12"}}/><Area type="monotone" dataKey="spending" stroke="#7788ef" strokeWidth={2.5} fill="url(#spendFill)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div>:<EmptyState icon={BarChart3} title="Your spending story starts here" text="Add transactions or import a CSV to see monthly trends."/>}
      </section>
      <section className="panel category-panel"><div className="panel-head"><div><h3>Where money goes</h3><p>Expense category breakdown</p></div><button className="link-button" onClick={()=>onGo("Transactions")}>View all</button></div>
        {cats.length?<><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={cats.slice(0,7)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={3} stroke="none">{cats.slice(0,7).map((c,i)=><Cell key={c.name} fill={palette[i%palette.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(summary.expenses)}</strong><span>Total expenses</span></div></div><div className="category-legend">{cats.slice(0,5).map((c,i)=><div key={c.name}><span><i style={{background:palette[i%palette.length]}}/>{c.name}</span><strong>{money(c.value)}</strong></div>)}</div></>:<EmptyState icon={Activity} title="No categories yet" text="Imported expenses will appear here."/>}
      </section>
    </div>
    <div className="lower-grid"><section className="panel"><div className="panel-head"><div><h3>Financial discoveries</h3><p>Signals from your transaction history</p></div><button className="link-button" onClick={()=>onGo("Discoveries")}>Explore <ArrowUpRight size={14}/></button></div><div className="insight-list">{insights.slice(0,3).map((i,n)=><div className="insight-row" key={i.title}><span className={`insight-icon i${n}`}><Lightbulb size={17}/></span><div><strong>{i.title}</strong><p>{i.detail}</p></div></div>)}</div></section>
      <section className="panel"><div className="panel-head"><div><h3>Needs a closer look</h3><p>Unusually high transactions</p></div><span className={`count-pill ${anomalies.length?"warning-pill":""}`}>{anomalies.length} alerts</span></div>{anomalies.length?<div className="alert-list">{anomalies.slice(0,3).map(a=><div className="alert-row" key={a.id}><span className="alert-icon"><AlertTriangle size={17}/></span><div><strong>{a.transaction.description}</strong><p>{a.transaction.date} · {money(a.transaction.amount)}</p></div></div>)}</div>:<div className="calm-state"><Check size={17}/><span>No current alerts. Add more history to improve detection.</span></div>}<button className="secondary full view-discoveries" onClick={()=>onGo("Discoveries")}>Review discoveries</button></section></div>
    <section className="panel recent-panel"><div className="panel-head"><div><h3>Recent transactions</h3><p>Your latest recorded activity</p></div><button className="link-button" onClick={()=>onGo("Transactions")}>All transactions <ArrowUpRight size={14}/></button></div><TransactionTable rows={[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)} compact/></section>
  </>;
}

function EmptyState({icon:Icon,title,text}) { return <div className="empty-state"><span><Icon size={22}/></span><strong>{title}</strong><p>{text}</p></div>; }

function TransactionsPage({rows,search,setSearch,filter,setFilter,onAdd,onEdit,onDelete,onImport}) {
  const [drag,setDrag] = useState(false);
  return <><PageHeader eyebrow="YOUR ACTIVITY" title="Transactions" description="Bring your financial activity together and keep every entry accurate." action={<button className="primary" onClick={onAdd}><Plus size={17}/> Add transaction</button>}/>
    <label className={`import-strip ${drag?"drag":""}`} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);onImport(e.dataTransfer.files?.[0]);}}><span className="import-icon"><FileUp size={21}/></span><span className="import-copy"><strong>Import a transaction CSV</strong><small>Drop a CSV file here or browse from your device. Preview and validate before relying on results.</small></span><span className="secondary browse-button"><Upload size={15}/> Browse file<input type="file" accept=".csv,text/csv" onChange={e=>{onImport(e.target.files?.[0]);e.target.value="";}}/></span></label>
    <div className="panel table-panel"><div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions…"/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="refund">Refunds</option><option value="transfer">Transfers</option></select><span className="result-count">{rows.length} transactions</span></div><TransactionTable rows={rows} onEdit={onEdit} onDelete={onDelete}/></div>
    <div className="notice info"><CircleHelp size={17}/><span>CSV import accepts date, description and amount columns, or separate debit/credit columns. Review imported data for accuracy.</span></div>
  </>;
}

function TransactionTable({rows,onEdit,onDelete,compact=false}) {
  if (!rows.length) return <EmptyState icon={CreditCard} title="No transactions found" text="Add an entry or import a CSV to get started."/>;
  return <div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Date</th><th>Category</th><th>Account</th><th className="right">Amount</th>{!compact&&<th className="right">Actions</th>}</tr></thead><tbody>{rows.map(t=><tr key={t.id}><td><div className="transaction-name"><span className={`merchant-icon ${t.type}`}><CreditCard size={15}/></span><span><strong>{t.description}</strong><small>{t.type==="income"?"Income":t.type==="transfer"?"Own-account transfer":t.type==="refund"?"Refund":"Expense"}</small></span></div></td><td className="date-cell">{t.date}</td><td><span className="category-chip">{t.category||"Uncategorized"}</span></td><td className="account-cell">{t.account||"—"}</td><td className={`amount-cell right ${t.type==="income"||t.type==="refund"?"positive":""}`}>{t.type==="income"?"+":t.type==="refund"?"+":t.type==="transfer"?"": "−"}{money(t.amount)}</td>{!compact&&<td><div className="row-actions"><button className="icon-button small" title="Edit transaction" onClick={()=>onEdit(t)}><span className="sr-only">Edit</span><Activity size={15}/></button><button className="icon-button small danger-hover" title="Delete transaction" onClick={()=>onDelete(t.id)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table></div>;
}

function RecurringPage({recurring,bills,monthlyIncome,setMonthlyIncome,incomeSaved,onSaveIncome,billForm,setBillForm,editingBillId,setEditingBillId,onSaveBill,onDeleteBill,onMarkPaid,demoMode}) {
  const monthly = recurring.reduce((s,r)=>s+r.monthlyCost,0);
  const unpaid = bills.filter(b=>b.active!==false);
  const setField=(key,value)=>setBillForm(old=>({...old,[key]:value}));
  function editBill(bill) { setEditingBillId(bill.id); setBillForm({name:bill.name,amount:String(bill.amount),frequency:bill.frequency||"Monthly",nextDueDate:bill.nextDueDate||today(),category:bill.category||"Other"}); window.scrollTo({top:0,behavior:"smooth"}); }
  return <><PageHeader eyebrow="YOUR COMMITMENTS" title="Recurring bills" description="Save bills you need to pay, track each due date, and protect money for upcoming commitments."/>
    {!incomeSaved && <section className="panel onboarding-panel"><div className="panel-head"><div><h3>Welcome — set up your budget first</h3><p>Enter your monthly income and add any recurring bills below. These are saved to your account, not inferred automatically.</p></div></div><form className="inline-income-form" onSubmit={onSaveIncome}><label>Monthly income (₹)<input type="number" min="0.01" step="0.01" value={monthlyIncome} onChange={e=>setMonthlyIncome(e.target.value)} placeholder="Enter your monthly income" required/></label><button className="primary">Save income</button></form></section>}
    {incomeSaved && <section className="panel income-settings-panel"><div className="panel-head"><div><h3>Monthly income</h3><p>Update this whenever your income changes.</p></div><strong className="income-value">{money(monthlyIncome)}</strong></div><form className="inline-income-form" onSubmit={onSaveIncome}><label>Update monthly income (₹)<input type="number" min="0.01" step="0.01" value={monthlyIncome} onChange={e=>setMonthlyIncome(e.target.value)} required/></label><button className="secondary">Update income</button></form></section>}
    <section className="panel recurring-panel"><div className="panel-head"><div><h3>{editingBillId?"Edit recurring bill":"Add a recurring bill"}</h3><p>Each bill occurrence starts unpaid. Mark it paid to create one linked expense transaction.</p></div></div>
      <form className="bill-form" onSubmit={onSaveBill}><label>Bill name<input value={billForm.name} onChange={e=>setField("name",e.target.value)} placeholder="e.g. Rent, internet, EMI" required/></label><label>Amount (₹)<input type="number" min="0.01" step="0.01" value={billForm.amount} onChange={e=>setField("amount",e.target.value)} placeholder="600" required/></label><label>Frequency<select value={billForm.frequency} onChange={e=>setField("frequency",e.target.value)}><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></label><label>Next due date<input type="date" value={billForm.nextDueDate} onChange={e=>setField("nextDueDate",e.target.value)} required/></label><label>Expense category<select value={billForm.category} onChange={e=>setField("category",e.target.value)}>{CATEGORIES.filter(c=>!(["Salary","Transfer","Refund"].includes(c))).map(c=><option key={c}>{c}</option>)}</select></label><div className="bill-form-actions"><button className="primary">{editingBillId?"Save changes":"Add bill"}</button>{editingBillId&&<button type="button" className="secondary" onClick={()=>{setEditingBillId(null);setBillForm({name:"",amount:"",frequency:"Monthly",nextDueDate:today(),category:"Rent/EMI"});}}>Cancel edit</button>}</div></form>
      <div className="panel-head bills-list-head"><div><h3>Your saved bills</h3><p>Mark the current occurrence paid; the next due date will advance automatically.</p></div><span className="count-pill">{unpaid.length} active</span></div>
      {unpaid.length ? <div className="managed-bills-list">{unpaid.map(b=><div className="managed-bill" key={b.id}><div className="merchant-logo"><RefreshCw size={18}/></div><div className="recurring-info"><strong>{b.name}</strong><span>{b.frequency} · {money(b.amount)} · {b.category}</span><small>Next due: {b.nextDueDate || "Not set"}</small></div><div className="managed-bill-actions"><button className="primary small-button" onClick={()=>onMarkPaid(b)}>Mark paid</button><button className="secondary small-button" onClick={()=>editBill(b)}>Edit</button><button className="icon-button small danger-hover" title="Delete bill" onClick={()=>onDeleteBill(b.id)}><Trash2 size={15}/></button></div></div>)}</div> : <EmptyState icon={RefreshCw} title="No saved recurring bills" text="Add your rent, utilities, subscriptions, loan payments, or other regular commitments above."/>}
    </section>
    <section className="panel recurring-panel"><div className="panel-head"><div><h3>Detected payment patterns</h3><p>These are inferred from transactions and are separate from bills you manage.</p></div><span className="count-pill">{recurring.length} patterns</span></div>{recurring.length?<div className="recurring-list">{recurring.map(r=><div className="recurring-card" key={r.key}><div className="merchant-logo"><RefreshCw size={19}/></div><div className="recurring-info"><strong>{r.name}</strong><span>{r.frequency} · {r.occurrences} occurrences · {r.confidence} confidence</span><small>Observed dates: {r.dates.slice(-4).join(", ")}</small></div><div className="recurring-cost"><strong>{money(r.monthlyCost)}<small>/mo est.</small></strong><span>{money(r.annualCost)}/yr</span></div></div>)}</div>:<p className="muted">Patterns appear after enough repeated transactions are available.</p>}</section>
    <div className="notice info"><CircleHelp size={17}/><span>Marking a bill paid creates a linked expense exactly once. The payment is recorded for today, and the bill's next due date advances based on its recurrence.</span></div>
  </>;
}

function DiscoveriesPage({anomalies,insights,onDismiss,onTransactions}) {
  return <><PageHeader eyebrow="PATTERNS WORTH NOTICING" title="Discoveries" description="Understand what stands out in your financial history, with the evidence behind every signal."/>
    <div className="discovery-summary"><div><span className="discovery-symbol"><Sparkles size={21}/></span><div><strong>{anomalies.length} transaction(s) to review</strong><p>Rule-based signals for unusually high category spending. These are not fraud determinations.</p></div></div><button className="secondary" onClick={onTransactions}>View transactions <ArrowUpRight size={15}/></button></div>
    <section className="panel discovery-panel"><div className="panel-head"><div><h3>Unusual spending alerts</h3><p>Compared against earlier transactions in the same category</p></div></div>
      {anomalies.length?<div className="discovery-list">{anomalies.map(a=><div className="discovery-item" key={a.id}><span className="alert-icon large"><AlertTriangle size={20}/></span><div className="discovery-body"><div className="discovery-title"><strong>{a.transaction.description}</strong><span className="amount-cell">{money(a.transaction.amount)}</span></div><p>{a.message}</p><small>{a.transaction.date} · {a.transaction.category}</small><div className="discovery-actions"><button className="secondary small-button" onClick={()=>onDismiss(a.id)}><Check size={14}/> Mark expected / dismiss</button></div></div></div>)}</div>:<EmptyState icon={Check} title="No current alerts" text="As transaction history grows, PennyLens can compare new expenses with past category patterns."/>}
    </section>
    <section className="panel"><div className="panel-head"><div><h3>Other insights</h3><p>Summary of patterns in the available data</p></div></div><div className="insight-list">{insights.map((i,n)=><div className="insight-row" key={i.title}><span className={`insight-icon i${n%3}`}><Lightbulb size={17}/></span><div><strong>{i.title}</strong><p>{i.detail}</p></div></div>)}</div></section>
  </>;
}

export default function App() {
  const [sessionUser,setSessionUser] = useState(null);
  const [ready,setReady] = useState(!hasFirebase);
  const [demoMode,setDemoMode] = useState(false);
  useEffect(()=>{
    if(!hasFirebase) return;
    const unsubscribe = onAuthStateChanged(auth, user => { setSessionUser(user || null); setReady(true); });
    return unsubscribe;
  },[]);
  async function signOut() {
    if(demoMode) { setDemoMode(false); return; }
    if(hasFirebase) await firebaseSignOut(auth);
    setSessionUser(null);
  }
  if(!ready) return <div className="splash"><div className="brand-mark"><Wallet/></div><strong>Loading PennyLens…</strong></div>;
  if(!sessionUser && !demoMode) return <AuthScreen onDemo={()=>setDemoMode(true)} onSignedIn={setSessionUser}/>;
  return <AppShell user={sessionUser} demoMode={demoMode} onSignOut={signOut}/>;
}