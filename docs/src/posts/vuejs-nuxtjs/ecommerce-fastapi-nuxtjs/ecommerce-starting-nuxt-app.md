# Setting up Nuxt app and activating Bulma CSS

Now it is time to setup and configure our Nuxt app.

So basically you can follow the official doc about how to start the empty nuxt app. 
Here are my steps:

```shell
💁  shako @ 💻  shako-ThinkPad in 📁  Djackets_Nuxtjs
└❯ mkdir frontend
mkdir: created directory 'frontend'

┌💁  shako @ 💻  shako-ThinkPad in 📁  Djackets_Nuxtjs
└❯ cd frontend/
/home/shako/REPOS/Learning_FastAPI/Djackets_Nuxtjs/frontend
```

Next is to run npx:

```shell
create-nuxt-app v3.6.0
✨  Generating Nuxt.js project in .
? Project name: frontend
? Programming language: JavaScript
? Package manager: Npm
? UI framework: None
? Nuxt.js modules: 
❯◉ Axios - Promise based HTTP client
 ◯ Progressive Web App (PWA)
 ◯ Content - Git-based headless CMS
```

Here we need to choose Axios for future usage.

We are not going to use linters, no testing(shame on us):

```shell
? Linting tools: (Press <space> to select, <a> to toggle all, <i> to invert selection)
? Testing framework: None
? Rendering mode: Universal (SSR / SSG)
? Deployment target: Server (Node.js hosting)
? Development tools: 
❯◉ jsconfig.json (Recommended for VS Code if you're not using typescript)
 ◯ Semantic Pull Requests
 ◯ Dependabot (For auto-updating dependencies, GitHub only)
```

And the rest is:

```shell
? What is your GitHub username? shahriyarr
? Version control system: Git
..Installing packages with npm
```

Finally we are going to see something like:

```shell
🎉  Successfully created project frontend

  To get started:

        npm run dev

  To build & start for production:

        npm run build
        npm run start

```

If you run `npm run dev`:

```shell
💁  shako @ 💻  shako-ThinkPad in 📁  frontendmaster ⌀15 ✗
└❯ npm run dev

> frontend@1.0.0 dev
> nuxt


   ╭───────────────────────────────────────╮
   │                                       │
   │   Nuxt @ v2.15.6                      │
   │                                       │
   │   ▸ Environment: development          │
   │   ▸ Rendering:   server-side          │
   │   ▸ Target:      server               │
   │                                       │
   │   Listening: http://localhost:3000/   │
   │                                       │
   ╰───────────────────────────────────────╯


ℹ Listening on: http://localhost:3000/
```

Now we are going to activate the Bulma CSS for our project:

```shell
❯ npm install @nuxtjs/bulma
```

Development dependencies:

```shell
❯ npm install -D node-sass
❯ npm install -D sass-loader
```

Our updated `packages.json` is:

```js
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nuxt",
    "build": "nuxt build",
    "start": "nuxt start",
    "generate": "nuxt generate"
  },
  "dependencies": {
    "@nuxtjs/axios": "^5.13.1",
    "@nuxtjs/bulma": "^1.3.0",
    "core-js": "^3.9.1",
    "nuxt": "^2.15.3"
  },
  "devDependencies": {
    "@nuxt/types": "^2.15.6",
    "node-sass": "^5.0.0",
    "sass-loader": "^10.1.1"
  }
}
```

The next is to use Bulma globally in NuxtJS. For that purposes, I am going to create `assets/stylesheets/main.sass` file and put:

```js
// Bulma variables
@import "~bulma/sass/utilities/all"
// Bulma framework
@import "~bulma"
```

Then use it in the `nuxt.config.js`:

```js
css: [
    '@/assets/stylesheets/main.sass'
],
```

Extra dependencies:

```shell
❯ npm install @nuxtjs/style-resources -D
❯ npm install @nuxtjs/fontawesome -D
```

And add them to `nuxt.config.js`:

```js
  buildModules: [
    "@nuxtjs/style-resources",
    "@nuxtjs/fontawesome",
  ],
```

We are done with initial setup.

The code changes for this episode -> [episode-15](https://github.com/ShahriyarR/ecommerce-nuxtjs-frontend/tree/episode-15)

The next is to start building our UI and create base template.

### NEXT -> [Setting up base template](./ecommerce-setup-base-template)