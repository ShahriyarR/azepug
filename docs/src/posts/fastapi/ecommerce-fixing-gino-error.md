# Fixing Gino engine is not initialized issue

In order to eliminate this `UninitializedError: Gino engine is not initialized` we are going to restructure our project a bit.

I am going to remove `app/database.py` file and do the db initialization inside `app/main.py` file.
The final main.py:

```python
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from gino.ext.starlette import Gino
from backend.users.api.controller import router as user_router
from sqlalchemy import MetaData

sys.path.append('..')

__all__ = ['app', 'db']

app = FastAPI(title=settings.PROJECT_NAME)
db: MetaData = Gino(
        app,
        dsn=settings.DATABASE_URI,
        pool_min_size=3,
        pool_max_size=20,
        retry_limit=10,
        retry_interval=10,
        ssl=None,
    )


@app.on_event("startup")
async def startup():
    print("app started")


@app.on_event("shutdown")
async def shutdown():
    print("SHUTDOWN")


app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(user_router, prefix='/users')
```

Add following parts into `app/__init__.py` and `backend/__init__.py` file:

```python
from .app import app, db

__all__ = ['app', 'db']
```

The new version of `users/crud.py`:

```python
from .schemas import UserCreate, UserInDB
from backend.users import auth_service
from .models import User


async def create_user(new_user: UserCreate) -> UserInDB:
    new_password = auth_service.create_salt_and_hashed_password(plaintext_password=new_user.password)
    new_user_params = new_user.copy(update=new_password.dict())
    new_user_updated = UserInDB(**new_user_params.dict())
    created_user = await User.create(**new_user_updated.dict())

    return UserInDB.from_orm(created_user)


async def get_user_by_username(user_name: str) -> UserInDB:
    found_user = await User.query.where(User.username == user_name).gino.first()

    return UserInDB.from_orm(found_user)
```

In the `users/models.py` change the import statement to be:

```python
from backend import db
```

Now if we try to login several times it will work without Gino error.

The code changes for this episode -> [episode-7](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-7)

Next thing is to write tests to our project.
