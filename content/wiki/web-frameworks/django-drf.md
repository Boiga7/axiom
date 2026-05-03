---
type: concept
category: web-frameworks
tags: [django, drf, rest-framework, api, serializers, viewsets, permissions, router]
sources: [raw/inbox/django-drf-websearch-2026-05-03.md]
updated: 2026-05-03
para: resource
tldr: Django REST Framework (DRF) is the industry-standard toolkit for building REST APIs with Django. ModelSerializer + ModelViewSet + DefaultRouter is the standard CRUD pattern; custom @action decorators extend it for AI service endpoints.
---

# Django REST Framework (DRF)

> **TL;DR** Django REST Framework (DRF) is the industry-standard toolkit for building REST APIs with Django. ModelSerializer + ModelViewSet + DefaultRouter is the standard CRUD pattern; custom `@action` decorators extend it for AI service endpoints.

The canonical way to expose Django models as a REST API. DRF sits on top of [[web-frameworks/django]]'s ORM, auth, and middleware stack and adds serialisation, viewsets, permissions, routers, and browsable API UI. In AI engineering contexts, DRF is commonly used to expose LLM inference endpoints, document processing pipelines, and annotation interfaces.

> [Source: django-rest-framework.org, 2026-05-03]

---

## Install

```bash
pip install djangorestframework
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    "rest_framework",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}
```

---

## Serializers

Convert Django model instances ↔ Python dicts ↔ JSON. The serialiser is the contract between your ORM and your API consumers.

```python
from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "title", "content", "created_at"]
        read_only_fields = ["id", "created_at"]
```

**ModelSerializer** auto-generates fields from the model. Override any field for custom behaviour:

```python
class DocumentSerializer(serializers.ModelSerializer):
    word_count = serializers.SerializerMethodField()
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = Document
        fields = ["id", "title", "content", "word_count", "author_name"]

    def get_word_count(self, obj) -> int:
        return len(obj.content.split())

    def validate_content(self, value: str) -> str:
        if len(value) < 10:
            raise serializers.ValidationError("Content too short.")
        return value
```

---

## ViewSets

Classes that bundle multiple related views. `ModelViewSet` gives you all CRUD actions for free:

```python
from rest_framework import viewsets, permissions
from .models import Document
from .serializers import DocumentSerializer

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by("-created_at")
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scope to the requesting user
        return Document.objects.filter(owner=self.request.user)
```

`ModelViewSet` provides: `list`, `create`, `retrieve`, `update`, `partial_update`, `destroy`.

Use mixins to restrict available actions:

```python
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet

class ReadOnlyDocumentViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
```

---

## Custom Actions — AI Endpoints

Use `@action` for non-CRUD endpoints on a ViewSet:

```python
from rest_framework.decorators import action
from rest_framework.response import Response
import anthropic

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    @action(detail=True, methods=["post"])
    def summarise(self, request, pk=None):
        """Generate an AI summary of this document."""
        doc = self.get_object()
        client = anthropic.Anthropic()
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"Summarise this document in 3 bullet points:\n\n{doc.content}"
            }]
        )
        return Response({"summary": message.content[0].text})

    @action(detail=False, methods=["post"])
    def classify(self, request):
        """Classify a batch of documents."""
        ids = request.data.get("ids", [])
        docs = Document.objects.filter(id__in=ids)
        # ... batch AI classification
        return Response({"results": [...]})
```

Routes generated:
- `POST /documents/{id}/summarise/`
- `POST /documents/classify/`

---

## Routers

Register ViewSets with a router to auto-generate all URL patterns:

```python
# urls.py
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

router = DefaultRouter()
router.register(r"documents", DocumentViewSet, basename="document")

urlpatterns = [
    path("api/", include(router.urls)),
]
```

This generates:
| Method | URL | Action |
|---|---|---|
| GET | `/api/documents/` | list |
| POST | `/api/documents/` | create |
| GET | `/api/documents/{id}/` | retrieve |
| PUT | `/api/documents/{id}/` | update |
| PATCH | `/api/documents/{id}/` | partial_update |
| DELETE | `/api/documents/{id}/` | destroy |
| POST | `/api/documents/{id}/summarise/` | custom action |

---

## Permissions

Control access per-viewset or per-action:

```python
from rest_framework.permissions import BasePermission, IsAuthenticated

class IsDocumentOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user

class DocumentViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsDocumentOwner()]
```

---

## Authentication

```python
# settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",   # API key header
        "rest_framework.authentication.SessionAuthentication", # browser sessions
    ],
}
```

For JWT: `pip install djangorestframework-simplejwt`

```python
# urls.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns += [
    path("api/token/", TokenObtainPairView.as_view()),
    path("api/token/refresh/", TokenRefreshView.as_view()),
]
```

---

## Streaming LLM Responses

For real-time LLM output, Django Channels handles WebSockets; for SSE, use a StreamingHttpResponse:

```python
from django.http import StreamingHttpResponse
import anthropic

def stream_summary(request, doc_id):
    doc = Document.objects.get(id=doc_id)
    client = anthropic.Anthropic()

    def event_stream():
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": f"Summarise: {doc.content}"}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"

    return StreamingHttpResponse(event_stream(), content_type="text/event-stream")
```

For full WebSocket streaming, see [[web-frameworks/django]] (Channels section).

---

## Connections

- [[web-frameworks/django]] — DRF sits on top of Django; ORM, auth middleware, and settings all come from Django
- [[web-frameworks/fastapi]] — FastAPI is the alternative for new Python APIs; automatic OpenAPI, better async, lighter than DRF
- [[apis/anthropic-api]] — Anthropic client used inside DRF custom actions for LLM endpoints
- [[python/instructor]] — instructor wraps the Anthropic client to enforce Pydantic schemas; pairs well with DRF serialisers
- [[cs-fundamentals/api-design]] — REST principles underlying DRF's routing conventions

## Open Questions

- When does DRF beat FastAPI? (DRF wins when you're already on Django and need ORM integration + admin; FastAPI wins for greenfield Python APIs)
- How does DRF's async support (Django 3.1+) compare to FastAPI's native async in practice?
- Is there a clean pattern for streaming LLM responses through DRF viewsets?
