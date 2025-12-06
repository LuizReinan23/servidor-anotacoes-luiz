// =========================
// Supabase
// =========================
const supabase = window.supabaseClient;

let notes = [];
let editingId = null;

// Carrega notas do Supabase
async function loadNotesFromDb() {
  const { data, error } = await supabase
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

// Salva nota nova
async function insertNoteToDb(note) {
  const { data, error } = await supabase
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

// Atualiza nota existente
async function updateNoteInDb(note) {
  const { data, error } = await supabase
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

// Excluir nota no banco
async function deleteNoteFromDb(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir nota no Supabase:", error);
    alert("Erro ao excluir nota no banco.");
    return false;
  }

  return true;
}

// =========================
// Funções de UI
// =========================

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

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

// =========================
// Ações (salvar / excluir)
// =========================

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
    ? tagsRaw.split(",").map((t) => t.trim()).filter((t) => t !== "")
    : [];

  if (editingId) {
    // edição
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
    // nova nota
    const newNote = {
      title,
      category,
      tags,
      content,
    };

    const saved = await insertNoteToDb(newNote);
    if (!saved) return;

    // adiciona no início da lista
    notes.unshift(saved);
  }

  renderCategoryFilter();
  renderNotes();
  clearForm();
}

// =========================
// Inicialização
// =========================

document.addEventListener("DOMContentLoaded", () => {
  // carregar notas do Supabase
  (async () => {
    notes = await loadNotesFromDb();
    renderCategoryFilter();
    renderNotes();
  })();

  const form = document.getElementById("noteForm");
  form.addEventListener("submit", handleFormSubmit);

  document
    .getElementById("clearFormBtn")
    .addEventListener("click", clearForm);

  document
    .getElementById("searchInput")
    .addEventListener("input", renderNotes);

  document
    .getElementById("categoryFilter")
    .addEventListener("change", renderNotes);

  document
    .getElementById("sortSelect")
    .addEventListener("change", renderNotes);
});