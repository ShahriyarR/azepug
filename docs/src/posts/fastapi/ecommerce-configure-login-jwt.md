# Configure login functionality with JWT

As we have implemented the user registration with password hash and salt, now it is time to login our user.

We are going to use JWT based auth. 
This section is a updated and combined version of: [Auth users in FastAPI with JWT Tokens](https://www.jeffastor.com/blog/authenticating-users-in-fastapi-with-jwt-tokens) and [FastAPI OAuth2 with Password (and hashing), Bearer with JWT tokens](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).

First, let's add password verification function to verify sent password. Add following method in the Authenticate class in `users/authentication.py` file:

```python
@staticmethod
def verify_password(*, password: str, salt: str, hashed_pw: str) -> bool:
    return pwd_context.verify(password + salt, hashed_pw)
```

We need to send raw password, salt and check if it is equal to hashed password in the database.

The next is to install our dependency package to manage JWT, this is suggested in FastAPI doc as well:

```shell
poetry add python-jose[cryptography]
```

Okay, great let's add needed JWT settings to .env file and also to our config manager.
Please keep in mind that you can generate this `SECRET_KEY` using:

```shell
openssl rand -hex 32
```

Add followings to `.env` file:

```shell
# JWT related variables

SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_TOKEN_PREFIX="Bearer"
JWT_AUDIENCE="backend:auth"
```

Then add following into the `Settings` class in `app/core/config.py`:

```python
JWT_SETTINGS: Optional[Dict[str, Any]] = None
SECRET_KEY: str
JWT_ALGORITHM: str
ACCESS_TOKEN_EXPIRE_MINUTES: int
JWT_TOKEN_PREFIX: str
JWT_AUDIENCE: str

@validator('JWT_SETTINGS', pre=True)
def assemble_jwt_settings(cls, v: Optional[str], values: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(v, str):
        return v
    return {
        "SECRET_KEY": values.get("SECRET_KEY"),
        "JWT_ALGORITHM": values.get("JWT_ALGORITHM"),
        "ACCESS_TOKEN_EXPIRE_MINUTES": values.get("ACCESS_TOKEN_EXPIRE_MINUTES"),
        "JWT_TOKEN_PREFIX": values.get("JWT_TOKEN_PREFIX"),
        "JWT_AUDIENCE": values.get("JWT_AUDIENCE"),
    }
```


Then we need to define Pydantic schemas for our token management in `users/schemas.py`:

```python
# Add JWT schemas

class JWTMeta(CoreModel):
    iss: str = "azepug.az"
    aud: str = settings.JWT_AUDIENCE
    iat: float = datetime.timestamp(datetime.now())
    exp: float = datetime.timestamp(datetime.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


class JWTCreds(CoreModel):
    """How we'll identify users"""
    sub: EmailStr
    username: str


class JWTPayload(JWTMeta, JWTCreds):
    """
    JWT Payload right before it's encoded - combine meta and username
    """
    pass


class AccessToken(CoreModel):
    access_token: str
    token_type: str
```

Let'now try to create our Access Token in `users/authentication.py` file:

```python
@staticmethod
def create_access_token_for_user(
    *,
    user: UserInDB,
    secret_key: str = str(settings.SECRET_KEY),
    audience: str = settings.JWT_AUDIENCE,
    expires_in: int = settings.ACCESS_TOKEN_EXPIRE_MINUTES,
) -> Optional[str]:
    if not user or not isinstance(user, UserInDB):
        return None
    jwt_meta = JWTMeta(
        aud=audience,
        iat=datetime.timestamp(datetime.now()),
        exp=datetime.timestamp(datetime.now() + timedelta(minutes=expires_in)),
    )
    jwt_creds = JWTCreds(sub=user.email, username=user.username)
    token_payload = JWTPayload(
        **jwt_meta.dict(),
        **jwt_creds.dict(),
    )
    return jwt.encode(
        token_payload.dict(), secret_key, algorithm=settings.JWT_ALGORITHM
    )

```

The code itself is quite standart and nothing fancy here. Basically we are returning back the Access Token.

But if you have a question where we will use this generated token - basically we need to return back to the frontend this access token, in the frontend side we will get it and store in the `localStorage` and at each request we will send in the header as `Beared` token.

Do you remember our UserPublic schema? We need to update it to add the `access_token`:

```python
class UserPublic(DateTimeModelMixin, UserBase):
    access_token: Optional[AccessToken]

    class Config:
        orm_mode = True
```

That means we are going to return back to the frontend User public data + access_token.

Nice, then let me quickly explain our login flow. 
Basically:

* We are going to send the `POST` request to the `login` endpoint with username and password.
* We are going to get the user with this provided username from the database.
* Then we need to get the stored salt from this found user and verify the password if it is the one stored in the database or not.
* If the user exists and the provided password is valid then we are going to create the access token and send the UserPublic data to the frontend.
* In the frontend we need to get this access token and store it in the `state` and in the `localStorage`.

Does it make sense? If yes then let's continue for getting our user with username from the database.
I am going to add this function in the `users/crud.py`:

```python
async def get_user_by_username(user_name: str) -> UserInDB:
    async with db.with_bind(settings.DATABASE_URI) as engine:
        found_user = await User.query.where(User.username == user_name).gino.first()

    return UserInDB.from_orm(found_user)
```

Basically we are getting back the user from the database if the provided username exists in users table.

Then let's define our `/login` endpoint. Before that we need another Pydantic schema exactly for the login action:

```python
class UserLogin(CoreModel):
    """
    username and password are required for logging in the user
    """
    username: str
    password: constr(min_length=7, max_length=100)

    @validator("username", pre=True)
    def username_is_valid(cls, username: str) -> str:
        return validate_username(username)
```

So basically we are expecting username and password as part of UserLogin schema.

Finally our endpoint:

```python
@router.post(
    '/login',
    tags=["user login"],
    description="Log in the User",
    response_model=UserPublic
)
async def user_login(user: UserLogin) -> UserPublic:
    from ..crud import get_user_by_username

    found_user = await get_user_by_username(user_name=user.username)
    if auth_service.verify_password(password=user.password, salt=found_user.salt, hashed_pw=found_user.password):
        # If the provided password is valid one then we are going to create an access token
        token = auth_service.create_access_token_for_user(user=found_user)
        access_token = AccessToken(access_token=token, token_type='bearer')
        return UserPublic(**found_user.dict(), access_token=access_token)
```

Sending the login request:

```shell
curl -X POST  http://127.0.0.1:8000/users/login -d '{"username": "example", "password": "12345789"}' | jq

{
  "email": "example@gmail.com",
  "username": "example",
  "email_verified": false,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2021-05-16T15:19:30.408545",
  "updated_at": "2021-05-16T15:19:30.408578",
  "access_token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJleGFtcGxlQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiZXhhbXBsZSIsImlzcyI6ImF6ZXB1Zy5heiIsImF1ZCI6ImJhY2tlbmQ6YXV0aCIsImlhdCI6MTYyMTIzNDY1OS41NjQ4NDIsImV4cCI6MTYyMTIzNjQ1OS41NjQ4NDh9.CQzIWY_TcDn51WooCahyb5S4oCZXOdCeXkr3BmZ7UQM",
    "token_type": "bearer"
  }
}
```

As you see we have successfully logged in our user as we get back the access token :)

We are still struggling with issue related to Gino as the global db seems to be uninitialized as we send second request:

```python
gino.exceptions.UninitializedError: Gino engine is not initialized.
```

In the next chapters we will try to fix this issue as well. Also we need to add some extra functionality for our token management.

The code changes for this episode -> [episode-6](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-6)


### NEXT -> [Fixing Gino engine is not initialized issue](./ecommerce-fixing-gino-error)
