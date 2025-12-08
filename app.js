// =========================
// Supabase Client
// =========================

// usamos "db" para não conflitar com window.supabase
const db = window.supabaseClient;

if (!db) {
  console.error(
    "Supabase client não inicializado! Verifique o script no index.html."
  );
}

// =========================
// ESTADO GLOBAL
// =========================

let notes = [];
let editingId = null;

let expenses = [];
let expensesChart = null;

// =========================
// HELPERS GERAIS
// =========================

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

function formatMoney(value) {
  return (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// =====================================================
// =====================  NOTAS  =======================
// =====================================================

// -------- Supabase: notas --------

async function loadNotesFromDb() {
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
  const { error } = await db.from("notes").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir nota no Supabase:", error);
    alert("Erro ao excluir nota no banco.");
    return false;
  }

  return true;
}

// -------- UI: notas --------

function getUniqueCategories() {
  const set = new Set();
  notes.forEach((n) => {
    if (n.category && n.category.trim() !== "") {
      set.add(n.category.trim());
    }
  });
  return Array.from(set).sort();
}

function renderCategoryFilter() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  const currentValue = categoryFilter.value;

  categoryFilter.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Todas";
  categoryFilter.appendChild(optAll);

  const categories = getUniqueCategories();
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  const exists = Array.from(categoryFilter.options).some(
    (o) => o.value === currentValue
  );
  categoryFilter.value = exists ? currentValue : "";
}

function renderNotes() {
  const listEl = document.getElementById("notesList");
  if (!listEl) return;

  const searchInput = document.getElementById("searchInput");
  const searchValue = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const categoryFilterEl = document.getElementById("categoryFilter");
  const categoryFilter = categoryFilterEl ? categoryFilterEl.value : "";

  const sortSelectEl = document.getElementById("sortSelect");
  const sortValue = sortSelectEl ? sortSelectEl.value : "newest";

  let filtered = notes.filter((note) => {
    const matchesCategory =
      !categoryFilter || note.category === categoryFilter;

    if (!matchesCategory) return false;

    if (!searchValue) return true;

    const inTitle = note.title.toLowerCase().includes(searchValue);
    const inContent = note.content.toLowerCase().includes(searchValue);
    const inCategory = (note.category || "")
      .toLowerCase()
      .includes(searchValue);
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
    const empty = document.createElement("p");
    empty.textContent = "Nenhuma anotação encontrada.";
    empty.style.fontSize = "0.85rem";
    empty.style.color = "#9ca3af";
    listEl.appendChild(empty);
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
    if (note.tags && note.tags.length > 0) {
      card.appendChild(tagsEl);
    }
    card.appendChild(metaEl);
    card.appendChild(actionsEl);

    listEl.appendChild(card);
  });
}

function clearForm() {
  editingId = null;
  document.getElementById("noteId").value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("categoryInput").value = "";
  document.getElementById("tagsInput").value = "";
  document.getElementById("contentInput").value = "";
}

function loadNoteIntoForm(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  editingId = id;
  document.getElementById("noteId").value = note.id;
  document.getElementById("titleInput").value = note.title;
  document.getElementById("categoryInput").value = note.category || "";
  document.getElementById("tagsInput").value = (note.tags || []).join(", ");
  document.getElementById("contentInput").value = note.content;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------- Ações: notas --------

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
  renderCategoryFilter();
  renderNotes();
}

async function handleFormSubmit(event) {
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
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "")
    : [];

  if (editingId) {
    const index = notes.findIndex((n) => n.id === editingId);
    if (index === -1) return;

    const updatedNote = {
      ...notes[index],
      title,
      category,
      tags,
      content,
    };

    const saved = await updateNoteInDb(updatedNote);
    if (!saved) return;

    notes[index] = saved;
  } else {
    const newNote = {
      title,
      category,
      tags,
      content,
    };

    const saved = await insertNoteToDb(newNote);
    if (!saved) return;

    notes.unshift(saved);
  }

  renderCategoryFilter();
  renderNotes();
  clearForm();
}

// =====================================================
// =====================  GASTOS  ======================
// =====================================================

// -------- Supabase: gastos --------

async function loadExpensesFromDb() {
  const { data, error } = await db
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Erro ao buscar gastos:", error);
    return [];
  }

  return data;
}

async function insertExpenseToDb(expense) {
  const { data, error } = await db
    .from("expenses")
    .insert(expense)
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir gasto no Supabase:", error);
    alert("Erro ao salvar gasto no banco.");
    return null;
  }

  return data;
}

