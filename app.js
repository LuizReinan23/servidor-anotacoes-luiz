// =========================
// Supabase Client (db)
// =========================
const db = window.supabaseClient;

if (!db) {
  console.error("Supabase client não inicializado. Verifique index.html.");
}

// =========================
// ESTADO: Anotações
// =========================
let notes = [];
let editingNoteId = null;

// =========================
// ESTADO: Gastos (localStorage)
// =========================
const EXPENSES_STORAGE_KEY = "luizExpensesV1";
let expenses = [];
let expensesChart = null;

// =========================
// ESTADO: Wiki
// =========================
let wikiCommands = [];
let editingWikiId = null;

// =========================
// Utilidades gerais
// =========================

function formatCurrencyBRL(value) {
  // Garante que sempre vamos trabalhar com um número
  let num = 0;

  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string") {
    num = Number(value.replace(",", "."));
  } else {
    num = Number(value) || 0;
  }

  if (!Number.isFinite(num)) {
    num = 0;
  }

  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// =========================
// TABS
// =========================

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = {
    notes: document.getElementById("tab-notes"),
    expenses: document.getElementById("tab-expenses"),
    wiki: document.getElementById("tab-wiki"),
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.values(tabContents).forEach((section) =>
        section.classList.remove("active")
      );
      tabContents[tab].classList.add("active");
    });
  });
}

// =========================
// ANOTAÇÕES – Supabase
// =========================

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

// Helpers de UI para notas

function getUniqueNoteCategories() {
  const set = new Set();
  notes.forEach((n) => {
    if (n.category && n.category.trim() !== "") {
      set.add(n.category.trim());
    }
  });
  return Array.from(set).sort();
}

function renderNoteCategoryFilter() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  const current = categoryFilter.value;

  categoryFilter.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Todas";
  categoryFilter.appendChild(optAll);

  const categories = getUniqueNoteCategories();
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  categoryFilter.value = current || "";
}

function renderNotes() {
  const listEl = document.getElementById("notesList");
  const searchValue = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const categoryFilter = document.getElementById("categoryFilter").value;
  const sortValue = document.getElementById("sortSelect").value;

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
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortValue === "oldest") {
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
    const created = formatDateTimeBR(note.createdAt);
    const updated =
      note.updatedAt && note.updatedAt !== note.createdAt
        ? " • Atualizada: " + formatDateTimeBR(note.updatedAt)
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
  renderNoteCategoryFilter();
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
    // edição
    const index = notes.findIndex((n) => n.id === editingNoteId);
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
    // nova nota
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

  renderNoteCategoryFilter();
  renderNotes();
  clearNoteForm();
}

// =========================
// GASTOS – localStorage
// =========================

function loadExpensesFromStorage() {
  const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
  if (!raw) {
    expenses = [];
    return;
  }
  try {
    expenses = JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler despesas do localStorage, resetando…", e);
    expenses = [];
  }
}

function saveExpensesToStorage() {
  localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
}

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

  const cats = getUniqueExpenseCategories();
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  select.value = current || "";
}

function renderExpensesTable() {
  const tbody = document.getElementById("expensesTableBody");
  const categoryFilter = document.getElementById("expenseCategoryFilter").value;

  let filtered = expenses;
  if (categoryFilter) {
    filtered = expenses.filter((e) => e.category === categoryFilter);
  }

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "Nenhum gasto registrado.";
    td.style.color = "#9ca3af";
    td.style.fontSize = "0.85rem";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  filtered
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((e) => {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDateBR(e.date);

      const tdDesc = document.createElement("td");
      tdDesc.textContent = e.desc;

      const tdCat = document.createElement("td");
      tdCat.textContent = e.category;

      const tdVal = document.createElement("td");
      tdVal.textContent = formatCurrencyBRL(e.value);

      tr.appendChild(tdDate);
      tr.appendChild(tdDesc);
      tr.appendChild(tdCat);
      tr.appendChild(tdVal);

      tbody.appendChild(tr);
    });
}

function renderExpensesSummaryAndChart() {
  const totalEl = document.getElementById("expensesTotal");
  const categoryFilter = document.getElementById("expenseCategoryFilter").value;

  let filtered = expenses;
  if (categoryFilter) {
    filtered = expenses.filter((e) => e.category === categoryFilter);
  }

  const total = filtered.reduce((sum, e) => sum + e.value, 0);
  totalEl.textContent = formatCurrencyBRL(total);

  // agrupar por categoria
  const map = new Map();
  filtered.forEach((e) => {
    const cat = e.category || "Sem categoria";
    map.set(cat, (map.get(cat) || 0) + e.value);
  });

  const labels = Array.from(map.keys());
  const values = Array.from(map.values());

  const ctx = document.getElementById("expensesChart").getContext("2d");

  if (expensesChart) {
    expensesChart.destroy();
  }

  expensesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Total por categoria",
          data: values,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#9ca3af",
            callback: (val) => formatCurrencyBRL(val),
          },
          grid: { color: "#111827" },
        },
      },
    },
  });
}

