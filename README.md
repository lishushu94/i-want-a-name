# i want a name · Find Your Perfect Domain in Seconds ⚡

> EN | [中文](README.zh.md)

**Got a brilliant idea but stuck on naming?** Describe what you're building, and watch AI craft memorable domain suggestions instantly. Check availability in real-time, then jump straight to your favorite registrar. All powered by your browser—no data leaves your device.

---

## The Problem We All Face

You know that feeling, right? You've got this amazing product idea burning in your mind, but when it comes to finding a domain name...

- Every good `.com` seems taken 😫
- You spend hours brainstorming, only to find they're all registered
- The available ones? Too long, too weird, or just... meh
- Checking availability one-by-one is painfully slow

**This tool exists to end that struggle.**

---

## What Makes It Special

### 🧠 **AI-Powered Creativity**
Describe your idea in plain English (or Chinese!), and get a curated list of short, memorable, brandable domains. No more staring at blank pages trying to come up with something clever.

### ⚡ **Instant Availability Checks**
Forget manually checking domains one by one. We automatically run WHOIS lookups for every suggestion, showing you exactly which ones are free to grab and which registrar holds the taken ones.

### 🔗 **One-Click Registration**
Found the perfect name? Click once and land on your preferred registrar's page with the domain already filled in. GoDaddy, Namecheap, Cloudflare—you choose.

### 💬 **Organized Conversations**
Working on multiple projects? Keep separate chats for each idea, rename them, switch between them. Your brainstorming stays organized.

### 💾 **Data You Control**
Export your conversations as JSON files—back them up, share with your team, or import them later. Your data, your rules.

### 🔒 **Privacy That Actually Matters**
- API keys? Stored locally in your browser
- Chat history? Stays on your device
- No tracking, no analytics, no cloud storage (unless you deploy it yourself)
- Only connects to your chosen AI provider and WHOIS services

### 🎨 **Tailored to Your Taste**
- Dark/Light themes that are easy on your eyes
- English or Chinese interface
- Custom system prompts to guide the AI your way
- OpenAI-compatible API support (use GPT, Azure, or any compatible service)

---

## Get Started in 30 Seconds

```bash
# Clone and run locally
npm install
npm run dev
# Open http://localhost:3000 and start brainstorming!
```

**That's it.** No database setup, no environment variables (unless you want to deploy), just install and go.

---

## Deploy Anywhere

### Cloudflare Pages (Recommended)
```bash
npm install && npm run build
```
- Node version: 20
- Framework: Next.js (auto-detected)
- Output folder: `.next` or use `@cloudflare/next-on-pages`
- Cost: **Free** for most use cases

Since everything runs client-side, you can deploy to any static host: Vercel, Netlify, GitHub Pages, or even your own server.

---

## Security First

Your API key is the key to your wallet. We get it.

- **Never leaves your browser**: Stored in `localStorage`, never sent to any backend
- **Exported files contain everything**: If you export conversations, that JSON has your full history—keep it secure
- **Open source**: Check the code yourself, fork it, audit it

---

## What's Built & What's Coming

### ✅ Already Here
- AI-powered domain suggestions (supports both text and function-calling modes)
- Real-time availability checks with registrar info
- Multi-conversation management (rename, delete, switch)
- Full import/export system (preserves tool calls and suggestions)
- Custom OpenAI-compatible base URL support
- Light/Dark themes + EN/ZH languages
- Customizable system prompts with default preview
- Tool-calling toggle (for compatible models)

### 🚧 Coming Soon
- More AI provider adapters (Azure OpenAI, Google Gemini, DeepSeek, etc.)
- Optional server-side persistence (for teams who want it)
- Additional languages and UI refinements
- Domain price comparisons across registrars

---

## Join the Journey

This is an open project, and your input shapes it.

**Want to contribute?** Please read the [Contributing Guide](CONTRIBUTING.md) first.
- Add support for new AI providers
- Polish the UI (we're always improving)
- Translate to more languages
- Suggest features via issues

**Found a bug or have feedback?**
Open an issue or submit a PR. Every contribution makes this better for everyone.

---

## License

MIT · Free for personal and commercial use. Build on it, remix it, make it yours.

---

**Made with ☕ and the frustration of domain hunting**
