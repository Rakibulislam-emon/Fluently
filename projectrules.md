# AI_ENGINEERING_RULES.md

# TypeMind Engineering Rules

## Core Philosophy

TypeMind is a lightweight AI communication utility.

The system prioritizes:

* simplicity
* low RAM usage
* fast startup
* predictable behavior
* maintainability
* modular architecture
* privacy
* clean UX

This is NOT an enterprise platform.

Every implementation decision must reduce complexity, not increase it.

---

# General Engineering Rules

## Rule 1 — NEVER create large files

Maximum file size:

* Preferred: under 200 lines
* Hard limit: 350 lines

If a file grows too large:

* split components
* extract hooks
* extract utilities
* extract services

Large files are forbidden.

---

## Rule 2 — Single responsibility per file

Each file must do ONE thing only.

Bad:

* UI
* API logic
* state management
* clipboard logic
  inside same file

Good:

* isolated services
* isolated UI
* isolated hooks
* isolated utilities

---

## Rule 3 — NEVER overengineer

Do NOT:

* create unnecessary abstractions
* build plugin systems
* create generic frameworks
* create factories prematurely
* optimize prematurely

Only build what the MVP currently needs.

---

## Rule 4 — Prefer explicit code over clever code

Code must be:

* readable
* debuggable
* predictable
* maintainable

Avoid:

* hidden side effects
* deeply nested abstractions
* magic utility patterns

Clarity is mandatory.

---

## Rule 5 — Keep dependencies minimal

Before adding any dependency:

* verify necessity
* prefer native APIs first
* avoid heavy libraries

Never install packages for trivial functionality.

---

# Desktop Architecture Rules

## Rule 6 — Tauri-first architecture

This project uses:

* Tauri
* React
* Rust backend

Do NOT implement Electron-style patterns.

Keep memory usage low.

---

## Rule 7 — Optimize for weak hardware

The app must run smoothly on:

* 8GB RAM systems
* low-end CPUs

Avoid:

* excessive re-renders
* unnecessary background tasks
* memory-heavy libraries
* large runtime overhead

Performance is mandatory.

---

## Rule 8 — No passive monitoring

The app must NEVER:

* monitor all typing
* keylog
* continuously read clipboard
* collect background text

The app only processes:

* explicitly selected text
* user-triggered actions

Privacy is non-negotiable.

---

# AI System Rules

## Rule 9 — APIs only

The app uses:

* Groq API
* optional Gemini API later

The app does NOT:

* run local models
* use Ollama
* use heavy inference systems

Keep the client lightweight.

---

## Rule 10 — AI output must be sanitized

Always remove:

* markdown
* quotes
* explanations
* unnecessary prefixes
* formatting artifacts

The popup should display ONLY the rewritten sentence.

---

## Rule 11 — The AI is NOT a translator

The AI must:

* preserve intent
* preserve emotional tone
* sound natural
* avoid literal translation
* avoid robotic phrasing

Natural conversational English is the priority.

---

## Rule 12 — Keep prompts centralized

All prompts must exist inside:

src/prompts/

Never hardcode prompts across multiple files.

---

# UI Rules

## Rule 13 — Minimal UI only

TypeMind is a utility layer.

UI must be:

* tiny
* fast
* invisible
* distraction-free

Avoid:

* glassmorphism
* heavy animations
* futuristic effects
* oversized modals

Utility software should disappear into workflow.

---

## Rule 14 — One primary action per screen

Every UI surface should have:

* one clear action
* minimal cognitive load

Avoid clutter.

---

## Rule 15 — Popup positioning must remain stable

Do NOT implement complex cursor tracking initially.

MVP uses:

* centered floating popup
  OR
* fixed overlay positioning

Reliability is more important than visual cleverness.

---

# State Management Rules

## Rule 16 — Keep global state minimal

Only globalize state when absolutely necessary.

Prefer:

* local component state
* isolated hooks

Use Zustand minimally.

---

## Rule 17 — Avoid unnecessary reactivity

Avoid:

* deeply shared state
* cascading updates
* excessive subscriptions

Keep state simple.

---

# API Rules

## Rule 18 — All API calls require timeout handling

Every request must include:

* timeout
* retry limit
* graceful failure handling

Never allow hanging requests.

---

## Rule 19 — Debounce AI requests

AI requests must:

* debounce properly
* prevent duplicate calls
* cancel stale requests

Avoid API spam.

---

## Rule 20 — Add lightweight caching later

Repeated common phrases should eventually use:

* local SQLite cache

This reduces:

* latency
* API cost

But caching is NOT required for initial MVP.

---

# Error Handling Rules

## Rule 21 — Never fail silently

All failures must:

* log properly
* fail gracefully
* avoid app crashes

Silent failures are forbidden.

---

## Rule 22 — Every async operation requires try/catch

Mandatory for:

* API calls
* clipboard operations
* text replacement
* shortcut actions

No exceptions.

---

# AI Agent Rules

## Rule 23 — AI must preserve architecture consistency

When generating code:

* follow existing patterns
* reuse existing structure
* avoid rewriting unrelated systems

Do NOT reinvent architecture.

---

## Rule 24 — AI must not generate unused systems

Forbidden:

* speculative abstractions
* future-proof architecture
* placeholder frameworks
* unnecessary configuration systems

Build only current requirements.

---

## Rule 25 — AI must avoid duplicate logic

Before generating utilities or services:

* search existing modules first

Reuse before creating new code.

---

## Rule 26 — Prefer composition over inheritance

Keep systems:

* modular
* composable
* isolated

Avoid inheritance-heavy patterns.

---

# File Structure Rules

## Rule 27 — Maintain strict folder organization

Use:

src/
components/
hooks/
services/
utils/
prompts/
stores/
types/

Do NOT mix responsibilities.

---

## Rule 28 — Separate UI from business logic

UI components must NOT:

* contain API logic
* contain heavy processing
* contain complex side effects

Business logic belongs in:

* services
* hooks
* utilities

---

# Security Rules

## Rule 29 — Never permanently store sensitive text

Do NOT persist:

* passwords
* personal messages
* copied text
* API responses

unless explicitly required.

---

## Rule 30 — API keys must never exist in frontend code

Use:

* environment variables
* secure config handling

Never hardcode secrets.

---

## Rule 31 — Never auto-send clipboard content

User action must always trigger processing.

No automatic uploads.

---

# Performance Rules

## Rule 32 — Minimize startup overhead

The app must launch quickly.

Avoid:

* unnecessary initialization
* eager loading
* startup-heavy logic

---

## Rule 33 — Keep background processes lightweight

Background systems must:

* use minimal CPU
* avoid polling loops
* avoid excessive listeners

---

# UX Rules

## Rule 34 — Speed matters more than intelligence

Fast good-enough output is better than:

* slow perfect output

Latency is critical.

---

## Rule 35 — Avoid intrusive UX

Never:

* steal focus aggressively
* spam notifications
* interrupt typing flow

The assistant should feel invisible.

---

# Product Scope Rules

## Rule 36 — MVP scope is fixed

The MVP ONLY does:

1. User selects text
2. Shortcut triggers rewrite
3. AI rewrites text
4. Popup displays result

No additional complexity unless explicitly approved.

---

## Rule 37 — Ignore advanced editor integrations initially

Do NOT optimize initially for:

* Microsoft Word
* games
* terminal emulators
* Figma
* secure fields

Focus only on:

* standard text inputs
* Chromium-based apps
* basic desktop workflows

---

# Final Principle

Prefer:

* boring
* stable
* understandable

over:

* clever
* complex
* impressive

A tiny reliable utility is better than a powerful unstable system.
