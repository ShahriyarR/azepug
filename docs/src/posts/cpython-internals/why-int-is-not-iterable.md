# Why 'int' object is not iterable - because tp_iter is NULL

Recently I was curious about how int object is implemented in CPython and researched the iterable error for int.
My code sample is:

```python
$ cat test_iterator.py 
x = 3 
for i in x: 
    pass
```

It is obvious that we can not go through integer but for CPython this code will be compiled successfully - in contrast it will fail at runtime:

```python
$ ~/REPOS/cpython/debug_3.8/python test_iterator.py
Traceback (most recent call last): 
    File "test_iterator.py", line 2, in <module>;
        for i in x:
TypeError: 'int' object is not iterable
```

So why?

For this let’s see the opcodes:

```python
$ ~/REPOS/cpython/debug_3.8/python -m dis test_iterator.py
  1           0 LOAD_CONST               0 (3)
              2 STORE_NAME               0 (x)
 
  2           4 LOAD_NAME                0 (x)
              6 GET_ITER
        >>    8 FOR_ITER                 4 (to 14)
             10 STORE_NAME               1 (i)
 
  3          12 JUMP_ABSOLUTE            8
        >>   14 LOAD_CONST               1 (None)
             16 RETURN_VALUE
```

It seems to be GET_ITER should get the iterable object for us.

Open up `Python/ceval.c` in source and search for GET_ITER – 
you will find the target as part of huge switch statement - [ceval.c#L2859]((https://github.com/python/cpython/blob/master/Python/ceval.c#L2859))

```c
TARGET(GET_ITER) {
    /* before: [obj]; after [getiter(obj)] */
    PyObject *iterable = TOP();
    PyObject *iter = PyObject_GetIter(iterable);
    Py_DECREF(iterable);
    SET_TOP(iter);
    if (iter == NULL)
    goto error;
    PREDICT(FOR_ITER);
    PREDICT(CALL_FUNCTION);
    DISPATCH();
 }
```

There is a call for `PyObject_GetIter()` which is in `Objects/abstract.c` - [abstract.c#L2542](https://github.com/python/cpython/blob/master/Objects/abstract.c#L2542)

```c
PyObject *
PyObject_GetIter(PyObject *o)
{
    PyTypeObject *t = o->ob_type;
    getiterfunc f;
    f = t->tp_iter;
    if (f == NULL) {
    if (PySequence_Check(o))
        return PySeqIter_New(o);
        return type_error("'%.200s' object is not iterable", o);
    }
    else {
    PyObject *res = (*f)(o);
    if (res != NULL && !PyIter_Check(res)) {
        PyErr_Format(PyExc_TypeError,
        "iter() returned non-iterator "
        "of type '%.100s'",
        res->ob_type->tp_name);
        Py_DECREF(res);
        res = NULL;
    }
    return res;
    }
}
```

As you see there is an error similar to our error at runtime ->

```c
type_error("'%.200s' object is not iterable", o)
```

This will only true if `f` is `NULL`:

```c
if (f == NULL) {
 if (PySequence_Check(o))
    return PySeqIter_New(o);
    return type_error("'%.200s' object is not iterable", o);
 }
```

And what about f?

```c
PyTypeObject *t = o->ob_type;
 getiterfunc f;
 f = t->tp_iter;
```

So an int object has `tp_iter` which must be `NULL` for `int` object.
Let’s see the type definition of int object, i.e `PyLong_Type`. 
We can see it from debugger:

```c
(gdb) p PyLong_Type->tp_iter
$2 = (getiterfunc) 0x0
```

As well as from source code -> [longobject.c#L5483](https://github.com/python/cpython/blob/master/Objects/longobject.c#L5483)

Okay then we can convince our soul that List object is iterable because tp_iter is not NULL?
Yes sure!

```c
(gdb) p PyList_Type->tp_iter
$3 = (getiterfunc) 0x5555555d3277 <list_iter>
(gdb) p PyTuple_Type->tp_iter
$4 = (getiterfunc) 0x55555560a97e <tuple_iter>
(gdb) p PySet_Type->tp_iter
$5 = (getiterfunc) 0x555555602278 <set_iter>
```

That is the fundamental idea of checking if some object is iterable or not. Cool.