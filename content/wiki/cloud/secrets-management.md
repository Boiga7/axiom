---
type: concept
category: cloud
para: resource
tags: [secrets, vault, hashicorp, aws-secrets-manager, key-vault, rotation, dynamic-secrets]
sources: []
updated: 2026-05-01
tldr: Credentials, API keys, database passwords, TLS certificates — anything that grants access must be managed, rotated, and audited.
---

# Secrets Management

Credentials, API keys, database passwords, TLS certificates. Anything that grants access must be managed, rotated, and audited. Hard-coded secrets in code or config are the most common cause of credential leaks.

---

## The Spectrum

From worst to best:

```
Hardcoded in source code           → git history = permanent leak
.env files committed to Git        → same problem
Unencrypted in environment vars    → visible in process list, CI logs
Encrypted env vars in CI           → better; still no rotation or audit
Cloud Secrets Manager              → rotation, audit, fine-grained RBAC
Dynamic secrets (Vault)            → short-lived, auto-rotated, per-client
```

---

## AWS Secrets Manager

Managed secret storage. Auto-rotation for RDS databases. 90-day default rotation period (configurable). Costs $0.40/secret/month.

```python
import boto3
import json

client = boto3.client("secretsmanager", region_name="eu-west-1")

# Read a secret
def get_secret(secret_name: str) -> dict:
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])

# Usage
creds = get_secret("production/database/postgres")
conn = psycopg2.connect(
    host=creds["host"],
    database=creds["dbname"],
    user=creds["username"],
    password=creds["password"]
)
```

**Automatic RDS rotation** — Secrets Manager calls a Lambda function that generates a new password, updates it in Postgres, and stores the new value. Zero downtime because it updates the secret before rotating at the DB.

```hcl
# Terraform — enable automatic rotation
resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

**Secret reference in ECS task definition** (inject without application code changes):
```json
{
  "secrets": [{
    "name": "DB_PASSWORD",
    "valueFrom": "arn:aws:secretsmanager:eu-west-1:123456789:secret:prod/db-password"
  }]
}
```

---

## HashiCorp Vault

Enterprise-grade secrets management. Self-hosted (or HCP Vault, hosted). Two features beyond AWS Secrets Manager: dynamic secrets and fine-grained policies.

### KV v2 — Static Secrets with Versioning

```bash
# Enable KV v2 at the secrets/ path
vault secrets enable -path=secrets kv-v2

# Write a secret (creates version 1)
vault kv put secrets/production/db password="supersecret" username="app_user"

# Read current version
vault kv get secrets/production/db

# Read a specific version
vault kv get -version=2 secrets/production/db

# Rollback to version 1
vault kv rollback -version=1 secrets/production/db
```

```python
import hvac

client = hvac.Client(url="https://vault.my-company.com", token=os.environ["VAULT_TOKEN"])
secret = client.secrets.kv.v2.read_secret_version(path="production/db", mount_point="secrets")
db_password = secret["data"]["data"]["password"]
```

### Dynamic Secrets — Database Engine

The most powerful Vault feature. Vault generates short-lived database credentials on demand. No static passwords to leak, rotate, or share.

```bash
# Configure the database secrets engine
vault secrets enable database

vault write database/config/my-postgres \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgres.internal:5432/mydb" \
  allowed_roles="app-role" \
  username="vault-admin" \
  password="vault-admin-password"

# Define what role "app-role" can do: create a DB user, grant SELECT/INSERT/UPDATE, TTL 1 hour
vault write database/roles/app-role \
  db_name=my-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

```python
# Application requests credentials at startup
creds = client.secrets.database.generate_credentials(name="app-role")
username = creds["data"]["username"]  # e.g. "v-app-role-xK7pQ3b2"
password = creds["data"]["password"]  # valid for 1 hour, then auto-revoked
```

Every application instance gets its own unique credentials. Compromised credentials are short-lived and identifiable to the instance that leaked them.

### Vault Agent

Sidecar that authenticates to Vault, retrieves secrets, and writes them to a shared volume or injects them into environment variables. Applications read files. No Vault SDK required.

```hcl
# vault-agent-config.hcl
auto_auth {
  method "aws" {
    config = {
      role = "my-app-role"
    }
  }
}

template {
  source      = "/vault/templates/db-creds.tpl"
  destination = "/vault/secrets/db-creds.env"
  perms       = "0640"
}
```

---

## GCP Secret Manager

