// ===== GATEKEEPER (Privacy Lock) =====
const HOME_IP = '73.144.43.202';
const SECRET_PIN = '7878';

async function initGatekeeper() {
  const gate = document.getElementById('gatekeeper');
  const pinArea = document.getElementById('pin-area');
  const subText = gate.querySelector('.lock-sub');

  // 1. Check if already unlocked this session
  if (sessionStorage.getItem('mealplan_unlocked') === 'true') {
    gate.style.display = 'none';
    return;
  }

  try {
    // 2. Attempt IP verification
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    if (data.ip === HOME_IP) {
      unlockGate();
      return;
    }
  } catch (e) {
    console.warn('IP check failed, falling back to PIN');
  }

  // 3. Show PIN prompt if IP check fails or isn't home
  subText.textContent = 'Verification required for public access.';
  pinArea.style.display = 'block';
  document.getElementById('gate-pin').focus();
}

function checkPin() {
  const input = document.getElementById('gate-pin').value;
  if (input === SECRET_PIN) {
    unlockGate();
    sessionStorage.setItem('mealplan_unlocked', 'true');
  } else {
    showToast('Invalid PIN', 'error');
    document.getElementById('gate-pin').value = '';
  }
}

function unlockGate() {
  const gate = document.getElementById('gatekeeper');
  gate.style.opacity = '0';
  setTimeout(() => { gate.style.display = 'none'; }, 300);
}

// Start gatekeeper immediately
initGatekeeper();

// ===== STATE =====
const state = {
  apiKey: '',
  provider: 'groq', // 'groq' | 'openrouter' | 'gemini'
  plan: {}, // { "Mon": { breakfast: "...", lunch: "...", dinner: "..." }, ... }
  grocery: [], // [{ section, name, qty, checked }]
  recipes: {}, // { mealName: { ... } }
  prefs: {
    goTos: [],
    staples: [],
    avoid: [],
    dietaryNotes: '',
    servings: 4,
    customPrompt: ''
  }
};

