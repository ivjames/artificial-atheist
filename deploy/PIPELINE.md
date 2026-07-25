# Article pipeline — scheduling

The conversations→articles pipeline (§5) has one scheduled step: **clustering**
(find topics that crossed the distinct-consented-user threshold and queue an
`ArticleDraft`). Drafting/scrubbing and publishing are human-driven at
`/review/pipeline` — nothing publishes automatically.

Because clustering needs the droplet Postgres (and drafting needs provider
keys), this runs **on the droplet**, not in GitHub Actions (which can't reach
the DB). Two options:

## Option A — systemd timer (recommended, matches the app's systemd setup)

```bash
sudo cp deploy/artificial-atheist-pipeline.service deploy/artificial-atheist-pipeline.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now artificial-atheist-pipeline.timer
systemctl list-timers artificial-atheist-pipeline.timer   # confirm next run
journalctl -u artificial-atheist-pipeline.service -f       # watch a run
```

Default cadence is daily at 08:00 (edit `OnCalendar` in the `.timer`).

## Option B — crontab

```cron
# daily at 08:00, from the app dir so .env + node_modules resolve
0 8 * * *  cd /var/www/artificial-atheist && /usr/bin/npm run pipeline:auto >> /var/log/artificial-atheist-pipeline.log 2>&1
```

## What `pipeline:auto` does

- **Always:** `runClustering()` — queues drafts for newly eligible topics.
- **Only if `PIPELINE_AUTODRAFT=1`** (in `.env`): also runs Slot B draft + Slot C
  scrub on every `queued` draft so the reviewer opens ready-to-review pieces.
  Off by default so the scheduled job incurs no surprise model spend.

Manual equivalents: `npm run pipeline:cluster`, then `npm run pipeline:draft -- <id>`.