```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()

# Create a secret
parent = "projects/my-project"
client.create_secret(
    request={"parent": parent, "secret_id": "db-password", "secret": {"replication": {"automatic": {}}}}
)

# Add version
client.add_secret_version(
    request={"parent": f"{parent}/secrets/db-password", "payload": {"data": b"my-secret-value"}}
)

# Read latest version
name = f"{parent}/secrets/db-password/versions/latest"
response = client.access_secret_version(request={"name": name})
secret_value = response.payload.data.decode("UTF-8")
```

---

## Azure Key Vault

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://my-vault.vault.azure.net/", credential=credential)

# Read
secret = client.get_secret("db-password")

# Write
client.set_secret("db-password", "new-value", expires_on=datetime.now(timezone.utc) + timedelta(days=90))
```

**CSI driver** — mount Key Vault secrets as Kubernetes volumes. Application reads `/mnt/secrets/db-password` as a file. Rotated automatically when the secret changes in Key Vault.

---

## External Secrets Operator (Kubernetes)

Kubernetes controller that syncs secrets from AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, or HashiCorp Vault into Kubernetes Secrets. Applications use standard Kubernetes Secret mounts. No cloud SDK required.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-creds
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/database/postgres
        property: password
```

---

## Secret Hygiene Rules

1. **Never commit secrets to Git** — use `git-secrets` or `trufflehog` pre-commit hook to block.
2. **Rotate on suspected compromise** — assume breached; rotate immediately.
3. **Audit access** — CloudTrail (AWS) / Cloud Audit Logs (GCP) / Azure Monitor log every secret read.
4. **Least privilege** — grant only the secrets an application actually needs.
5. **Prefer dynamic over static** — if your platform supports it (Vault, Secrets Manager with rotation), use it.
6. **Don't log secrets** — redact before logging; `structlog.processors.format_exc_info` can expose them.

---

## Common Failure Cases

**Automatic RDS rotation breaks the application during the rotation window**
Why: the default "single user" rotation strategy updates the password in Secrets Manager and then in RDS sequentially — any application that cached the old credentials will fail until it re-fetches the secret.
Detect: application errors with `authentication failed for user` start at the rotation time and resolve within minutes as instances refresh their credentials cache.
Fix: use the "alternating users" rotation strategy, which maintains two valid credentials and rotates between them so the old credential remains valid until all instances have picked up the new one.

**Vault dynamic database credentials expire mid-request causing connection errors**
Why: the application creates a database connection pool at startup using credentials with a 1-hour TTL, but the pool holds connections open beyond TTL expiry, and the DB rejects them with `role does not exist`.
Detect: database errors appear consistently at 1-hour intervals (or at the `max_ttl` boundary) and resolve after application restart.
Fix: implement Vault lease renewal in the application (call `sys/leases/renew` before the TTL expires), or use Vault Agent to handle token and credential renewal automatically and write fresh credentials to a file the app re-reads.

**External Secrets Operator stops syncing after an AWS IAM policy change**
Why: the ClusterSecretStore's IRSA role lost the `secretsmanager:GetSecretValue` permission, but the ExternalSecret resource shows no error — it silently retains the last synced value.
Detect: `kubectl describe externalsecret <name>` shows `SecretSynced=False` with an `AccessDenied` reason; the Kubernetes Secret has a stale version of the value.
Fix: restore the IAM permission and force a resync by annotating the ExternalSecret with `force-sync: $(date +%s)`; set up an alert on the `SecretSynced` condition to catch future sync failures promptly.

**Secrets committed to Git in CI pipeline debug output**
Why: a `set -x` or verbose CI log level causes the shell to echo commands, printing environment variables (including injected secrets) to the CI log stream.
Detect: CI log output contains literal secret values; a trufflehog or gitleaks scan of CI logs finds credential patterns.
Fix: never use `set -x` in CI steps that handle secrets; mask secret values in CI by registering them as masked variables (GitHub: `add-mask`); audit CI log retention and rotate any exposed credentials immediately.

## Connections

- [[cloud/aws-core]] — AWS Secrets Manager, KMS for encryption keys
- [[cloud/gcp-core]] — GCP Secret Manager, IAM for access control
- [[cloud/azure-core]] — Azure Key Vault, Managed Identities
- [[cloud/kubernetes]] — External Secrets Operator, Vault Agent, CSI driver
- [[cloud/github-actions]] — OIDC replaces stored credentials in CI
- [[cloud/terraform]] — never store secrets in tfvars; use data sources to read at apply time
