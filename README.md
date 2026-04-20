# 🍽️ MealPlan — AI-Powered Weekly Meal Planner

A Progressive Web App for weekly meal planning with AI-generated menus, recipes, and grocery lists organized by Meijer store sections.

## Features
- ✨ **AI Meal Planning** — Describe your week or auto-generate via Gemini 2.0 Flash
- 🛒 **Grocery List** — Sorted by Meijer store sections, tap to check off items
- 📖 **Recipes** — AI-generated recipes for any meal, on demand
- 🖨️ **Print Ready** — Clean print stylesheet for both weekly plan and grocery list
- 📱 **PWA** — Install on your phone, works offline
- ⚙️ **Preferences** — Save go-to meals, dietary notes, servings

## Setup

1. Clone this repo
2. Open in a browser (or serve with any static file server)
3. Go to **Settings → Set Gemini API Key**
4. Get a free key at [aistudio.google.com](https://aistudio.google.com/apikey)
5. Start planning!

## Hosting on GitHub Pages

1. Push to GitHub
2. Go to **Settings → Pages → Source → GitHub Actions**
3. The included workflow (`.github/workflows/deploy.yml`) will auto-deploy on push to `main`
4. Point `MarkSocks.com` subdomain via SquareSpace DNS → your GitHub Pages URL

## Custom Domain

Add a `CNAME` file with your domain:
```
meals.marksocks.com
```

Then in SquareSpace DNS, add a CNAME record pointing `meals` → `yourusername.github.io`.

## Privacy

Your API key and all meal data are stored **only in your browser's localStorage**. Nothing is sent to any server except direct calls to Google's Gemini API.
