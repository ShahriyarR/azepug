# Create Order app, models and schemas

Now we have category and products we need to create Order app and its models.

```shell
$ cd backend

$ fastapi startapp order
FastAPI app created successfully!
```

Now we have final structure:

```shell
❯ tree -I __pycache__ -d
.
├── backend
│   ├── app
│   │   ├── core
│   │   ├── csv_to_upload
│   │   └── statics
│   │       └── media
│   ├── order
│   │   └── api
│   ├── product
│   │   ├── api
│   │   └── uploads
│   ├── tests
│   └── users
│       └── api
├── htmlcov
└── migrations
    └── versions
```

Let's create our database models now in the `order/models.py`:

```python
from backend import db


class Order(db.Model):
    __tablename__ = "order"

    id = db.Column(db.BigInteger(), primary_key=True)
    user = db.Column(db.BigInteger(), db.ForeignKey('users.id'))
    first_name = db.Column(db.Unicode(length=20))
    last_name = db.Column(db.Unicode(length=20))
    email = db.Column(db.String(length=50))
    address = db.Column(db.Unicode(length=100))
    zipcode = db.Column(db.String(length=10))
    place = db.Column(db.String())
    phone = db.Column(db.String())
    created_at = db.Column(db.DateTime(), nullable=False)
    updated_at = db.Column(db.DateTime(), nullable=False)
    paid_amount = db.Column(db.Numeric(), nullable=False)
    stripe_token = db.Column(db.String(length=100))


class OrderItem(db.Model):
    __tablename__ = "orderitem"

    id = db.Column(db.BigInteger(), primary_key=True)
    order = db.Column(db.BigInteger(), db.ForeignKey('order.id'))
    product = db.Column(db.BigInteger(), db.ForeignKey('product.id'))
    price = db.Column(db.Numeric(), nullable=False)
    quantity = db.Column(db.Integer(), server_default=1)

```

Prepare our migrations import the new models in the `migrations/env.py`:

```python
from backend import settings
from backend import db
from backend.users.models import User
from backend.product.models import Category, Product
from backend.order.models import Order, OrderItem

config.set_main_option('sqlalchemy.url', settings.DATABASE_URI)
target_metadata = db
```

Running alembic command to generate migration file:

```shell
❯ poetry run alembic revision --autogenerate -m "added order and orderitem tables"
Generating /home/shako/REPOS/Learning_FastAPI/Djackets/migrations/versions/8e35694be576_added_order_and_orderitem_tables.py ...  done
```

Running migrations:

```shell
❯ poetry run alembic upgrade head
INFO  [alembic.runtime.migration] Running upgrade fb488e2be728 -> 8e35694be576, added order and orderitem tables
```

Checking in the database:

```sql
ecommerce=# \dt
              List of relations
 Schema |      Name       | Type  |   Owner   
--------+-----------------+-------+-----------
 public | alembic_version | table | ecommerce
 public | category        | table | ecommerce
 public | order           | table | ecommerce
 public | orderitem       | table | ecommerce
 public | product         | table | ecommerce
 public | users           | table | ecommerce
(6 rows)
```

Now let's create our Pydantic schemas:

```python
from backend.app.schemas import CoreModel, IDModelMixin, DateTimeModelMixin
from pydantic import EmailStr


class OrderCreate(CoreModel, DateTimeModelMixin):
    first_name: str
    last_name: str
    email: EmailStr
    address: str
    zipcode: str
    phone: str
    place: str


class OrderInDB(OrderCreate, IDModelMixin):

    class Config:
        orm_mode = True


class OrderItemCreate(CoreModel):
    price: float
    product: int
    quantity: int


class OrderItemInDB(OrderItemCreate, IDModelMixin):
    
    class Config:
        orm_mode = True
```

Please keep in mind that, the crucial part of our app is this Orders management and checkout things and due to this fact, this database models and schemas will be updated after building our frontend.

Basically, we are going to stop here with our backend development and continue with NuxtJS.
I will add views/controller part of this app after preparing the frontend.

The code changes for this episode -> [episode-14](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-14)