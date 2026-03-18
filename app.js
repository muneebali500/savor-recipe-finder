const state = {
  ingredients: [],
  theme: localStorage.getItem("savor_theme") || "light",
};

const elements = {
  logo: document.querySelector(".logo"),
  themeBtn: document.getElementById("themeBtn"),
  infoBtn: document.getElementById("infoBtn"),
  infoOverlay: document.getElementById("infoOverlay"),
  infoCloseBtn: document.getElementById("infoCloseBtn"),
  infoStartBtn: document.getElementById("infoStartBtn"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  randomBtn: document.getElementById("randomBtn"),
  ingrToggleBtn: document.getElementById("ingrToggleBtn"),
  ingrSearchBar: document.getElementById("ingrSearchBar"),
  ingrInput: document.getElementById("ingrInput"),
  addIngredientBtn: document.getElementById("addIngredientBtn"),
  ingredientSearchBtn: document.getElementById("ingredientSearchBtn"),
  ingrTags: document.getElementById("ingrTags"),
  toast: document.getElementById("toast"),
};

function init() {
  applySavedTheme();
  bindEvents();
  openInfoPopup();
}

function bindEvents() {
  elements.logo.addEventListener("click", scrollToTop);
  elements.themeBtn.addEventListener("click", toggleTheme);
  elements.infoBtn.addEventListener("click", openInfoPopup);
  elements.infoCloseBtn.addEventListener("click", closeInfoPopup);
  elements.infoStartBtn.addEventListener("click", closeInfoPopup);
  elements.infoOverlay.addEventListener("click", handleInfoOverlayClick);
  elements.searchBtn.addEventListener("click", startSearch);
  elements.randomBtn.addEventListener("click", loadRandom);
  elements.ingrToggleBtn.addEventListener("click", toggleIngredientSearch);
  elements.addIngredientBtn.addEventListener("click", addIngredient);
  elements.ingredientSearchBtn.addEventListener("click", searchByIngredients);

  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      startSearch();
    }
  });

  elements.ingrInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addIngredient();
    }
  });

  document.querySelectorAll(".suggestion-chip").forEach((button) => {
    button.addEventListener("click", () => quickSearch(button.dataset.search));
  });

  document.querySelectorAll(".filter-chip, .cat-chip").forEach((button) => {
    button.addEventListener("click", () => toggleActiveChip(button));
  });
}

function applySavedTheme() {
  if (state.theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    elements.themeBtn.textContent = "☀️";
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    elements.themeBtn.textContent = "🌙";
    state.theme = "light";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    elements.themeBtn.textContent = "☀️";
    state.theme = "dark";
  }

  localStorage.setItem("savor_theme", state.theme);
}

function openInfoPopup() {
  elements.infoOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeInfoPopup() {
  elements.infoOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

function handleInfoOverlayClick(event) {
  if (event.target === elements.infoOverlay) {
    closeInfoPopup();
  }
}

function toggleIngredientSearch() {
  elements.ingrSearchBar.classList.toggle("open");
  elements.ingrToggleBtn.classList.toggle("active");

  if (elements.ingrSearchBar.classList.contains("open")) {
    elements.ingrInput.focus();
  }
}

function addIngredient() {
  const ingredient = elements.ingrInput.value.trim();

  if (!ingredient) {
    showToast("Type an ingredient first.");
    return;
  }

  if (state.ingredients.includes(ingredient.toLowerCase())) {
    showToast("That ingredient is already added.");
    elements.ingrInput.value = "";
    return;
  }

  state.ingredients.push(ingredient.toLowerCase());
  elements.ingrInput.value = "";
  renderIngredientTags();
}

function removeIngredient(ingredient) {
  state.ingredients = state.ingredients.filter((item) => item !== ingredient);
  renderIngredientTags();
}

function renderIngredientTags() {
  elements.ingrTags.innerHTML = "";

  state.ingredients.forEach((ingredient) => {
    const tag = document.createElement("span");
    tag.className = "ingr-tag";
    tag.textContent = ingredient;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${ingredient}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      removeIngredient(ingredient);
    });

    tag.appendChild(removeBtn);
    elements.ingrTags.appendChild(tag);
  });
}

function startSearch() {
  const query = elements.searchInput.value.trim();

  if (!query) {
    showToast("Enter a recipe name to search.");
    return;
  }

  showToast(`Search UI ready for "${query}". API results arrive in Day 2.`);
}

function quickSearch(term) {
  elements.searchInput.value = term;
  startSearch();
}

function loadRandom() {
  showToast("Random recipe loading will be connected with TheMealDB next.");
}

function searchByIngredients() {
  if (!state.ingredients.length) {
    showToast("Add at least one ingredient first.");
    return;
  }

  showToast(`Ingredient search queued for ${state.ingredients.join(", ")}.`);
}

function toggleActiveChip(button) {
  const group = button.closest(".filters-bar, .category-bar");

  group.querySelectorAll("button").forEach((chip) => {
    chip.classList.remove("active");
  });

  button.classList.add("active");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2400);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", init);