// ===== PROVIDER CONFIG =====
const PROVIDERS = {
  groq: {
    label: 'Groq (Free ⚡)',
    placeholder: 'gsk_…',
    signupUrl: 'https://console.groq.com',
    signupLabel: 'console.groq.com',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
    defaultModel: 'llama-3.3-70b-versatile',
    type: 'openai-compat',
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  openrouter: {
    label: 'OpenRouter (Free models)',
    placeholder: 'sk-or-…',
    signupUrl: 'https://openrouter.ai/keys',
    signupLabel: 'openrouter.ai',
    models: ['meta-llama/llama-4-scout:free', 'google/gemini-2.0-flash-exp:free', 'deepseek/deepseek-r1:free'],
    defaultModel: 'meta-llama/llama-4-scout:free',
    type: 'openai-compat',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  gemini: {
    label: 'Google Gemini',
    placeholder: 'AIza…',
    signupUrl: 'https://aistudio.google.com/apikey',
    signupLabel: 'aistudio.google.com',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  }
};

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MEAL_TYPES = ['dinner'];

const MEIJER_SECTIONS = [
  { id: 'produce',    label: 'Produce',           icon: '🥦' },
  { id: 'meat',       label: 'Meat & Seafood',     icon: '🥩' },
  { id: 'dairy',      label: 'Dairy & Eggs',       icon: '🥛' },
  { id: 'deli',       label: 'Deli',               icon: '🫙' },
  { id: 'bakery',     label: 'Bakery & Bread',     icon: '🍞' },
  { id: 'frozen',     label: 'Frozen',             icon: '🧊' },
  { id: 'canned',     label: 'Canned & Dry Goods', icon: '🥫' },
  { id: 'pasta',      label: 'Pasta, Rice & Beans',icon: '🍝' },
  { id: 'snacks',     label: 'Snacks & Cereal',    icon: '🥣' },
  { id: 'condiments', label: 'Condiments & Oils',  icon: '🫙' },
  { id: 'spices',     label: 'Spices & Baking',    icon: '🧂' },
  { id: 'beverages',  label: 'Beverages',          icon: '🧃' },
  { id: 'health',     label: 'Health & Personal',  icon: '💊' },
  { id: 'household',  label: 'Household',          icon: '🧹' },
  { id: 'other',      label: 'Other',              icon: '🛒' }
];

const DEFAULT_GOTOS = [
  'Steak + potatoes + squash or green beans',
  'Homemade Meatballs + mashed potatoes + veggies',
  'Spaghetti & meatballs',
  'Beef/turkey enchiladas',
  'Chicken Caesar wraps',
  'Mediterranean chicken bowls (feta, cucumber, tomato, tzatziki)',
  'Chicken tacos (with corn/bean salsa)',
  'Fried chicken tacos',
  'Sheet‑pan chicken + veggies (feta, chickpeas, onion, cauliflower, zucchini)',
  'Chicken stir fry',
  'White chicken chili',
  'Chicken fettuccine Alfredo',
  'Greek chicken bowls',
  'Chicken Parmesan (baked)',
  'Shrimp + cilantro lime rice + Brussels sprouts',
  'Salmon + potatoes + green beans',
  'Sushi takeout night',
  'Veggie fried rice',
  'Tofu stir fry with rice (broccoli, egg, carrots)',
  'Stir‑fry noodles with veggies',
  'Loaded sweet potatoes (black beans, corn, avocado, cheese)',
  'Indian Vegetable Stew',
  'Pad Thai',
  'Breakfast for dinner (sweet + savory options)',
  'Kids: pizza • Adults: salad + chicken',
  'Kids: nuggets with lava • Adults: bowls or wraps',
  'Backup mac and cheese nights',
  'JMikes',
  'Wing Snob',
  '5th Tavern',
  'General "order in" nights'
];

const DEFAULT_SIDES = [
  'Broccoli', 'Green beans', 'Brussels sprouts', 
  'Potatoes (baked, mashed, roasted)', 'Cilantro lime rice', 
  'Bread/garlic bread', 'Fruit sides for kids', 'Cucumber + tzatziki'
];

const DEFAULT_STAPLES = [
  'Milk', 'Butter', 'Cottage Cheese', 'Yogurt', 'Cereal', 'Lunchables'
];

// ===== STORAGE =====
function save() {
  localStorage.setItem('mealplanner_state', JSON.stringify({
    plan: state.plan,
    grocery: state.grocery,
    recipes: state.recipes,
    prefs: state.prefs
  }));
}

function load() {
  const raw = localStorage.getItem('mealplanner_state');
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      Object.assign(state.plan, saved.plan || {});
      state.grocery = saved.grocery || [];
      state.recipes = saved.recipes || {};
      Object.assign(state.prefs, saved.prefs || {});
    } catch(e) {}
  }
  const prov = localStorage.getItem('mealplanner_provider');
  if (prov && PROVIDERS[prov]) state.provider = prov;

  const key = localStorage.getItem('mealplanner_apikey');
  if (key) {
    // Guard against key/provider mismatch (e.g. old Gemini key with new Groq provider)
    const isGeminiKey = key.startsWith('AIza');
    const isGeminiProvider = state.provider === 'gemini';
    if (isGeminiKey !== isGeminiProvider) {
      // Clear the mismatched key — user will be prompted to re-enter
      localStorage.removeItem('mealplanner_apikey');
      console.warn('MealPlan: Cleared mismatched API key (wrong key type for selected provider)');
    } else {
      state.apiKey = key;
    }
  }

  if (state.prefs.goTos.length === 0) state.prefs.goTos = [...DEFAULT_GOTOS];
  if (!state.prefs.staples || state.prefs.staples.length === 0) state.prefs.staples = [...DEFAULT_STAPLES];
}

// ===== UNIFIED AI CALL =====
function providerName() {
  return PROVIDERS[state.provider]?.label || 'AI';
}

async function callAI(prompt, jsonHint = null) {
  if (!state.apiKey) {
    showToast('Add your API key in Settings → AI Provider', 'error');
    throw new Error('No API key');
  }
  const prov = PROVIDERS[state.provider];
  if (!prov) throw new Error('Unknown provider');

  if (prov.type === 'gemini') {
    return callGeminiNative(prompt, jsonHint, prov);
  } else {
    return callOpenAICompat(prompt, jsonHint, prov);
  }
}

