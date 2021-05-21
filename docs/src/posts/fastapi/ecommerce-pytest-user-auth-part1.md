# Adding Pytest tests to User auth (part 1)

Good citizens have the willingness to write tests. It should be started as soon as possible or immediately, now.

How about to start testing from simplest one? In the `users/authentication.py` there is a method called `create_salt_and_hashed_password`.

Create a file called `test_users_authenticate.py` and `conftest.py` in the `tests` folder.
In the `conftest.py` we are going to create simplest ever fixture:

```python
import pytest
from backend.users import auth_service


@pytest.fixture(scope="class")
def auth_obj():
    return auth_service
```

It basically gives us the auth_service object with class scope which will see in a moment.
So what was the aim of our password hashing and salting steps? Putting simply, even somebody creates exactly registers exactly with the same password as some other user it will be stored totally different in the database i.e you will have 2 different password hashes with the same plain password string.

Then let's test it. In the `tests/test_users.py`:

```python
import pytest


@pytest.mark.usefixtures('auth_obj')
class TestAuthenticate:

    def test_create_salt_and_hashed_password(self, auth_obj):
        test_password = '123456789'
        first_password = auth_obj.create_salt_and_hashed_password(plaintext_password=test_password)
        second_password = auth_obj.create_salt_and_hashed_password(plaintext_password=test_password)
        assert first_password.password is second_password.password
```

First we are going to fail of course:

```shell
$ poetry run pytest -s -vvv backend/tests/test_users.py
>       assert first_password.password is second_password.password
E       AssertionError: assert '$2b$12$fUelT5NhuqCzhCwv95r3rOsTjgYVP8yu0hjDs1hD7lg2HotaKHkpu' is '$2b$12$9.46JvTzrK6QSxbiaBBVIuha1PrPCimfOYJzURPQocIEnZ3LjIeOC'
```

That means we need to change `is` to `is not` and now it will be passed. Change the line:

```python
assert first_password.password is not second_password.password
```

Running pytest:

```shell
$ poetry run pytest -s -vvv backend/tests/test_users.py

backend/tests/test_users.py::TestAuthenticate::test_create_salt_and_hashed_password PASSED
```

Do you remember our `create_access_token_for_user` method again in the Authentication class?
It requires the `UserInDB` pydantic schema to create tokens for. That means we can create a fixture with dummy user and later use it:

```python
@pytest.fixture(scope="class")
def dummy_user() -> UserInDB:
    new_user = UserCreate(
        email="dummy_user@example.com",
        username="dummy_user",
        password="dummyuserswesomepass"
    )
    new_password = auth_service.create_salt_and_hashed_password(plaintext_password=new_user.password)
    new_user_params = new_user.copy(update=new_password.dict())
    return UserInDB(**new_user_params.dict())
```

Then add our new fixture to `TestAuthenticate` class:

```python
@pytest.mark.usefixtures('auth_obj')
@pytest.mark.usefixtures('dummy_user')
class TestAuthenticate:
    ...

```

Now it is time to generate and to check our token:

```python
def test_create_access_token_for_user(self, auth_obj, dummy_user):
    token = auth_obj.create_access_token_for_user(user=dummy_user)
    decoded = jwt.decode(token,
                            str(settings.SECRET_KEY),
                            audience=settings.JWT_AUDIENCE,
                            algorithms=settings.JWT_ALGORITHM)
    assert isinstance(decoded, dict)
    assert decoded['username'] == dummy_user.username
```

How about to test if somebody sends wrong SECRET_KEY, audience and algorith?

```python
def test_create_access_token_for_user_wrong_secret_key(self, auth_obj, dummy_user):
    token = auth_obj.create_access_token_for_user(user=dummy_user)
    with pytest.raises(jose.exceptions.JWTError) as jwt_error:
        jwt.decode(
            token,
            str('nice-wrong-secret-key'),
            audience=settings.JWT_AUDIENCE,
            algorithms=settings.JWT_ALGORITHM
        )

    assert 'Signature verification failed' in str(jwt_error.value)

def test_create_access_token_for_user_wrong_audience(self, auth_obj, dummy_user):
    token = auth_obj.create_access_token_for_user(user=dummy_user)
    with pytest.raises(jose.exceptions.JWTError) as jwt_error:
        jwt.decode(token,
                    str(settings.SECRET_KEY),
                    audience='heyyy',
                    algorithms=settings.JWT_ALGORITHM)

    assert 'Invalid audience' in str(jwt_error.value)

def test_create_access_token_for_user_wrong_algo(self, auth_obj, dummy_user):
    token = auth_obj.create_access_token_for_user(user=dummy_user)
    with pytest.raises(jose.exceptions.JWTError) as jwt_error:
        jwt.decode(token,
                    str(settings.SECRET_KEY),
                    audience=settings.JWT_AUDIENCE,
                    algorithms='HMAC')

    assert 'The specified alg value is not allowed' in str(jwt_error.value)
```

All tests will be passed:

```python
$  poetry run pytest -s -vvv backend/tests/test_users_authenticate.py

collected 5 items
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_salt_and_hashed_password PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_wrong_secret_key PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_wrong_audience PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_wrong_algo PASSED
```

Did you hear something about test coverage? We want to know what kind of extra tests we can add for testing our `authentication.py`. I am going to generate html reports for our coverage:

```python
$ poetry run pytest -s --cov-report html --cov=backend/users backend/tests

collected 5 items

backend/tests/test_users_authenticate.py .....

----------- coverage: platform linux, python 3.9.0-final-0 -----------
Coverage HTML written to dir htmlcov
```

Then open up the `htmlcov/index.html` file in the browser.

You will see something like:

![pytest-coverage](/pytest_cov_users_1.png)

It is clear that we are missing 2 tests from the `authentication.py`. Now click to this `authentication.py` link in the browser:

![pytest-coverage-authentication](/pytest_cov_users_2.png)

Great we have really nice overview what tests currently are missing.

Write more tests bro :)

Adding 2 more tests:

```python
def test_create_access_token_for_user_no_user(self, auth_obj):
    token = auth_obj.create_access_token_for_user(user=None)
    assert token is None

def test_verify_password(self, auth_obj, dummy_user):
    is_verified = auth_obj.verify_password(password='dummyuserswesomepass',
                                            salt=dummy_user.salt,
                                            hashed_pw=dummy_user.password)
    assert is_verified is True
```

Rerun the pytest coverage:

```shell
$ poetry run pytest -s -vvv --cov-report html --cov=backend/users backend/tests
collected items

backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_salt_and_hashed_password PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_no_user PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_verify_password PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_wrong_secret_key PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_wrong_audience PASSED
backend/tests/test_users_authenticate.py::TestAuthenticate::test_create_access_token_for_user_wrong_algo PASSED

----------- coverage: platform linux, python 3.9.0-final-0 -----------
Coverage HTML written to dir htmlcov

```

Check again the coverage for `authentication.py` file:

![pytest-coverage-authentication-v3](/pytest_cov_users_3.png)

Wow 100%)) Now we are done with `authentication.py`.

I guess the next is to cover all other operations as well.

The code changes for this episode -> [episode-8](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-8)

### NEXT -> [Adding Pytest tests (part 2)](./ecommerce-pytest-users-part2)