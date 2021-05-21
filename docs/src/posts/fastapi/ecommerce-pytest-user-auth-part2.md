# Adding Pytest tests to User auth (part 2)

Okay, now we are going to write some async tests, so we need `pytest-asyncio` package:

```shell
$ poetry add pytest-asyncio --dev
$ poetry add httpx --dev
```

Next we need to create AsyncClient fixture for further usage in the `tests/conftest.py` file. We use httpx here as described in the [FastAPI DOC](https://fastapi.tiangolo.com/advanced/async-tests/)

```python
# new imports
from backend import app
from httpx import AsyncClient

# skipped lines
@pytest.yield_fixture
async def client():
    async with AsyncClient(app=app, base_url='http://localhost:8000/') as async_client:
        yield async_client
```

Also the new fixture again in the same file for creating user:

```python
@pytest.yield_fixture
def user_to_create():
    yield UserCreate(
            email="test_client@example.com",
            username="test_client",
            password="testclientpassword"
    )
```

The Gino will raise exception and to eliminate this we need to add lines below to the `tests/__init__.py`:

```python
import pytest
from backend import db
from backend.app.core.config import settings


@pytest.yield_fixture()
async def init_db():
    conn = await db.set_bind(settings.DATABASE_URI)
    yield conn
    await conn.close()
```

Now let's create our first test to send the POST request to the user create endpoint. Create a file called `test_users_api.py` inside the tests folder:

```python
import pytest
from . import init_db


class TestAPI:

    @pytest.mark.asyncio
    async def test_user_create(self, client, init_db, user_to_create):
        response = await client.post('users/create', json=user_to_create.dict())
        assert response.status_code == 200
        data = response.json()
        assert data['username'] == user_to_create.username
```

We use here our async client, init_db and user_to_create fixtures.
Run tests:

```shell
$ poetry run pytest -s -vvv --cov-report html --cov=backend/users backend/tests
collected 8 items
backend/tests/test_users_api.py::TestAPI::test_user_create PASSED
...

```

Checking from the database:

```sql
ecommerce=# select count(*) from users where username='test_client';
 count 
-------
     1
(1 row)
```

Great, now if you run test second time, it will fail as:

```sql
>   ???
E   asyncpg.exceptions.UniqueViolationError: duplicate key value violates unique constraint "users_email_key"
E   DETAIL:  Key (email)=(test_client@example.com) already exists.
```

Yes, you can not create the user with same email and username.

It means, that we need some teardown functionality after each test method run. Let's add this async method:

```python
async def remove_user(self, user_to_create):
    test_user = await User.query.where(User.username == user_to_create.username).gino.first()
    await test_user.delete()
```

We need to call this method inside `test_user_create` method at the end:

```python
@pytest.mark.asyncio
async def test_user_create(self, client, init_db, user_to_create):
    response = await client.post('users/create', json=user_to_create.dict())
    assert response.status_code == 200
    data = response.json()
    assert data['username'] == user_to_create.username
    await self.remove_user(user_to_create=user_to_create)
```

Now you can run tests without worrying about duplicate key error.
But, still I am going to check this condition:

```python
@pytest.mark.asyncio
async def test_user_create_twice(self, client, init_db, user_to_create):
    with pytest.raises(UniqueViolationError) as db_error:
        await client.post('users/create', json=user_to_create.dict())
        await client.post('users/create', json=user_to_create.dict())

    assert 'duplicate key value violates unique constraint' in str(db_error.value)
    await self.remove_user(user_to_create=user_to_create)
```

Running tests:

```shell
collected 9 items
backend/tests/test_users_api.py::TestAPI::test_user_create PASSED
backend/tests/test_users_api.py::TestAPI::test_user_create_twice PASSED
```

Nice let's try to get some extra errors from user creation process:

```python
@pytest.mark.asyncio
async def test_user_create_wrong_email_format(self, client, init_db, user_to_create):
    wrong_user = UserCreate(
        email="wrong.user@gmail.com",
        username="wrong_user",
        password="wrong_user_password"
    )

    wrong_user.email = 'wrong_email'
    res = await client.post('users/create', json=wrong_user.dict())
    print(res.json())
    assert 'value is not a valid email address' == res.json()['detail'][0]['msg']
```

Here we basically updated our wrong_user schema's email to be invalid format after Pydantic schema creation(to avoid Pydantic validation error at the very beginning).
The next is to send post request with wrong email format. If we run the tests:

```shell
$ poetry run pytest -s -vvv --cov-report html --cov=backend/users backend/tests

collected 10 items

backend/tests/test_users_api.py::TestAPI::test_user_create PASSED
backend/tests/test_users_api.py::TestAPI::test_user_create_twice PASSED
backend/tests/test_users_api.py::TestAPI::test_user_create_wrong_email_format {'detail': [{'loc': ['body', 'email'], 'msg': 'value is not a valid email address', 'type': 'value_error.email'}]}
PASSED
```

If you notice from the endpoint we got back the message about invalid email address and in the assert we have checked if it equals to `'value is not a valid email address'` string.

Let's write extra tests to test invalid username and invalid password as well:

```python
@pytest.mark.asyncio
async def test_user_create_wrong_username_format(self, client, init_db, user_to_create):
    wrong_user = UserCreate(
        email="wrong.user@gmail.com",
        username="wrong_user",
        password="wrong_user_password"
    )

    wrong_user.username = 'asd_sad$?'
    res = await client.post('users/create', json=wrong_user.dict())
    print(res.json())
    assert 'Invalid characters in username.' == res.json()['detail'][0]['msg']

@pytest.mark.asyncio
async def test_user_create_wrong_password_format(self, client, init_db, user_to_create):
    wrong_user = UserCreate(
        email="wrong.user@gmail.com",
        username="wrong_user",
        password="wrong_user_password"
    )

    wrong_user.password = '13'
    res = await client.post('users/create', json=wrong_user.dict())
    print(res.json())
    assert 'ensure this value has at least 7 characters' == res.json()['detail'][0]['msg']
```

For now we have `93%` coverage:

![The next coverage report](/pytest_cov_users_4.png)

Let's increase this percentage by adding test for login functionality. 
First let's try to login with non-existing username:

```python
@pytest.mark.asyncio
async def test_user_login_with_non_existing_username(self, client, init_db):
    fake_user = UserLogin(
        username="non-existing-username",
        password="fake-password"
    )
    res = await client.post('users/login', json=fake_user.dict())
    print(res.json())
```

If we run the tests we got some weird error here:

```python
>   ???
E   pydantic.error_wrappers.ValidationError: 2 validation errors for UserInDB
E   password
E     field required (type=value_error.missing)
E   salt
E     field required (type=value_error.missing)
```

This is due to fact that we did not take into account the fact about non-existing username in `get_user_by_username` function in the `users/crud.py` file:

```python
async def get_user_by_username(user_name: str) -> UserInDB:
    found_user = await User.query.where(User.username == user_name).gino.first()

    return UserInDB.from_orm(found_user)
```

Now we are going to change this code a bit to be more defensive:

```python
async def get_user_by_username(user_name: str) -> UserInDB:
    found_user = await User.query.where(User.username == user_name).gino.first()
    if found_user:
        return UserInDB.from_orm(found_user)
    raise HTTPException(status_code=404, detail="User with given username not found")
```

Basically if there is no such user with given username we will raise an exception with 404 code.

Now from the test side we need to add checks for this:

```python
@pytest.mark.asyncio
async def test_user_login_with_non_existing_username(self, client, init_db):
    fake_user = UserLogin(
        username="non-existing-username",
        password="fake-password"
    )
    res = await client.post('users/login', json=fake_user.dict())
    assert res.status_code == 404
    assert res.json()['detail'] == "User with given username not found"
```

Okay, now let's add a test for existing user but with wrong password:

```python
@pytest.mark.asyncio
async def test_user_login_with_wrong_password(self, client, init_db, user_to_create):
    # Create the user
    res = await client.post('users/create', json=user_to_create.dict())
    assert res.json()['username'] == user_to_create.username

    # Try to login with wrong password
    fake_user = UserLogin(
        username="test_client",
        password="fake-password"
    )
    res = await client.post('users/login', json=fake_user.dict())
    print(res.json())
```

As you run the tests you are going to get `None` as res.json() will return `None`.

Because in the `users/api/controller.py` we did not add what to do if `verify_password` returns false:

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

To fix this I am going to add extra `raise` after if check:

```python
    # same method above ^^^
    return UserPublic(**found_user.dict(), access_token=access_token)
raise HTTPException(status_code=401, detail='Incorrect password provided')
```

Now, let's tweak our test:

```python
@pytest.mark.asyncio
async def test_user_login_with_wrong_password(self, client, init_db, user_to_create):
    # Create the user
    res = await client.post('users/create', json=user_to_create.dict())
    assert res.json()['username'] == user_to_create.username

    # Try to login with wrong password
    fake_user = UserLogin(
        username="test_client",
        password="fake-password"
    )
    res = await client.post('users/login', json=fake_user.dict())
    assert res.status_code == 401
    assert res.json()['detail'] == 'Incorrect password provided'
    await self.remove_user(user_to_create=user_to_create)
```

We have increased our coverage percentage to `98%`:

![The next coverage report 2](/pytest_cov_users_5.png)


Now let's add simple check if we can login successfully or not:

```python
@pytest.mark.asyncio
async def test_user_login_with_success(self, client, init_db, user_to_create):
    # Create the user
    res = await client.post('users/create', json=user_to_create.dict())
    assert res.json()['username'] == user_to_create.username

    # Try to login with wrong password
    valid_user = UserLogin(
        username="test_client",
        password="testclientpassword"
    )
    res = await client.post('users/login', json=valid_user.dict())
    assert res.status_code == 200
    assert res.json()['access_token']
    await self.remove_user(user_to_create=user_to_create)
```

Now we got 100% coverage:

![The next coverage report 3](/pytest_cov_users_6.png)

Crazy :D

The code changes for this episode -> [episode-9](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-9)

The next thing I would like to add other parts of our ecommerce app orders and of course products.
