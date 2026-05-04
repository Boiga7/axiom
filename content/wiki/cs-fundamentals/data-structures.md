---
type: concept
category: cs-fundamentals
para: resource
tags: [data-structures, algorithms, big-o, arrays, linked-lists, trees, hash-tables, stacks, queues]
tldr: The core data structures every software engineer must know — what each is, when to use it, and the time/space complexity that governs that choice.
sources: []
updated: 2026-05-01
---

# Data Structures

> **TL;DR** The core data structures every software engineer must know — what each is, when to use it, and the time/space complexity that governs that choice.

## Big O Notation — Reading Complexity

Big O describes how an algorithm's time or space grows relative to input size `n`. Read it as worst-case unless stated otherwise.

| Notation | Name | Example |
|---|---|---|
| O(1) | Constant | Hash table lookup |
| O(log n) | Logarithmic | Binary search |
| O(n) | Linear | Array traversal |
| O(n log n) | Log-linear | Merge sort |
| O(n²) | Quadratic | Nested loops, bubble sort |
| O(2ⁿ) | Exponential | Naive recursion (Fibonacci) |

**Rule of thumb:** if n ≤ 10⁷, O(n log n) is fine. O(n²) becomes painful above n = 10⁴. Never put O(n²) inside a web request handler.

---

## Arrays

A contiguous block of memory. Elements accessed by index.

```python
arr = [1, 2, 3, 4]
arr[2]      # O(1) — direct index
arr.append(5)   # O(1) amortised
arr.insert(0, 0)    # O(n) — shifts everything right
del arr[0]      # O(n)
5 in arr        # O(n) — linear scan
```

| Operation | Time |
|---|---|
| Access by index | O(1) |
| Append | O(1) amortised |
| Insert/delete at front | O(n) |
| Search | O(n) |

**Use when:** you need fast indexed access, iteration, or a simple ordered collection. Python `list` is a dynamic array.

---

## Hash Tables (Dictionaries / Sets)

Maps keys to values using a hash function. Python `dict` and `set` are both hash tables.

```python
freq = {}
for word in words:
    freq[word] = freq.get(word, 0) + 1  # O(1) average

seen = set()
seen.add("item")    # O(1)
"item" in seen      # O(1) — not O(n) like a list!
```

| Operation | Average | Worst (collision) |
|---|---|---|
| Insert | O(1) | O(n) |
| Lookup | O(1) | O(n) |
| Delete | O(1) | O(n) |

**Use when:** you need fast lookup, deduplication, or counting. The `in` operator on a set is O(1); on a list it's O(n). This distinction matters at scale.

**Gotcha:** keys must be hashable (immutable). Lists are not hashable; tuples are.

---

## Linked Lists

Nodes where each points to the next. No contiguous memory. No indexed access.

```python
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

# Prepend — O(1)
new_node = Node(0)
new_node.next = head
head = new_node

# Delete given node — O(1) if you have the previous node
prev.next = prev.next.next
```

| Operation | Time |
|---|---|
| Access by index | O(n) |
| Insert/delete at head | O(1) |
| Insert/delete at tail (doubly-linked) | O(1) |
| Search | O(n) |

**Use when:** you need frequent insertions/deletions at arbitrary positions and don't need random access. Python `collections.deque` is a doubly-linked list — use it for queues.

**In Python practice:** rarely implement by hand. `deque` covers most use cases.

---

## Stacks

Last-in, first-out (LIFO). Use `list` with `append`/`pop`, or `deque`.

```python
stack = []
stack.append(1)     # push — O(1)
stack.append(2)
top = stack.pop()   # pop — O(1), returns 2
top = stack[-1]     # peek — O(1)
```

**Use when:** undo/redo, call stacks, parsing brackets, DFS (iterative).

---

## Queues