// Gemini native API (supports structured responseSchema)
async function callGeminiNative(prompt, jsonHint, prov) {
  const model = prov.defaultModel;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
      ...(jsonHint ? { responseMimeType: 'application/json', responseSchema: jsonHint } : {})
    }
  };
  const res = await fetch(
    `${prov.baseUrl}/${model}:generateContent?key=${state.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (jsonHint) {
    try {
      return JSON.parse(cleanJson(text));
    } catch(e) {
      throw new Error('Invalid JSON from Gemini — please try again');
    }
  }
  return text;
}

// OpenAI-compatible API (Groq, OpenRouter) — uses JSON mode
async function callOpenAICompat(prompt, jsonHint, prov) {
  // json_object mode requires the word JSON in the system prompt AND the response must be an object.
  // If the caller wants an array (e.g. grocery list), we wrap it in { items: [...] } and unwrap after.
  const wantArray = jsonHint && jsonHint.type === 'array';

  const systemMsg = jsonHint
    ? 'You are a helpful meal planning assistant. Always respond with valid JSON only — no markdown fences, no extra text, just raw JSON.'
    : 'You are a helpful meal planning assistant.';

  // For array results, redirect the model to return { "items": [...] }
  const userContent = (wantArray && jsonHint)
    ? prompt.replace(/Return JSON array of items\.?/i, 'Return a JSON object with a single key "items" whose value is the array of grocery items.')
    : prompt;

  const messages = [
    { role: 'system', content: systemMsg },
    { role: 'user',   content: userContent }
  ];

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` };
  if (state.provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin || 'https://mealplan.app';
    headers['X-Title'] = 'MealPlan';
  }

  const body = {
    model: prov.defaultModel,
    messages,
    temperature: 0.8,
    max_tokens: 4096, // stay within free-tier TPM limits
    ...(jsonHint ? { response_format: { type: 'json_object' } } : {})
  };

  const res = await fetch(`${prov.baseUrl}/chat/completions`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `${prov.label} error ${res.status}`;
    // Hint at a key mismatch if it's a 401
    if (res.status === 401) {
      throw new Error(`Invalid API key for ${prov.label}. Go to Settings → AI Provider to re-enter your key.`);
    }
    throw new Error(msg);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (jsonHint) {
    try {
      const parsed = JSON.parse(cleanJson(text));
      // Unwrap { items: [...] } if we wrapped it
      return wantArray ? (parsed.items ?? parsed) : parsed;
    } catch(e) {
      console.error('JSON Parse Error. Raw text:', text);
      throw new Error(`Invalid JSON from ${prov.label} — try again`);
    }
  }
  return text;
}

// Build context string from prefs
function buildPrefsContext() {
  const commonSides = [
    'Broccoli', 'Green beans', 'Brussels sprouts', 
    'Potatoes (baked, mashed, roasted)', 'Cilantro lime rice', 
    'Bread/garlic bread', 'Fruit sides for kids', 'Cucumber + tzatziki'
  ].join(', ');

  return [
    state.prefs.goTos.length   ? `Favorite/go-to meals (Prioritize these): ${state.prefs.goTos.join(', ')}` : '',
    `Common sides we use (Pair these with meals where appropriate): ${commonSides}`,
    state.prefs.avoid.length   ? `Avoid: ${state.prefs.avoid.join(', ')}` : '',
    state.prefs.dietaryNotes   ? `Dietary notes: ${state.prefs.dietaryNotes}` : '',
    `Servings per meal: ${state.prefs.servings}`
  ].filter(Boolean).join('\n');
}

