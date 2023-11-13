# elysia-vite-plugin-ssr ![Test](https://github.com/timnghg/elysia-vite-plugin-ssr/actions/workflows/main.yml/badge.svg)

Use [vike](https://vike.dev/) with [Elysia](https://elysiajs.com/).

## 1. Install

`bun add elysia-vite-plugin-ssr`

## 2. Usage

2.1. Prepare `src/pages` & `src/renderer` directory for vike. `src` can be changed at will.
Please follow [vike guide](https://vike.dev/add) for detailed instruction & example.

2.2. Use `elysiaVitePluginSsr` plugins.

```js
// src/index.ts
import { Elysia } from "elysia";
import { elysiaVitePluginSsr } from "elysia-vite-plugin-ssr";

const app = new Elysia().use(
  elysiaVitePluginSsr({
    pluginSsr: {
      // <-- must exist to trigger vite-plugin-ssr
      // ... vite-plugin-ssr options
      // baseAssets: 'https://cdn.example.com/assets/'
    },
    // onPluginSsrReady() {
    //   console.log("vite middleware is ready")
    // },
    // ... optional other vite config
    base: "/ssr", // no trailing slash
    root: path.resolve(import.meta.dir, "./"), // directories `./pages`, `./renderer` should exists
  })
);
```
