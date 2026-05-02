---
type: concept
category: cs-fundamentals
para: resource
tags: [transactions, acid, isolation-levels, deadlocks, postgresql, sqlalchemy, optimistic-locking]
sources: []
updated: 2026-05-01
tldr: ACID guarantees, isolation levels, deadlocks, and patterns for correct concurrent data access.
---

# Database Transactions

ACID guarantees, isolation levels, deadlocks, and patterns for correct concurrent data access.

---

## ACID Properties

```
Atomicity:   All operations in a transaction succeed, or none do.
             A transfer (debit + credit) either completes fully or rolls back.

Consistency: A committed transaction leaves the DB in a valid state.
             Constraints, triggers, and foreign keys are enforced at commit.

Isolation:   Concurrent transactions behave as if serialised.
             The degree of isolation is configurable (see levels below).

Durability:  Once committed, data survives crashes.
             PostgreSQL achieves this via WAL (Write-Ahead Log).
```

---

## Isolation Levels

```
Level                 Dirty Read  Non-Repeatable Read  Phantom Read  Serialisation Anomaly
─────────────────────────────────────────────────────────────────────────────────────────
READ UNCOMMITTED      possible    possible             possible      possible
READ COMMITTED        prevented   possible             possible      possible   ← PG default
REPEATABLE READ       prevented   prevented            prevented*    possible   ← PG: also prevents phantoms
SERIALIZABLE          prevented   prevented            prevented     prevented

Dirty read:              reading uncommitted data from another transaction
Non-repeatable read:     reading same row twice, getting different values (another tx committed in between)
Phantom read:            query returns different rows on re-execution (another tx inserted/deleted)
Serialisation anomaly:   concurrent transactions produce a result impossible with any serial order

When to upgrade:
  REPEATABLE READ: reporting queries that read multiple rows and need consistency
  SERIALIZABLE:    financial transactions, inventory decrement under contention
```

---

## PostgreSQL Isolation in Python

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

engine = create_engine("postgresql+psycopg2://user:pass@localhost/mydb")
SessionLocal = sessionmaker(bind=engine)

# Default (READ COMMITTED) — suitable for most operations
with SessionLocal() as session:
    order = session.get(Order, order_id)
    order.status = "shipped"
    session.commit()

# REPEATABLE READ — for multi-read reports
with SessionLocal() as session:
    session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))
    total = session.query(func.sum(Order.total)).scalar()
    count = session.query(func.count(Order.id)).scalar()
    # Guaranteed: total and count are from the same consistent snapshot
    session.commit()

# SERIALIZABLE — for critical financial operations
def transfer_funds(from_id: str, to_id: str, amount: float) -> None:
    with SessionLocal() as session:
        try:
            session.execute(text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE"))
            sender = session.query(Account).with_for_update().get(from_id)
            receiver = session.query(Account).with_for_update().get(to_id)
            if sender.balance < amount:
                raise ValueError("Insufficient funds")
            sender.balance -= amount
            receiver.balance += amount
            session.commit()
        except Exception:
            session.rollback()
            raise
```

---

## Pessimistic vs Optimistic Locking

```python
# PESSIMISTIC — lock the row immediately (FOR UPDATE)
# Use when: high contention, writes are expensive to retry

with session.begin():
    # SELECT ... FOR UPDATE blocks concurrent writes until this tx commits
    inventory = (
        session.query(ProductInventory)
        .filter_by(product_id=product_id)
        .with_for_update()    # acquires row lock
        .one()
    )
    if inventory.quantity < requested_quantity:
        raise HTTPException(409, "Insufficient stock")
    inventory.quantity -= requested_quantity

# OPTIMISTIC — no lock; detect conflict at commit
# Use when: low contention, reads far outnumber writes

class ProductInventory(Base):
    __tablename__ = "product_inventory"
    id = Column(UUID, primary_key=True)
    quantity = Column(Integer, nullable=False)
    version = Column(Integer, nullable=False, default=0)    # version counter

    __mapper_args__ = {"version_id_col": version}    # SQLAlchemy optimistic locking

# If another transaction modified the row between read and commit,
# SQLAlchemy raises StaleDataError — caller must retry.
from sqlalchemy.orm.exc import StaleDataError

def decrement_with_retry(product_id: str, quantity: int, max_retries: int = 3) -> None:
    for attempt in range(max_retries):
        try:
            with SessionLocal() as session:
                inv = session.query(ProductInventory).filter_by(product_id=product_id).one()
                inv.quantity -= quantity
                session.commit()
                return
        except StaleDataError:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.1 * (attempt + 1))   # brief backoff before retry
