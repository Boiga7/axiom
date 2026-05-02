---
type: concept
category: web-frameworks
tags: [django, python, orm, drf, async, channels, websocket, backend]
sources: []
updated: 2026-04-29
para: resource
tldr: Django is batteries-included Python web — ORM with pgvector support, DRF for REST APIs, Channels for WebSocket LLM streaming, and Admin as a free internal AI operations tool; use over FastAPI when you need relational data, auth, or management commands out of the box.
---

# Django

> **TL;DR** Django is batteries-included Python web — ORM with pgvector support, DRF for REST APIs, Channels for WebSocket LLM streaming, and Admin as a free internal AI operations tool; use over FastAPI when you need relational data, auth, or management commands out of the box.

Python's batteries-included web framework. The right choice when you need: a production-grade ORM, Django Admin, DRF APIs, or a mature ecosystem. Heavier than FastAPI but more complete out of the box.

---

## When to Use Django vs FastAPI

| Use Django when... | Use FastAPI when... |
|---|---|
| You need Django Admin for content management | You need maximum API performance |
| Complex relational data with ORM | Simple API, primarily LLM endpoints |
| Existing Django project | Starting fresh, API-first |
| Authentication, permissions out of the box | You're building for microservices |
| Management commands, celery tasks | You need native async throughout |
| Team knows Django | Team prefers type-first development |

Django's async support (3.1+) is still maturing. Not every ORM operation is truly async. FastAPI is async-native from the ground up.

---

## ORM

Django's ORM is a first-class feature. Critical patterns for AI applications:

**Lazy evaluation — N+1 prevention:**
```python
# Bad: N+1 queries
for document in Document.objects.all():
    print(document.author.name)  # one query per document

# Good: select_related (JOIN for ForeignKey/OneToOne)
for document in Document.objects.select_related("author").all():
    print(document.author.name)  # 1 query

# Good: prefetch_related (2 queries for ManyToMany/reverse FK)
for document in Document.objects.prefetch_related("tags").all():
    print([t.name for t in document.tags.all()])  # 2 queries total
```

**Storing embeddings (pgvector):**
```python
from pgvector.django import VectorField

class Document(models.Model):
    content = models.TextField()
    embedding = VectorField(dimensions=1536)

# Similarity search
from pgvector.django import CosineDistance
Document.objects.alias(distance=CosineDistance("embedding", query_embedding)).filter(distance__lt=0.3).order_by("distance")[:5]
```

---

## Django REST Framework (DRF)

The standard for building APIs with Django.

```python
from rest_framework import serializers, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "content", "created_at"]

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"])
    def summarise(self, request, pk=None):
        doc = self.get_object()
        summary = summarise_with_claude(doc.content)
        return Response({"summary": summary})
```

```python
# urls.py
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register("documents", DocumentViewSet)
urlpatterns = router.urls  # GET/POST /documents/, GET/PUT/DELETE /documents/{id}/
```

---

## Async Views (Django 3.1+)

```python
from django.http import StreamingHttpResponse, JsonResponse
from asgiref.sync import sync_to_async
import anthropic

async def chat_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)
    
    data = json.loads(request.body)
    client = anthropic.AsyncAnthropic()
    
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": data["message"]}]
    )
    return JsonResponse({"reply": response.content[0].text})
```

**Async ORM:** Not all ORM methods are async-native. Use `sync_to_async` wrapper:
```python
documents = await sync_to_async(list)(Document.objects.filter(user=user))
```

Or use the ORM's async-compatible methods (Django 4.1+):
```python
async for doc in Document.objects.filter(user=user):
    # truly async iteration
    pass
```

---

## Channels (WebSocket)

Django Channels adds WebSocket and async protocol support.

```python
# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
import anthropic

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        client = anthropic.AsyncAnthropic()
        
        async with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": data["message"]}]
        ) as stream:
            async for text in stream.text_stream:
                await self.send(text_data=json.dumps({"token": text}))
        
        await self.send(text_data=json.dumps({"done": True}))
```

---

## Django Admin for AI Applications

Django Admin becomes a powerful internal tool for AI operations:
- Review and approve agent-generated content
- Manage prompt templates
- Monitor and audit agent actions
- Curate training data

```python
from django.contrib import admin

@admin.register(AgentAction)
class AgentActionAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "agent_type", "user", "status", "token_count"]
    list_filter = ["agent_type", "status"]
    readonly_fields = ["timestamp", "input_prompt", "output_text", "token_count"]
    actions = ["mark_reviewed", "flag_for_training"]
```

