const API_BASE = "https://www.themealdb.com/api/json/v1/1";

const starterMeals = [
  {
    idMeal: "starter-pasta",
    strMeal: "Creamy Pasta Night",
    strArea: "Italian",
    strCategory: "Pasta",
    strMealThumb: "",
    strInstructions:
      "Boil pasta until tender. Warm cream, garlic, and parmesan in a pan. Toss the pasta through the sauce and finish with black pepper.",
    description:
      "A warm starter idea while the live recipe search waits for your first keyword.",
  },
  {
    idMeal: "starter-curry",
    strMeal: "Golden Curry Bowl",
    strArea: "Indian",
    strCategory: "Main",
    strMealThumb: "",
    strInstructions:
      "Toast spices in oil. Add onions, tomatoes, and stock. Simmer until rich, then serve with rice and fresh herbs.",
    description:
      "A simple preview card showing how cuisine browsing will feel in the full app.",
  },
  {
    idMeal: "starter-salmon",
    strMeal: "Citrus Salmon Plate",
    strArea: "Seafood",
    strCategory: "Dinner",
    strMealThumb: "",
    strInstructions:
      "Season salmon with citrus zest and salt. Sear until golden. Serve with herbs, greens, and a squeeze of lemon.",
    description:
      "A fresh recipe-card layout that can now be replaced by live API results.",
  },
];

const fallbackCategories = ["Beef", "Chicken", "Dessert", "Pasta", "Seafood", "Vegetarian"];

