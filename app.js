const STORAGE_KEY = "luizNotesV1";

let notes = [];
let editingId = null;

function loadNotes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    notes = [];
    return;
  }
  try {
    notes = JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler localStorage, resetando dados...", e);
    notes = [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

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
    deleteBtn.addEventListener("click", () => deleteNote(note.id));

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

function deleteNote(id) {
  const note = notes.find((n) => n.id === id);
  const title = note ? note.title : "";
  const confirmDelete = window.confirm(
    `Tem certeza que deseja excluir a anotação "${title}"?`
  );
  if (!confirmDelete) return;

  notes = notes.filter((n) => n.id !== id);
  saveNotes();
  renderCategoryFilter();
  renderNotes();
}

function handleFormSubmit(event) {
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

  const now = new Date().toISOString();

  if (editingId) {
    const index = notes.findIndex((n) => n.id === editingId);
    if (index !== -1) {
      notes[index] = {
        ...notes[index],
        title,
        category,
        tags,
        content,
        updatedAt: now,
      };
    }
  } else {
    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      category,
      tags,
      content,
      createdAt: now,
      updatedAt: now,
    };
    notes.push(newNote);
  }

  saveNotes();
  renderCategoryFilter();
  renderNotes();
  clearForm();
}

document.addEventListener("DOMContentLoaded", () => {
  loadNotes();
  renderCategoryFilter();
  renderNotes();

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
