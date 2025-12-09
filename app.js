// =========================
// Supabase (ANOTAÇÕES)
// =========================
const db = window.supabaseClient;
if (!db) {
  console.error("Supabase não inicializado – verifique o script no index.html.");
}

// Estado de anotações
let notes = [];
let editingNoteId = null;

// --- Operações no Supabase ---

async function loadNotesFromDb() {
  if (!db) return [];

  const { data, error } = await db
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar notas no Supabase:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    tags: row.tags || [],
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function insertNoteToDb(note) {
  if (!db) return null;

  const { data, error } = await db
    .from("notes")
    .insert({
      title: note.title,
      category: note.category,
      tags: note.tags,
      content: note.content,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir nota no Supabase:", error);
    alert("Erro ao salvar nota no banco.");
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    tags: data.tags || [],
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function updateNoteInDb(note) {
  if (!db) return null;

  const { data, error } = await db
    .from("notes")
    .update({
      title: note.title,
      category: note.category,
      tags: note.tags,
      content: note.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", note.id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar nota no Supabase:", error);
    alert("Erro ao atualizar nota no banco.");
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    tags: data.tags || [],
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function deleteNoteFromDb(id) {
  if (!db) return false;

  const { error } = await db.from("notes").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir nota no Supabase:", error);
    alert("Erro ao excluir nota no banco.");
    return false;
  }
  return true;
}

// =========================
// Utilitários gerais
// =========================

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

// =========================
// UI – ANOTAÇÕES
// =========================

function getUniqueNoteCategories() {
  const set = new Set();
  notes.forEach((n) => {
    if (n.category && n.category.trim() !== "") {
      set.add(n.category.trim());
    }
  });
  return Array.from(set).sort();
}

function renderNotesCategoryFilter() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;

  const current = select.value;
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Todas";
  select.appendChild(optAll);

  const cats = getUniqueNoteCategories();
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  const exists = Array.from(select.options).some((o) => o.value === current);
  select.value = exists ? current : "";
}

function renderNotes() {
  const listEl = document.getElementById("notesList");
  if (!listEl) return;

  const searchValue = (document.getElementById("searchInput")?.value || "")
    .toLowerCase()
    .trim();
  const categoryFilter = document.getElementById("categoryFilter")?.value || "";
  const sortValue = document.getElementById("sortSelect")?.value || "newest";

  let filtered = notes.filter((note) => {
    const matchesCategory =
      !categoryFilter || note.category === categoryFilter;
    if (!matchesCategory) return false;

    if (!searchValue) return true;

    const inTitle = note.title.toLowerCase().includes(searchValue);
    const inContent = note.content.toLowerCase().includes(searchValue);
    const inCategory = (note.category || "").toLowerCase().includes(searchValue);
    const inTags = (note.tags || [])
      .join(",")
      .toLowerCase()
      .includes(searchValue);

    return inTitle || inContent || inCategory || inTags;
  });

  if (sortValue === "newest") {
    filtered.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  } else if (sortValue === "oldest") {
    filtered.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  } else if (sortValue === "title") {
    filtered.sort((a, b) =>
      a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
    );
  }

  listEl.innerHTML = "";
  if (filtered.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Nenhuma anotação encontrada.";
    p.style.fontSize = "0.85rem";
    p.style.color = "#9ca3af";
    listEl.appendChild(p);
    return;
  }

  filtered.forEach((note) => {
    const card = document.createElement("article");
    card.className = "note-card";

    const header = document.createElement("div");
    header.className = "note-header";

    const titleEl = document.createElement("div");
    titleEl.className = "note-title";
    titleEl.textContent = note.title;

    const categoryEl = document.createElement("div");
    categoryEl.className = "note-category";
    categoryEl.textContent = note.category || "Sem categoria";

    header.appendChild(titleEl);
    header.appendChild(categoryEl);

    const contentEl = document.createElement("div");
    contentEl.className = "note-content";
    contentEl.textContent = note.content;

    const tagsEl = document.createElement("div");
    tagsEl.className = "note-tags";
    (note.tags || []).forEach((tag) => {
      if (!tag) return;
      const span = document.createElement("span");
      span.className = "note-tag";
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    const metaEl = document.createElement("div");
    metaEl.className = "note-meta";
    const created = formatDate(note.createdAt);
    const updated =
      note.updatedAt && note.updatedAt !== note.createdAt
        ? " • Atualizada: " + formatDate(note.updatedAt)
        : "";
    metaEl.textContent = `Criada: ${created}${updated}`;

    const actionsEl = document.createElement("div");
    actionsEl.className = "note-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => loadNoteIntoForm(note.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-secondary";
    deleteBtn.textContent = "Excluir";
    deleteBtn.addEventListener("click", () => handleDeleteNote(note.id));

    actionsEl.appendChild(editBtn);
    actionsEl.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(contentEl);
    if (note.tags && note.tags.length > 0) card.appendChild(tagsEl);
    card.appendChild(metaEl);
    card.appendChild(actionsEl);

    listEl.appendChild(card);
  });
}

function clearNoteForm() {
  editingNoteId = null;
  document.getElementById("noteId").value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("categoryInput").value = "";
  document.getElementById("tagsInput").value = "";
  document.getElementById("contentInput").value = "";
}

function loadNoteIntoForm(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  editingNoteId = id;
  document.getElementById("noteId").value = note.id;
  document.getElementById("titleInput").value = note.title;
  document.getElementById("categoryInput").value = note.category || "";
  document.getElementById("tagsInput").value = (note.tags || []).join(", ");
  document.getElementById("contentInput").value = note.content;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleDeleteNote(id) {
  const note = notes.find((n) => n.id === id);
  const title = note ? note.title : "";
  const confirmDelete = window.confirm(
    `Tem certeza que deseja excluir a anotação "${title}"?`
  );
  if (!confirmDelete) return;

  const ok = await deleteNoteFromDb(id);
  if (!ok) return;

  notes = notes.filter((n) => n.id !== id);
  renderNotesCategoryFilter();
  renderNotes();
}

async function handleNoteFormSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("titleInput").value.trim();
  const category = document.getElementById("categoryInput").value.trim();
  const tagsRaw = document.getElementById("tagsInput").value.trim();
  const content = document.getElementById("contentInput").value.trim();

  if (!title || !category || !content) {
    alert("Preencha título, categoria e conteúdo.");
    return;
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter((t) => t !== "")
    : [];

  if (editingNoteId) {
    const index = notes.findIndex((n) => n.id === editingNoteId);
    if (index === -1) return;

    const updated = {
      ...notes[index],
      title,
      category,
      tags,
      content,
    };

    const saved = await updateNoteInDb(updated);
    if (!saved) return;

    notes[index] = saved;
  } else {
    const newNote = { title, category, tags, content };
    const saved = await insertNoteToDb(newNote);
    if (!saved) return;

    notes.unshift(saved);
  }

  renderNotesCategoryFilter();
  renderNotes();
  clearNoteForm();
}

// =========================
// GASTOS (localStorage + Chart.js)
// =========================

const EXPENSES_KEY = "luizExpensesV1";
let expenses = [];
let expensesChart = null;

function loadExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    expenses = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro ao ler gastos do localStorage:", e);
    expenses = [];
  }
}

function saveExpenses() {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

function getUniqueExpenseCategories() {
  const set = new Set();
  expenses.forEach((e) => {
    const cat = (e.category || "").trim();
    if (cat) set.add(cat);
  });
  return Array.from(set).sort();
}

function renderExpenseCategoryFilter() {
  const select = document.getElementById("expenseCategoryFilter");
  if (!select) return;

  const current = select.value;
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Todas";
  select.appendChild(optAll);

  const cats = getUniqueExpenseCategories();
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  const exists = Array.from(select.options).some((o) => o.value === current);
  select.value = exists ? current : "";
}

function renderExpenses() {
  const tbody = document.getElementById("expensesTableBody");
  const totalEl = document.getElementById("expensesTotal");
  const categoryFilter =
    document.getElementById("expenseCategoryFilter")?.value || "";

  if (!tbody || !totalEl) return;

  let list = expenses.slice();

  if (categoryFilter) {
    list = list.filter((e) => (e.category || "") === categoryFilter);
  }

  tbody.innerHTML = "";
  let total = 0;

  list.forEach((exp) => {
    total += Number(exp.amount || 0);

    const tr = document.createElement("tr");

    const d = document.createElement("td");
    d.textContent = exp.date ? new Date(exp.date).toLocaleDateString("pt-BR") : "";

    const desc = document.createElement("td");
    desc.textContent = exp.description;

    const cat = document.createElement("td");
    cat.textContent = exp.category || "Sem categoria";

    const val = document.createElement("td");
    val.textContent = Number(exp.amount || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    tr.appendChild(d);
    tr.appendChild(desc);
    tr.appendChild(cat);
    tr.appendChild(val);
    tbody.appendChild(tr);
  });

  totalEl.textContent = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  renderExpensesChart(list);
}

function renderExpensesChart(list) {
  const canvas = document.getElementById("expensesChart");
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext("2d");

  // Soma por categoria
  const totalsByCategory = new Map();
  list.forEach((exp) => {
    const raw = (exp.category || "Sem categoria").trim();
    const cat = raw === "" ? "Sem categoria" : raw;
    const current = totalsByCategory.get(cat) || 0;
    totalsByCategory.set(cat, current + Number(exp.amount || 0));
  });

  const labels = Array.from(totalsByCategory.keys()).sort();
  const values = labels.map((c) => totalsByCategory.get(c));

  if (expensesChart) {
    expensesChart.destroy();
  }

  expensesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Gastos por categoria (R$)",
          data: values,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function handleExpenseFormSubmit(event) {
  event.preventDefault();

  const description = document
    .getElementById("expenseDescription")
    .value.trim();
  const category = document
    .getElementById("expenseCategory")
    .value.trim();
  const amountStr = document.getElementById("expenseAmount").value;
  const dateStr = document.getElementById("expenseDate").value;

  const amount = Number(amountStr.replace(",", "."));

  if (!description || !amount || !dateStr) {
    alert("Preencha descrição, valor e data.");
    return;
  }

  const exp = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    description,
    category,
    amount,
    date: dateStr,
  };

  expenses.push(exp);
  saveExpenses();
  renderExpenseCategoryFilter();
  renderExpenses();

  document.getElementById("expenseForm").reset();
}

// =========================
// Alternar entre ANOTAÇÕES / GASTOS
// =========================

const modeNotes = document.getElementById("modeNotes");
const modeExpenses = document.getElementById("modeExpenses");
const notesView = document.getElementById("notesView");
const expensesView = document.getElementById("expensesView");

function activateMode(mode) {
  if (!modeNotes || !modeExpenses || !notesView || !expensesView) return;

  if (mode === "notes") {
    modeNotes.classList.add("mode-card-active");
    modeExpenses.classList.remove("mode-card-active");
    notesView.classList.add("active-view");
    expensesView.classList.remove("active-view");
  } else {
    modeExpenses.classList.add("mode-card-active");
    modeNotes.classList.remove("mode-card-active");
    expensesView.classList.add("active-view");
    notesView.classList.remove("active-view");
  }
}

// =========================
// Inicialização
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  // --- Anotações ---
  notes = await loadNotesFromDb();
  renderNotesCategoryFilter();
  renderNotes();

  const noteForm = document.getElementById("noteForm");
  noteForm?.addEventListener("submit", handleNoteFormSubmit);

  document
    .getElementById("clearFormBtn")
    ?.addEventListener("click", clearNoteForm);

  document
    .getElementById("searchInput")
    ?.addEventListener("input", renderNotes);

  document
    .getElementById("categoryFilter")
    ?.addEventListener("change", renderNotes);

  document
    .getElementById("sortSelect")
    ?.addEventListener("change", renderNotes);

  // --- Gastos ---
  loadExpenses();
  renderExpenseCategoryFilter();
  renderExpenses();

  document
    .getElementById("expenseForm")
    ?.addEventListener("submit", handleExpenseFormSubmit);

  document
    .getElementById("expenseCategoryFilter")
    ?.addEventListener("change", renderExpenses);

  // --- Switch de visão ---
  modeNotes?.addEventListener("click", () => activateMode("notes"));
  modeExpenses?.addEventListener("click", () => activateMode("expenses"));
});