const state = {
  ingredients: [],
  meals: [...starterMeals],
  theme: localStorage.getItem("savor_theme") || "light",
  lastQuery: "",
  loading: false,
  currentMeal: null,
  activeArea: "",
  activeCategory: "",
  sort: "default",
  currentView: "grid",
  currentTitle: "Featured ideas",
  currentCountLabel: "3 starter cards",
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
  categoryBar: document.getElementById("categoryBar"),
  recipeGrid: document.getElementById("recipeGrid"),
  loader: document.getElementById("loader"),
  emptyState: document.getElementById("emptyState"),
  sectionTitle: document.getElementById("sectionTitle"),
  resultCount: document.getElementById("resultCount"),
  sortSelect: document.getElementById("sortSelect"),
  gridViewBtn: document.getElementById("gridViewBtn"),
  listViewBtn: document.getElementById("listViewBtn"),
  recipeModal: document.getElementById("recipeModal"),
  modalHero: document.getElementById("modalHero"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  modalCuisine: document.getElementById("modalCuisine"),
  modalTitle: document.getElementById("modalTitle"),
  modalTags: document.getElementById("modalTags"),
  modalArea: document.getElementById("modalArea"),
  modalCategory: document.getElementById("modalCategory"),
  modalIngredientCount: document.getElementById("modalIngredientCount"),
  modalIngredients: document.getElementById("modalIngredients"),
  modalSteps: document.getElementById("modalSteps"),
  modalLinks: document.getElementById("modalLinks"),
  toast: document.getElementById("toast"),
};

function init() {
  applySavedTheme();
  bindEvents();
  renderCategoryButtons(fallbackCategories);
  loadCategories();
  renderRecipes(starterMeals, {
    title: "Featured ideas",
    countLabel: "3 starter cards",
  });
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
  elements.modalCloseBtn.addEventListener("click", closeRecipeModal);
  elements.recipeModal.addEventListener("click", handleRecipeModalClick);
  elements.sortSelect.addEventListener("change", sortRecipes);
  elements.gridViewBtn.addEventListener("click", () => setView("grid"));
  elements.listViewBtn.addEventListener("click", () => setView("list"));

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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoPopup();
      closeRecipeModal();
    }
  });

  document.querySelectorAll(".suggestion-chip").forEach((button) => {
    button.addEventListener("click", () => quickSearch(button.dataset.search));
  });

  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => searchByArea(button));
  });

  elements.categoryBar.addEventListener("click", (event) => {
    const button = event.target.closest(".cat-chip");
    if (button) {
      searchByCategory(button);
    }
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
  if (!elements.recipeModal.classList.contains("open")) {
    document.body.style.overflow = "";
  }
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

async function startSearch() {
  const query = elements.searchInput.value.trim();

  if (!query || state.loading) {
    if (!query) showToast("Enter a recipe name to search.");
    return;
  }

  clearFilterSelection();
  state.lastQuery = query;
  setLoading(true, "Searching...");

  try {
    const meals = await searchRecipes(query);
    setResults(meals, {
      title: `Results for "${query}"`,
      countLabel: buildCountLabel(meals.length),
    });

    if (!meals.length) {
      showToast("No matching recipes found.");
    }
  } catch (error) {
    setResults([], {
      title: "Search unavailable",
      countLabel: "network error",
    });
    showToast("Could not reach TheMealDB. Please try again.");
  } finally {
    setLoading(false);
  }
}

async function searchByArea(button) {
  if (state.loading) return;

  const area = button.dataset.area;
  state.activeArea = area;
  state.activeCategory = "";
  setActiveButton(".filter-chip", button);
  setActiveButton(".cat-chip", null);
  setLoading(true, "Filtering...");

  try {
    const meals = await fetchFilteredMeals("a", area, { strArea: area });
    setResults(meals, {
      title: `${area} recipes`,
      countLabel: buildCountLabel(meals.length),
    });
  } catch (error) {
    showToast(`Could not load ${area} recipes.`);
  } finally {
    setLoading(false);
  }
}

async function searchByCategory(button) {
  if (state.loading) return;

  const category = button.dataset.category;
  state.activeCategory = category;
  state.activeArea = "";
  setActiveButton(".cat-chip", button);
  setActiveButton(".filter-chip", null);
  setLoading(true, "Browsing...");

  try {
    const meals = await fetchFilteredMeals("c", category, {
      strCategory: category,
    });
    setResults(meals, {
      title: `${category} recipes`,
      countLabel: buildCountLabel(meals.length),
    });
  } catch (error) {
    showToast(`Could not load ${category} recipes.`);
  } finally {
    setLoading(false);
  }
}

async function searchByIngredients() {
  if (!state.ingredients.length) {
    showToast("Add at least one ingredient first.");
    return;
  }

  if (state.loading) return;

  clearFilterSelection();
  setLoading(true, "Matching...");

  try {
    const meals = await fetchMealsByIngredients(state.ingredients);
    setResults(meals, {
      title: `Recipes with ${state.ingredients.join(", ")}`,
      countLabel: buildCountLabel(meals.length),
    });

    if (!meals.length) {
      showToast("No recipes matched all selected ingredients.");
    }
  } catch (error) {
    showToast("Could not search by ingredients.");
  } finally {
    setLoading(false);
  }
}

async function searchRecipes(query) {
  const response = await fetch(
    `${API_BASE}/search.php?s=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    throw new Error(`Recipe search failed with ${response.status}`);
  }

  const data = await response.json();
  return data.meals || [];
}

async function fetchFilteredMeals(type, value, extra = {}) {
  const response = await fetch(
    `${API_BASE}/filter.php?${type}=${encodeURIComponent(value)}`,
  );

  if (!response.ok) {
    throw new Error(`Filter request failed with ${response.status}`);
  }

  const data = await response.json();
  return (data.meals || []).map((meal) => ({ ...meal, ...extra }));
}

async function fetchMealsByIngredients(ingredients) {
  const lists = await Promise.all(
    ingredients.map((ingredient) => fetchFilteredMeals("i", ingredient)),
  );

  if (!lists.length) return [];

  const [firstList, ...rest] = lists;
  const commonIds = rest.reduce((ids, list) => {
    const nextIds = new Set(list.map((meal) => meal.idMeal));
    return ids.filter((id) => nextIds.has(id));
  }, firstList.map((meal) => meal.idMeal));

  const lookup = new Map(firstList.map((meal) => [meal.idMeal, meal]));
  return commonIds.map((id) => lookup.get(id)).filter(Boolean);
}

async function fetchRandomRecipe() {
  const response = await fetch(`${API_BASE}/random.php`);

  if (!response.ok) {
    throw new Error(`Random recipe failed with ${response.status}`);
  }

  const data = await response.json();
  return data.meals ? data.meals[0] : null;
}

async function fetchRecipeById(id) {
  const response = await fetch(`${API_BASE}/lookup.php?i=${id}`);

  if (!response.ok) {
    throw new Error(`Recipe lookup failed with ${response.status}`);
  }

  const data = await response.json();
  return data.meals ? data.meals[0] : null;
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories.php`);

    if (!response.ok) {
      throw new Error(`Category request failed with ${response.status}`);
    }

    const data = await response.json();
    const categories = (data.categories || []).map((item) => item.strCategory);
    renderCategoryButtons(categories.length ? categories : fallbackCategories);
  } catch (error) {
    renderCategoryButtons(fallbackCategories);
  }
}

function renderCategoryButtons(categories) {
  const label = elements.categoryBar.querySelector(".cat-label");
  elements.categoryBar.innerHTML = "";
  elements.categoryBar.appendChild(label);

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "cat-chip";
    button.type = "button";
    button.dataset.category = category;
    button.textContent = category;
    elements.categoryBar.appendChild(button);
  });
}

