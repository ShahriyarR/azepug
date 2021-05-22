# Start Product app, create database models and activate admin panel

Let's quickly start our product app:

```shell
$ cd backend

$ fastapi startapp product
FastAPI app created successfully!
```

Then add models to the `product/models.py`:


```python
from backend import db


class Category(db.Model):
    __tablename__ = 'category'

    id = db.Column(db.BigInteger(), primary_key=True)
    name = db.Column(db.String(), unique=True, nullable=False)
    slug = db.Column(db.String(), unique=True, nullable=False)


class Product(db.Model):
    __tablename__ = 'product'

    id = db.Column(db.BigInteger(), primary_key=True)
    category = db.Column(db.BigInteger(), db.ForeignKey('category.id'))
    name = db.Column(db.String(), unique=True, nullable=False)
    slug = db.Column(db.String(), unique=True, nullable=False)
    description = db.Column(db.Unicode(), nullable=True)
    price = db.Column(db.Numeric(), nullable=False)
    image = db.Column(db.String(), nullable=True)
    thumbnail = db.Column(db.String(), nullable=True)
    date_added = db.Column(db.DateTime(), nullable=False)

```

I have decided to restructure the project again a bit. I have moved `migrations` from the `backend` to be near the `backend` and also `alembic.ini` should be near.
The structure is going to be something like:

```shell
❯ tree -P backend -I __pycache__
.
├── backend
│   ├── app
│   │   ├── core
│   │   └── csv_to_upload
│   ├── product
│   │   └── api
│   ├── tests
│   └── users
│       └── api
├── htmlcov
└── migrations
    └── versions
```

Import new models in the `migrations/env.py`:

```python
from backend import settings
from backend import db
from backend.users.models import User
from backend.product.models import Category, Product

config.set_main_option('sqlalchemy.url', settings.DATABASE_URI)
target_metadata = db
```

Prepare new migrations:

```shell
$ poetry run alembic revision --autogenerate -m 'added category and product models'

Generating /home/shako/REPOS/Learning_FastAPI/Djackets/migrations/versions/8d45bccb2ed0_added_category_and_product_models.py ...  done
```

Running migrations:

```shell
$ poetry run alembic upgrade head

INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 7967edfd9f18 -> 8d45bccb2ed0, added category and product models.
```

Checking from the database:

```sql
ecommerce=# \dt
              List of relations
 Schema |      Name       | Type  |   Owner   
--------+-----------------+-------+-----------
 public | alembic_version | table | ecommerce
 public | category        | table | ecommerce
 public | product         | table | ecommerce
 public | users           | table | ecommerce
```

As with FastAPI ecosystem there is nothing even closer to Django admin, instead we have some basic things on our hand.

I have found an admin library based on the Gino ORM - [gino-admin](https://github.com/xnuinside/gino-admin)
It is based on Sanic but can be activated for FastAPI as well.

Let's first expose the `settings`. Updated version of `api/__init__.py`:

```python
from .main import app, db
from .core.config import settings

__all__ = ['app', 'db', 'settings']
```

And the `backend/__init__.py`:

```python
from .app import app, db, settings

__all__ = ['app', 'db', 'settings']
```

Install `giro-admin`:

```shell
$ poetry add gino-admin
```

Then create `app/admin.py` file:

```python
import os
from gino_admin import create_admin_app
from backend.users.models import User
from backend.product.models import Category, Product
from backend import db, settings

current_path = os.path.dirname(os.path.abspath(__file__))

os.environ["SANIC_ADMIN_USER"] = "admin"
os.environ["SANIC_ADMIN_PASSWORD"] = "12345"

if __name__ == "__main__":
    # host & port - will be used to up on them admin app
    # config - Gino Admin configuration - check docs to see all possible properties,
    # that allow set path to presets folder or custom_hash_method, optional parameter
    # db_models - list of db.Models classes (tables) that you want to see in Admin Panel
    create_admin_app(
        host="0.0.0.0",
        port=os.getenv("PORT", 5000),
        db=db,
        db_models=[User, Category, Product],
        config={
            "presets_folder": os.path.join(current_path, "csv_to_upload"),
            "db_uri": settings.DATABASE_URI
        },
    )
```

As you see we have registered all 3 models and also defined the dummy admin user and password.

Start the admin:

```shell
❯ python backend/app/admin.py

[2021-05-22 18:12:36 +0400] [15063] [INFO] Goin' Fast @ http://0.0.0.0:5000
/.venv/lib/python3.9/site-packages/sanic/server.py:354> took 0.270 seconds'
[2021-05-22 18:12:37 +0400] [15063] [INFO] Starting worker [15063]
```

Go to the `http://0.0.0.0:5000/admin/login` and type your admin/password.

You will see our models inside the admin panel:

![Gino admin panel](/gino-admin.png)


Also I have spotted issue with gino-admin and reported as [issue40](https://github.com/xnuinside/gino-admin/issues/40)

The code changes for this episode -> [episode-10](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-10)
