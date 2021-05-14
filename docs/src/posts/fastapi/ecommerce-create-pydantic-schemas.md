# Configure Pydantic schemas and User model

Now it is time to get more serious stuff. 
We need proper User model, proper Pydantic schemas and simple endpoint to test our work.
I have adopted, changed the code from [Designing a robust User Model](https://www.jeffastor.com/blog/designing-a-robust-user-model-in-a-fastapi-app)

Let's get started. 
First of all let's update our User model with extra columns:

```python
from backend.app.main import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.BigInteger(), primary_key=True)
    username = db.Column(db.Unicode(), unique=True, nullable=False)
    email = db.Column(db.String(), unique=True, nullable=False)
    email_verified = db.Column(db.Boolean(), nullable=True, server_default="True")
    salt = db.Column(db.Unicode(), nullable=False)
    password = db.Column(db.Unicode(), nullable=False)
    is_active = db.Column(db.Boolean(), nullable=False, server_default="True")
    is_superuser = db.Column(db.Boolean(), nullable=False, server_default="False")
    created_at = db.Column(db.DateTime(), nullable=False)
    updated_at = db.Column(db.DateTime(), nullable=False)
```

Create migration file:

```shell
❯ poetry run alembic revision --autogenerate -m 'update users table'
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.ddl.postgresql] Detected sequence named 'users_id_seq' as owned by integer column 'users(id)', assuming SERIAL and omitting
INFO  [alembic.autogenerate.compare] Detected removed table 'users'
  Generating /home/shako/REPOS/Learning_FastAPI/Djackets/backend/migrations/versions/0508f9ca0879_update_users_table.py ...  done
```

Run the migration:

```shell
poetry run alembic upgrade head
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 43774c187998 -> 0508f9ca0879, update users table
```

Next lets define our shared schemas in `app/schemas.py` file:

```python
# Define core Pydantic schemas here
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, validator


class CoreModel(BaseModel):
    """
    Any common logic to be shared by all models goes here
    """
    pass


class DateTimeModelMixin(BaseModel):
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    
    @validator("created_at", "updated_at", pre=True, always=True)
    def default_datetime(cls, value: datetime) -> datetime:
        return value or datetime.now()


class IDModelMixin(BaseModel):
    id: int

```

Our plan here is to have something code and shared Pydantic models to be used in different schemas.
`DateTimeModelMixin` has 2 two properties which will be populated automatically. Basically, we are going to add `created_at` and `updated_at` with `datetime.now()`.

Now it is time to add our User schemas:

```python
import string
from pydantic import EmailStr, constr, validator
from backend.app.schemas import CoreModel, DateTimeModelMixin, IDModelMixin
from typing import Optional


# simple check for valid username
def validate_username(username: str) -> str:
    allowed = string.ascii_letters + string.digits + "-" + "_"
    assert all(char in allowed for char in username), "Invalid characters in username."
    assert len(username) >= 3, "Username must be 3 characters or more."
    return username


class UserBase(CoreModel):
    """
    Leaving off password and salt from base model
    """
    email: Optional[EmailStr]
    username: Optional[str]
    email_verified: bool = False
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(CoreModel):
    """
    Email, username, and password are required for registering a new user
    """
    email: EmailStr
    password: constr(min_length=7, max_length=100)
    username: str

    @validator("username", pre=True)
    def username_is_valid(cls, username: str) -> str:
        return validate_username(username)


class UserInDB(IDModelMixin, DateTimeModelMixin, UserBase):
    """
    Add in id, created_at, updated_at, and user's password and salt
    """
    password: constr(min_length=7, max_length=100)
    salt: str


class UserPublic(DateTimeModelMixin, UserBase):
    pass


# TODO: UserUpdate for profile update can be here

# TODO: UserPasswordUpdate for password update can be here
```

Why we need `UserPublic`? It is basically for response model, we do not want to return password, salt, etc back to the user.

Now let's add our first view(or controller) to test. I am going to remove `v1.py` file from `users/api/` and add `controller.py` instead:

```python
from fastapi import APIRouter, status, Body
from fastapi.responses import JSONResponse
from ..schemas import UserCreate, UserInDB, UserPublic

router = APIRouter()


@router.post(
    "/create",
    tags=["user registration"],
    description="Register the User",
    response_model=UserPublic,
)
async def user_create(user: UserCreate):
    return user
```

What we have so far? We have indicated that we want as input `UserCreate` model which is from Pydantic, we also have `response_model` which is a neat thing to indicate what the frontend side will get back after sending POST request to our endpoint.

Wait, we need to register our router. Open the `app/main.py` file and update:

```python
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .database import db

sys.path.append('..') # fixing parent folder import error

from backend.users.api.controller import router as user_router


def get_application():
    _app = FastAPI(title=settings.PROJECT_NAME)

    _app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    db.init_app(_app)

    _app.include_router(user_router, prefix='/users') # this is the new added
    
    return _app


app = get_application()
```

Fire up the server:

```shell
❯ fastapi run
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [1322] using statreload
INFO:     Started server process [1325]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

You can go to `http://127.0.0.1:8000/docs` and see our new endpoint and even test it there.

For simplicity I am going to run cURL here:

```shell
curl -X POST http://127.0.0.1:8000/users/create -d '{"email": "example@gmail.com", "password": "123456789", "username": "example"}' | jq

{
  "email": "example@gmail.com",
  "username": "example",
  "email_verified": false,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2021-05-14T16:15:36.070429",
  "updated_at": "2021-05-14T16:15:36.070445"
}
```

As you see the request data is what we have defined in `UserCreate` schema, and the response data was automatically populated for us from `UserPublic` schema.

That is it for now. So we have setup the User model, User schemas and we have our simple endpoint for just returning back the UserPublic data. But It is fully functional and even the validation is in place:

```shell
curl -X POST http://127.0.0.1:8000/users/create -d '{"email": "example@gmail.com", "password": "12345", "username": "example"}' | jq

{
  "detail": [
    {
      "loc": [
        "body",
        "password"
      ],
      "msg": "ensure this value has at least 7 characters",
      "type": "value_error.any_str.min_length",
      "ctx": {
        "limit_value": 7
      }
    }
  ]
}
```

Great the next thing is to improve our User registration and to add password salt/hashing.

The code changes for this episode -> [episode-4](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-4)


### NEXT -> [Configure password encryption and user registration](./ecommerce-configure-password-encryption)