function setResults(meals, options = {}) {
  state.meals = meals;
  state.currentTitle = options.title || "Recipes";
  state.currentCountLabel = options.countLabel || buildCountLabel(meals.length);
  renderRecipes();
}

function renderRecipes() {
  const meals = getSortedMeals(state.meals);

  elements.recipeGrid.innerHTML = "";
  elements.emptyState.hidden = meals.length > 0;
  updateSectionTitle(state.currentTitle, state.currentCountLabel);
  applyViewClass();

  meals.forEach((meal) => {
    elements.recipeGrid.appendChild(createRecipeCard(meal));
  });
}

function updateSectionTitle(title, countLabel) {
  elements.sectionTitle.childNodes[0].nodeValue = `${title} `;
  elements.resultCount.textContent = countLabel;
}

function getSortedMeals(meals) {
  const sortedMeals = [...meals];

  if (state.sort === "az") {
    sortedMeals.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
  }

  if (state.sort === "za") {
    sortedMeals.sort((a, b) => b.strMeal.localeCompare(a.strMeal));
  }

  return sortedMeals;
}

function sortRecipes() {
  state.sort = elements.sortSelect.value;
  renderRecipes();
}

function setView(view) {
  state.currentView = view;
  elements.gridViewBtn.classList.toggle("active", view === "grid");
  elements.listViewBtn.classList.toggle("active", view === "list");
  applyViewClass();
}

function applyViewClass() {
  elements.recipeGrid.classList.toggle("list-view", state.currentView === "list");
}

