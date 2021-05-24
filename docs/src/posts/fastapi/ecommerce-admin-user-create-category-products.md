# Enable admin user and create categories

Some code portions were adopted from: [Auth dependencies in FastAPI](https://www.jeffastor.com/blog/authentication-dependencies-in-fastapi)

Let me describe the problem we have at the time being. Basically, I could not find the Django like ImageField and related admin panel settings to create and upload files as easy as possible.

But, what we can create and endpoints to create category and products and enable it only for admin user. That means we need somehow to create a user, to set it as admin user, then login (obtain token) and try to create the category and products.

We need to define dependency to extract the username from the token, and also to add extra dependency to our route to check if the user is admin and it has proper token.

Let's create a method in `users/authentication.py` to extract our username from the provided token:

```python
@staticmethod
def get_username_from_token(*,
                            token: str,
                            secret_key: str = str(settings.SECRET_KEY)) -> Optional[str]:
    try:
        decoded_token = jwt.decode(token, str(secret_key),
                                    audience=settings.JWT_AUDIENCE,
                                    algorithms=[settings.JWT_ALGORITHM])
        payload = JWTPayload(**decoded_token)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload.username
```

The next method is for getting the token from the request headers and then extract the username from the token and then find this user from the database:

```python
async def get_current_user(self, token: str = Depends(oauth2_scheme)) -> UserInDB:
    from backend.users.crud import get_user_by_username

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        username = self.get_username_from_token(token=token)
        token_data = TokenData(username=username)
    except jwt.JWTError:
        raise credentials_exception
    user = await get_user_by_username(user_name=token_data.username)
    if user is None:
        raise credentials_exception
    return user
```

You need to define `oauth2_scheme` at the top:

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
```

Also we need to define new schema in `users/schemas.py`:

```python
class TokenData(CoreModel):
    username: Optional[str] = None
```


The next 2 methods are for checking if the user is active and if the user is admin. 
I am going to add them outside of the Authenticate class:

```python
async def get_current_active_user(current_user: UserInDB = Depends(Authenticate().get_current_user)) -> UserInDB:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def check_if_user_is_admin(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    if not current_user.is_superuser:
        raise HTTPException(status_code=401, detail="You have not enough privileges")
    return current_user
```

Here we need to make some changes to `users/__init__.py`:

```python
from .authentication import Authenticate, oauth2_scheme, get_current_active_user, check_if_user_is_admin

auth_service = Authenticate()

__all__ = ['auth_service', 'oauth2_scheme', 'get_current_active_user', 'check_if_user_is_admin']
```

Okay, now let's create `/users/me` endpoint to get current logged in active user:

```python
# Changed import
...
from backend.users import auth_service, get_current_active_user


@router.get(
    "/me",
    tags=["get current logged in user"],
    description="Get current logged in user",
    response_model=UserPublic,
)
async def get_me(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    return current_user
```

How about to test it? Well first create the user then loggin and obtain the token as before.
We are going to use Postman:

![Postman send get request to users me](/postman_users_get_me.png)

Try to check if the user is admin or not with non-superuser. Just change the `Depends(check_if_user_is_admin)` section in the get_me function above and send again the GET request:


![Postman send get request to check admin user](/postman_users_get_me_2.png)


Now it is time to create our functionality to create the Category for our ecommerce with admin user only.

Nice let's define Category Pydantic schema in the `product/schemas.py`:

```python
from backend.app.schemas import CoreModel, IDModelMixin


class CategoryCreate(CoreModel):
    name: str
    slug: str


class CategoryInDB(CategoryCreate, IDModelMixin):

    class Config:
        orm_mode = True
```

Let's leave it there and create our create category function in the `product/crud.py`:

```python
from schemas import CategoryCreate, CategoryInDB
from models import Category


async def create_category(category: CategoryCreate) -> CategoryInDB:
    created_category = await Category(**category.dict())
    return CategoryInDB.from_orm(created_category)
```

Define our endpoint to send the POST request in the `product/api/controller.py`:


```python
from fastapi import APIRouter, Depends
from ..schemas import CategoryInDB, CategoryCreate
from backend.users import check_if_user_is_admin

router = APIRouter()


@router.post(
    "/category/create",
    tags=["create category"],
    description="Create new category",
    response_model=CategoryInDB,
    dependencies=[Depends(check_if_user_is_admin)]
)
async def category_create(category: CategoryCreate) -> CategoryInDB:
    from ..crud import create_category

    return await create_category(category)
```

We can nicely define the dependency for our request path operation. For sending the POST request to create the category, the user must be a superuser or so called the admin one:

![Postman send post request to create category with regular user](/postman_product_category_create.png)

Let's update our user to be a super user:

![Update the dummy user to be a superuser](/fastapi_update_user_from_admin_panel.png)

Send the request again:

![Create category with superuser](/postman_product_create_category_succsess.png)

Wohoo, we could able to create the category for our site with the POST request using superuser only dependency check.

Nice and clean :)

I guess the next is to create products and handle file uploads with superuser.

The code changes for this episode -> [episode-11](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-11)


We have a new bug report for gino-admin as well [TypeError: 'tuple' object is not callable](https://github.com/xnuinside/gino-admin/issues/41)