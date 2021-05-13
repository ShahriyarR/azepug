# Setting up FastAPI project boilerplate

Welcome to these tutorial series. In this blog post we are going to create project structure and boilerplate.
Our stack:

* Python 3.9 (anything >= 3.7 will do the work)
* Gino as ORM
* Postgres as DB
* FastAPI as our love

How to automate the process of creating the structure for our project?
Do we have something similar to Django's startproject and startapp in FastAPI world? Answer is yes.

Take a look at this wonderful project -> [manage-fastapi](https://github.com/ycd/manage-fastapi).

Let's start by using this tool. First create virtualenv:

```shell
$ mkdir Djackets
$ python3.9 -m venv .venv
```

Then install the tool:

```shell
$ source .venv/bin/activate
$ pip install manage-fastapi 
```

Then follow as:

```shell
$ fastapi startproject --interactive backend

Select the package manager: 
    pip               
 >  poetry

Select the python version:
    3.6                
 >  3.7
    3.8

Select the license:
 >  MIT  
    BSD                                                                                                                            GNU
    Apache

[y/n] Do you want pre commit?[n]n

[y/n] Do you want docker?[n]y 

Select the database:
 >  Postgres

FastAPI project created successfully! 🎉
```

At the end we will have structure as below:

```shell
❯ tree backend
backend
├── app
│   ├── core
│   │   ├── config.py
│   │   ├── __init__.py
│   │   └── __pycache__
│   │       └── __init__.cpython-39.pyc
│   ├── database.py
│   ├── __init__.py
│   ├── main.py
│   └── __pycache__
│       ├── database.cpython-39.pyc
│       ├── __init__.cpython-39.pyc
│       └── main.cpython-39.pyc
├── docker-compose.yaml
├── Dockerfile
├── LICENSE
├── pyproject.toml
├── README.md
└── tests
    ├── __init__.py
    └── __pycache__
        └── __init__.cpython-39.pyc

6 directories, 16 files
```

Now we need to create the users app. Change directory to the backend folder and run:

```shell
$ cd backend
$ fastapi startapp users
FastAPI app created successfully! 🎉
```

Now the structure is:

```shell
tree 
.
├── app
│   ├── core
│   │   ├── config.py
│   │   ├── __init__.py
│   │   └── __pycache__
│   │       └── __init__.cpython-39.pyc
│   ├── database.py
│   ├── __init__.py
│   ├── main.py
│   └── __pycache__
│       ├── database.cpython-39.pyc
│       ├── __init__.cpython-39.pyc
│       └── main.cpython-39.pyc
├── docker-compose.yaml
├── Dockerfile
├── LICENSE
├── pyproject.toml
├── README.md
├── tests
│   ├── __init__.py
│   └── __pycache__
│       └── __init__.cpython-39.pyc
└── users
    ├── api
    │   ├── __init__.py
    │   ├── __pycache__
    │   │   └── __init__.cpython-39.pyc
    │   └── v1.py
    ├── crud.py
    ├── __init__.py
    ├── models.py
    ├── __pycache__
    │   ├── crud.cpython-39.pyc
    │   ├── __init__.cpython-39.pyc
    │   ├── models.cpython-39.pyc
    │   └── schemas.cpython-39.pyc
    └── schemas.py

10 directories, 27 files
```

We choose to use poetry as our dependency manager and now we are going to add some more packages.
The Gino has nice blog post about [Build a FastAPI Server](https://python-gino.org/docs/en/master/tutorials/fastapi.html) and they have clearly stated which packages we need here:

```shell
$ poetry add gino[pg,starlette]
$ poetry add fastapi uvicorn gunicorn
$ poetry add alembic psycopg2
$ poetry add -D pytest requests
```

Our final `pyproject.toml` file should look:

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

[tool.poetry.dev-dependencies]
pytest = "^5.2"
pytest-cov = "^2.10.1"
requests = "^2.25.1"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
```

Could we run our server? Sure:

```shell
┌ⓔ .venv 💁  shako @ 💻  shako-ThinkPad in 📁  backend
└❯ fastapi run
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [23699] using statreload
INFO:     Started server process [23701]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Now we are done with basic setup. 

Next is configuring our Database to be used by Gino.
Thanks

### NEXT -> [Configure database access using Gino ORM](./ecommerce-configure-db)