function createRecipeCard(meal) {
  const card = document.createElement("article");
  card.className = "recipe-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-img-wrap";

  if (meal.strMealThumb) {
    const image = document.createElement("img");
    image.src = meal.strMealThumb;
    image.alt = meal.strMeal;
    image.loading = "lazy";
    imageWrap.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "emoji-fallback";
    fallback.textContent = getRecipeEmoji(meal);
    imageWrap.appendChild(fallback);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const kicker = document.createElement("p");
  kicker.className = "card-kicker";
  kicker.textContent =
    meal.strArea || state.activeArea || meal.strCategory || state.activeCategory || "Recipe idea";

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = meal.strMeal;

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = buildRecipeSummary(meal);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  [
    meal.strArea || state.activeArea,
    meal.strCategory || state.activeCategory,
  ]
    .filter(Boolean)
    .forEach((item) => {
      const pill = document.createElement("span");
      pill.textContent = item;
      meta.appendChild(pill);
    });

  const action = document.createElement("button");
  action.className = "card-action";
  action.type = "button";
  action.textContent = "View recipe";
  action.addEventListener("click", () => openRecipeModal(meal));

  body.append(kicker, title, desc, meta, action);
  card.append(imageWrap, body);

  return card;
}

function buildRecipeSummary(meal) {
  if (meal.description) return meal.description;

  const category = meal.strCategory || state.activeCategory;
  const area = meal.strArea || state.activeArea;

  if (category && area) {
    return `A ${category.toLowerCase()} recipe from ${area}. Open the detail view for ingredients, steps, and links.`;
  }

  if (category) {
    return `A ${category.toLowerCase()} recipe. Open the detail view for ingredients, steps, and links.`;
  }

  if (area) {
    return `A recipe from ${area}. Open the detail view for ingredients, steps, and links.`;
  }

  return "Open the detail view for ingredients, steps, and recipe links.";
}

async function openRecipeModal(meal) {
  let fullMeal = meal;

  if (!fullMeal.strInstructions && !String(fullMeal.idMeal).startsWith("starter")) {
    showToast("Loading recipe details...");
    fullMeal = await fetchRecipeById(fullMeal.idMeal);
  }

  if (!fullMeal) {
    showToast("Recipe details were not available.");
    return;
  }

  state.currentMeal = fullMeal;
  renderRecipeModal(fullMeal);
  elements.recipeModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeRecipeModal() {
  elements.recipeModal.classList.remove("open");
  if (!elements.infoOverlay.classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

function handleRecipeModalClick(event) {
  if (event.target === elements.recipeModal) {
    closeRecipeModal();
  }
}

function renderRecipeModal(meal) {
  const ingredients = extractIngredients(meal);
  const steps = parseInstructions(meal.strInstructions);

  renderModalHero(meal);
  elements.modalCuisine.textContent = meal.strArea
    ? `${meal.strArea} cuisine`
    : "Recipe details";
  elements.modalTitle.textContent = meal.strMeal;
  elements.modalArea.textContent = meal.strArea || "-";
  elements.modalCategory.textContent = meal.strCategory || "-";
  elements.modalIngredientCount.textContent = ingredients.length;

  renderModalTags(meal);
  renderModalIngredients(ingredients);
  renderModalSteps(steps);
  renderModalLinks(meal);
}

function renderModalHero(meal) {
  elements.modalHero.querySelector(".modal-preview")?.remove();

  if (meal.strMealThumb) {
    const image = document.createElement("img");
    image.className = "modal-preview";
    image.src = meal.strMealThumb;
    image.alt = meal.strMeal;
    elements.modalHero.insertBefore(image, elements.modalCloseBtn);
    return;
  }

  const fallback = document.createElement("span");
  fallback.className = "modal-preview modal-emoji";
  fallback.textContent = getRecipeEmoji(meal);
  elements.modalHero.insertBefore(fallback, elements.modalCloseBtn);
}

function renderModalTags(meal) {
  elements.modalTags.innerHTML = "";
  [meal.strArea, meal.strCategory, ...(meal.strTags || "").split(",")]
    .map((tag) => tag && tag.trim())
    .filter(Boolean)
    .slice(0, 6)
    .forEach((tag) => {
      const pill = document.createElement("span");
      pill.textContent = tag;
      elements.modalTags.appendChild(pill);
    });
}

function renderModalIngredients(ingredients) {
  elements.modalIngredients.innerHTML = "";

  if (!ingredients.length) {
    const empty = document.createElement("p");
    empty.className = "card-desc";
    empty.textContent = "No ingredient list is available for this recipe yet.";
    elements.modalIngredients.appendChild(empty);
    return;
  }

  ingredients.forEach((ingredient) => {
    const item = document.createElement("div");
    item.className = "ingredient-item";

    const name = document.createElement("strong");
    name.textContent = ingredient.name;

    const amount = document.createElement("span");
    amount.textContent = ingredient.measure || "to taste";

    item.append(name, amount);
    elements.modalIngredients.appendChild(item);
  });
}

function renderModalSteps(steps) {
  elements.modalSteps.innerHTML = "";

  if (!steps.length) {
    const item = document.createElement("li");
    item.textContent = "No step-by-step instructions are available.";
    elements.modalSteps.appendChild(item);
    return;
  }

  steps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    elements.modalSteps.appendChild(item);
  });
}

function renderModalLinks(meal) {
  elements.modalLinks.innerHTML = "";

  [
    { label: "Recipe source", url: meal.strSource },
    { label: "Watch tutorial", url: meal.strYoutube },
  ]
    .filter((link) => link.url)
    .forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.textContent = link.label;
      elements.modalLinks.appendChild(anchor);
    });
}

