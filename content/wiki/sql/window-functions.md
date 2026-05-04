---
type: concept
category: sql
para: resource
tags: [sql, window-functions, analytics, postgresql, row-number, lead, lag, partition-by]
tldr: Window functions run calculations across a set of rows related to the current row without collapsing them into a group — essential for rankings, running totals, and time-series comparisons.
sources: []
updated: 2026-05-04
---

# Window Functions

> **TL;DR** Window functions run calculations across a set of rows related to the current row without collapsing them into a group — essential for rankings, running totals, and time-series comparisons.

## Anatomy of a Window Function

```sql
function_name(args) OVER (
  PARTITION BY column   -- reset the window per group
  ORDER BY column       -- controls ordering within the window
  ROWS BETWEEN ...      -- optional: define the frame
)
```

The `OVER` clause is what makes it a window function. Without `OVER`, `SUM()` collapses rows. With `OVER`, it computes across a window while keeping every row.

## Ranking Functions

```sql
SELECT
  name,
  score,
  ROW_NUMBER() OVER (ORDER BY score DESC)           AS position,
  RANK()       OVER (ORDER BY score DESC)           AS rank,        -- gaps on tie
  DENSE_RANK() OVER (ORDER BY score DESC)           AS dense_rank,  -- no gaps
  NTILE(4)     OVER (ORDER BY score DESC)           AS quartile
FROM leaderboard;
```

- `ROW_NUMBER` — always unique, even on tie
- `RANK` — tied rows get the same rank; next rank skips (1, 1, 3)
- `DENSE_RANK` — tied rows get the same rank; next rank does not skip (1, 1, 2)
- `NTILE(n)` — divides the window into n buckets

### Partition by group

```sql
-- Top scorer per department
SELECT * FROM (
  SELECT
    name, department, salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
  FROM employees
) ranked
WHERE dept_rank = 1;
```

## Offset Functions

```sql
SELECT
  date,
  revenue,
  LAG(revenue, 1)  OVER (ORDER BY date) AS prev_day_revenue,
  LEAD(revenue, 1) OVER (ORDER BY date) AS next_day_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day_change
FROM daily_revenue;
```

- `LAG(col, n)` — value n rows before the current row
- `LEAD(col, n)` — value n rows after
- Both return `NULL` at edges; supply a default as a third argument: `LAG(revenue, 1, 0)`

## Aggregate Window Functions

```sql
SELECT
  date,
  revenue,
  SUM(revenue)    OVER (ORDER BY date)                              AS running_total,
  AVG(revenue)    OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d_avg,
  SUM(revenue)    OVER (PARTITION BY category ORDER BY date)        AS category_running_total
FROM daily_revenue;
```

Frame options:
- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — from first row to current (default for running totals)
- `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` — rolling 7-day window
- `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` — whole partition

## FIRST_VALUE and LAST_VALUE

```sql
SELECT
  name,
  salary,
  department,
  FIRST_VALUE(name) OVER (PARTITION BY department ORDER BY salary DESC) AS highest_paid_in_dept,
  LAST_VALUE(name)  OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_paid_in_dept
FROM employees;
```

`LAST_VALUE` requires an explicit frame extending to `UNBOUNDED FOLLOWING` — the default frame stops at the current row.

## Percentiles

```sql
SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99
FROM request_logs;
```

`PERCENTILE_CONT` interpolates; `PERCENTILE_DISC` picks an actual value from the dataset.

## Performance Notes

- Window functions run after `WHERE` and `GROUP BY` but before `ORDER BY` and `LIMIT`
- Each `OVER` clause can trigger a separate sort pass — combine partitions where possible
- On large tables, ensure the `PARTITION BY` and `ORDER BY` columns are indexed
- PostgreSQL can push window function computation down to an index scan in some cases

## Common Patterns

| Pattern | Function |
|---|---|
| Row number within group | `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` |
| Top-N per group | `WHERE rank <= N` after `RANK()` |
| Running total | `SUM() OVER (ORDER BY ...)` |
| 7-day rolling average | `AVG() OVER (ORDER BY ... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` |
| Day-over-day change | `value - LAG(value) OVER (ORDER BY ...)` |
| Percent of total | `value / SUM(value) OVER () * 100` |

## Connections

- [[sql/query-optimization]] — understanding how the planner handles window sort passes
- [[cs-fundamentals/sql]] — core SQL fundamentals
- [[python/sqlalchemy]] — SQLAlchemy supports window functions via `func.row_number().over()`
- [[data/data-engineering-hub]] — analytical patterns in data pipelines
