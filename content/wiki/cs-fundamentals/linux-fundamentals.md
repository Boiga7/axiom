---
type: concept
category: cs-fundamentals
para: resource
tags: [linux, bash, shell, processes, networking, permissions, systemd]
sources: []
updated: 2026-05-01
tldr: "Core Linux knowledge for software engineers: process management, file system, networking, shell scripting, and systemd. Essential for anyone running services in production."
---

# Linux Fundamentals

Core Linux knowledge for software engineers: process management, file system, networking, shell scripting, and systemd. Essential for anyone running services in production.

---

## File System

```bash
# Navigation
pwd                          # print working directory
ls -lah                      # list with sizes, hidden files, human-readable
find /var/log -name "*.log" -mtime -1   # files modified in last 24h
stat myfile.txt              # inode, permissions, timestamps

# Permissions: rwxrwxrwx (owner/group/other)
chmod 755 script.sh          # rwxr-xr-x: owner full, others read+execute
chmod 600 ~/.ssh/id_rsa      # rw-------: only owner read/write
chown www-data:www-data /var/www/html -R

# Disk usage
df -h                        # disk space by filesystem
du -sh /var/log/*            # size of each item in /var/log
ncdu /                       # interactive disk usage explorer

# Links
ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/  # symlink
```

---

## Process Management

```bash
# View processes
ps aux                       # all processes
ps aux | grep python         # filter by name
pgrep -fl gunicorn           # find processes matching name
top                          # interactive (q to quit)
htop                         # better top (install separately)

# Control
kill -9 <pid>                # SIGKILL — instant, no cleanup
kill -15 <pid>               # SIGTERM — graceful shutdown (default)
kill -HUP <pid>              # SIGHUP — reload config
pkill -f "gunicorn myapp"    # kill by command pattern

# Background jobs
nohup python worker.py &     # run in background, ignore SIGHUP
jobs                         # list background jobs
fg %1                        # bring job 1 to foreground
bg %1                        # send job 1 to background

# Resource limits
ulimit -n 65536              # open file descriptor limit
nice -n 10 python cpu_task.py  # run at lower CPU priority
```

---

## Shell Scripting

```bash
#!/usr/bin/env bash
set -euo pipefail            # exit on error, undefined vars, pipe failures

# Variables
APP_ENV="${APP_ENV:-production}"    # default value
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Conditionals
if [[ "$APP_ENV" == "production" ]]; then
    LOG_LEVEL="INFO"
else
    LOG_LEVEL="DEBUG"
fi

# Check file/dir exists
if [[ ! -f ".env" ]]; then
    echo "ERROR: .env file not found" >&2
    exit 1
fi

# Loops
for FILE in /var/log/app/*.log; do
    echo "Processing: $FILE"
    gzip "$FILE"
done

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a /var/log/deploy.log
}

# Trap for cleanup on exit
cleanup() {
    log "Cleaning up..."
    rm -f /tmp/deploy.lock
}
trap cleanup EXIT

# Check command succeeded
if ! systemctl restart myapp; then
    log "ERROR: failed to restart myapp"
    exit 1
fi
```

---

## Networking

```bash
# Connectivity
ping -c 4 google.com
curl -v https://api.myapp.com/health      # verbose HTTP
wget -O - https://api.myapp.com/health    # GET + print to stdout
nc -zv postgres.internal 5432             # check port open (netcat)

# DNS
dig api.myapp.com                         # full DNS lookup
dig +short api.myapp.com A               # just the IP
nslookup api.myapp.com 8.8.8.8           # use specific DNS server
host api.myapp.com

# Open ports and connections
ss -tlnp                     # listening TCP ports + process
netstat -tlnp                # same (older)
lsof -i :8000                # what's using port 8000
iptables -L -n               # firewall rules

# Transfer files
scp user@host:/path/file .
rsync -avz --progress user@host:/var/log/ ./logs/

# SSH tunnels
ssh -L 5432:postgres.internal:5432 bastion.myapp.com   # forward local:5432 → remote postgres
ssh -N -f -L 6379:redis.internal:6379 bastion          # background tunnel
```