// ===== GENERATE WEEK PLAN =====
async function generateWeekPlan(customInstruction = '') {
  const ctx = buildPrefsContext();
  const prompt = `You are a helpful meal planning assistant. Generate a full 7-day meal plan (Sunday through Saturday).
User preferences:
${ctx}
${customInstruction ? `Additional instruction: ${customInstruction}` : ''}

Respond with JSON matching the schema exactly. Use short, recognizable meal names (max 5 words). 
IMPORTANT: Wrap day names in double asterisks (e.g., "**Sunday**"). Only include the 'dinner' key for each day. Do NOT include breakfast or lunch.

  const schema = {
    type: 'object',
    properties: Object.fromEntries(DAYS.map(d => [d, {
      type: 'object',
      properties: {
        dinner:    { type: 'string' }
      },
      required: ['dinner']
    }])),
    required: DAYS
  };

  showLoading('planner-loading', 'Crafting your week\u2026');
  try {
    const rawResult = await callAI(prompt, schema);
    console.log('AI Raw Result:', rawResult);
    
    // Create a flattened map of everything in the response to find days easily
    const flatResult = {};
    function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        // Strip ** from keys to find target days
        const cleanK = k.replace(/\*\*/g, '');
        flatResult[cleanK] = v;
        if (typeof v === 'object') walk(v);
      }
    }
    walk(rawResult);

    let foundAny = false;
    DAYS.forEach(d => {
      const fullDay = {
        'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 
        'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday'
      }[d];
      
      // Look for any key that matches this day (case-insensitive) in our flat map
      const dayKey = Object.keys(flatResult).find(k => 
        k.toLowerCase() === d.toLowerCase() || k.toLowerCase() === fullDay.toLowerCase()
      );

      if (dayKey) {
        const val = flatResult[dayKey];
        if (val && typeof val === 'object' && val.dinner) {
          state.plan[d] = { dinner: val.dinner };
          foundAny = true;
        } else if (typeof val === 'string') {
          state.plan[d] = { dinner: val };
          foundAny = true;
        }
      }
    });
    
    if (!foundAny) {
      console.warn('Could not find any days in AI response:', rawResult);
      throw new Error('AI response was formatted unexpectedly. Try again?');
    }
    
    save();
    renderPlan();
    showToast('Week plan generated! \u2728', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    hideLoading('planner-loading');
  }
}

// ===== GENERATE GROCERY LIST =====
async function generateGrocery() {
  const meals = [];
  DAYS.forEach(d => {
    const day = state.plan[d];
    if (day) MEAL_TYPES.forEach(t => { if (day[t]) meals.push(day[t]); });
  });
  if (meals.length === 0) { showToast('Generate a meal plan first', 'error'); return; }

  const sectionIds = MEIJER_SECTIONS.map(s => s.id);
  const prompt = `Create a consolidated grocery list for these meals: ${meals.join(', ')}.
Servings per meal: ${state.prefs.servings}.
${state.prefs.dietaryNotes ? `Dietary notes: ${state.prefs.dietaryNotes}` : ''}

Organize items by these Meijer store sections (use exact IDs): ${sectionIds.join(', ')}.
Consolidate duplicate ingredients. Use practical quantities (e.g. "2 lbs", "1 bunch", "1 can").

Return JSON array of items.`;

  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: sectionIds },
        name:    { type: 'string' },
        qty:     { type: 'string' }
      },
      required: ['section','name','qty']
    }
  };

  showLoading('grocery-loading', 'Building your Meijer list\u2026');
  try {
    const items = await callAI(prompt, schema);
    
    // Combine AI items with staples
    const finalItems = items.map(i => ({ ...i, checked: false }));
    
    // Add staples if not already present
    state.prefs.staples.forEach(staple => {
      const lower = staple.toLowerCase();
      if (!finalItems.some(i => i.name.toLowerCase().includes(lower))) {
        finalItems.push({ section: 'other', name: staple, qty: '1', checked: false });
      }
    });

    state.grocery = finalItems;
    save();
    renderGrocery();
    switchView('grocery');
    showToast('Grocery list ready! \u1F6D2', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    hideLoading('grocery-loading');
  }
}

// ===== GENERATE RECIPE =====
async function generateRecipe(mealName) {
  if (state.recipes[mealName]) { showRecipeModal(mealName); return; }

  const prompt = `Write a detailed recipe for: "${mealName}"
Servings: ${state.prefs.servings}
${state.prefs.dietaryNotes ? `Dietary notes: ${state.prefs.dietaryNotes}` : ''}

Include: brief description, prep time, cook time, ingredients list with measurements, step-by-step instructions, and any tips.
Return as JSON.`;

  const schema = {
    type: 'object',
    properties: {
      name:         { type: 'string' },
      description:  { type: 'string' },
      prepTime:     { type: 'string' },
      cookTime:     { type: 'string' },
      servings:     { type: 'string' },
      ingredients:  { type: 'array', items: { type: 'string' } },
      instructions: { type: 'array', items: { type: 'string' } },
      tips:         { type: 'string' },
      emoji:        { type: 'string' }
    },
    required: ['name','ingredients','instructions']
  };

  showLoading('recipe-loading', `Getting recipe for ${mealName}…`);
  try {
    const recipe = await callAI(prompt, schema);
    state.recipes[mealName] = recipe;
    save();
    showRecipeModal(mealName);
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    hideLoading('recipe-loading');
  }
}

// ===== RENDER PLAN =====
function renderPlan() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;
  grid.innerHTML = DAYS.map(d => {
    const day = state.plan[d] || {};
    const hasMeal = Object.values(day).some(Boolean);
    const chips = MEAL_TYPES.map(t =>
      day[t] ? `<div class="meal-chip ${t}" title="${day[t]}" onclick="generateRecipe('${escHtml(day[t])}')">
        ${escHtml(truncate(day[t], 18))}
      </div>` : ''
    ).join('');
    return `<div class="day-card ${hasMeal ? 'has-meal' : ''}" onclick="openDayModal('${d}')">
      <div class="day-name">${d}</div>
      <div class="day-meals">${chips || '<div class="day-add">+ add</div>'}</div>
    </div>`;
  }).join('');
}

// ===== RENDER GROCERY =====
function renderGrocery() {
  const container = document.getElementById('grocery-list');
  if (!container) return;
  if (state.grocery.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="es-icon">🛒</div>
      <h3>No grocery list yet</h3>
      <p>Generate your week plan first, then tap "Build Grocery List"</p>
    </div>`;
    return;
  }

  const bySection = {};
  state.grocery.forEach((item, idx) => {
    if (!bySection[item.section]) bySection[item.section] = [];
    bySection[item.section].push({ ...item, idx });
  });

  const uncheckedCount = state.grocery.filter(i => !i.checked).length;
  document.getElementById('grocery-count').textContent = `${uncheckedCount} item${uncheckedCount !== 1 ? 's' : ''} remaining`;

  container.innerHTML = MEIJER_SECTIONS
    .filter(s => bySection[s.id])
    .map(s => `
      <div class="grocery-section">
        <div class="grocery-section-header">
          <span class="section-icon">${s.icon}</span>${s.label}
          <span style="margin-left:auto;font-size:0.75rem;opacity:0.6">${bySection[s.id].length}</span>
        </div>
        <div class="grocery-items">
          ${bySection[s.id].map(item => `
            <div class="grocery-item ${item.checked ? 'checked' : ''}" id="gitem-${item.idx}">
              <div class="grocery-check ${item.checked ? 'done' : ''}" onclick="toggleGrocery(${item.idx})"></div>
              <span class="item-name">${escHtml(item.name)}</span>
              <span class="item-qty">${escHtml(item.qty)}</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
}

