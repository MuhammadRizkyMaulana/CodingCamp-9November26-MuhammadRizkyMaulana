/* Expense & Budget Visualizer
   Vanilla JS + Chart.js, data disimpan di Local Storage. */

// ---------- Konstanta ----------
const STORAGE_KEYS = {
  transactions: "ebv_transactions",
  categories: "ebv_categories",
  theme: "ebv_theme",
  sort: "ebv_sort",
};
const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];
const CHART_COLORS = [
  "#2ecc71", "#3498db", "#e67e22", "#9b59b6", "#e74c3c",
  "#1abc9c", "#f1c40f", "#34495e", "#fd79a8", "#95a5a6",
];
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// ---------- Local Storage helper ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Failed to save data:", err);
  }
}

// ---------- State ----------
let transactions = load(STORAGE_KEYS.transactions, []);
let categories = load(STORAGE_KEYS.categories, DEFAULT_CATEGORIES);
let sortBy = load(STORAGE_KEYS.sort, "newest");
let theme = load(STORAGE_KEYS.theme, "light");
let chart = null;

// ---------- Elemen DOM ----------
const $ = (id) => document.getElementById(id);
const form = $("transaction-form");
const nameInput = $("item-name");
const amountInput = $("item-amount");
const categorySelect = $("item-category");
const formError = $("form-error");
const categoryForm = $("category-form");
const newCategoryInput = $("new-category");
const categoryError = $("category-error");
const sortSelect = $("sort-by");
const listEl = $("transaction-list");
const listEmpty = $("list-empty");
const totalEl = $("total-balance");
const chartCanvas = $("spending-chart");
const chartEmpty = $("chart-empty");
const themeToggle = $("theme-toggle");

// ---------- Render ----------
function renderCategories() {
  const current = categorySelect.value;
  categorySelect.innerHTML = "";
  categories.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });
  if (categories.includes(current)) categorySelect.value = current;
}

function getSortedTransactions() {
  const list = [...transactions];
  switch (sortBy) {
    case "amount-desc": return list.sort((a, b) => b.amount - a.amount);
    case "amount-asc": return list.sort((a, b) => a.amount - b.amount);
    case "category": return list.sort((a, b) => a.category.localeCompare(b.category));
    default: return list.sort((a, b) => b.id - a.id); // newest first
  }
}

function renderList() {
  listEl.innerHTML = "";
  listEmpty.hidden = transactions.length > 0;

  getSortedTransactions().forEach((t) => {
    const li = document.createElement("li");
    li.className = "item";

    const info = document.createElement("div");
    const name = document.createElement("p");
    name.className = "item-name";
    name.textContent = t.name;
    const amount = document.createElement("p");
    amount.className = "item-amount";
    amount.textContent = currency.format(t.amount);
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = t.category;
    info.append(name, amount, chip);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-delete";
    del.dataset.id = t.id;
    del.textContent = "Delete";
    del.setAttribute("aria-label", "Delete transaction " + t.name);

    li.append(info, del);
    listEl.appendChild(li);
  });
}

function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalEl.textContent = currency.format(total);
}

function renderChart() {
  const totals = {};
  transactions.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  const labels = Object.keys(totals);
  const data = labels.map((l) => totals[l]);
  const colors = labels.map((l) => CHART_COLORS[categories.indexOf(l) % CHART_COLORS.length]);

  const hasData = labels.length > 0;
  chartCanvas.parentElement.hidden = !hasData;
  chartEmpty.hidden = hasData;

  if (!hasData) {
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.options.plugins.legend.labels.color = textColor;
    chart.update();
    return;
  }

  chart = new Chart(chartCanvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "transparent" }],
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: textColor } },
        tooltip: {
          callbacks: { label: (ctx) => " " + ctx.label + ": " + currency.format(ctx.parsed) },
        },
      },
    },
  });
}

function render() {
  renderList();
  renderBalance();
  renderChart();
}

// ---------- Add transaction ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  if (!name || amountInput.value === "" || !category) {
    formError.textContent = "All fields are required.";
    formError.hidden = false;
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    formError.textContent = "Amount must be greater than 0.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  transactions.push({ id: Date.now(), name, amount, category });
  save(STORAGE_KEYS.transactions, transactions);
  form.reset();
  nameInput.focus();
  render();
});

// ---------- Delete transaction ----------
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete");
  if (!btn) return;
  transactions = transactions.filter((t) => String(t.id) !== btn.dataset.id);
  save(STORAGE_KEYS.transactions, transactions);
  render();
});

// ---------- Inisialisasi ----------
sortSelect.value = sortBy;
renderCategories();
applyTheme();
render();
