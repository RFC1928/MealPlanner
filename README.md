# 🍽️ MealPlan — AI-Powered Weekly Meal Planner

A sleek, private Progressive Web App for weekly meal planning. Generate menus, recipes, and grocery lists tailored to your preferences using high-performance AI models (Groq or OpenRouter).

## ✨ Features
- **AI Meal Planning** — Describe your week or auto-generate dinners based on your core meal rotation.
- **Grocery List** — Automatically built and sorted by Meijer store sections.
- **Recipes** — AI-generated recipes with prep/cook times and instructions.
- **Print Ready** — Professional print stylesheet for paper-based planning.
- **PWA** — Installable on iOS/Android with offline support.
- **Private** — Secure gatekeeper (IP + PIN) and local-only data storage.

## 🚀 Setup & Usage

1. **Clone & Serve**: Open `index.html` via any static server (e.g., `npx serve .`).
2. **Configure AI**: Go to **Settings**, choose your provider (Groq is recommended for speed), and enter your API key.
3. **Plan Your Week**: Hit **✨ Generate** to fill your week with dinners based on your "Go-to Meals" list.
4. **Shop**: Build your grocery list; common staples (Milk, Butter, etc.) are added automatically.

## 🛠️ Tech Stack
- **Frontend**: Vanilla JS, CSS (with modern gradients and glassmorphism).
- **Hosting**: GitHub Pages (via GitHub Actions).
- **AI Providers**: Groq (Llama 3) or OpenRouter (Free models).

## 🔒 Privacy & Security
- **Data**: All preferences and meal plans stay in your browser's `localStorage`.
- **Keys**: API keys are stored locally and never sent to a backend.
- **Gatekeeper**: The app includes a simple IP-based lock (`73.144.43.202`) with a PIN fallback (`7878`) to keep your plan private on the public web.

## 📦 Deployment
This repo includes a GitHub Action to deploy to GitHub Pages automatically.
- Update `CNAME` for your custom domain: `meals.marksocks.com`.
- Enable **Settings → Pages → GitHub Actions** in your repo settings.