First-in, first-out (FIFO). Use `collections.deque`. Never `list.pop(0)` (that's O(n)).

```python
from collections import deque
q = deque()
q.append(1)         # enqueue — O(1)
q.append(2)
front = q.popleft() # dequeue — O(1), returns 1
```

**Use when:** BFS, task queues, any order-preserving pipeline.

---

## Trees

Hierarchical structure. Each node has a value and zero or more children.

### Binary Search Tree (BST)

Left child < parent < right child. Enables O(log n) search on sorted data.

```python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def search(node, target):
    if not node or node.val == target:
        return node
    if target < node.val:
        return search(node.left, target)
    return search(node.right, target)
```

| Operation | Average (balanced) | Worst (degenerate/list) |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |

**Balanced variants:** AVL trees, Red-Black trees (used in Java `TreeMap`). Python's `sortedcontainers.SortedList` gives O(log n) operations without manual BST implementation.

### Tree Traversals

```python
def inorder(node):   # Left → Root → Right → sorted output for BST
    if not node: return
    inorder(node.left)
    print(node.val)
    inorder(node.right)

def preorder(node):  # Root → Left → Right → good for copying
    if not node: return
    print(node.val)
    preorder(node.left)
    preorder(node.right)

def postorder(node): # Left → Right → Root → good for deletion
    if not node: return
    postorder(node.left)
    postorder(node.right)
    print(node.val)
```

**BFS on a tree (level-order):**

```python
from collections import deque

def level_order(root):
    if not root: return
    q = deque([root])
    while q:
        node = q.popleft()
        print(node.val)
        if node.left: q.append(node.left)
        if node.right: q.append(node.right)
```

---

## Heaps (Priority Queues)

A complete binary tree where the parent is always smaller (min-heap) or larger (max-heap) than children. Python's `heapq` is a min-heap.

```python
import heapq

heap = []
heapq.heappush(heap, 3)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
smallest = heapq.heappop(heap)  # 1 — O(log n)

# Max-heap: negate values
heapq.heappush(heap, -5)
largest = -heapq.heappop(heap)  # 5
```

| Operation | Time |
|---|---|
| Push | O(log n) |
| Pop min | O(log n) |
| Peek min | O(1) |
| Heapify (build from list) | O(n) |

**Use when:** you need the smallest/largest element repeatedly — Dijkstra's, k-th largest, merge k sorted lists.

---

## Graphs

Nodes (vertices) connected by edges. Can be directed or undirected, weighted or unweighted.

**Representation options:**

```python
# Adjacency list (default — memory-efficient for sparse graphs)
graph = {
    "A": ["B", "C"],
    "B": ["D"],
    "C": ["D"],
    "D": []
}

# Adjacency matrix (fast edge lookup, expensive for sparse graphs)
# matrix[i][j] = 1 means edge from i to j
```

**BFS — shortest path in unweighted graph:**

```python
from collections import deque

def bfs(graph, start, end):
    visited = {start}
    q = deque([[start]])
    while q:
        path = q.popleft()
        node = path[-1]
        if node == end:
            return path
        for neighbour in graph[node]:
            if neighbour not in visited:
                visited.add(neighbour)
                q.append(path + [neighbour])
```

**DFS — reachability, cycle detection, topological sort:**

```python
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbour in graph[node]:
        if neighbour not in visited:
            dfs(graph, neighbour, visited)
    return visited
```

---

## Choosing a Data Structure

| You need | Use |
|---|---|
| Fast lookup by key | `dict` / `set` |
| Ordered sequence with random access | `list` |
| Fast insert/delete at both ends | `collections.deque` |
| Smallest/largest element fast | `heapq` |
| Sorted sequence with fast insert | `sortedcontainers.SortedList` |
| Hierarchical data | Tree |
| Connected relationships | Graph |

## Common Failure Cases

**`list.pop(0)` used as a queue, creating O(n) dequeue operations**
Why: removing from the front of a Python list shifts all remaining elements; in a tight loop over thousands of items this turns O(n) work into O(n²).
Detect: profiler shows `list.remove` or `list.pop(0)` dominating CPU time; substitute `collections.deque` and measure the speedup.
Fix: replace `list` with `collections.deque` for any queue — `deque.popleft()` is O(1).

**`in` operator on a list inside a loop creating O(n²) membership checks**
Why: `if item in my_list` is O(n) per call; inside a loop over n items the total cost is O(n²), which is tolerable at n=100 but painful at n=10,000.
Detect: profiler shows the inner `__contains__` call dominating; or input size doubling causes 4x slowdown instead of 2x.
Fix: convert the list to a `set` before the loop: `my_set = set(my_list)` — `in` on a set is O(1).

**Unbalanced BST degrading to O(n) operations**
Why: inserting an already-sorted sequence into a naive BST produces a degenerate tree (every node has one child) equivalent to a linked list; search becomes O(n).
Detect: BST operations slow linearly as elements are inserted in sorted order.
Fix: use a self-balancing structure — Python's `sortedcontainers.SortedList` or Java's `TreeMap`; never implement a raw BST for production use.

**Max-heap simulated with positive values causing incorrect ordering**
Why: Python's `heapq` is a min-heap; to simulate a max-heap engineers negate values, but forgetting to negate on both push and pop produces wrong order silently.
Detect: `heappop` returns a smaller (more negative) value when the largest value is expected.
Fix: negate consistently on both push (`heappush(heap, -value)`) and pop (`-heappop(heap)`), or use a `(priority, item)` tuple.

## Connections

- [[cs-fundamentals/algorithms]] — sorting, searching, and graph algorithms that operate on these structures
- [[cs-fundamentals/system-design]] — data structure choices affect system scalability
- [[math/linear-algebra]] — vectors and matrices are multi-dimensional arrays; understanding memory layout matters for ML
- [[python/ecosystem]] — Python's `collections`, `heapq`, `sortedcontainers` implementations
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
