# Configure User registration - password hashing

> NOTE: From now, I have shifted from Python 3.9 to 3.8 due to this bug [Segmentation Fault in record_repr at asyncpg/protocol/record/recordobj.c:462](https://github.com/MagicStack/asyncpg/issues/757)


Okay, now it is time to restructure our project a bit and apply changes to store our User's data securely.
Particularly, we need password hashing and salting and an endpoint to send the request.

Let's get started.

I would like to change our `app/database.py` file and hard code some arguments there(those will be updated and will be read from .env as well in the future):

```python
from .core.config import settings


db = Gino(
db: Gino = Gino(
    dsn=settings.DATABASE_URI
    dsn=settings.DATABASE_URI,
)
    pool_min_size=3,
    pool_max_size=20,
    retry_limit=1,
    retry_interval=1,
    ssl=None,
)
```

Next I am going to change our Pydantic schemas in `users/schemas.py`. 
Changes are below, the rest of the file was left unchanged:

```python

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

    class Config:
        orm_mode = True


class UserInDB(DateTimeModelMixin, UserBase):
    """
    Add in id, created_at, updated_at, and user's password and salt
    """
    password: constr(min_length=7, max_length=100)
    salt: str

    class Config:
        orm_mode = True


class UserPublic(DateTimeModelMixin, UserBase):

    class Config:
        orm_mode = True


# TODO: UserUpdate for profile update can be here

# TODO: UserPasswordUpdate for password update can be here

class UserPasswordUpdate(CoreModel):
    """
    Users can change their password
    """
    password: constr(min_length=7, max_length=100)
    salt: str

    class Config:
        orm_mode = True
```

Basically we add `orm_mode=True` and new schema called `UserPasswordUpdate`.
This change will come handy when we are going to pass database models to our Pydantic schema.
Read more about [orm_mode=True](https://pydantic-docs.helpmanual.io/usage/models/#orm-mode-aka-arbitrary-class-instances).


We need some extra packages:

```shell
$ poetry add passlib[bcrypt]
```

Our final `pyproject.toml` file will be:

```toml
[tool.poetry]
name = "backend"
version = "0.1.0"
description = ""
authors = ["Shahriyar Rzayev <rzayev.sehriyar@gmail.com>"]

[tool.poetry.dependencies]
python = "^3.7"
fastapi = "^0.64.0"
gino = {extras = ["pg", "starlette"], version = "^1.0.1"}
uvicorn = "^0.13.4"
gunicorn = "^20.1.0"
alembic = "^1.6.2"
psycopg2 = "^2.8.6"
passlib = {extras = ["bcrypt"], version = "^1.7.4"}
pydantic = {extras = ["dotenv"], version = "^1.8.2"}

[tool.poetry.dev-dependencies]
pytest = "^5.2"
pytest-cov = "^2.10.1"
requests = "^2.25.1"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
```

Great, now we need to create Authentication helper class and methods to create password hash and salt.
Create a file `users/authentication.py` file and put:

```python
import bcrypt
from passlib.context import CryptContext
from .schemas import UserPasswordUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Authenticate:
    def create_salt_and_hashed_password(self, *, plaintext_password: str) -> UserPasswordUpdate:
        salt = self.generate_salt()
        hashed_password = self.hash_password(password=plaintext_password, salt=salt)
        return UserPasswordUpdate(salt=salt, password=hashed_password)

    @staticmethod
    def generate_salt() -> str:
        return bcrypt.gensalt().decode()

    @staticmethod
    def hash_password(*, password: str, salt: str) -> str:
        return pwd_context.hash(password + salt)
```

This code has been adopted from -> [Auth users in FastAPI with JWT Tokens](https://www.jeffastor.com/blog/authenticating-users-in-fastapi-with-jwt-tokens).

Did you notice the `UserPasswordUpdate` pydantic schema? This is basically the copy of `UserInDB` schema.
Basically, we are returning back this schema with new generated salt and password for later usage in our `create_user` function.


Next we need to instantiate this class in the `users/__init__.py` file:

```python
from .authentication import Authenticate

auth_service = Authenticate()

__all__ = ['auth_service', ]
```

Then go ahead to `users/crud.py` file and add our actual user creation function:

```python
from .schemas import UserPasswordUpdate, UserCreate, UserInDB
from backend.users import auth_service
from .models import User, db
from backend.app.core.config import settings


async def create_user(new_user: UserCreate) -> UserInDB:
    # This is a UserPasswordUpdate
    new_password = auth_service.create_salt_and_hashed_password(plaintext_password=new_user.password)
    # Next we extend our UserCreate schema here
    new_user_params = new_user.copy(update=new_password.dict())
    # Updated and extended UserCreate schema was passed to UserInDB
    new_user_updated = UserInDB(**new_user_params.dict())
    # Just printing the result
    print(new_user_updated)

    # Here we are openning one time connection
    async with db.with_bind(settings.DATABASE_URI) as engine:
        # Database model User creation happens here
        created_user = await User.create(**new_user_updated.dict())

    # And now we nicely return from_orm with UserInDB
    return UserInDB.from_orm(created_user)
```

Please follow comments in the code to get the idea what is going on there.

That's great but, we need an endpoint to use this crud operation. Let's update our `api/controller.py`:

```python
from fastapi import APIRouter
from ..schemas import UserCreate, UserInDB, UserPublic

router = APIRouter()


@router.post(
    "/create",
    tags=["user registration"],
    description="Register the User",
    response_model=UserPublic,
)
async def user_create(user: UserCreate) -> UserInDB:
    from ..crud import create_user

    return await create_user(user)
```

We are simply awaiting create_user and it should do the trick for us. But, please pay attention to our response_model it is `UserPublic` - it means that the password, salt will be omitted in the response, but the function itself has the return type of `UserInDB`. Nice and clean :)

We have some other changes in order to finish this chapter and to test our app.
The updated version of `app/main.py`:

```python
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .database import db
from backend.users.api.controller import router as user_router

sys.path.append('..')

app = FastAPI(title=settings.PROJECT_NAME)
db.init_app(app)


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

For `migrations/env.py` update following lines:

```python
sys.path.append('..')
from backend.app.core.config import settings
from backend.app.database import db
from backend.users.models import User
```

Now let's fire up our server and test it.
First sending the request:

```shell
curl -X POST http://127.0.0.1:8000/users/create -d '{"email": "example@gmail.com", "password": "12345789", "username": "example"}' | jq

{
  "email": "example@gmail.com",
  "username": "example",
  "email_verified": false,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2021-05-15T20:21:06.507097",
  "updated_at": "2021-05-15T20:21:06.507117"
}

```

We can't see the hashed password and salt because of again `UserPublic` schema.

But we can check if in database:


```sql
ecommerce=# select * from users;
 id | username |       email       | email_verified |             salt              |                           password                           | is_active | is_superuser |         created_at         |         updated_at         
----+----------+-------------------+----------------+-------------------------------+--------------------------------------------------------------+-----------+--------------+----------------------------+----------------------------
 22 | example  | example@gmail.com | f              | $2b$12$bu70L8D4nbNBftEvSc93gO | $2b$12$9OvltW2n.AqwXFhv5OyBh.x51.dWg7Vt..Gd6eAC6LUu5ziqNfF9G | t         | f            | 2021-05-15 20:21:06.507097 | 2021-05-15 20:21:06.507117
(1 row)
```

As you see we have hashed password and salt in place.

From the server output(do remember this print?):

```shell
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [28445] using statreload
INFO:     Started server process [28447]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
app started
email='example@gmail.com' username='example' email_verified=False is_active=True is_superuser=False created_at=datetime.datetime(2021, 5, 15, 20, 21, 6, 507097) updated_at=datetime.datetime(2021, 5, 15, 20, 21, 6, 507117) password='$2b$12$9OvltW2n.AqwXFhv5OyBh.x51.dWg7Vt..Gd6eAC6LUu5ziqNfF9G' salt='$2b$12$bu70L8D4nbNBftEvSc93gO'
INFO:     127.0.0.1:45054 - "POST /users/create HTTP/1.1" 200 OK
```

So basically we have registered the user with hashed and salted password properly.

The code changes for this episode -> [episode-5](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-5)

The next thing is to have login functionality with JWT, so we are going to extend our Authentication system.

### NEXT -> [Configure login functionality with JWT](./ecommerce-configure-login-jwt)