# Setting up base template

Now we are ready to prepare our base template for our frontend.

This section is an adopted version of VueJS section from original tutorial -> [Set up the base template](https://www.youtube.com/watch?v=Yg5zkd9nm6w&t=988s).

It was unable to use `@nuxtjs/fontawesome` package here instead I am going to link the font-awesome from CDN. Open the `nutx.config.js` file and add following:

```js
link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet',  href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.2/css/all.min.css'}
]
```

In Nuxt we need to define default template in the `layouts/default.vue` file.

Here is the complete working example:

```js
<template>
  <div id="wrapper">
    <nav class="navbar is-dark">
      <div class="navbar-brand">
        <NuxtLink to="/" class="navbar-item"><strong>Djackets</strong></NuxtLink>
        <a class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navbar-menu" @click="showMobileMenu = !showMobileMenu">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div class="navbar-menu" id="navbar-menu" v-bind:class="{'is-active': showMobileMenu}">
        <div class="navbar-end">
          <NuxtLink to="/summer" class="navbar-item">Summer</NuxtLink>
          <NuxtLink to="/winter" class="navbar-item">Winter</NuxtLink>

          <div class="navbar-item">
            <div class="buttons">
              <NuxtLink to="/log-in" class="button is-light">Log in</NuxtLink>
              <NuxtLink to="/cart" class="button is-success">
                <span class="icon"><i class="fas fa-shopping-cart"></i></span>
                <span>Cart</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <section class="section">
      <NuxtLink to=""/>
    </section>
    <Nuxt />
    <footer  class="footer">
      <p class="has-text-centered">Copyright (c) 2021</p>
    </footer>
  </div>
</template>

<script>
export  default {
  data() {
    return {
      showMobileMenu: false
    }
  }
}
</script>
```

Save the file and then try to update the home page in `pages/index.vue`:

```js
<template>
  <div class="home">
    Home
  </div>
</template>
```

That is it. We have base template. Fire up the development server:

```shell
❯ npm run dev

ℹ Listening on: http://localhost:3000/
```

Open up the browser with given link:

![Base template](/nuxtjs_base_template.png)

As you see we have this navbar and footer.

The code changes for this episode -> [episode-16](https://github.com/ShahriyarR/ecommerce-nuxtjs-frontend/tree/episode-16)