// ===== GROCERY TOGGLE =====
function toggleGrocery(idx) {
  state.grocery[idx].checked = !state.grocery[idx].checked;
  save();
  renderGrocery();
}

// ===== RENDER RECIPES VIEW =====
function renderRecipesView() {
  const container = document.getElementById('recipes-list');
  if (!container) return;
  const keys = Object.keys(state.recipes);
  if (keys.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="es-icon">📖</div>
      <h3>No recipes yet</h3>
      <p>Tap any meal on the planner to load its recipe</p>
    </div>`;
    return;
  }
  container.innerHTML = keys.map(name => {
    const r = state.recipes[name];
    return `<div class="recipe-card">
      <div class="recipe-header">
        <div class="recipe-icon">${r.emoji || '🍽️'}</div>
        <div>
          <div class="recipe-title">${escHtml(r.name || name)}</div>
          <div class="recipe-meta">${[r.prepTime && `Prep: ${r.prepTime}`, r.cookTime && `Cook: ${r.cookTime}`, r.servings && `Serves: ${r.servings}`].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div class="recipe-body">
        ${r.description ? `<p style="color:var(--text2);font-size:.875rem;margin-bottom:.75rem">${escHtml(r.description)}</p>` : ''}
        <div class="recipe-section">
          <h4>Ingredients</h4>
          <ul>${(r.ingredients||[]).map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>
        </div>
        <div class="recipe-section">
          <h4>Instructions</h4>
          <ol>${(r.instructions||[]).map(s => `<li>${escHtml(s)}</li>`).join('')}</ol>
        </div>
        ${r.tips ? `<div class="recipe-section"><h4>Tips</h4><p>${escHtml(r.tips)}</p></div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ===== RECIPE MODAL =====
function showRecipeModal(mealName) {
  const r = state.recipes[mealName];
  if (!r) return;
  const el = document.getElementById('recipe-modal-body');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem">
      <span style="font-size:2rem">${r.emoji || '🍽️'}</span>
      <div>
        <div class="recipe-title" style="font-family:'Fraunces',serif;font-size:1.15rem;font-weight:700">${escHtml(r.name||mealName)}</div>
        <div class="recipe-meta" style="font-size:.8rem;color:var(--text2)">${[r.prepTime&&`Prep: ${r.prepTime}`,r.cookTime&&`Cook: ${r.cookTime}`,r.servings&&`Serves: ${r.servings}`].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
    ${r.description?`<p style="color:var(--text2);font-size:.875rem;margin-bottom:.75rem">${escHtml(r.description)}</p>`:''}
    <div class="recipe-section"><h4>Ingredients</h4><ul>${(r.ingredients||[]).map(i=>`<li>${escHtml(i)}</li>`).join('')}</ul></div>
    <div class="recipe-section"><h4>Instructions</h4><ol>${(r.instructions||[]).map(s=>`<li>${escHtml(s)}</li>`).join('')}</ol></div>
    ${r.tips?`<div class="recipe-section"><h4>Tips</h4><p>${escHtml(r.tips)}</p></div>`:''}`;
  openModal('recipe-modal');
}

// ===== DAY MODAL =====
function openDayModal(day) {
  const d = state.plan[day] || {};
  document.getElementById('day-modal-title').textContent = `${day}'s Meals`;
  MEAL_TYPES.forEach(t => {
    const el = document.getElementById(`day-${t}`);
    if (el) el.value = d[t] || '';
  });
  document.getElementById('day-modal').dataset.day = day;
  openModal('day-modal');
}

function saveDayModal() {
  const day = document.getElementById('day-modal').dataset.day;
  if (!state.plan[day]) state.plan[day] = {};
  MEAL_TYPES.forEach(t => {
    const val = document.getElementById(`day-${t}`).value.trim();
    state.plan[day][t] = val;
  });
  save(); renderPlan(); closeModal('day-modal');
}

// ===== PREFERENCES =====
function renderPrefs() {
  document.getElementById('pref-servings').value = state.prefs.servings;
  document.getElementById('pref-dietary').value  = state.prefs.dietaryNotes;
  document.getElementById('api-key-input').value = state.apiKey ? '••••••••' + state.apiKey.slice(-6) : '';
  // Render provider selector
  const sel = document.getElementById('provider-select');
  if (sel) sel.value = state.provider;
  updateProviderHint();
  renderTagList('gotos-tags', state.prefs.goTos, 'goTos');
  renderTagList('staples-tags', state.prefs.staples, 'staples');
  renderTagList('avoid-tags', state.prefs.avoid, 'avoid');
}

function updateProviderHint() {
  const prov = PROVIDERS[state.provider];
  if (!prov) return;
  const hintText = `Get a free key at <a href="${prov.signupUrl}" target="_blank" rel="noopener" style="color:var(--purple2)">${prov.signupLabel}</a>. Stored only on this device.`;
  const hs = document.getElementById('provider-hint-settings');
  const hm = document.getElementById('provider-hint-modal');
  if (hs) hs.innerHTML = hintText;
  if (hm) hm.innerHTML = hintText;
  const inp = document.getElementById('api-key-input');
  if (inp) inp.placeholder = prov.placeholder;
  const raw = document.getElementById('api-key-raw');
  if (raw) raw.placeholder = prov.placeholder;
}

function onProviderChange() {
  const sel = document.getElementById('provider-select');
  state.provider = sel.value;
  localStorage.setItem('mealplanner_provider', state.provider);
  // Clear key display when switching providers
  state.apiKey = '';
  localStorage.removeItem('mealplanner_apikey');
  document.getElementById('api-key-input').value = '';
  updateProviderHint();
  showToast(`Switched to ${PROVIDERS[state.provider]?.label}. Enter a new key.`, '');
}

function renderTagList(containerId, items, key) {
  const el = document.getElementById(containerId);
  el.innerHTML = items.map((item, i) =>
    `<span class="tag">${escHtml(item)} <span class="tag-remove" onclick="removeTag('${key}',${i})">×</span></span>`
  ).join('');
}

function removeTag(key, idx) {
  state.prefs[key].splice(idx, 1);
  const containerMap = { goTos: 'gotos-tags', staples: 'staples-tags', avoid: 'avoid-tags' };
  save(); 
  renderTagList(containerMap[key], state.prefs[key], key);
}

function addTag(inputId, key, tagsId) {
  const el = document.getElementById(inputId);
  const val = el.value.trim();
  if (!val) return;
  if (!state.prefs[key].includes(val)) {
    state.prefs[key].push(val);
    save();
    renderTagList(tagsId, state.prefs[key], key);
  }
  el.value = '';
}

function savePrefs() {
  state.prefs.servings    = parseInt(document.getElementById('pref-servings').value) || 4;
  state.prefs.dietaryNotes = document.getElementById('pref-dietary').value.trim();
  save();
  showToast('Preferences saved ✓', 'success');
}

function saveApiKey() {
  const raw = document.getElementById('api-key-raw').value.trim();
  if (!raw) return;
  
  const sel = document.getElementById('provider-select');
  state.provider = sel.value;
  state.apiKey = raw;
  
  localStorage.setItem('mealplanner_apikey', raw);
  localStorage.setItem('mealplanner_provider', state.provider);
  
  document.getElementById('api-key-input').value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + raw.slice(-6);
  document.getElementById('api-key-raw').value = '';
  
  updateProviderHint();
  closeModal('apikey-modal');
  showToast(`${PROVIDERS[state.provider]?.label} key saved \u2713`, 'success');
}

function clearApiKey() {
  state.apiKey = '';
  localStorage.removeItem('mealplanner_apikey');
  const inp = document.getElementById('api-key-input');
  if (inp) inp.value = '';
  showToast('API key cleared \u2014 enter a new one in Set Key', '');
}

// ===== VIEW SWITCHING =====
function switchView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .bnav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelectorAll(`[data-view="${id}"]`).forEach(b => b.classList.add('active'));
  if (id === 'recipes') renderRecipesView();
  if (id === 'grocery') renderGrocery();
  if (id === 'settings') renderPrefs();
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ===== LOADING STATES =====
function showLoading(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  const p = el.querySelector('p');
  if (p) p.innerHTML = `Asking <strong>${providerName()}</strong>… ${msg}`;
}
function hideLoading(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 3200);
}

// ===== UTILS =====
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function truncate(s, n) { return s.length > n ? s.slice(0, n-1) + '\u2026' : s; }

// Robust JSON cleaning to strip markdown backticks
function cleanJson(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// ===== AI PROMPT (planner) =====
async function handleAiPrompt() {
  const inp = document.getElementById('ai-prompt-input');
  const val = inp.value.trim();
  if (!val) { await generateWeekPlan(); return; }
  inp.value = '';
  await generateWeekPlan(val);
}

// ===== CLEAR ALL =====
function clearAll() {
  if (!confirm('Clear the entire plan, grocery list, and recipes?')) return;
  state.plan = {}; state.grocery = []; state.recipes = {};
  save(); renderPlan(); renderGrocery(); renderRecipesView();
  showToast('Cleared', '');
}

// ===== PRINT =====
function printView() { window.print(); }

// ===== PWA INSTALL =====
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'flex';
});

function installPWA() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(() => { deferredInstallPrompt = null; });
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  load();
  renderPlan();
  switchView('planner');

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }

  // AI prompt enter key
  const inp = document.getElementById('ai-prompt-input');
  if (inp) {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiPrompt(); }
    });
  }

  // Add-tag enter key listeners
  document.getElementById('goto-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag('goto-input','goTos','gotos-tags'); }
  });
  document.getElementById('avoid-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag('avoid-input','avoid','avoid-tags'); }
  });
});
