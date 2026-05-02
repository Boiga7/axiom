---
type: concept
category: cs-fundamentals
para: resource
tags: [pydantic, validation, schemas, type-safety, marshmallow, data-classes, serialisation]
sources: []
updated: 2026-05-01
tldr: Schema definition, custom validators, serialisation, and defensive data handling at system boundaries.
---

# Data Validation with Pydantic v2

Schema definition, custom validators, serialisation, and defensive data handling at system boundaries.

---

## Why Validate at Boundaries

```
Internal code can be trusted — don't wrap every function call in try/except.
Validate at:
  - HTTP request bodies (user input)
  - External API responses (third-party data)
  - Database reads (if schema migrations can race deploys)
  - Queue/stream messages (schema drift between producers and consumers)
  - Config files and environment variables

Don't validate:
  - Between internal functions in the same service
  - Pure transformations on already-validated data
  - Database writes from your own ORM (trust the model)
```

---

## Pydantic v2 Core Patterns

```python
from pydantic import (
    BaseModel, Field, field_validator, model_validator,
    ConfigDict, AliasChoices, EmailStr, HttpUrl,
    constr, conint, confloat,
)
from typing import Annotated
from decimal import Decimal
from datetime import datetime
import uuid

# Strict mode: no coercion (e.g., "123" does NOT become 123)
class StrictModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

# Standard request body model
class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")   # reject unknown fields

    user_id: uuid.UUID
    items: list["OrderItem"] = Field(min_length=1, max_length=50)
    discount_code: Annotated[str, Field(max_length=20, pattern=r"^[A-Z0-9\-]+$")] | None = None
    shipping_address: "Address"
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "GBP"

class OrderItem(BaseModel):
    product_id: uuid.UUID
    quantity: Annotated[int, Field(ge=1, le=999)]
    unit_price: Annotated[Decimal, Field(ge=0, decimal_places=2)]

class Address(BaseModel):
    line1: constr(min_length=1, max_length=200)
    line2: str | None = None
    city: constr(min_length=1, max_length=100)
    postcode: constr(pattern=r"^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$")   # UK postcode
    country: constr(pattern=r"^[A-Z]{2}$") = "GB"
```

---

## Custom Validators

```python
from pydantic import field_validator, model_validator
from pydantic_core import PydanticCustomError

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    date_of_birth: datetime

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors = []
        if len(v) < 12:
            errors.append("at least 12 characters")
        if not any(c.isupper() for c in v):
            errors.append("at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("at least one digit")
        if errors:
            raise PydanticCustomError(
                "password_too_weak",
                "Password must contain: {requirements}",
                {"requirements": ", ".join(errors)},
            )
        return v

    @field_validator("date_of_birth")
    @classmethod
    def must_be_adult(cls, v: datetime) -> datetime:
        from datetime import timezone
        age = (datetime.now(timezone.utc) - v).days // 365
        if age < 18:
            raise ValueError("Must be 18 or older")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "UserRegistration":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self
```

---

## Aliases and External Data Mapping

```python
from pydantic import AliasChoices, AliasPath, Field

# Handle snake_case model ← camelCase API
class StripeWebhookEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_id: str = Field(alias="id")
    event_type: str = Field(alias="type")
    # Handle nested JSON path: data.object.amount
    amount: int = Field(validation_alias=AliasPath("data", "object", "amount"))
    currency: str = Field(validation_alias=AliasPath("data", "object", "currency"))
    created_at: datetime = Field(validation_alias="created")

    # Multiple alias sources (accept any of these names)
    customer_email: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            AliasPath("data", "object", "customer_email"),
            AliasPath("data", "object", "billing_details", "email"),
        ),
    )

# Parse raw webhook payload
event = StripeWebhookEvent.model_validate(raw_json_dict)
```

---

## Computed Fields and Serialisation

```python
from pydantic import computed_field, model_serializer
from typing import Any

class Product(BaseModel):
    name: str
    price_pence: int           # stored in pence internally
    tax_rate: Decimal = Decimal("0.20")

    @computed_field
    @property
    def price_pounds(self) -> Decimal:
        return Decimal(self.price_pence) / 100

    @computed_field
    @property
    def price_with_tax(self) -> Decimal:
        return self.price_pounds * (1 + self.tax_rate)

    # Custom serialisation — control what's in the JSON response
    def model_dump_for_api(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "price": str(self.price_pounds),
            "price_with_tax": str(self.price_with_tax),
            # Omit internal fields: price_pence, tax_rate
        }

p = Product(name="Widget", price_pence=999)
# p.price_pounds → Decimal("9.99")
# p.price_with_tax → Decimal("11.988")
```

---

## Validating External API Responses

```python
import httpx
from pydantic import ValidationError
import logging

class GithubUser(BaseModel):
    model_config = ConfigDict(extra="ignore")   # ignore unknown fields (external API evolves)

    login: str
    id: int
    email: str | None = None
    public_repos: int = 0
    created_at: datetime

async def fetch_github_user(username: str) -> GithubUser:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.github.com/users/{username}")
        response.raise_for_status()

    try:
        return GithubUser.model_validate(response.json())
    except ValidationError as e:
        logging.error(f"GitHub API schema changed: {e}")
        raise   # let caller decide how to handle
```

---

## Config / Environment Validation

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Required — startup fails if missing
    database_url: str
    secret_key: str
    redis_url: str

    # Optional with defaults
    debug: bool = False
    log_level: str = "INFO"
    max_connections: Annotated[int, Field(ge=1, le=100)] = 10
    api_timeout: Annotated[float, Field(gt=0, le=300)] = 30.0
    allowed_hosts: list[str] = ["localhost"]

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in valid:
            raise ValueError(f"log_level must be one of: {valid}")
        return v.upper()

settings = Settings()   # Raises ValidationError at startup if config is wrong
```

---

## Connections

[[se-hub]] · [[python/ecosystem]] · [[cs-fundamentals/api-design]] · [[cs-fundamentals/api-security]] · [[web-frameworks/fastapi]] · [[python/instructor]]
