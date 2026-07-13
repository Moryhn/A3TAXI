# Contributing to A3TAXI

Two people working on this repo now. This doc exists so we don't step on each other — read it once, it's short.

## The rule

**Nothing gets pushed straight to `main`.** `main` is protected on GitHub — direct pushes are blocked, even for admins. Every change goes through a branch + pull request (PR), even small ones.

## Workflow

1. **Pull the latest `main` before starting anything new:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a branch off `main`.** Name it `type/short-description`:
   ```bash
   git checkout -b feat/driver-notes
   ```
   Common types: `feat/` (new feature), `fix/` (bug fix), `chore/` (config, deps, docs, cleanup).

3. **Commit as you go.** Match the style already used in this repo's history — short, present-tense, prefixed:
   ```
   feat: add notes field to driver dashboard
   fix: correct invoice total rounding
   chore: bump vite to 8.1.5
   ```

4. **Push your branch and open a PR into `main`:**
   ```bash
   git push -u origin feat/driver-notes
   ```
   Then on GitHub, click "Compare & pull request." Fill in the PR template — it's short, just say what changed and how you checked it works.

5. **Wait for the CI check to pass** (it verifies both apps still install and build) and for a review before merging. If you're not sure whether something needs review, ask — better to over-ask early on than debug a broken `main` later.

6. **After merge**, delete the branch (GitHub offers a button) and go back to step 1 for the next change.

## A few things that matter here

- **Never commit `.env` files.** They hold real database/API credentials. `.env.example` (repo root and `frontend/`) documents what variables exist — copy it to `.env` locally and fill in real values yourself. See the main `README.md` for full local setup instructions.
- **Don't rename or downgrade `bcryptjs`, `multer`, or `vite`** without checking with the other person first — these versions were pinned deliberately to avoid known security advisories.
- If a PR touches something you're unsure about (pricing logic, SMS, auth), say so in the PR description — it just means the reviewer looks a little closer, not that anything's wrong.
- If you get stuck on git itself (merge conflict, messed-up branch), stop and ask rather than force-pushing or resetting — those commands can destroy work that isn't recoverable.

## Local setup

See the "Local Setup" section in `README.md` for installing dependencies, setting up PostgreSQL, and configuring environment variables.