---

## systemd Service Management

```bash
# Service control
systemctl start myapp
systemctl stop myapp
systemctl restart myapp
systemctl reload myapp        # send SIGHUP, reload config without restart
systemctl status myapp
systemctl enable myapp        # start on boot
systemctl disable myapp

# Logs
journalctl -u myapp -f        # follow service logs
journalctl -u myapp --since "1 hour ago"
journalctl -u myapp -p err    # only errors
```

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/myapp
EnvironmentFile=/opt/myapp/.env
ExecStart=/opt/myapp/venv/bin/gunicorn myapp.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 30
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

---

## Text Processing

```bash
# grep
grep -r "ERROR" /var/log/      # recursive search
grep -n "NullPointer" app.log  # with line numbers
grep -v "DEBUG" app.log        # exclude lines
grep -E "ERROR|WARN" app.log   # extended regex (OR)
grep -c "500" access.log       # count matches

# awk — field-based processing
awk '{print $1}' access.log                    # print first field
awk -F: '{print $1}' /etc/passwd               # colon delimiter
awk '$9 == 500 {print $7}' access.log          # URLs returning 500
awk 'END {print NR}' app.log                   # count lines

# sed — stream editor
sed 's/ERROR/[ERROR]/g' app.log                # replace
sed -n '/2026-05-01/,/2026-05-02/p' app.log   # range print
sed -i 's/localhost/api.prod.com/g' config.yml # in-place edit

# sort + uniq
sort access.log | uniq -c | sort -rn | head -20  # top 20 unique lines
```

---

## Useful Combinations

```bash
# Real-time error monitor with context
tail -f /var/log/app.log | grep --line-buffered -A 3 "ERROR"

# Count HTTP status codes in nginx access log
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Find large files
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null

# Check open file descriptors for process
ls -la /proc/$(pgrep -f gunicorn | head -1)/fd | wc -l
```

---

## Common Failure Cases

**Script fails silently because `set -euo pipefail` is missing**
Why: without these flags, a failed command in the middle of a script is ignored and execution continues with a broken state; the script exits 0 even though work was skipped.
Detect: a deploy script reports success but the application binary was never copied; intermediate commands failed without stopping the script.
Fix: add `set -euo pipefail` as the second line of every bash script (after the shebang) so any non-zero exit, unbound variable, or pipe failure immediately halts execution.

**Service crashes repeatedly because `Restart=always` masks the root cause**
Why: systemd's `Restart=always` respawns the service immediately; the service enters a fast crash loop that consumes resources and buries the actual error in a flood of identical log entries.
Detect: `systemctl status myapp` shows "Active: activating (auto-restart)" cycling every few seconds; the same error fills `journalctl`.
Fix: add `RestartSec=10` to throttle restarts and give yourself time to read the logs; fix the root cause rather than tuning the restart policy.

**File descriptor exhaustion kills the process**
Why: each open socket, file, or pipe consumes an fd; the default `ulimit -n` of 1024 is hit quickly by connection-heavy services, causing `OSError: [Errno 24] Too many open files`.
Detect: `lsof -p <pid> | wc -l` is close to the limit; errors mention "too many open files".
Fix: raise the limit in the systemd unit with `LimitNOFILE=65536`, and ensure connections are properly closed (use context managers for files and sockets).

**`kill -9` leaves zombie processes and locked files**
Why: SIGKILL bypasses the process's signal handlers, so cleanup code (releasing locks, flushing buffers, closing sockets) never runs.
Detect: a pid file or socket lock remains on disk after the process is gone; a subsequent start fails with "address already in use" or "lock file exists".
Fix: always send SIGTERM (`kill -15`) first and wait for graceful shutdown; only escalate to SIGKILL if the process does not exit within the grace period.

## Connections
[[se-hub]] · [[cs-fundamentals/distributed-systems]] · [[cloud/cloud-security]] · [[cs-fundamentals/security-fundamentals-se]] · [[cloud/serverless-patterns]] · [[cs-fundamentals/concurrency]]
