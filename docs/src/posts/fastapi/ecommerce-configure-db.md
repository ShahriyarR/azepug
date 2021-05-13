# Configure Gino as ORM

Now it is time to configure ORM for our project.
I assume you have PosgtreSQL already installed. If yes then it will be easy to prepare user, database for our project.
Connect to Postgres and run followings:

```sql
postgres=# create user ecommerce with encrypted password '12345';
CREATE ROLE

postgres=# create database ecommerce;
CREATE DATABASE

postgres=# grant all privileges on database ecommerce to ecommerce;
GRANT
```

I am not going to bother with weak Database password, but you should of course.
The next thing we need to update our `.env` file. The final result should be:

```env
PROJECT_NAME=backend
BACKEND_CORS_ORIGINS=["http://localhost:8000", "https://localhost:8000", "http://localhost", "https://localhost"]


POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=12345
POSTGRES_SERVER=localhost
POSTGRES_DB=ecommerce
```

Do you remember the file with name `database.py` which was created by our [manage-fastapi](https://github.com/ycd/manage-fastapi) tool? 

It is in fact was based on SQLAlchemy, now remove all the lines there and add only these lines below:

```python
from gino.ext.starlette import Gino
from .core.config import settings


db = Gino(
    dsn=settings.DATABASE_URI
)
```

The last thing we need to have is to initialize our DB connection at the very start.
Add `db.init_app(_app)` inside `get_application()` function in `main.py`.
The final version of this file will be:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .database import db


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
    
    return _app


app = get_application()
```

Finally to test our connection run the server:

```shell
❯ fastapi run
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [17655] using statreload
INFO:     Started server process [17657]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

As we have no error, it is clear we are in a good shape :)
The next thing is to create the migraitons and the User model of course.

The code changes for this episode -> [episode-2](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-2)

### NEXT -> [Configure Alembic database migrations](./ecommerce-configure-alembic)