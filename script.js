const STORAGE_KEY = "personalExpenseTracker.transactions";

const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const filterInput = document.getElementById("filter");
const transactionList = document.getElementById("transaction-list");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");
const clearAllButton = document.getElementById("clear-all");

let transactions = loadTransactions();

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2
});

const categoryIcons = {
  Food: "🍲",
  Travel: "🚌",
  Shopping: "🛍️",
  Education: "📚",
  Bills: "🧾",
  Salary: "💼",
  Allowance: "💰",
  Other: "📌"
};

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.description === "string" &&
      Number.isFinite(Number(item.amount)) &&
      Number(item.amount) > 0 &&
      ["income", "expense"].includes(item.type) &&
      typeof item.category === "string" &&
      typeof item.date === "string"
    );
  } catch (error) {
    console.error("Could not load saved transactions:", error);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error("Could not save transactions:", error);
    showMessage("Could not save data in this browser. Check your browser storage settings.", true);
    return false;
  }
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function calculateTotals() {
  return transactions.reduce((totals, transaction) => {
    const amount = Number(transaction.amount);
    if (transaction.type === "income") {
      totals.income += amount;
    } else {
      totals.expenses += amount;
    }
    return totals;
  }, { income: 0, expenses: 0 });
}

function updateSummary() {
  const totals = calculateTotals();
  document.getElementById("total-income").textContent = formatCurrency(totals.income);
  document.getElementById("total-expenses").textContent = formatCurrency(totals.expenses);

  const balanceElement = document.getElementById("balance");
  const balance = totals.income - totals.expenses;
  balanceElement.textContent = formatCurrency(balance);
  balanceElement.setAttribute("aria-label", `Remaining balance ${formatCurrency(balance)}`);
}

function formatDate(dateString) {
  const parts = dateString.split("-").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
    return dateString;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function createTransactionElement(transaction) {
  const item = document.createElement("li");
  item.className = "transaction-item";

  const icon = document.createElement("span");
  icon.className = "category-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = categoryIcons[transaction.category] || categoryIcons.Other;

  const details = document.createElement("div");
  details.className = "transaction-details";

  const description = document.createElement("p");
  description.className = "transaction-description";
  description.textContent = transaction.description;

  const meta = document.createElement("p");
  meta.className = "transaction-meta";
  meta.textContent = `${transaction.category} · ${formatDate(transaction.date)}`;

  details.append(description, meta);

  const right = document.createElement("div");
  right.className = "transaction-right";

  const amount = document.createElement("p");
  amount.className = `transaction-amount ${transaction.type}`;
  const sign = transaction.type === "income" ? "+" : "−";
  amount.textContent = `${sign}${formatCurrency(Number(transaction.amount))}`;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", `Delete transaction: ${transaction.description}`);
  deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

  right.append(amount, deleteButton);
  item.append(icon, details, right);
  return item;
}

function renderTransactions() {
  const selectedFilter = filterInput.value;
  const filteredTransactions = transactions
    .filter(transaction => selectedFilter === "all" || transaction.type === selectedFilter)
    .sort((a, b) => {
      const dateDifference = b.date.localeCompare(a.date);
      return dateDifference || b.createdAt - a.createdAt;
    });

  transactionList.replaceChildren();
  filteredTransactions.forEach(transaction => {
    transactionList.appendChild(createTransactionElement(transaction));
  });

  emptyState.hidden = filteredTransactions.length > 0;
  if (transactions.length > 0 && filteredTransactions.length === 0) {
    emptyState.querySelector("h3").textContent = "No matching transactions";
    emptyState.querySelector("p").textContent = "Try choosing a different filter.";
  } else {
    emptyState.querySelector("h3").textContent = "No transactions yet";
    emptyState.querySelector("p").textContent = "Add your first transaction to see it here.";
  }

  const count = transactions.length;
  document.getElementById("transaction-count").textContent =
    `${count} transaction${count === 1 ? "" : "s"}`;
  clearAllButton.disabled = count === 0;
  clearAllButton.style.opacity = count === 0 ? "0.45" : "1";
}

function refreshUI() {
  updateSummary();
  renderTransactions();
}

function deleteTransaction(id) {
  transactions = transactions.filter(transaction => transaction.id !== id);
  saveTransactions();
  refreshUI();
  showMessage("Transaction deleted.");
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!description) {
    showMessage("Please enter a description.", true);
    descriptionInput.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showMessage("Please enter an amount greater than zero.", true);
    amountInput.focus();
    return;
  }

  if (!date) {
    showMessage("Please choose a date.", true);
    dateInput.focus();
    return;
  }

  const transaction = {
    id: (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    type,
    category,
    date,
    createdAt: Date.now()
  };

  transactions.push(transaction);
  const saved = saveTransactions();
  refreshUI();
  form.reset();
  dateInput.value = getTodayLocalDate();
  typeInput.value = "expense";
  descriptionInput.focus();

  showMessage(saved ? "Transaction added successfully." : "Transaction added for this session, but could not be saved.");
});

filterInput.addEventListener("change", renderTransactions);

clearAllButton.addEventListener("click", () => {
  if (transactions.length === 0) return;

  const confirmed = window.confirm("Delete all transactions? This cannot be undone.");
  if (!confirmed) return;

  transactions = [];
  saveTransactions();
  refreshUI();
  showMessage("All transactions cleared.");
});

dateInput.value = getTodayLocalDate();
refreshUI();
