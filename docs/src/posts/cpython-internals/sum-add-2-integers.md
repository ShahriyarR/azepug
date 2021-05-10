# Python/C API - sum/add 2 integers

Hi, this topic is about how you can call simple Python/C functions to sum 2 integers.

Let’s dive in:

```shell
shako@shako-localhost:~/REPOS/cpython/debug$ gdb ./python
(gdb) break main 
Breakpoint 1 at 0x591aa: file ../Programs/python.c, line 14.
(gdb) run Starting program: /home/shako/REPOS/cpython/debug/python 
[Thread debugging using libthread_db enabled] 
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
Breakpoint 1, main (argc=1, argv=0x7fffffffdec8) at ../Programs/python.c:14 
14 {
```

We put break at main function to stop python at very “beginning”.
Then we can call functions. First let’s create new int object:


```c
(gdb) call PyLong_FromLong(11111)
$1 = (PyObject *) 0x7ffff7f8e040
```

What we did here is basically calling C function `PyLong_FromLong`([longobject.c#L243](https://github.com/python/cpython/blob/3.7/Objects/longobject.c#L243))

As commented in source code this will create a new int object from C long int type.

There is a call for `_PyLong_New`([longobject.c#L195](https://github.com/python/cpython/blob/3.7/Objects/longobject.c#L195))
which is allocating memory for given int:

```c
/* Allocate a new int object with size digits.
 Return NULL and set exception if we run out of memory. */
```

And if you notice those function return type is PyObject as most of things in Python.
Next run is for creating new integer object:


```c
(gdb) call PyLong_FromLong(22222)
$2 = (PyObject *) 0x7ffff7f8e090
```

If you are curious about what is this int object:

```c
(gdb) p *$2
$3 = {_ob_next = 0x7ffff7f8e040, _ob_prev = 0x555555a58660 <refchain>;, ob_refcnt = 1, ob_type = 0x555555a54ee0 <PyLong_Type>}
(gdb) p *$2->ob_type
$4 = {ob_base = {ob_base = {_ob_next = 0x0, _ob_prev = 0x0, ob_refcnt = 1, ob_type = 0x555555a5f720 <PyType_Type>}, ob_size = 0}, tp_name = 0x5555557c433f "int",
...(Truncated output)...
```

So the integer object type is PyLong_Type which is type of PyType_Type :)
Next we need to add these numbers(objects in our term). 

Prior to this let’s see the type definition for PyLong_Type([longobject.c#L5379](https://github.com/python/cpython/blob/3.7/Objects/longobject.c#L5379)) ; if you follow link you will see:

`long_as_number, /* tp_as_number */`

Same thing you can see from debugger as well:


```c
(gdb) p PyLong_Type
$10 = {ob_base = {ob_base = {_ob_next = 0x0, _ob_prev = 0x0, ob_refcnt = 1, ob_type = 0x555555a5f720 <PyType_Type>}, ob_size = 0}, tp_name = 0x5555557c433f "int",
  tp_basicsize = 40, tp_itemsize = 4, tp_dealloc = 0x5555555d9788 <long_dealloc>, tp_print = 0x0, tp_getattr = 0x0, tp_setattr = 0x0, tp_as_async = 0x0,
  tp_repr = 0x5555555dc451 <long_to_decimal_string>, tp_as_number = 0x555555a54b20 <long_as_number>;
...(Truncated Output)...
```

Then let’s see what we have in `tp_as_number`:


```c
(gdb) p *PyLong_Type->tp_as_number
$12 = {nb_add = 0x5555555de646 <long_add>, nb_subtract = 0x5555555de75e <long_sub>, nb_multiply = 0x5555555e19a9 <long_mul>, nb_remainder = 0x5555555e00b6 <long_mod>,
...(Truncated Output)...
```

Can be explored from link [longobject.c#L5342](https://github.com/python/cpython/blob/3.7/Objects/longobject.c#L5342)
So now we see `nb_add` which is a `long_add` binary function which is stored at [longobject.c#L3083](https://github.com/python/cpython/blob/3.7/Objects/longobject.c#L3083)

```c
(gdb) p PyLong_Type->tp_as_number->nb_add 
$14 = (binaryfunc) 0x5555555de646 <long_add>; 
(gdb) p *PyLong_Type->tp_as_number->nb_add 
$15 = {PyObject *(PyObject *, PyObject *)} 0x5555555de646 <long_add>;
```

Now it is clear how we are going to add 2 integers: 

```c
(gdb) call PyLong_Type->tp_as_number->nb_add(0x7ffff7f8e040, 0x7ffff7f8e090) 
$16 = (PyObject *) 0x7ffff7f8e0e0
```

How about printing this final result?:

```c
(gdb) call PyObject_Print(0x7ffff7f8e0e0, stderr, 1)

Program received signal SIGSEGV, Segmentation fault. 
0x00005555555f8f8b in PyObject_Str (v=v@entry=0x7ffff7f8e0e0) at ../Objects/object.c:524 524 if (Py_EnterRecursiveCall(" while getting the str of an object"))
```

After some research I found that this is happening because, 
we did not called Initialization [Py_Initialize()](https://docs.python.org/3/c-api/init.html#c.Py_Initialize)

For more read here - Initialization, Finalization, and Threads [pre-init-safe](https://docs.python.org/3/c-api/init.html#pre-init-safe)

```c
(gdb) call Py_Initialize() [some errors may occur here]

(gdb) call PyObject_Print(0x7ffff7f8e0e0, stderr, 1) 
33333$19 = 0
```

That’s it. Now you should have very basic grasp of what is going on in Python/C API.