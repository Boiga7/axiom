---
type: concept
category: cloud
para: resource
tags: [ansible, iac, configuration-management, playbooks, automation]
sources: []
updated: 2026-05-01
tldr: Agentless configuration management and automation tool. Uses SSH to push configuration to remote hosts — no daemon, no agent installed on targets. Written in Python; tasks are YAML playbooks.
---

# Ansible

Agentless configuration management and automation tool. Uses SSH to push configuration to remote hosts. No daemon, no agent installed on targets. Written in Python; tasks are YAML playbooks.

---

## Core Concepts

- **Inventory** — list of hosts to manage (static file or dynamic plugin)
- **Playbook** — ordered list of plays; each play runs tasks against a host group
- **Task** — single unit of work (call a module)
- **Module** — idempotent action (apt, copy, template, service, shell, docker_container, aws_s3…)
- **Role** — reusable, structured collection of tasks, templates, vars, handlers
- **Handler** — task triggered only when notified (e.g., restart nginx after config change)
- **Vault** — encrypted secrets file, decrypted at runtime

---

## Inventory

```ini
# inventory/hosts.ini
[webservers]
web1.prod ansible_host=10.0.1.10
web2.prod ansible_host=10.0.1.11

[databases]
db1.prod ansible_host=10.0.2.10

[prod:children]
webservers
databases

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

```bash
# Dynamic inventory (AWS EC2 example)
ansible-inventory --list -i aws_ec2.yaml

# aws_ec2.yaml
plugin: amazon.aws.aws_ec2
regions: [eu-west-1]
filters:
  tag:Env: prod
keyed_groups:
  - key: tags.Role
    prefix: role
```

---

## Basic Playbook

```yaml
# playbooks/webserver.yaml
---
- name: Configure web servers
  hosts: webservers
  become: true      # sudo
  vars:
    app_port: 8080
    app_version: "2.1.0"

  pre_tasks:
  - name: Update apt cache
    apt:
      update_cache: true
      cache_valid_time: 3600

  tasks:
  - name: Install nginx
    apt:
      name: nginx
      state: present

  - name: Deploy nginx config
    template:
      src: templates/nginx.conf.j2
      dest: /etc/nginx/sites-enabled/myapp
      mode: "0644"
    notify: Reload nginx

  - name: Ensure nginx running
    service:
      name: nginx
      state: started
      enabled: true

  handlers:
  - name: Reload nginx
    service:
      name: nginx
      state: reloaded
```

---

## Jinja2 Templates

```jinja
# templates/nginx.conf.j2
server {
    listen {{ app_port }};
    server_name {{ ansible_hostname }};

    location / {
        proxy_pass http://127.0.0.1:{{ app_port }};
        proxy_set_header Host $host;
    }
}
```

---

## Role Structure

```
roles/
  webserver/
    tasks/
      main.yaml        # default task list
      install.yaml
    handlers/
      main.yaml
    templates/
      nginx.conf.j2
    defaults/
      main.yaml        # lowest priority vars
    vars/
      main.yaml        # higher priority vars
    files/
      index.html
    meta/
      main.yaml        # dependencies
```

```bash
# Create role scaffold
ansible-galaxy init roles/webserver

# Install community roles
ansible-galaxy install geerlingguy.nginx
ansible-galaxy collection install community.aws
```

---

## Ansible Vault

```bash
# Encrypt a secrets file
ansible-vault encrypt vars/secrets.yaml

# Edit encrypted file
ansible-vault edit vars/secrets.yaml

# Run playbook with vault password
ansible-playbook site.yaml --vault-password-file ~/.vault_pass

# Encrypt a single string inline
ansible-vault encrypt_string 'mydbpassword' --name 'db_password'
```

```yaml
# vars/secrets.yaml (encrypted at rest)
db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  613832...
```

---

## Common CLI Commands

```bash
# Run playbook
ansible-playbook -i inventory/hosts.ini playbooks/webserver.yaml

# Check mode (dry run — no changes made)
ansible-playbook site.yaml --check --diff

# Limit to specific hosts
ansible-playbook site.yaml --limit web1.prod

# Run specific tags only
ansible-playbook site.yaml --tags "deploy,config"

# One-off ad-hoc command
ansible webservers -i inventory/hosts.ini -m shell -a "uptime"

# Test connectivity
ansible all -m ping

# Verbose output
ansible-playbook site.yaml -vvv
```

---

## Idempotency

Ansible modules are idempotent by default. Running the same playbook twice produces the same result without side effects. The `shell` and `command` modules are NOT idempotent unless you add `creates:` or `when:` conditions. Prefer purpose-built modules over shell wherever possible.

---

## CI Integration

```yaml
# .github/workflows/deploy.yaml
- name: Deploy with Ansible
  uses: dawidd6/action-ansible-playbook@v2
  with:
    playbook: playbooks/deploy.yaml
    inventory: inventory/hosts.ini
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    vault_password: ${{ secrets.ANSIBLE_VAULT_PASSWORD }}
    options: |
      --extra-vars "app_version=${{ github.sha }}"
```

---

## Common Failure Cases

**SSH connection refused on first run**
Why: the target host's `authorized_keys` doesn't include the key pair Ansible is using, or `sshd` is not running.
Detect: `ansible all -m ping` returns `UNREACHABLE` with `Connection refused` or `Permission denied (publickey)`.
Fix: verify the key in `ansible_ssh_private_key_file` matches an entry in `~/.ssh/authorized_keys` on the target, and confirm `sshd` is running with `systemctl status sshd`.

**Non-idempotent `shell` task re-runs on every play**
Why: the `shell` and `command` modules always report `changed` unless told otherwise, so handlers fire and downstream tasks run unnecessarily.
Detect: the task shows `changed` on repeated runs even though the system state hasn't changed.
Fix: add a `creates: /path/to/sentinel-file` argument or wrap with `when: not (result.stat.exists)` after a `stat` check.

**Vault password not found in CI**
Why: the pipeline has no `--vault-password-file` argument and no `ANSIBLE_VAULT_PASSWORD_FILE` env var set.
Detect: playbook exits with `ERROR! Decryption failed (no vault secrets were found that could decrypt)`.
Fix: store the vault password as a CI secret, write it to a temp file at runtime, and pass `--vault-password-file` or set `ANSIBLE_VAULT_PASSWORD_FILE`.

**Role dependency version conflict via `ansible-galaxy`**
Why: two roles declare incompatible versions of the same collection dependency, and `ansible-galaxy install` resolves to an incompatible version.
Detect: tasks fail with `module not found` or unexpected parameter errors after a fresh install in CI.
Fix: pin collection versions in `requirements.yml` and commit the file; run `ansible-galaxy collection install -r requirements.yml --force` to reproduce the exact environment.

**Handler not triggered because task was skipped**
Why: when a `when:` condition skips the task that contains `notify`, the handler is never queued even if the underlying file changed.
Detect: config was manually changed on the host but the handler (e.g., `Reload nginx`) never ran; service is using the stale config.
Fix: use `listen` on the handler and trigger it explicitly with `meta: flush_handlers` at a defined checkpoint, or run the task unconditionally and guard logic inside it.

## Connections
[[cloud-hub]] · [[cloud/github-actions]] · [[cloud/kubernetes]] · [[cloud/pulumi]] · [[cloud/aws-cdk]]
