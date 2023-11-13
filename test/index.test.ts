import react from "@vitejs/plugin-react";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "bun:test";
import { Elysia } from "elysia";
import * as path from "path";
import type { ViteDevServer } from "vite";
import { elysiaVike } from "../src/index";

describe("elysia-vike :: current", () => {
    let app: Elysia<any>;
    let viteDevServer: ViteDevServer;

    beforeAll(async () => {
        await new Promise((resolve) => {
            app = new Elysia().use(
                elysiaVike({
                    pluginSsr: {},
                    base: "/ssr",
                    root: path.resolve(import.meta.dir, "./current"),
                    plugins: [react()],
                    onPluginSsrReady(server) {
                        viteDevServer = server;
                        resolve(undefined);
                        console.log("current :: ready");
                    },
                })
            );
        });
    });

    afterAll(async () => {
        if (viteDevServer) {
            await viteDevServer.ws.close();
            await viteDevServer.close();
        }
        app.server?.stop(true);
        console.log("current :: stopped");
    });

    it("should serve /ssr/", async () => {
        const resp = app.handle(new Request(`http://localhost/ssr/`));
        const text = await resp.then((r) => r.text());
        const status = await resp.then((r) => r.status);

        // debug
        if (!text || text === "NOT_FOUND") {
            console.log(text);
        }
        expect(status).toBe(200);
        expect(text).not.toBe("NOT_FOUND");

        // vite-plugin-ssr
        expect(text.includes("vike_pageContext")).toBeTrue();

        // navigation
        expect(text.includes("Home")).toBeTrue();
        expect(text.includes("About")).toBeTrue();
    });

    it("should serve /ssr/about", async () => {
        const resp = app.handle(new Request(`http://localhost/ssr/about`));
        const text = await resp.then((r) => r.text());
        const status = await resp.then((r) => r.status);
        expect(status).toBe(200);
        expect(text).not.toBe("NOT_FOUND");
        expect(text.includes("<h1>About</h1>")).toBeTrue();
    });
});
