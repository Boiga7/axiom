---
type: concept
category: cs-fundamentals
para: resource
tags: [algorithms, sorting, searching, recursion, dynamic-programming, big-o, divide-and-conquer]
tldr: Core algorithms every software engineer must know — sorting, searching, recursion, dynamic programming, and the patterns that connect them.
sources: []
updated: 2026-05-01
---

# Algorithms

> **TL;DR** Core algorithms every software engineer must know — sorting, searching, recursion, dynamic programming, and the patterns that connect them.

## Sorting

### Merge Sort — O(n log n), stable, divide-and-conquer

Divide the array in half recursively, then merge sorted halves back together. Guaranteed O(n log n) in all cases.

```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]
```

**Use when:** stability matters (equal elements keep original order), or guaranteed worst-case performance is required. Python's built-in `sorted()` is Timsort — a merge sort variant.

### Quicksort — O(n log n) average, O(n²) worst, in-place

Pick a pivot, partition so all elements less than pivot are left of it, recurse on each partition. Fast in practice due to cache locality.

```python
def quicksort(arr, low=0, high=None):
    if high is None:
        high = len(arr) - 1
    if low < high:
        pivot_idx = partition(arr, low, high)
        quicksort(arr, low, pivot_idx - 1)
        quicksort(arr, pivot_idx + 1, high)

def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
```

**Worst case:** already-sorted or reverse-sorted input with a naive pivot choice. Randomise the pivot to avoid this.

### Sorting Comparison

| Algorithm | Best | Average | Worst | Space | Stable |
|---|---|---|---|---|---|
| Python `sorted()` (Timsort) | O(n) | O(n log n) | O(n log n) | O(n) | Yes |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Yes |

**In practice:** always use the language built-in (`sorted()`, `list.sort()`). Only implement custom sorting when you need a non-standard comparator.

---

## Searching

### Binary Search — O(log n)

Works on any sorted sequence. Halves the search space each step.

```python
def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1  # not found

# Python standard library
import bisect
idx = bisect.bisect_left(arr, target)  # leftmost insertion point
```

**Common variations:**
- Find first/last occurrence of a value
- Find the insertion point for a value
- Search on an implicit array (e.g., binary search on the answer)

**Off-by-one trap:** `low <= high` (not `<`) ensures single-element arrays are handled. Use `mid = low + (high - low) // 2` to avoid overflow in languages with fixed-width integers.

---

## Recursion

A function calls itself with a smaller input until reaching a base case.

```python
def factorial(n):
    if n <= 1:       # base case — must exist and terminate
        return 1
    return n * factorial(n - 1)  # recursive case — moves toward base
```

**Three laws of recursion:**
1. Must have a base case.
2. Must change its state and move toward the base case.
3. Must call itself recursively.

**Call stack depth:** Python's default recursion limit is 1000. For large inputs, convert to iteration with an explicit stack, or use `sys.setrecursionlimit()`.

```python
import sys
sys.setrecursionlimit(10000)

# Or convert to iteration:
def factorial_iterative(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
```

---

## Dynamic Programming

DP solves problems by breaking them into overlapping subproblems and storing results to avoid recomputation. Two patterns:

**Top-down (memoisation):** recursive + cache

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

**Bottom-up (tabulation):** iterative, fills a table from smallest subproblems up

```python
def fib_dp(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

# Space optimised (only need last two values):
def fib_optimal(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

### Classic DP Problems

**Longest Common Subsequence (LCS):**

```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
```

**0/1 Knapsack:** given items with weights and values, maximise value within a weight limit.

```python
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i - 1][w]  # skip item i
            if weights[i - 1] <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
    return dp[n][capacity]
