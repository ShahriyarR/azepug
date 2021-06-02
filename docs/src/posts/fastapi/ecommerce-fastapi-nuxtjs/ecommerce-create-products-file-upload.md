# Create products and explore File upload handling

In this episode we are going to explore to create the products in the created categories and try to explore the file upload.

First of all, we are going to change our Product model in the `product/models.py`:

```python
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
    created_at = db.Column(db.DateTime(), nullable=False)
    updated_at = db.Column(db.DateTime(), nullable=False)
```

Create migrations:

```shell
$ poetry run alembic revision --autogenerate -m 'update products table'
INFO  [alembic.autogenerate.compare] Detected added column 'product.created_at'
INFO  [alembic.autogenerate.compare] Detected added column 'product.updated_at'
INFO  [alembic.autogenerate.compare] Detected removed column 'product.date_added'
  Generating /home/shako/REPOS/Learning_FastAPI/Djackets/migrations/versions/fb488e2be728_update_products_table.py ...  done
```

Run the migration:

```shell
$ poetry run alembic upgrade head
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade e7abfa02496c -> fb488e2be728, update products table
```

The next is to define our Pydantic schemas:

```python
class ProductCreate(CoreModel, DateTimeModelMixin):
    category: int
    name: str
    slug: str
    description: Optional[str]
    price: float
    image: Optional[str]
    thumbnail: Optional[str]


class ProductInDB(ProductCreate, IDModelMixin):
    
    class Config:
        orm_mode = True
```

Okay now simple create query to the database in the `product/crud.py`:

```python
async def create_product(product: ProductCreate) -> ProductInDB:
    created_product = await Product.create(**product.dict())
    return ProductInDB.from_orm(created_product)
```

Now let's create simple endpoint to create a product using admin user in the given category:

```python
@router.post(
    "/product/create",
    tags=["create product"],
    description="Create new product",
    response_model=ProductInDB,
    dependencies=[Depends(check_if_user_is_admin)]
)
async def product_create(product: ProductCreate) -> ProductInDB:
    from ..crud import create_product

    return await create_product(product)
```

For now we are going to create products without photo. Let's test with Postman:

![Postman product create without image](/postman_product_create_without_image.png)

Okay we could create the Product in the category with ID 3.

Now let's handle our image upload procedure. For that purpose we need to install python-multipart package:

```python
$ poetry add python-multipart

• Installing python-multipart (0.0.5)
```

We are going to save in the database only the file name and not the path, as if somehow our server changes it will brake of migrations etc.

Let's add some helpers in the `product/helpers.py` - the code below adopted from [fastapi issue comment](https://github.com/tiangolo/fastapi/issues/1805#issuecomment-666278841):

```python
import os
from fastapi import HTTPException, UploadFile
import aiofiles
import uuid

BASEDIR = os.path.dirname(__file__)


async def handle_file_upload(file: UploadFile) -> str:
    _, ext = os.path.splitext(file.filename)
    img_dir = os.path.join(BASEDIR, 'uploads/')
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
    content = await file.read()
    if file.content_type not in ['image/jpeg', 'image/png']:
        raise HTTPException(status_code=406, detail="Only .jpeg or .png  files allowed")
    file_name = f'{uuid.uuid4().hex}{ext}'
    async with aiofiles.open(os.path.join(img_dir, file_name), mode='wb') as f:
        await f.write(content)

    return file_name
```

Basically the code above, creating uploads folder inside the product app folder renames our file name with hexadecimal value and creates new file with uploaded file content.

Now let's change our product create endpoint:

```python
@router.post(
    "/product/create",
    tags=["create product"],
    description="Create new product",
    response_model=ProductInDB,
    dependencies=[Depends(check_if_user_is_admin)]
)
async def product_create(category: int = Form(...),
                         name: str = Form(...),
                         slug: str = Form(...),
                         price: float = Form(...),
                         description: str = Form(...),
                         image: UploadFile = File(...)
                         ) -> ProductInDB:
    product = ProductCreate(category=category,
                            name=name,
                            slug=slug,
                            price=price,
                            description=description)
    product.image = await handle_file_upload(image)
    # here we put id=10 manually for test purposes originally it should came from database
    return ProductInDB(id=10, **product.dict())
```

Please keep in mind that it is impossible to send both json as our Pydantic schema and also use the UploadFile. If you curious about this discussion please read on here -> [Using UploadFile and Pydantic model in one request](https://github.com/tiangolo/fastapi/issues/2257) and [[QUESTION] Use UploadFile in Pydantic model](https://github.com/tiangolo/fastapi/issues/657).

For this limitation of HTTP we need to send fields as form data.

Let's try it with Postman:

![Postman send file and product data as form data](/postman_product_create_file_upload_v2.png)


As you have already noticed the uploaded image is also created in the mention directory as well:

![File uploaded successfully](/file_uploaded.png)

But the problem is that we need to serve this media file as well. 
So basically, we are going to restructure our app a bit.

First move `helpers.py` file to `app/` folder. Then create the folder in `app/statics/media`.

And do following changes:

```python
import os
from fastapi import HTTPException, UploadFile
import aiofiles
import uuid

BASEDIR = os.path.dirname(__file__)


async def handle_file_upload(file: UploadFile) -> str:
    _, ext = os.path.splitext(file.filename)
    img_dir = os.path.join(BASEDIR, 'statics/media/')
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
    content = await file.read()
    if file.content_type not in ['image/jpeg', 'image/png']:
        raise HTTPException(status_code=406, detail="Only .jpeg or .png  files allowed")
    file_name = f'{uuid.uuid4().hex}{ext}'
    async with aiofiles.open(os.path.join(img_dir, file_name), mode='wb') as f:
        await f.write(content)

    return file_name
```

The final structure will be like:

```shell
❯ tree backend/app -I __pycache__
backend/app
├── admin.py
├── core
│   ├── config.py
│   └── __init__.py
├── csv_to_upload
├── helpers.py
├── __init__.py
├── main.py
├── schemas.py
└── statics
    └── media
        ├── 609e62e2feaf4f99b0338aeecaedda82.png
        └── 6619b160dbef413bb189c519cdb4554b.png

4 directories, 9 files
```

Now it is time to serve this directory. In the `app/main.py` file do the following changes:

```python
from fastapi.staticfiles import StaticFiles

...
__all__ = ['app', 'db']

BASEDIR = os.path.dirname(__file__)
...
...
app.include_router(user_router, prefix='/users')
app.include_router(product_router, prefix='/product')

app.mount("/static", StaticFiles(directory=BASEDIR + "/statics"), name="static")
```

Now restart the app and go to he link for your uploaded photo:

![FastAPI serving media files](/fastapi_serving_media_file.png)

I think we are done with this episode. The next is to create thumbnails from uploaded files and serve them as well for our frontend.

The code changes for this episode -> [episode-12](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-12)

### NEXT -> [Create thumbnails from images and add products](./ecommerce-create-thumbnails-and-add-products)