---

## Management Commands for AI

```python
# management/commands/embed_documents.py
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = "Re-embed all documents that lack embeddings"
    
    def handle(self, *args, **options):
        docs = Document.objects.filter(embedding__isnull=True)
        self.stdout.write(f"Embedding {docs.count()} documents...")
        for doc in docs:
            doc.embedding = embed_text(doc.content)
            doc.save(update_fields=["embedding"])
```

Run: `python manage.py embed_documents`

---

## Key Facts

- Async support: Django 3.1+ has async views; Django 4.1+ has async ORM iteration; not all ORM methods are async-native — use `sync_to_async` wrapper
- pgvector integration: `VectorField(dimensions=1536)` + `CosineDistance` for similarity search via `pgvector.django`
- DRF ViewSet auto-generates GET/POST /resources/ and GET/PUT/DELETE /resources/{id}/ routes via `DefaultRouter`
- Django Channels: WebSocket consumer pattern for streaming LLM tokens token-by-token over persistent connection
- Django Admin: no extra code needed for AI ops internal tooling — review agent actions, flag training data, manage prompts
- Management commands: `python manage.py embed_documents` — standard pattern for batch embedding jobs
- N+1 prevention: `select_related` for FK/OneToOne (JOIN), `prefetch_related` for ManyToMany/reverse FK (2 queries)

## Common Failure Cases

**`sync_to_async(list)(queryset)` creates a new database connection per request because the connection is not reused**  
Why: `sync_to_async` runs the synchronous function in a thread pool; each thread may get its own database connection from Django's connection pool rather than sharing the async view's connection; under high load this exhausts the pool.  
Detect: database connection count grows with concurrent requests; `django.db.connection.queries` shows duplicate connections; the pool exhausts under moderate load.  
Fix: use Django 4.1+ async ORM iteration (`async for obj in queryset`) instead of `sync_to_async(list)`; or configure `CONN_MAX_AGE` and the async connection handling for your database backend.

**Django Channels WebSocket consumer crashes silently when the Anthropic stream raises an exception mid-generation**  
Why: if an exception occurs inside `async with client.messages.stream()`, the WebSocket connection is left open but the generator stops; the client receives no error and waits indefinitely.  
Detect: WebSocket connections hang after a certain number of tokens; no error message is sent to the client; the server logs show an unhandled exception inside the consumer.  
Fix: wrap the streaming block in `try/except` and send an error message over the WebSocket before closing; always `await self.close()` in the exception handler.

**N+1 query with `prefetch_related` on a filtered related set invalidates the prefetch cache**  
Why: `queryset.prefetch_related("tags")` fetches all related tags in one query; if you then filter `document.tags.filter(active=True)`, Django issues a new query rather than using the prefetch cache, re-introducing N+1.  
Detect: `django.test.utils.CaptureQueriesContext` shows more queries than expected when filtering on a prefetched relationship.  
Fix: use `Prefetch("tags", queryset=Tag.objects.filter(active=True))` to pre-filter in the prefetch itself; avoid calling `.filter()` on a prefetched related manager.

**Management command runs synchronous ORM code from an async context, causing `SynchronousOnlyOperation`**  
Why: if a management command calls `asyncio.run(async_function())` and that async function calls synchronous Django ORM methods, Django raises `SynchronousOnlyOperation` because async context is detected.  
Detect: `django.core.exceptions.SynchronousOnlyOperation: You cannot call this from an async context` in management command output.  
Fix: use `sync_to_async` to wrap ORM calls within async functions; or keep management commands fully synchronous and use `asyncio.run()` only for I/O-bound non-ORM work.

## Connections

- [[web-frameworks/fastapi]] — the lighter async-native alternative; comparison table on this page
- [[web-frameworks/nextjs]] — the frontend Django might serve
- [[python/ecosystem]] — Python ecosystem (uv, Pydantic, asyncio, pytest)
- [[infra/vector-stores]] — pgvector in Django projects

## Open Questions

- At what scale does Django's async ORM limitations (sync_to_async wrapping) become a significant performance bottleneck vs FastAPI's async-native SQLAlchemy?
- Is Django Channels the right choice for LLM streaming, or are simpler SSE (Server-Sent Events) approaches via Django async views preferable?
- How does Django Admin hold up as an AI operations tool when agent action volume becomes high (millions of rows)?