function handleExpenseFormSubmit(event) {
  event.preventDefault();

  const desc = document.getElementById("expenseDesc").value.trim();
  const category = document.getElementById("expenseCategory").value.trim();
  const valueStr = document.getElementById("expenseValue").value.trim();
  const dateStr = document.getElementById("expenseDate").value;

  if (!desc || !category || !valueStr || !dateStr) {
    alert("Preencha descrição, categoria, valor e data.");
    return;
  }

  const value = Number(valueStr.replace(",", "."));
  if (Number.isNaN(value) || value <= 0) {
    alert("Informe um valor válido.");
    return;
  }

  const expense = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    desc,
    category,
    value,
    date: dateStr,
  };

  expenses.push(expense);
  saveExpensesToStorage();
  renderExpenseCategoryFilter();
  renderExpensesTable();
  renderExpensesSummaryAndChart();

  document.getElementById("expenseForm").reset();
}

// =========================
// WIKI – Supabase
// =========================

async function loadWikiFromDb() {
  if (!db) return [];
  const { data, error } = await db
    .from("wiki_commands")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar wiki_commands:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    vendor: row.vendor,
    deviceType: row.device_type,
    model: row.model,
    context: row.context,
    command: row.command,
    description: row.description,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function insertWikiCommandToDb(cmd) {
  if (!db) return null;
  const { data, error } = await db
    .from("wiki_commands")
    .insert({
      title: cmd.title,
      vendor: cmd.vendor,
      device_type: cmd.deviceType,
      model: cmd.model,
      context: cmd.context,
      command: cmd.command,
      description: cmd.description,
      tags: cmd.tags,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir comando na wiki:", error);
    alert("Erro ao salvar comando na wiki.");
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    vendor: data.vendor,
    deviceType: data.device_type,
    model: data.model,
    context: data.context,
    command: data.command,
    description: data.description,
    tags: data.tags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function updateWikiCommandInDb(cmd) {
  if (!db) return null;
  const { data, error } = await db
    .from("wiki_commands")
    .update({
      title: cmd.title,
      vendor: cmd.vendor,
      device_type: cmd.deviceType,
      model: cmd.model,
      context: cmd.context,
      command: cmd.command,
      description: cmd.description,
      tags: cmd.tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cmd.id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar comando na wiki:", error);
    alert("Erro ao atualizar comando na wiki.");
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    vendor: data.vendor,
    deviceType: data.device_type,
    model: data.model,
    context: data.context,
    command: data.command,
    description: data.description,
    tags: data.tags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function deleteWikiCommandFromDb(id) {
  if (!db) return false;
  const { error } = await db.from("wiki_commands").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir comando da wiki:", error);
    alert("Erro ao excluir comando da wiki.");
    return false;
  }
  return true;
}

function getUniqueWikiField(field) {
  const set = new Set();
  wikiCommands.forEach((c) => {
    const val = c[field];
    if (val && String(val).trim() !== "") {
      set.add(String(val).trim());
    }
  });
  return Array.from(set).sort();
}

function renderWikiFilters() {
  const vendorSelect = document.getElementById("wikiVendorFilter");
  const deviceTypeSelect = document.getElementById("wikiDeviceTypeFilter");
  const contextSelect = document.getElementById("wikiContextFilter");

  const currentVendor = vendorSelect.value;
  const currentDevice = deviceTypeSelect.value;
  const currentContext = contextSelect.value;

  // vendor
  vendorSelect.innerHTML = "";
  let opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Todos";
  vendorSelect.appendChild(opt);
  getUniqueWikiField("vendor").forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    vendorSelect.appendChild(o);
  });
  vendorSelect.value = currentVendor || "";

  // device type
  deviceTypeSelect.innerHTML = "";
  opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Todos";
  deviceTypeSelect.appendChild(opt);
  getUniqueWikiField("deviceType").forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    deviceTypeSelect.appendChild(o);
  });
  deviceTypeSelect.value = currentDevice || "";

  // context
  contextSelect.innerHTML = "";
  opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Todos";
  contextSelect.appendChild(opt);
  getUniqueWikiField("context").forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    contextSelect.appendChild(o);
  });
  contextSelect.value = currentContext || "";
}