// -------- Helpers de filtro de gastos --------

function getUniqueExpenseCategories() {
  const set = new Set();
  expenses.forEach((e) => {
    if (e.category && e.category.trim() !== "") {
      set.add(e.category.trim());
    }
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

  const categories = getUniqueExpenseCategories();
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  const exists = Array.from(select.options).some(
    (o) => o.value === current
  );
  select.value = exists ? current : "";
}

function getCurrentExpenseFilter() {
  const select = document.getElementById("expenseCategoryFilter");
  return select ? select.value : "";
}

// -------- UI: tabela + gráfico --------

function renderExpensesTable(list) {
  const tbody = document.getElementById("expensesTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let total = 0;

  list.forEach((exp) => {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.textContent = new Date(exp.date).toLocaleDateString("pt-BR");

    const descTd = document.createElement("td");
    descTd.textContent = exp.description;

    const catTd = document.createElement("td");
    catTd.textContent = exp.category || "-";

    const amountTd = document.createElement("td");
    amountTd.textContent = formatMoney(exp.amount);

    total += Number(exp.amount) || 0;

    tr.appendChild(dateTd);
    tr.appendChild(descTd);
    tr.appendChild(catTd);
    tr.appendChild(amountTd);

    tbody.appendChild(tr);
  });

  const totalEl = document.getElementById("expensesTotal");
  if (totalEl) {
    totalEl.textContent = formatMoney(total);
  }
}

function renderExpensesChart(list) {
  const canvas = document.getElementById("expensesChart");
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext("2d");

  // Soma os gastos por categoria
  const totalsByCategory = new Map();

  list.forEach((exp) => {
    // trata categoria vazia
    const catRaw = (exp.category || "Sem categoria").trim();
    const cat = catRaw === "" ? "Sem categoria" : catRaw;

    const current = totalsByCategory.get(cat) || 0;
    totalsByCategory.set(cat, current + Number(exp.amount || 0));
  });

  const labels = Array.from(totalsByCategory.keys()).sort();
  const values = labels.map((c) => totalsByCategory.get(c));

  // destrói gráfico anterior, se já existir
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

function renderExpenses() {
  renderExpenseCategoryFilter();

  const filter = getCurrentExpenseFilter();

  const filtered =
    !filter ? expenses : expenses.filter((e) => e.category === filter);

  renderExpensesTable(filtered);
  renderExpensesChart(filtered);
}

// -------- Ações: formulário de gastos --------

async function handleExpenseFormSubmit(event) {
  event.preventDefault();

  const description = document
    .getElementById("expenseDescription")
    .value.trim();
  const category = document
    .getElementById("expenseCategory")
    .value.trim();
  const amountRaw = document
    .getElementById("expenseAmount")
    .value.trim();
  const date = document.getElementById("expenseDate").value;

  if (!description || !amountRaw || !date) {
    alert("Preencha descrição, valor e data.");
    return;
  }

  const amount = Number(amountRaw.replace(",", "."));
  if (Number.isNaN(amount) || amount <= 0) {
    alert("Informe um valor válido.");
    return;
  }

  const newExpense = {
    description,
    category: category || null,
    amount,
    date,
  };

  const saved = await insertExpenseToDb(newExpense);
  if (!saved) return;

  expenses.unshift(saved);

  renderExpenses();
  event.target.reset();
}

// =====================================================
// ================  INICIALIZAÇÃO  ====================
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  // ----- Notas -----
  (async () => {
    notes = await loadNotesFromDb();
    renderCategoryFilter();
    renderNotes();
  })();

  const form = document.getElementById("noteForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  const clearBtn = document.getElementById("clearFormBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearForm);
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", renderNotes);
  }

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderNotes);
  }

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", renderNotes);
  }

  // ----- Gastos -----
  (async () => {
    expenses = await loadExpensesFromDb();
    renderExpenses();
  })();

  const expenseForm = document.getElementById("expenseForm");
  if (expenseForm) {
    expenseForm.addEventListener("submit", handleExpenseFormSubmit);
  }

  const expenseCategoryFilter = document.getElementById(
    "expenseCategoryFilter"
  );
  if (expenseCategoryFilter) {
    expenseCategoryFilter.addEventListener("change", renderExpenses);
  }

  // ----- Alternância de modo (se existir) -----
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

  if (modeNotes) {
    modeNotes.addEventListener("click", () => activateMode("notes"));
  }
  if (modeExpenses) {
    modeExpenses.addEventListener("click", () => activateMode("expenses"));
  }
});