```

### Recognising DP Problems

DP applies when:
- The problem asks for the **optimal value** (max/min/count) of something
- You can break it into **overlapping subproblems**
- Each subproblem's solution doesn't depend on how you got to it (optimal substructure)

Common signals: "minimum/maximum number of steps", "number of ways to", "longest/shortest subsequence".

---

## Two Pointers

Use two indices that move toward each other or in the same direction. Turns O(n²) nested loops into O(n).

```python
# Two-sum in sorted array
def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        total = arr[left] + arr[right]
        if total == target:
            return left, right
        elif total < target:
            left += 1
        else:
            right -= 1
    return None

# Sliding window — maximum sum subarray of length k
def max_subarray_sum(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum
```

---

## Backtracking

Explore all possible solutions by building candidates incrementally, abandoning ("pruning") as soon as a partial candidate can't lead to a valid solution.

```python
# Generate all permutations
def permutations(nums):
    result = []
    def backtrack(current, remaining):
        if not remaining:
            result.append(current[:])
            return
        for i, num in enumerate(remaining):
            current.append(num)
            backtrack(current, remaining[:i] + remaining[i + 1:])
            current.pop()  # undo the choice
    backtrack([], nums)
    return result
```

**Use when:** problems require "find all combinations/permutations/subsets" or constraint satisfaction (Sudoku, N-Queens).

---

## Algorithm Patterns — Decision Guide

| Problem type | Pattern |
|---|---|
| Find target in sorted data | Binary search |
| Shortest path, unweighted graph | BFS |
| Explore all paths, detect cycles | DFS |
| Optimal substructure + overlapping subproblems | Dynamic programming |
| Pair/subarray/window in sequence | Two pointers / sliding window |
| All combinations/permutations | Backtracking |
| Minimum spanning tree | Greedy (Kruskal/Prim) |
| Shortest weighted path | Dijkstra (no negative edges) |
| Contains duplicate / fast lookup | Hash set/dict |
| k-th largest/smallest | Heap |

## Common Failure Cases

**Quicksort degrades to O(n²) on sorted input**
Why: a naive pivot choice (last element) creates maximally unbalanced partitions on already-sorted or reverse-sorted data.
Detect: profiling shows unexpectedly slow sort performance; input arrays are often pre-sorted or nearly sorted.
Fix: randomise pivot selection before partitioning, or use the median-of-three strategy.

**Binary search returns wrong index due to off-by-one**
Why: using `low < high` instead of `low <= high` causes single-element arrays to be skipped entirely.
Detect: unit tests on arrays of length 1, or searches for the last element, return -1 incorrectly.
Fix: use `while low <= high` and derive mid as `low + (high - low) // 2` to prevent integer overflow in fixed-width languages.

**Stack overflow from unbounded recursion**
Why: missing or unreachable base case, or input too deep for Python's default recursion limit of 1000 frames.
Detect: `RecursionError: maximum recursion depth exceeded` at runtime.
Fix: add an explicit base case, convert to an iterative loop with an explicit stack, or call `sys.setrecursionlimit()` with a reasoned bound.

**DP memoisation cache shared across requests in a web app**
Why: `@lru_cache` on a module-level function persists for the lifetime of the process, not the request — different callers share state.
Detect: test isolation failures; one test's cached result bleeds into another; memory grows unbounded under load.
Fix: scope the cache to the call site, use `functools.lru_cache` only on pure stateless functions, or call `.cache_clear()` in teardown.

**O(n²) inner loop slipping into a hot path**
Why: a nested loop (e.g., `if item in some_list`) looks innocent at small scale but becomes a bottleneck when `n` exceeds a few thousand.
Detect: profiler shows the inner loop dominating latency; response times degrade non-linearly as data grows.
Fix: convert the list to a `set` before the loop for O(1) membership checks, reducing the block to O(n) overall.

## Connections

- [[cs-fundamentals/data-structures]] — algorithms operate on these structures
- [[math/optimisation]] — gradient descent is an optimisation algorithm; same tradeoffs between local and global optima apply
- [[math/probability]] — randomised algorithms (quicksort pivot selection, hash functions) rely on probability theory
- [[python/ecosystem]] — `heapq`, `bisect`, `collections`, `functools.lru_cache` are the practical implementations