function renderWikiList() {
  const listEl = document.getElementById("wikiList");
  const search = document.getElementById("wikiSearch").value.toLowerCase().trim();
  const vendorFilter = document.getElementById("wikiVendorFilter").value;
  const deviceFilter = document.getElementById("wikiDeviceTypeFilter").value;
  const contextFilter = document.getElementById("wikiContextFilter").value;

  let filtered = wikiCommands.filter((cmd) => {
    if (vendorFilter && cmd.vendor !== vendorFilter) return false;
    if (deviceFilter && cmd.deviceType !== deviceFilter) return false;
    if (contextFilter && cmd.context !== contextFilter) return false;

    if (!search) return true;

    const haystack =
      (cmd.title || "") +
      " " +
      (cmd.vendor || "") +
      " " +
      (cmd.deviceType || "") +
      " " +
      (cmd.model || "") +
      " " +
      (cmd.context || "") +
      " " +
      (cmd.command || "") +
      " " +
      (cmd.description || "") +
      " " +
      (cmd.tags || []).join(" ");

    return haystack.toLowerCase().includes(search);
  });

  listEl.innerHTML = "";
  if (filtered.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Nenhum comando encontrado.";
    p.style.fontSize = "0.85rem";
    p.style.color = "#9ca3af";
    listEl.appendChild(p);
    return;
  }

  filtered.forEach((cmd) => {
    const card = document.createElement("article");
    card.className = "wiki-card";

    const header = document.createElement("div");
    header.className = "wiki-header";

    const titleEl = document.createElement("div");
    titleEl.className = "wiki-title";
    titleEl.textContent = cmd.title;

    const metaTop = document.createElement("div");
    metaTop.className = "wiki-meta";

    if (cmd.vendor) {
      const b = document.createElement("span");
      b.className = "badge badge-primary";
      b.textContent = cmd.vendor;
      metaTop.appendChild(b);
    }
    if (cmd.deviceType) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = cmd.deviceType;
      metaTop.appendChild(b);
    }
    if (cmd.model) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "Modelo: " + cmd.model;
      metaTop.appendChild(b);
    }
    if (cmd.context) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "Contexto: " + cmd.context;
      metaTop.appendChild(b);
    }

    header.appendChild(titleEl);
    header.appendChild(metaTop);

    const commandEl = document.createElement("pre");
    commandEl.className = "wiki-command";
    commandEl.textContent = cmd.command;

    const descriptionEl = document.createElement("div");
    descriptionEl.className = "wiki-description";
    descriptionEl.textContent = cmd.description || "";

    const tagsEl = document.createElement("div");
    tagsEl.className = "wiki-tags";
    (cmd.tags || []).forEach((tag) => {
      if (!tag) return;
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = "#" + tag;
      tagsEl.appendChild(span);
    });

    const footer = document.createElement("div");
    footer.className = "wiki-footer";

    const metaDates = document.createElement("div");
    const created = formatDateTimeBR(cmd.createdAt);
    const updated =
      cmd.updatedAt && cmd.updatedAt !== cmd.createdAt
        ? " • Atualizado: " + formatDateTimeBR(cmd.updatedAt)
        : "";
    metaDates.textContent = `Criado: ${created}${updated}`;

    const actions = document.createElement("div");
    actions.className = "wiki-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => loadWikiIntoForm(cmd.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-secondary";
    deleteBtn.textContent = "Excluir";
    deleteBtn.addEventListener("click", () => handleDeleteWiki(cmd.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    footer.appendChild(metaDates);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(commandEl);
    if (cmd.description) card.appendChild(descriptionEl);
    if (cmd.tags && cmd.tags.length > 0) card.appendChild(tagsEl);
    card.appendChild(footer);

    listEl.appendChild(card);
  });
}

function clearWikiForm() {
  editingWikiId = null;
  document.getElementById("wikiId").value = "";
  document.getElementById("wikiTitle").value = "";
  document.getElementById("wikiVendor").value = "";
  document.getElementById("wikiDeviceType").value = "";
  document.getElementById("wikiModel").value = "";
  document.getElementById("wikiContext").value = "";
  document.getElementById("wikiCommand").value = "";
  document.getElementById("wikiDescription").value = "";
  document.getElementById("wikiTags").value = "";
}

