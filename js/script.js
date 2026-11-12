// ===== Expense & Budget Visualizer =====
const CATEGORY_COLORS = { Food: "#2ecc71", Transport: "#3498db", Fun: "#e67e22" };
const KEYS = { data: "ebv-transactions", theme: "ebv-theme" };

let transactions = JSON.parse(localStorage.getItem(KEYS.data)) || [];
let chart = null;

const form = document.getElementById("transaction-form");
const nameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const errorEl = document.getElementById("form-error");
const listEl = document.getElementById("transaction-list");
const emptyEl = document.getElementById("empty-message");
const totalEl = document.getElementById("total-balance");
const sortSelect = document.getElementById("sort-select");
const themeBtn = document.getElementById("theme-toggle");
const monthlyList = document.getElementById("monthly-list");
const monthlyEmpty = document.getElementById("monthly-empty");

const formatMoney = (n) => "$" + n.toFixed(2);

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`; // dd-mm-yyyy
}

function save() {
  localStorage.setItem(KEYS.data, JSON.stringify(transactions));
}

// ----- Add transaction -----
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;

  if (!name || isNaN(amount) || amount <= 0 || !category) {
    errorEl.textContent = "Please fill in all fields correctly (amount must be greater than 0).";
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  transactions.push({ id: Date.now(), name, amount, category, date: formatDate(new Date()) });
  save();
  form.reset();
  render();
});

// ----- Delete transaction -----
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  save();
  render();
}

// ----- Sort -----
function getSorted() {
  const list = [...transactions];
  switch (sortSelect.value) {
    case "amount-desc": return list.sort((a, b) => b.amount - a.amount);
    case "amount-asc": return list.sort((a, b) => a.amount - b.amount);
    case "category": return list.sort((a, b) => a.category.localeCompare(b.category));
    default: return list.sort((a, b) => b.id - a.id);
  }
}
sortSelect.addEventListener("change", renderList);

// ----- Render: transaction list -----
function renderList() {
  listEl.innerHTML = "";
  emptyEl.hidden = transactions.length > 0;

  getSorted().forEach((t) => {
    const li = document.createElement("li");

    const info = document.createElement("article");
    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = t.name;
    const amount = document.createElement("span");
    amount.className = "item-amount";
    amount.textContent = formatMoney(t.amount);
    const meta = document.createElement("p");
    meta.className = "item-meta";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t.category;
    const date = document.createElement("time");
    date.className = "item-date";
    date.textContent = t.date;
    meta.append(tag, date);
    info.append(name, amount, meta);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-delete";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTransaction(t.id));

    li.append(info, del);
    listEl.appendChild(li);
  });
}

// ----- Render: total balance -----
function renderTotal() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalEl.textContent = formatMoney(total);
}

// ----- Render: pie chart -----
function renderChart() {
  const categories = Object.keys(CATEGORY_COLORS);
  const data = categories.map((c) =>
    transactions.filter((t) => t.category === c).reduce((s, t) => s + t.amount, 0)
  );
  if (typeof Chart === "undefined") return;

  if (chart) {
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }
  chart = new Chart(document.getElementById("spending-chart"), {
    type: "pie",
    data: {
      labels: categories,
      datasets: [{ data, backgroundColor: categories.map((c) => CATEGORY_COLORS[c]) }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.parsed)}` } },
      },
    },
  });
}

// ----- Render: monthly summary -----
function renderMonthly() {
  monthlyList.innerHTML = "";
  monthlyEmpty.hidden = transactions.length > 0;

  // Group by month key "yyyy-mm" taken from the dd-mm-yyyy date
  const months = {};
  transactions.forEach((t) => {
    const [, mm, yyyy] = t.date.split("-");
    const key = `${yyyy}-${mm}`;
    if (!months[key]) months[key] = { total: 0, Food: 0, Transport: 0, Fun: 0 };
    months[key].total += t.amount;
    months[key][t.category] += t.amount;
  });

  Object.keys(months).sort().reverse().forEach((key) => {
    const [yyyy, mm] = key.split("-");
    const label = new Date(yyyy, mm - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const m = months[key];

    const li = document.createElement("li");
    const head = document.createElement("p");
    head.className = "month-head";
    const title = document.createElement("strong");
    title.textContent = label;
    const total = document.createElement("span");
    total.className = "item-amount";
    total.textContent = formatMoney(m.total);
    head.append(title, total);

    const detail = document.createElement("p");
    detail.className = "month-detail";
    detail.textContent = Object.keys(CATEGORY_COLORS)
      .map((c) => `${c}: ${formatMoney(m[c])}`)
      .join("  •  ");

    li.append(head, detail);
    monthlyList.appendChild(li);
  });
}

function render() {
  renderList();
  renderTotal();
  renderChart();
  renderMonthly();
}

// ----- Dark / Light mode -----
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeBtn.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}
themeBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(KEYS.theme, next);
  applyTheme(next);
});

applyTheme(localStorage.getItem(KEYS.theme) || "light");
render();
