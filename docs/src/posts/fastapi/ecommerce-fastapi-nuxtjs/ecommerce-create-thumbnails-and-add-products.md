# Create thumbnails from images and add products

First of all we need to add Pillow package to our dependencies:

```shell
$ poetry add Pillow

• Installing pillow (8.2.0)
```

Then we are going to restructure our `handle_file_upload` function in the `app/helpers.py`:

```python
async def handle_file_upload(file: UploadFile) -> Tuple[str, str]:
    content, ext, img_dir = await file_operations(file)
    file_name = f'{uuid.uuid4().hex}{ext}'
    async with aiofiles.open(os.path.join(img_dir, file_name), mode='wb') as f:
        await f.write(content)

    new_file = os.path.join(BASEDIR, f'statics/media/{file_name}')
    thumbnail_name = f'thumb_{file_name}'
    thumbnail_content = make_thumbnail(new_file)

    async with aiofiles.open(os.path.join(img_dir, thumbnail_name), mode='wb') as f:
        await f.write(thumbnail_content.read())
        thumbnail_content.close()

    return file_name, thumbnail_name
```

As you may notice, we have extracted some functionality to the `file_operations` function:

```python
async def file_operations(file: UploadFile) -> Tuple[bytes, str, str]:
    _, ext = os.path.splitext(file.filename)
    img_dir = os.path.join(BASEDIR, 'statics/media/')
    if not os.path.exists(img_dir):
        os.makedirs(img_dir)
    content = await file.read()
    if file.content_type not in ['image/jpeg', 'image/png']:
        raise HTTPException(status_code=406, detail="Only .jpeg or .png  files allowed")
    return content, ext, img_dir
```

Now let's add `make_thumbnail` function:

```python
def make_thumbnail(file: str, size: tuple = (300, 200)) -> BytesIO:
    img = Image.open(file)
    rgb_im = img.convert('RGB')
    rgb_im.thumbnail(size)

    thumb_io = BytesIO()
    rgb_im.save(thumb_io, format='PNG', quality=85)
    thumb_io.seek(0)
    return thumb_io
```

Basically we are sending to the `make_thumbnail` the new uploaded file name and it will create new resized file in the same directory but with `thumb_` prefix.

Our updated endpoint will be:

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
    image_, thumb_image = await handle_file_upload(image)
    product.image = image_
    product.thumbnail = thumb_image
    # here we put id=10 manually for test purposes originally it should came from database
    return ProductInDB(id=10, **product.dict())
```

Basically we have returned back the name of the thumbnail and updated the Pydantic schemas field.

Sending our POST request to the endpoint:

![Postman creating thumbnail](/postman_create_thumbnail.png)

Files are created accordingly:

```shell
❯ tree backend/app/statics/ -I __pycache__
backend/app/statics/
└── media
    ├── 0264f7d1d13343dd9ecbf7a9102b5f90.png
    └── thumb_0264f7d1d13343dd9ecbf7a9102b5f90.png
```

Now it is time to save those new data in the database. We need to update our controller:

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
    from ..crud import create_product

    product = ProductCreate(category=category,
                            name=name,
                            slug=slug,
                            price=price,
                            description=description)
    image_, thumb_image = await handle_file_upload(image)
    product.image = image_
    product.thumbnail = thumb_image
    return await create_product(product=product)
```

Checking in the database:

```sql
ecommerce=# select image, thumbnail from product;
                image                 |                 thumbnail                  
--------------------------------------+--------------------------------------------
 76745b2aa81247fda66f8b086d96ac26.png | thumb_76745b2aa81247fda66f8b086d96ac26.png
(1 row)
```

So we have successfully saved our product's image and thumbnail file names and it is already served by our server:

![FastAPI served the thumbnail](/fastapi_thumbnail_served.png)

I think from now, we are pretty done with backend product app and the next is to create the orders app or to add the tests to our product app.

The code changes for this episode -> [episode-13](https://github.com/ShahriyarR/ecommerce-nuxtjs-fastapi-backend/tree/episode-13)

### NEXT -> [Create Order app, models and schemas](./ecommerce-create-order-app-and-models)