```

---

## Deadlock Prevention

```
Deadlock: Transaction A holds lock on row 1, waits for row 2.
          Transaction B holds lock on row 2, waits for row 1.
          Both wait forever. DB detects and kills one.

Prevention strategies:
  1. Consistent lock ordering: always acquire locks in the same order across all transactions.
     (If you lock account A then account B, never lock B then A anywhere.)
  2. Short transactions: hold locks for the minimum time.
  3. Index your WHERE clauses: a table scan acquires far more locks than an index lookup.
  4. Avoid long-running transactions that hold locks while waiting for user input.

PostgreSQL deadlock detection:
  PostgreSQL detects deadlocks automatically and raises:
  ERROR:  deadlock detected
  DETAIL: Process X waits for ShareLock on transaction Y
  Application must catch and retry.
```

```python
import psycopg2

def safe_transfer(from_id: str, to_id: str, amount: float) -> None:
    # Always lock accounts in a consistent order (smaller ID first)
    # Prevents deadlocks when concurrent transfers involve the same pair
    ids = sorted([from_id, to_id])
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("BEGIN")
                # Lock both accounts in consistent order
                cur.execute(
                    "SELECT balance FROM accounts WHERE id = ANY(%s) FOR UPDATE",
                    (ids,),
                )
                accounts = {row[0]: row[1] for row in cur.fetchall()}
                
                if accounts[from_id] < amount:
                    conn.execute("ROLLBACK")
                    raise ValueError("Insufficient funds")
                
                cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s",
                            (amount, from_id))
                cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s",
                            (amount, to_id))
                conn.commit()
            except psycopg2.errors.DeadlockDetected:
                conn.rollback()
                raise   # let caller retry with backoff
```

---

## Savepoints (Nested Transactions)

```python
# Savepoints allow partial rollback within a transaction
with SessionLocal() as session:
    session.begin()

    order = Order(user_id=user_id, total=total)
    session.add(order)

    # Try to send confirmation email — if it fails, don't abort the order
    savepoint = session.begin_nested()
    try:
        send_confirmation_email(order)
        savepoint.commit()
    except EmailError:
        savepoint.rollback()   # only rolls back email, not the order
        logger.warning("Email failed but order proceeding")

    session.commit()   # order is committed regardless of email outcome
```

---

## Connection Pool Management

```python
# SQLAlchemy connection pool — tune for your load
engine = create_engine(
    DATABASE_URL,
    pool_size=10,           # maintained connections (keep open)
    max_overflow=20,        # extra connections allowed when pool exhausted
    pool_timeout=30,        # seconds to wait for a connection before error
    pool_recycle=3600,      # recycle connections every hour (avoids stale connections)
    pool_pre_ping=True,     # verify connection alive before using (handles network drops)
    echo=False,             # set True to log all SQL (dev only)
)

# Context manager ensures connections are returned to pool
def get_session():
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()   # returns connection to pool
```

---

## Connections

[[se-hub]] · [[cs-fundamentals/sql]] · [[cs-fundamentals/database-design]] · [[cs-fundamentals/concurrency]] · [[cs-fundamentals/performance-optimisation-se]] · [[cloud/aws-rds-aurora]]
