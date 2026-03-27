// ════════════════════════════════════════
      // CONFIG & STATE
      // ════════════════════════════════════════
      const API = "https://www.themealdb.com/api/json/v1/1";
      const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

      const state = {
        meals: [],
        filteredMeals: [],
        page: 0,
        pageSize: 9,
        loading: false,
        activeArea: null,
        activeCategory: null,
        favorites: new Map(), // idMeal -> meal
        notes: {}, // idMeal -> string
        ratings: {}, // idMeal -> 1-5
        shopList: [], // [{name, amount, checked}]
        mealPlan: {}, // "Mon_dinner" -> meal obj
        currentMeal: null,
        servings: 4,
        baseServings: 4,
        ingredients: [], // for ingredient search
        currentView: "grid",
        // cooking mode
        cookSteps: [],
        cookStep: 0,
        cookTimer: null,
        cookInterval: null,
      };

      // ════════════════════════════════════════
      // EMOJI HELPER
      // ════════════════════════════════════════
      const EMOJIS = [
        "🍝",
        "🌮",
        "🍜",
        "🥗",
        "🍲",
        "🥘",
        "🍛",
        "🍣",
        "🥙",
        "🍱",
        "🥪",
        "🍖",
        "🥩",
        "🍔",
        "🍰",
        "🍞",
        "🐟",
      ];
      function getEmoji(t = "") {
        t = t.toLowerCase();
        if (t.includes("pasta") || t.includes("spaghetti")) return "🍝";
        if (t.includes("taco") || t.includes("burrito")) return "🌮";
        if (t.includes("curry") || t.includes("tikka")) return "🍛";
        if (t.includes("sushi") || t.includes("salmon")) return "🍣";
        if (t.includes("soup") || t.includes("chowder")) return "🍲";
        if (t.includes("salad") || t.includes("slaw")) return "🥗";
        if (t.includes("pizza")) return "🍕";
        if (t.includes("burger")) return "🍔";
        if (t.includes("cake") || t.includes("brownie")) return "🍰";
        if (t.includes("rice")) return "🍚";
        if (t.includes("bread")) return "🍞";
        if (t.includes("noodle") || t.includes("ramen")) return "🍜";
        if (t.includes("steak") || t.includes("beef")) return "🥩";
        if (t.includes("chicken")) return "🍗";
        if (t.includes("fish") || t.includes("shrimp")) return "🐟";
        return EMOJIS[t.charCodeAt(0) % EMOJIS.length] || "🍽️";
      }

      // ════════════════════════════════════════
      // STORAGE
      // ════════════════════════════════════════
      function save(key, val) {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
      }
      function load(key, def) {
        try {
          const r = localStorage.getItem(key);
          return r ? JSON.parse(r) : def;
        } catch (e) {
          return def;
        }
      }

      function persist() {
        save("sv_favs", Array.from(state.favorites.values()));
        save("sv_notes", state.notes);
        save("sv_ratings", state.ratings);
        save("sv_shop", state.shopList);
        save("sv_plan", state.mealPlan);
      }
      function hydrate() {
        const favs = load("sv_favs", []);
        favs.forEach((r) => state.favorites.set(r.idMeal, r));
        state.notes = load("sv_notes", {});
        state.ratings = load("sv_ratings", {});
        state.shopList = load("sv_shop", []);
        state.mealPlan = load("sv_plan", {});
        updateFavCount();
        updateShopCount();
        // theme
        const theme = load("sv_theme", "light");
        if (theme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
          document.getElementById("themeBtn").textContent = "☀️";
        }
      }

      // ════════════════════════════════════════
      // THEME
      // ════════════════════════════════════════
      function toggleTheme() {
        const d = document.documentElement;
        const btn = document.getElementById("themeBtn");
        if (d.getAttribute("data-theme") === "dark") {
          d.removeAttribute("data-theme");
          btn.textContent = "🌙";
          save("sv_theme", "light");
        } else {
          d.setAttribute("data-theme", "dark");
          btn.textContent = "☀️";
          save("sv_theme", "dark");
        }
      }

      // ════════════════════════════════════════
      // API HELPERS
      // ════════════════════════════════════════
      async function apiFetch(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }
      async function searchByName(q) {
        const d = await apiFetch(
          `${API}/search.php?s=${encodeURIComponent(q)}`,
        );
        return d.meals || [];
      }
      async function filterByArea(a) {
        const d = await apiFetch(
          `${API}/filter.php?a=${encodeURIComponent(a)}`,
        );
        return d.meals || [];
      }
      async function filterByCat(c) {
        const d = await apiFetch(
          `${API}/filter.php?c=${encodeURIComponent(c)}`,
        );
        return d.meals || [];
      }
      async function filterByIngr(i) {
        const d = await apiFetch(
          `${API}/filter.php?i=${encodeURIComponent(i)}`,
        );
        return d.meals || [];
      }
      async function getById(id) {
        const d = await apiFetch(`${API}/lookup.php?i=${id}`);
        return d.meals ? d.meals[0] : null;
      }
      async function getRandom() {
        const d = await apiFetch(`${API}/random.php`);
        return d.meals ? d.meals[0] : null;
      }
      async function getCategories() {
        const d = await apiFetch(`${API}/categories.php`);
        return d.categories || [];
      }

      function extractIngredients(meal) {
        const arr = [];
        for (let i = 1; i <= 20; i++) {
          const nm = meal[`strIngredient${i}`];
          const ms = meal[`strMeasure${i}`];
          if (nm && nm.trim())
            arr.push({ name: nm.trim(), amount: (ms || "").trim() });
        }
        return arr;
      }

      function parseSteps(instr) {
        if (!instr) return [];
        let steps = instr
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 4);
        if (steps.length <= 2)
          steps = instr
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .map((s) => s.trim())
            .filter((s) => s.length > 5);
        return steps
          .map((s) => s.replace(/^(step\s*)?\d+[\.\):\-]\s*/i, ""))
          .filter((s) => s.length > 5)
          .slice(0, 15);
      }

      // ════════════════════════════════════════
      // CATEGORIES BAR
      // ════════════════════════════════════════
      async function loadCategories() {
        try {
          const cats = await getCategories();
          const bar = document.getElementById("categoryBar");
          const lbl = bar.querySelector(".cat-label");
          bar.innerHTML = "";
          bar.appendChild(lbl);
          cats.forEach((cat) => {
            const btn = document.createElement("button");
            btn.className = "cat-chip";
            btn.textContent = cat.strCategory;
            btn.dataset.category = cat.strCategory;
            btn.onclick = () => toggleCategoryFilter(btn);
            bar.appendChild(btn);
          });
        } catch (e) {
          console.error(e);
        }
      }

      // ════════════════════════════════════════
      // SEARCH
      // ════════════════════════════════════════
      async function startSearch() {
        const q = document.getElementById("searchInput").value.trim();
        if (!q || state.loading) return;
        clearFilters();
        await runSearch(() => searchByName(q));
      }
      function quickSearch(term) {
        document.getElementById("searchInput").value = term;
        startSearch();
      }
      function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      async function loadRandom() {
        showLoader(true);
        try {
          const meal = await getRandom();
          if (meal) {
            state.meals = [meal];
            state.filteredMeals = [meal];
            renderFull();
            openModal(meal);
          }
        } catch (e) {
          showToast("⚠️", "Failed to load random recipe");
        } finally {
          showLoader(false);
        }
      }

      // INGREDIENT SEARCH
      function toggleIngrSearch() {
        const bar = document.getElementById("ingrSearchBar");
        bar.classList.toggle("visible");
        if (bar.classList.contains("visible"))
          document.getElementById("ingrInput").focus();
      }
      function addIngredient() {
        const inp = document.getElementById("ingrInput");
        const val = inp.value.trim();
        if (!val || state.ingredients.includes(val)) return;
        state.ingredients.push(val);
        inp.value = "";
        renderIngrTags();
      }
      function removeIngredient(i) {
        state.ingredients.splice(i, 1);
        renderIngrTags();
      }
      function renderIngrTags() {
        document.getElementById("ingrTags").innerHTML = state.ingredients
          .map(
            (t, i) =>
              `<span class="ingr-tag">${t}<button onclick="removeIngredient(${i})">×</button></span>`,
          )
          .join("");
      }
      document.getElementById("ingrInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") addIngredient();
      });

      async function searchByIngredients() {
        if (!state.ingredients.length) {
          showToast("⚠️", "Add at least one ingredient");
          return;
        }
        clearFilters();
        // Search for first ingredient then intersect locally
        const main = state.ingredients[0];
        await runSearch(() => filterByIngr(main), true);
      }

      async function toggleAreaFilter(btn) {
        const area = btn.dataset.area;
        clearFilters();
        if (state.activeArea === area) {
          state.activeArea = null;
          resetGrid();
          return;
        }
        state.activeArea = area;
        btn.classList.add("active");
        document.getElementById("searchInput").value = "";
        await runSearch(() => filterByArea(area), true);
      }

      async function toggleCategoryFilter(btn) {
        const cat = btn.dataset.category;
        clearFilters();
        if (state.activeCategory === cat) {
          state.activeCategory = null;
          resetGrid();
          return;
        }
        state.activeCategory = cat;
        btn.classList.add("active");
        document.getElementById("searchInput").value = "";
        await runSearch(() => filterByCat(cat), true);
      }

      async function loadDefaultCategory(category = "Chicken") {
        const btn = Array.from(document.querySelectorAll(".cat-chip")).find(
          (chip) => chip.dataset.category === category,
        );

        if (!btn) return;

        await toggleCategoryFilter(btn);
      }

      function clearFilters() {
        state.activeArea = null;
        state.activeCategory = null;
        document
          .querySelectorAll(".filter-chip")
          .forEach((c) => c.classList.remove("active"));
        document
          .querySelectorAll(".cat-chip")
          .forEach((c) => c.classList.remove("active"));
      }

      function resetGrid() {
        state.meals = [];
        state.filteredMeals = [];
        state.page = 0;
        document.getElementById("recipeGrid").innerHTML = "";
        document.getElementById("sectionHeader").style.display = "none";
        document.getElementById("emptyState").classList.remove("visible");
      }

      async function runSearch(fetchFn, needsDetail = false) {
        resetGrid();
        showLoader(true);
        try {
          const meals = await fetchFn();
          if (!meals.length) {
            document.getElementById("emptyState").classList.add("visible");
            document.getElementById("sectionHeader").style.display = "flex";
            document.getElementById("resultCount").textContent = "(0 found)";
            return;
          }
          state.meals = meals;
          state.filteredMeals = [...meals];
          applySort();
          document.getElementById("sectionHeader").style.display = "flex";
          document.getElementById("resultCount").textContent =
            `(${meals.length} found)`;
          renderFull();
        } catch (e) {
          console.error(e);
          showToast("⚠️", "Failed to fetch recipes. Try again.");
        } finally {
          showLoader(false);
        }
      }

      function renderFull() {
        state.page = 0;
        document.getElementById("recipeGrid").innerHTML = "";
        renderPage();
      }

      // ════════════════════════════════════════
      // RENDER
      // ════════════════════════════════════════
      function setView(v) {
        state.currentView = v;
        const grid = document.getElementById("recipeGrid");
        grid.className = "recipe-grid" + (v === "list" ? " list-view" : "");
        document
          .getElementById("gridViewBtn")
          .classList.toggle("active", v === "grid");
        document
          .getElementById("listViewBtn")
          .classList.toggle("active", v === "list");
      }

      function renderPage() {
        const grid = document.getElementById("recipeGrid");
        const start = state.page * state.pageSize;
        const slice = state.filteredMeals.slice(start, start + state.pageSize);

        // Show skeleton first
        const skeletons = [];
        if (start === 0 && slice.length === 0) {
          return;
        }
        slice.forEach((_, i) => {
          const sk = buildSkeleton();
          sk.style.animationDelay = i * 60 + "ms";
          grid.appendChild(sk);
          skeletons.push(sk);
        });

        // Then replace with real cards
        setTimeout(() => {
          skeletons.forEach((sk, i) => {
            const meal = slice[i];
            if (!meal) return;
            const card = buildCard(meal, i * 65);
            grid.replaceChild(card, sk);
          });
        }, 200);
        state.page++;
      }

      function buildSkeleton() {
        const d = document.createElement("div");
        d.className = "skeleton-card";
        d.innerHTML = `<div class="skeleton-img"></div><div class="skeleton-body"><div class="skeleton-line w40"></div><div class="skeleton-line w80"></div><div class="skeleton-line w60"></div></div>`;
        return d;
      }

      function buildCard(meal, delay = 0) {
        const isFav = state.favorites.has(meal.idMeal);
        const hasNote = !!state.notes[meal.idMeal];
        const rating = state.ratings[meal.idMeal] || 0;
        const div = document.createElement("div");
        div.className = "recipe-card";
        div.style.animationDelay = delay + "ms";
        div.setAttribute("draggable", "true");
        div.dataset.mealId = meal.idMeal;
        div.onclick = (e) => {
          if (
            !e.target.closest(".fav-toggle") &&
            !e.target.closest(".drag-handle")
          )
            openModal(meal);
        };
        div.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("mealId", meal.idMeal);
          div.classList.add("dragging");
        });
        div.addEventListener("dragend", () => div.classList.remove("dragging"));

        const thumb = meal.strMealThumb || "";
        const area = meal.strArea || "";
        const cat = meal.strCategory || "";
        const starsHtml = rating ? "⭐".repeat(rating) : "";

        div.innerHTML = `
    <div class="card-img-wrap">
      ${thumb ? `<img src="${thumb}/preview" alt="${meal.strMeal}" loading="lazy" onerror="this.style.display='none'">` : ""}
      ${!thumb ? `<div class="food-emoji-placeholder">${getEmoji(meal.strMeal)}</div>` : ""}
      ${area ? `<div class="card-area-badge">🌍 ${area}</div>` : ""}
      <button class="fav-toggle ${isFav ? "active" : ""}" onclick="toggleFav('${meal.idMeal}',this)">${isFav ? "♥" : "♡"}</button>
      ${cat ? `<div class="card-category-badge">${cat}</div>` : ""}
    </div>
    <div class="card-body">
      <div class="card-cuisine">${area || cat || "World Cuisine"}</div>
      <div class="card-title">${meal.strMeal}</div>
      <div class="card-desc">${meal.strInstructions ? meal.strInstructions.slice(0, 100) + "…" : "Tap to view full recipe & ingredients."}</div>
      <div class="card-meta">
        <span class="card-tag">${cat || "Recipe"}</span>
        ${starsHtml ? `<span style="font-size:12px">${starsHtml}</span>` : ""}
        ${hasNote ? `<span class="card-note-indicator">📝 Note</span>` : ""}
      </div>
    </div>
    <button class="drag-handle" title="Drag to meal planner">⠿</button>
  `;
        return div;
      }

      // ════════════════════════════════════════
      // MODAL
      // ════════════════════════════════════════
      let modalMeal = null;

      async function openModal(meal) {
        let full = meal;
        if (!meal.strInstructions && meal.idMeal) {
          try {
            showLoader(true);
            full = (await getById(meal.idMeal)) || meal;
            const idx = state.meals.findIndex((m) => m.idMeal === meal.idMeal);
            if (idx !== -1) state.meals[idx] = full;
            const idx2 = state.filteredMeals.findIndex(
              (m) => m.idMeal === meal.idMeal,
            );
            if (idx2 !== -1) state.filteredMeals[idx2] = full;
          } catch (e) {
          } finally {
            showLoader(false);
          }
        }
        modalMeal = full;
        state.servings = 4;
        state.baseServings = 4;

        const isFav = state.favorites.has(full.idMeal);
        const ings = extractIngredients(full);
        const steps = parseSteps(full.strInstructions);

        // Header image
        const hdr = document.getElementById("modalHeader");
        hdr
          .querySelectorAll("img.modal-bg,.food-emoji-modal")
          .forEach((el) => el.remove());
        if (full.strMealThumb) {
          const img = document.createElement("img");
          img.className = "modal-bg";
          img.src = full.strMealThumb;
          img.alt = full.strMeal;
          img.style.cssText =
            "width:100%;height:100%;object-fit:cover;position:absolute;inset:0";
          hdr.insertBefore(img, hdr.firstChild);
        } else {
          const em = document.createElement("div");
          em.className = "food-emoji-modal";
          em.style.cssText =
            "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:90px";
          em.textContent = getEmoji(full.strMeal);
          hdr.insertBefore(em, hdr.firstChild);
        }

        document.getElementById("modalCuisine").textContent = full.strArea
          ? full.strArea + " Cuisine"
          : full.strCategory || "";
        document.getElementById("modalTitle").textContent = full.strMeal;
        const tags = [
          full.strCategory,
          full.strArea,
          ...(full.strTags ? full.strTags.split(",") : []),
        ].filter(Boolean);
        document.getElementById("modalTags").innerHTML = tags
          .map((t) => `<span class="modal-tag">${t.trim()}</span>`)
          .join("");
        document.getElementById("modalArea").textContent = full.strArea || "—";
        document.getElementById("modalIngCount").textContent = ings.length;
        document.getElementById("modalCategory").textContent =
          full.strCategory || "—";
        document.getElementById("scalerVal").textContent = state.servings;

        // Star rating
        const savedRating = state.ratings[full.idMeal] || 0;
        renderStars(savedRating);

        // Ingredients with checkboxes + add to shopping list
        renderModalIngredients(ings);

        // Steps
        renderModalSteps(steps);

        // Links
        const linksEl = document.getElementById("modalLinks");
        linksEl.innerHTML = "";
        if (full.strYoutube)
          linksEl.innerHTML += `<a class="youtube-link" href="${full.strYoutube}" target="_blank">▶ Watch on YouTube</a>`;
        if (full.strSource)
          linksEl.innerHTML += `<a class="source-link" href="${full.strSource}" target="_blank">🔗 Source Recipe</a>`;

        // Notes
        document.getElementById("notesArea").value =
          state.notes[full.idMeal] || "";
        document.getElementById("notesSavedMsg").classList.remove("show");

        // Fav btn
        const fb = document.getElementById("modalFavBtn");
        fb.className = "modal-fav-btn" + (isFav ? " active" : "");
        fb.innerHTML = isFav ? "♥ Saved" : "♡ Save";

        document.getElementById("modalOverlay").classList.add("open");
        document.body.style.overflow = "hidden";
      }

      function renderModalIngredients(ings) {
        const ratio = state.servings / state.baseServings;
        document.getElementById("modalIngredients").innerHTML = ings
          .map((ing, i) => {
            const scaledAmt = scaleAmount(ing.amount, ratio);
            const inShop = state.shopList.some((s) => s.name === ing.name);
            return `<div class="ingredient-item" id="ing_${i}" onclick="toggleIngredientCheck(${i})">
      <div class="ingredient-check" id="ingcheck_${i}"></div>
      <span class="ingredient-amount">${scaledAmt}</span>
      <span class="ingredient-name">${ing.name}</span>
      <button class="add-to-list-btn ${inShop ? "added" : ""}" onclick="event.stopPropagation();addIngToShop(${i},'${ing.name.replace(/'/g, "\\'")}','${scaledAmt.replace(/'/g, "\\'")}')" title="Add to shopping list">${inShop ? "✓ Listed" : "+ List"}</button>
    </div>`;
          })
          .join("");
      }

      function renderModalSteps(steps) {
        document.getElementById("modalSteps").innerHTML = steps.length
          ? steps
              .map(
                (s, i) =>
                  `<li class="step-item" id="step_${i}" onclick="toggleStep(${i})"><div class="step-num">${i + 1}</div><div class="step-text">${s}</div></li>`,
              )
              .join("")
          : `<li class="step-item"><div class="step-num">1</div><div class="step-text">${modalMeal.strInstructions || "No instructions available."}</div></li>`;
      }

      function toggleIngredientCheck(i) {
        const item = document.getElementById("ing_" + i);
        const check = document.getElementById("ingcheck_" + i);
        item.classList.toggle("checked");
        check.textContent = item.classList.contains("checked") ? "✓" : "";
      }
      function toggleStep(i) {
        document.getElementById("step_" + i)?.classList.toggle("done");
      }

      function scaleAmount(amount, ratio) {
        if (!amount || ratio === 1) return amount;
        // Replace numbers in amount string
        return amount.replace(/[\d.\/]+/g, (match) => {
          // Handle fractions like 1/2
          if (match.includes("/")) {
            const [a, b] = match.split("/");
            return roundNice((parseFloat(a) / parseFloat(b)) * ratio);
          }
          return roundNice(parseFloat(match) * ratio);
        });
      }
      function roundNice(n) {
        if (n === Math.floor(n)) return n.toString();
        return (Math.round(n * 4) / 4).toFixed(2).replace(/\.?0+$/, "");
      }

      function changeServings(delta) {
        state.servings = Math.max(1, Math.min(20, state.servings + delta));
        document.getElementById("scalerVal").textContent = state.servings;
        if (modalMeal) {
          const ings = extractIngredients(modalMeal);
          renderModalIngredients(ings);
        }
      }

      // ════════════════════════════════════════
      // STARS
      // ════════════════════════════════════════
      function renderStars(val) {
        document.querySelectorAll(".star").forEach((s, i) => {
          s.classList.toggle("active", i < val);
        });
      }
      document.getElementById("starRating").addEventListener("click", (e) => {
        const star = e.target.closest(".star");
        if (!star || !modalMeal) return;
        const val = parseInt(star.dataset.val);
        state.ratings[modalMeal.idMeal] = val;
        renderStars(val);
        persist();
        // Refresh card
        const card = document.querySelector(
          `[data-meal-id="${modalMeal.idMeal}"]`,
        );
        if (card) {
          const m = state.meals.find((m) => m.idMeal === modalMeal.idMeal);
          if (m) {
            const nc = buildCard(m);
            card.replaceWith(nc);
          }
        }
      });
      document
        .getElementById("starRating")
        .addEventListener("mouseover", (e) => {
          const star = e.target.closest(".star");
          if (!star) return;
          const val = parseInt(star.dataset.val);
          document
            .querySelectorAll(".star")
            .forEach(
              (s, i) =>
                (s.style.color = i < val ? "var(--gold-light)" : "#ddd"),
            );
        });
      document
        .getElementById("starRating")
        .addEventListener("mouseleave", () => {
          renderStars(modalMeal ? state.ratings[modalMeal.idMeal] || 0 : 0);
        });

      // ════════════════════════════════════════
      // NOTES
      // ════════════════════════════════════════
      function saveNote() {
        if (!modalMeal) return;
        state.notes[modalMeal.idMeal] =
          document.getElementById("notesArea").value;
        persist();
        const msg = document.getElementById("notesSavedMsg");
        msg.classList.add("show");
        setTimeout(() => msg.classList.remove("show"), 2000);
        // refresh fav panel if open
        renderFavPanel();
      }

      // ════════════════════════════════════════
      // MODAL CLOSE
      // ════════════════════════════════════════
      function closeModal() {
        document.getElementById("modalOverlay").classList.remove("open");
        document.body.style.overflow = "";
        modalMeal = null;
      }
      function handleModalClick(e) {
        if (e.target === document.getElementById("modalOverlay")) closeModal();
      }
      function toggleModalFav() {
        if (!modalMeal) return;
        toggleFavById(modalMeal.idMeal);
        const isFav = state.favorites.has(modalMeal.idMeal);
        const fb = document.getElementById("modalFavBtn");
        fb.className = "modal-fav-btn" + (isFav ? " active" : "");
        fb.innerHTML = isFav ? "♥ Saved" : "♡ Save";
      }

      // ════════════════════════════════════════
      // FAVORITES
      // ════════════════════════════════════════
      function toggleFav(id, btn) {
        toggleFavById(id);
        const isFav = state.favorites.has(id);
        btn.classList.toggle("active", isFav);
        btn.textContent = isFav ? "♥" : "♡";
        btn.classList.add("pop");
        btn.addEventListener(
          "animationend",
          () => btn.classList.remove("pop"),
          { once: true },
        );
      }
      function toggleFavById(id) {
        const meal =
          state.meals.find((m) => m.idMeal === id) || state.favorites.get(id);
        if (!meal) return;
        if (state.favorites.has(id)) {
          state.favorites.delete(id);
          showToast("💔", "Removed from favorites");
        } else {
          state.favorites.set(id, meal);
          showToast("♥", "Saved to favorites!");
        }
        persist();
        updateFavCount();
        renderFavPanel();
      }
      function updateFavCount() {
        document.getElementById("favCount").textContent = state.favorites.size;
      }
      function renderFavPanel() {
        const body = document.getElementById("favPanelBody");
        const favs = Array.from(state.favorites.values());
        if (!favs.length) {
          body.innerHTML = `<div class="fav-empty">🍽️<br>No saved recipes yet.</div>`;
          return;
        }
        body.innerHTML = favs
          .map((r) => {
            const note = state.notes[r.idMeal];
            const rating = state.ratings[r.idMeal];
            return `<div class="fav-item" onclick="openModal(${JSON.stringify(r).replace(/"/g, "&quot;")})">
      ${r.strMealThumb ? `<img class="fav-item-img" src="${r.strMealThumb}/preview" alt="${r.strMeal}" onerror="this.style.display='none'">` : `<div class="fav-item-emoji">${getEmoji(r.strMeal)}</div>`}
      <div class="fav-item-info">
        <div class="fav-item-title">${r.strMeal}</div>
        <div class="fav-item-meta">${r.strArea || ""} ${r.strCategory ? "• " + r.strCategory : ""} ${rating ? "• " + "⭐".repeat(rating) : ""}</div>
        ${note ? `<div class="fav-item-note">📝 ${note.slice(0, 40)}${note.length > 40 ? "…" : ""}</div>` : ""}
      </div>
      <button class="fav-remove" onclick="event.stopPropagation();toggleFavById('${r.idMeal}')" title="Remove">✕</button>
    </div>`;
          })
          .join("");
      }
      function toggleFavPanel() {
        const panel = document.getElementById("favPanel");
        const backdrop = document.getElementById("panelBackdrop");
        const isOpen = panel.classList.contains("open");
        if (!isOpen) renderFavPanel();
        panel.classList.toggle("open");
        backdrop.classList.toggle("open");
        document.body.style.overflow = isOpen ? "" : "hidden";
      }

      // ════════════════════════════════════════
      // SHOPPING LIST
      // ════════════════════════════════════════
      function addIngToShop(idx, name, amount) {
        const existing = state.shopList.find((s) => s.name === name);
        if (!existing) {
          state.shopList.push({ name, amount, checked: false });
        }
        persist();
        updateShopCount();
        const btn = document.querySelectorAll(".add-to-list-btn")[idx];
        if (btn) {
          btn.textContent = "✓ Listed";
          btn.classList.add("added");
        }
        showToast("🛒", `${name} added to shopping list`);
      }
      function updateShopCount() {
        const el = document.getElementById("shopCount");
        const n = state.shopList.filter((s) => !s.checked).length;
        el.textContent = n;
        el.style.display = n > 0 ? "flex" : "none";
      }
      function openShopList() {
        renderShopList();
        document.getElementById("shopOverlay").classList.add("open");
        document.body.style.overflow = "hidden";
      }
      function closeShopList() {
        document.getElementById("shopOverlay").classList.remove("open");
        document.body.style.overflow = "";
      }
      function handleShopClick(e) {
        if (e.target === document.getElementById("shopOverlay")) {
          closeShopList();
        }
      }
      function renderShopList() {
        const body = document.getElementById("shopBody");
        if (!state.shopList.length) {
          body.innerHTML = `<div class="shop-empty">Your shopping list is empty.<br>Add ingredients from any recipe.</div>`;
          return;
        }
        // Group by checked status
        const active = state.shopList.filter((s) => !s.checked);
        const done = state.shopList.filter((s) => s.checked);
        const renderItems = (arr) =>
          arr
            .map((item, i) => {
              const realIdx = state.shopList.indexOf(item);
              return `<div class="shop-item ${item.checked ? "done" : ""}" onclick="toggleShopItem(${realIdx})">
      <div class="shop-check">${item.checked ? "✓" : ""}</div>
      <span class="shop-amount">${item.amount || ""}</span>
      <span class="shop-name">${item.name}</span>
    </div>`;
            })
            .join("");
        body.innerHTML =
          renderItems(active) +
          (done.length
            ? `<div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--sand);padding:14px 0 6px">Done</div>` +
              renderItems(done)
            : "");
      }
      function toggleShopItem(i) {
        state.shopList[i].checked = !state.shopList[i].checked;
        persist();
        updateShopCount();
        renderShopList();
      }
      function clearShopList() {
        state.shopList = [];
        persist();
        updateShopCount();
        renderShopList();
      }

      // ════════════════════════════════════════
      // MEAL PLANNER
      // ════════════════════════════════════════
      let pickDayMeal = null,
        pickDaySelected = null,
        pickMealTypeSelected = "dinner";

      function openPlanner() {
        renderPlannerGrid();
        document.getElementById("plannerOverlay").classList.add("open");
        document.body.style.overflow = "hidden";
      }
      function closePlanner() {
        document.getElementById("plannerOverlay").classList.remove("open");
        document.body.style.overflow = "";
      }
      function handlePlannerClick(e) {
        if (e.target === document.getElementById("plannerOverlay"))
          closePlanner();
      }
      function clearPlan() {
        if (confirm("Clear entire meal plan?")) {
          state.mealPlan = {};
          persist();
          renderPlannerGrid();
        }
      }

      function renderPlannerGrid() {
        const grid = document.getElementById("plannerGrid");
        grid.innerHTML = DAYS.map(
          (day) => `
    <div class="day-col">
      <div class="day-header">${day}</div>
      ${MEAL_TYPES.map((type) => {
        const key = `${day}_${type}`;
        const meal = state.mealPlan[key];
        return `<div class="day-slot ${meal ? "has-meal" : ""}" id="slot_${key}"
          ondragover="e=>{e.preventDefault();document.getElementById('slot_${key}').classList.add('drag-over')}"
          ondragleave="document.getElementById('slot_${key}').classList.remove('drag-over')"
          ondrop="dropToSlot(event,'${key}')">
          <div class="meal-type-label">${type}</div>
          ${
            meal
              ? `<div class="planned-meal" onclick="openModal(${JSON.stringify(meal).replace(/"/g, "&quot;")})">
            ${meal.strMealThumb ? `<img class="planned-meal-img" src="${meal.strMealThumb}/preview" alt="${meal.strMeal}" onerror="this.style.display='none'">` : ""}
            <div class="planned-meal-name">${meal.strMeal}</div>
            <button class="planned-meal-remove" onclick="event.stopPropagation();removePlanMeal('${key}')">✕</button>
          </div>`
              : `<div class="add-to-plan-prompt">Drop a recipe here</div>`
          }
        </div>`;
      }).join("")}
    </div>
  `,
        ).join("");
      }

      function dropToSlot(e, key) {
        e.preventDefault();
        document.getElementById("slot_" + key)?.classList.remove("drag-over");
        const id = e.dataTransfer.getData("mealId");
        const meal =
          state.meals.find((m) => m.idMeal === id) || state.favorites.get(id);
        if (!meal) return;
        state.mealPlan[key] = meal;
        persist();
        renderPlannerGrid();
        showToast("📅", `${meal.strMeal} added to ${key.replace("_", " ")}`);
      }

      function removePlanMeal(key) {
        delete state.mealPlan[key];
        persist();
        renderPlannerGrid();
      }

      // Pick day modal (from recipe modal "Plan" button)
      function openPlanPicker() {
        if (!modalMeal) return;
        pickDayMeal = modalMeal;
        pickDaySelected = null;
        pickMealTypeSelected = "dinner";
        // Build day buttons
        const grid = document.getElementById("pickDayGrid");
        grid.innerHTML = DAYS.map(
          (d) =>
            `<button class="pick-day-btn" data-day="${d}" onclick="selectPickDay(this,'${d}')">${d}</button>`,
        ).join("");
        // Meal type buttons
        document.querySelectorAll(".pick-type-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.type === "dinner");
          b.onclick = () => {
            document
              .querySelectorAll(".pick-type-btn")
              .forEach((x) => x.classList.remove("active"));
            b.classList.add("active");
            pickMealTypeSelected = b.dataset.type;
          };
        });
        document.getElementById("pickDayOverlay").classList.add("open");
      }
      function selectPickDay(btn, day) {
        document
          .querySelectorAll(".pick-day-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        pickDaySelected = day;
      }
      function closePickDay() {
        document.getElementById("pickDayOverlay").classList.remove("open");
      }
      function confirmAddToPlan() {
        if (!pickDaySelected) {
          showToast("⚠️", "Please select a day");
          return;
        }
        const key = `${pickDaySelected}_${pickMealTypeSelected}`;
        state.mealPlan[key] = pickDayMeal;
        persist();
        closePickDay();
        showToast("📅", `Added to ${pickDaySelected} ${pickMealTypeSelected}!`);
      }

      function generateShopListFromPlan() {
        const meals = Object.values(state.mealPlan).filter(Boolean);
        if (!meals.length) {
          showToast("⚠️", "No meals in plan yet");
          return;
        }
        let added = 0;
        meals.forEach((meal) => {
          const ings = extractIngredients(meal);
          ings.forEach((ing) => {
            const exists = state.shopList.some((s) => s.name === ing.name);
            if (!exists) {
              state.shopList.push({
                name: ing.name,
                amount: ing.amount,
                checked: false,
              });
              added++;
            }
          });
        });
        persist();
        updateShopCount();
        closePlanner();
        openShopList();
        showToast("🛒", `${added} ingredients added to shopping list`);
      }

      // ════════════════════════════════════════
      // COOKING MODE
      // ════════════════════════════════════════
      function startCookingMode() {
        if (!modalMeal) return;
        const steps = parseSteps(modalMeal.strInstructions);
        if (!steps.length) {
          showToast("⚠️", "No step-by-step instructions available");
          return;
        }
        state.cookSteps = steps;
        state.cookStep = 0;
        document.getElementById("cookTitle").textContent = modalMeal.strMeal;
        document.getElementById("cookOverlay").classList.add("open");
        document.body.style.overflow = "hidden";
        renderCookIngredients();
        renderCookStep();
        closeModal();
      }
      function exitCookingMode() {
        document.getElementById("cookOverlay").classList.remove("open");
        document.body.style.overflow = "";
        timerReset();
      }
      function renderCookIngredients() {
        const ings = extractIngredients(modalMeal || {});
        const el = document.getElementById("cookIngredients");
        if (!ings.length) {
          el.style.display = "none";
          return;
        }
        el.style.display = "block";
        el.innerHTML =
          `<div class="cook-ingr-title">Ingredients needed</div>` +
          ings
            .slice(0, 8)
            .map(
              (i) =>
                `<div class="cook-ingr-item"><span class="cook-ingr-amt">${i.amount}</span>${i.name}</div>`,
            )
            .join("") +
          (ings.length > 8
            ? `<div class="cook-ingr-item" style="opacity:0.4">+${ings.length - 8} more…</div>`
            : "");
      }
      function renderCookStep() {
        const steps = state.cookSteps;
        const i = state.cookStep;
        // Progress
        document.getElementById("cookProgress").innerHTML = steps
          .map(
            (_, j) =>
              `<div class="cook-pip ${j < i ? "done" : j === i ? "active" : ""}"></div>`,
          )
          .join("");
        document.getElementById("cookStepNum").textContent =
          `Step ${i + 1} of ${steps.length}`;
        document.getElementById("cookStepText").textContent = steps[i];
        document.getElementById("cookPrev").disabled = i === 0;
        document.getElementById("cookNext").textContent =
          i === steps.length - 1 ? "🎉 Done!" : "Next Step →";
      }
      function cookNav(d) {
        const newStep = state.cookStep + d;
        if (newStep < 0) return;
        if (newStep >= state.cookSteps.length) {
          exitCookingMode();
          showToast("🎉", "Recipe complete! Enjoy your meal!");
          return;
        }
        state.cookStep = newStep;
        timerReset();
        renderCookStep();
      }
      // Timer
      let timerSeconds = 0,
        timerRunning = false,
        timerInterval = null;
      function setTimer(mins) {
        timerReset();
        timerSeconds = mins * 60;
        timerRunning = true;
        renderTimer();
        timerInterval = setInterval(() => {
          timerSeconds--;
          renderTimer();
          if (timerSeconds <= 0) {
            timerReset();
            showToast("⏱", "Timer done!");
          }
        }, 1000);
      }
      function timerReset() {
        clearInterval(timerInterval);
        timerRunning = false;
        timerSeconds = 0;
        document.getElementById("cookTimerDisplay").textContent = "—";
      }
      function renderTimer() {
        const m = Math.floor(timerSeconds / 60);
        const s = timerSeconds % 60;
        document.getElementById("cookTimerDisplay").textContent =
          `${m}:${s.toString().padStart(2, "0")}`;
      }

      // ════════════════════════════════════════
      // SORT & FILTER
      // ════════════════════════════════════════
      function applySort() {
        const val = document.getElementById("sortSelect").value;
        let arr = [...state.filteredMeals];
        if (val === "az")
          arr.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
        else if (val === "za")
          arr.sort((a, b) => b.strMeal.localeCompare(a.strMeal));
        state.filteredMeals = arr;
      }
      function sortRecipes() {
        renderFull();
      }

      // ════════════════════════════════════════
      // INFINITE SCROLL
      // ════════════════════════════════════════
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          if (state.page * state.pageSize < state.filteredMeals.length)
            renderPage();
        },
        { threshold: 0.5 },
      );
      observer.observe(document.getElementById("sentinel"));

      // ════════════════════════════════════════
      // TOAST & LOADER
      // ════════════════════════════════════════
      let toastTimer;
      function showToast(icon, msg) {
        clearTimeout(toastTimer);
        document.getElementById("toastIcon").textContent = icon;
        document.getElementById("toastMsg").textContent = msg;
        const t = document.getElementById("toast");
        t.classList.add("show");
        toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
      }
      function showLoader(v) {
        state.loading = v;
        document.getElementById("loader").style.display = v ? "flex" : "none";
        document.getElementById("searchBtn").disabled = v;
      }

      // ════════════════════════════════════════
      // KEYBOARD
      // ════════════════════════════════════════
      document
        .getElementById("searchInput")
        .addEventListener("keydown", (e) => {
          if (e.key === "Enter") startSearch();
        });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeModal();
          closePlanner();
          closePickDay();
          closeShopList();
          closePopup();
          if (document.getElementById("cookOverlay").classList.contains("open"))
            exitCookingMode();
        }
      });


      // ════════════════════════════════════════
      // INFO POPUP
      // ════════════════════════════════════════
      function showPopup() {
        const popupOverlay = document.getElementById("popup-overlay");
        popupOverlay.classList.add("active");
        popupOverlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
      function closePopup() {
        const popupOverlay = document.getElementById("popup-overlay");
        popupOverlay.classList.remove("active");
        popupOverlay.setAttribute("aria-hidden", "true");
        const overlays = [
          "modalOverlay",
          "plannerOverlay",
          "pickDayOverlay",
          "shopOverlay",
          "cookOverlay",
        ];
        const keepLocked = overlays.some((id) =>
          document.getElementById(id)?.classList.contains("open"),
        );
        if (!keepLocked) document.body.style.overflow = "";
      }
      document.getElementById("popup-overlay").addEventListener("click", (e) => {
        if (e.target === document.getElementById("popup-overlay")) closePopup();
      });

      // ════════════════════════════════════════
      // INIT
      // ════════════════════════════════════════
      hydrate();
      loadCategories().then(() => loadDefaultCategory());
      showPopup();