function extractIngredients(meal) {
  const ingredients = [];

  for (let index = 1; index <= 20; index += 1) {
    const name = meal[`strIngredient${index}`];
    const measure = meal[`strMeasure${index}`];

    if (name && name.trim()) {
      ingredients.push({
        name: name.trim(),
        measure: measure ? measure.trim() : "",
      });
    }
  }

  if (!ingredients.length && String(meal.idMeal).startsWith("starter")) {
    return [
      { name: "Main ingredient", measure: "1 portion" },
      { name: "Seasoning", measure: "to taste" },
      { name: "Fresh garnish", measure: "as needed" },
    ];
  }

  return ingredients;
}

function parseInstructions(instructions = "") {
  if (!instructions.trim()) return [];

  const lineSteps = instructions
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter((step) => step.length > 4);

  const steps =
    lineSteps.length > 1
      ? lineSteps
      : instructions
          .split(/(?<=[.!?])\s+/)
          .map((step) => step.trim())
          .filter((step) => step.length > 5);

  return steps
    .map((step) => step.replace(/^(step\s*)?\d+[\.\):\-]\s*/i, ""))
    .slice(0, 12);
}

function buildCountLabel(count) {
  return `${count} ${count === 1 ? "recipe" : "recipes"}`;
}

function setActiveButton(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle("active", button === activeButton);
  });
}

function clearFilterSelection() {
  state.activeArea = "";
  state.activeCategory = "";
  setActiveButton(".filter-chip", null);
  setActiveButton(".cat-chip", null);
}

function getRecipeEmoji(meal) {
  const text = `${meal.strMeal || ""} ${meal.strCategory || ""}`.toLowerCase();

  if (text.includes("pasta") || text.includes("spaghetti")) return "🍝";
  if (text.includes("taco") || text.includes("burrito")) return "🌮";
  if (text.includes("curry") || text.includes("tikka")) return "🍛";
  if (text.includes("salmon") || text.includes("fish")) return "🐟";
  if (text.includes("cake") || text.includes("dessert")) return "🍰";
  if (text.includes("chicken")) return "🍗";
  return "🍽️";
}

function setLoading(isLoading, label = "Searching...") {
  state.loading = isLoading;
  elements.loader.hidden = !isLoading;
  elements.recipeGrid.hidden = isLoading;
  elements.searchBtn.disabled = isLoading;
  elements.randomBtn.disabled = isLoading;
  elements.ingredientSearchBtn.disabled = isLoading;
  elements.searchBtn.textContent = isLoading ? label : "Search";
}

function quickSearch(term) {
  elements.searchInput.value = term;
  startSearch();
}

async function loadRandom() {
  if (state.loading) return;

  clearFilterSelection();
  setLoading(true, "Loading...");

  try {
    const meal = await fetchRandomRecipe();

    if (!meal) {
      showToast("No random recipe was returned.");
      return;
    }

    setResults([meal], {
      title: "Random pick",
      countLabel: "1 recipe",
    });
    openRecipeModal(meal);
  } catch (error) {
    showToast("Could not load a random recipe.");
  } finally {
    setLoading(false);
  }
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
