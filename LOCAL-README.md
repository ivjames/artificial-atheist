# Running Artificial Atheist locally

Quick reference for working on the site from your own machine (the iMac).
This covers the dev server, the Studio (seed → generate → edit → publish),
and the manual generator. None of this runs on the droplet — it's all local,
and publishing happens by pushing to GitHub, which triggers the webhook deploy.

## Prerequisites (one time)

- **Node 20+** (you have this).
- **The repo cloned** somewhere on your machine, e.g. `~/sites/artificial-atheist`.
- **Dependencies installed** — from the repo root:
  ```bash
  npm install
  ```
- **Your Anthropic API key** exported in the shell you'll run things from:
  ```bash
  export ANTHROPIC_API_KEY=sk-ant-...
  ```
  To avoid retyping it every time, add that line to `~/.zshrc` (then open a
  new terminal, or run `source ~/.zshrc`).

> Everything below is run **from the repo root** (`cd` into the cloned folder first).

---

## 1. Studio — write an article from a seed

This is the main tool. Seed an idea, the AI drafts it, you edit, then publish.

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # if not already in your shell
npm run studio
```

Then open **http://127.0.0.1:4477** in your browser.

**Workflow:**
1. Type a **seed idea** in the left box.
2. Pick a **topic** (or leave on "Auto" to let the model choose).
3. Click **Generate draft**. Title, excerpt, topic, and body fill in, with a
   live Markdown preview on the right.
4. **Edit** anything — the body is plain Markdown.
5. Choose what happens on publish with the checkboxes:
   - **commit** — make a git commit.
   - **push (deploys)** — push to GitHub, which triggers the live deploy.
   - **overwrite if exists** — replace a file with the same date+slug.
6. Click **Publish** (commits + pushes) or **Save file only** (writes the
   file, no git).

**The git-state indicator** in the publish bar shows your branch and whether
you're `clean`, `dirty`, `↓behind`, or `↑ahead`. If you're behind the remote,
Publish auto-pulls (rebase) before committing so you don't diverge. If the
tree has unrelated uncommitted changes, it asks before proceeding.

To stop the Studio: `Ctrl+C` in the terminal.

---

## 2. Preview the site locally (no publish)

To see the actual built site as visitors will, with live reload:

```bash
npm run serve
```

Open **http://localhost:8080**. Edits to templates, CSS, or posts reload
automatically.

> Note: site **search** (Pagefind) only works after a full `npm run build`,
> not under `npm run serve`. Everything else previews live.

To build the static site once (output in `_site/`):

```bash
npm run build
```

---

## 3. Generate an article from the command line (optional)

The non-interactive generator — picks the least-covered topic itself and
writes one article. This is the same thing the scheduled GitHub Action runs.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate
```

It writes a new file into `src/posts/`. Review it, then commit and push
yourself:

```bash
git add src/posts/
git commit -m "Add article"
git push
```

---

## 4. Publishing = pushing

However you create an article (Studio, CLI, or by hand), it goes live the
same way: a **push to GitHub**. The droplet's webhook sees the push, pulls,
rebuilds, and serves it. You never touch the server.

The scheduled GitHub Action also pushes articles on its own. So before you
publish from the Studio or CLI, it's good practice to be current:

```bash
git pull --rebase
```

(The Studio does this automatically when it detects you're behind.)

---

## Troubleshooting

- **"no API key" in the Studio status bar** — you didn't export
  `ANTHROPIC_API_KEY` in the terminal you ran `npm run studio` from. Export it
  and restart the Studio.
- **Generation fails / billing error** — the key works but the Anthropic
  account has no credit. Add credit in the Anthropic Console → Billing.
- **Push rejected / "behind"** — run `git pull --rebase`, then push again.
- **Port already in use** — something's on 4477. Run with a different port:
  ```bash
  STUDIO_PORT=4480 npm run studio
  ```
- **Studio shows "not a git repo"** — you're running it from outside the
  cloned repo. `cd` into the repo root and try again.
- **Merge conflict on the same article** — if you edited the same post in two
  places, resolve it the normal git way (`git status`, fix the file,
  `git add`, `git rebase --continue`), then push.