function loadWikiIntoForm(id) {
  const cmd = wikiCommands.find((c) => c.id === id);
  if (!cmd) return;
  editingWikiId = id;
  document.getElementById("wikiId").value = cmd.id;
  document.getElementById("wikiTitle").value = cmd.title || "";
  document.getElementById("wikiVendor").value = cmd.vendor || "";
  document.getElementById("wikiDeviceType").value = cmd.deviceType || "";
  document.getElementById("wikiModel").value = cmd.model || "";
  document.getElementById("wikiContext").value = cmd.context || "";
  document.getElementById("wikiCommand").value = cmd.command || "";
  document.getElementById("wikiDescription").value = cmd.description || "";
  document.getElementById("wikiTags").value = (cmd.tags || []).join(", ");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleDeleteWiki(id) {
  const cmd = wikiCommands.find((c) => c.id === id);
  const title = cmd ? cmd.title : "";
  const confirmDelete = window.confirm(
    `Tem certeza que deseja excluir o comando "${title}"?`
  );
  if (!confirmDelete) return;

  const ok = await deleteWikiCommandFromDb(id);
  if (!ok) return;

  wikiCommands = wikiCommands.filter((c) => c.id !== id);
  renderWikiFilters();
  renderWikiList();
}

async function handleWikiFormSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("wikiTitle").value.trim();
  const vendor = document.getElementById("wikiVendor").value.trim();
  const deviceType = document.getElementById("wikiDeviceType").value.trim();
  const model = document.getElementById("wikiModel").value.trim();
  const context = document.getElementById("wikiContext").value.trim();
  const command = document.getElementById("wikiCommand").value.trim();
  const description = document
    .getElementById("wikiDescription")
    .value.trim();
  const tagsRaw = document.getElementById("wikiTags").value.trim();

  if (!title || !vendor || !deviceType || !command) {
    alert(
      "Preencha pelo menos: Título, Fabricante, Equipamento e Comando."
    );
    return;
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter((t) => t !== "")
    : [];

  if (editingWikiId) {
    const index = wikiCommands.findIndex((c) => c.id === editingWikiId);
    if (index === -1) return;

    const updated = {
      ...wikiCommands[index],
      title,
      vendor,
      deviceType,
      model,
      context,
      command,
      description,
      tags,
    };

    const saved = await updateWikiCommandInDb(updated);
    if (!saved) return;

    wikiCommands[index] = saved;
  } else {
    const newCmd = {
      title,
      vendor,
      deviceType,
      model,
      context,
      command,
      description,
      tags,
    };

    const saved = await insertWikiCommandToDb(newCmd);
    if (!saved) return;

    wikiCommands.unshift(saved);
  }

  renderWikiFilters();
  renderWikiList();
  clearWikiForm();
}

// =========================
// Inicialização
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();

  // ---- Notas ----
  const noteForm = document.getElementById("noteForm");
  noteForm.addEventListener("submit", handleNoteFormSubmit);
  document
    .getElementById("clearFormBtn")
    .addEventListener("click", clearNoteForm);
  document
    .getElementById("searchInput")
    .addEventListener("input", renderNotes);
  document
    .getElementById("categoryFilter")
    .addEventListener("change", renderNotes);
  document
    .getElementById("sortSelect")
    .addEventListener("change", renderNotes);

  notes = await loadNotesFromDb();
  renderNoteCategoryFilter();
  renderNotes();

  // ---- Gastos ----
  loadExpensesFromStorage();
  renderExpenseCategoryFilter();
  renderExpensesTable();
  renderExpensesSummaryAndChart();
  document
    .getElementById("expenseForm")
    .addEventListener("submit", handleExpenseFormSubmit);
  document
    .getElementById("expenseCategoryFilter")
    .addEventListener("change", () => {
      renderExpensesTable();
      renderExpensesSummaryAndChart();
    });

  // ---- Wiki ----
  wikiCommands = await loadWikiFromDb();
  renderWikiFilters();
  renderWikiList();
  document
    .getElementById("wikiForm")
    .addEventListener("submit", handleWikiFormSubmit);
  document
    .getElementById("wikiClearBtn")
    .addEventListener("click", clearWikiForm);
  document
    .getElementById("wikiSearch")
    .addEventListener("input", renderWikiList);
  document
    .getElementById("wikiVendorFilter")
    .addEventListener("change", renderWikiList);
  document
    .getElementById("wikiDeviceTypeFilter")
    .addEventListener("change", renderWikiList);
  document
    .getElementById("wikiContextFilter")
    .addEventListener("change", renderWikiList);
});