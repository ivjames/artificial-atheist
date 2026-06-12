# Admin dashboard — droplet setup

The admin dashboard runs as a small Node service on the droplet, bound to
127.0.0.1, proxied by nginx at `https://artificialatheist.com/admin/` behind
HTTP basic auth. Panels: Dashboard (status), Studio (seed → generate → edit →
publish), Articles (list / edit / delete).

Node is already on the box (from the Eleventy build), so there's no new
runtime. Do all of this on the droplet.

## 0. Get the new files onto the droplet

Push the latest from your repo (the `tools/admin/` folder + the `admin`
script in package.json), then on the droplet:

```bash
cd /var/www/artificial-atheist
git pull
```

(No `npm install` needed — the admin uses only built-in Node + the existing
`@anthropic-ai/sdk`.)

## 1. Confirm the droplet can PUSH to GitHub

The dashboard commits and pushes articles, so the box needs **write** access.
Test the existing SSH key:

```bash
cd /var/www/artificial-atheist
git remote -v
```

- If the remote is `git@github.com:...` (SSH), test a push works:
  ```bash
  git commit --allow-empty -m "admin: test push" && git push && git reset --hard HEAD~1 2>/dev/null; git push -f 2>/dev/null
  ```
  Simpler: just try `git push` after an empty commit; if it succeeds, you're set.
- If the remote is `https://github.com/...`, switch it to SSH so the key is used:
  ```bash
  git remote set-url origin git@github.com:ivjames/artificial-atheist.git
  ```
- If the push is **rejected for permissions**, the existing key is read-only.
  Add a write-enabled deploy key:
  ```bash
  ssh-keygen -t ed25519 -C "aa-droplet-deploy" -f ~/.ssh/aa_deploy -N ""
  cat ~/.ssh/aa_deploy.pub
  ```
  Add that public key in GitHub → repo → Settings → Deploy keys → Add, and
  **check "Allow write access."** Then tell SSH to use it for this repo:
  ```bash
  cat >> ~/.ssh/config <<'EOF'

  Host github-aa
    HostName github.com
    User git
    IdentityFile ~/.ssh/aa_deploy
  EOF
  git remote set-url origin git@github-aa:ivjames/artificial-atheist.git
  ```

## 2. Service environment file (holds the API key)

```bash
sudo nano /etc/aa-admin.env
```

```
ANTHROPIC_API_KEY=sk-ant-your-key
STUDIO_PORT=4477
```

Lock it down:

```bash
sudo chmod 600 /etc/aa-admin.env
```

## 3. systemd service

Find your node path first: `which node` (often `/usr/bin/node` or an nvm path).

```bash
sudo nano /etc/systemd/system/aa-admin.service
```

```ini
[Unit]
Description=Artificial Atheist Admin dashboard
After=network.target

[Service]
WorkingDirectory=/var/www/artificial-atheist
ExecStart=/usr/bin/node tools/admin/server.mjs
EnvironmentFile=/etc/aa-admin.env
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
```

(Set `ExecStart` to your actual node path. `User=root` matches the webhook
service and ensures access to the repo and SSH key; if your repo and key are
owned by another user, use that user instead.)

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aa-admin
sudo systemctl status aa-admin --no-pager | head -8
```

Confirm it's listening locally:

```bash
curl -s http://127.0.0.1:4477/api/context | head -c 120; echo
```

## 4. Basic auth (username: jimo)

```bash
sudo apt install -y apache2-utils          # provides htpasswd
sudo htpasswd -c /etc/nginx/.htpasswd-aa jimo
```

It prompts for a password (you set it; it never leaves the box). To add more
users later, drop the `-c`.

## 5. nginx — proxy /admin/ behind auth

Edit the site's 443 server block:

```bash
sudo nano /etc/nginx/sites-available/artificialatheist.com
```

Add inside the `server { listen 443 ... }` block (alongside the existing
`location /` and `/hooks/`):

```nginx
    location /admin/ {
        auth_basic "Artificial Atheist Admin";
        auth_basic_user_file /etc/nginx/.htpasswd-aa;

        proxy_pass http://127.0.0.1:4477/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

The trailing slash on `proxy_pass` strips `/admin/`, and the app uses relative
paths, so everything resolves correctly under the prefix.

Test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Use it

Open **https://artificialatheist.com/admin/** — you'll get a login prompt
(jimo + your password). Then:

- **Dashboard** — counts, git state, recent commits, quick-draft box.
- **Studio** — seed → generate → edit → publish (commit + push deploys).
- **Articles** — edit or delete existing posts.

Publishing pushes to GitHub, which triggers the webhook, which rebuilds the
site. The dashboard pulls before committing if it's behind, only stages the
article file, and reports push failures clearly.

## Notes / safety

- The service binds 127.0.0.1, so it's only reachable through nginx (with
  auth). It is never exposed directly.
- The API key lives only in `/etc/aa-admin.env` (chmod 600).
- Memory: the Node service idles ~40MB. On 512MB + swap this is fine alongside
  your other sites, but it's the main new resource cost.
- To restart after code changes: `git pull` then
  `sudo systemctl restart aa-admin`.
- Logs: `sudo journalctl -u aa-admin -f`.
