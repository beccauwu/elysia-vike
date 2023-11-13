import { Elysia } from "elysia";
import { elysiaConnectDecorate } from "elysia-connect";
import { ViteConfig, getViteConfig } from "elysia-vite";
import { ServerResponse } from "node:http";
import * as path from "path";
import {
  UserConfig as ConfigVpsUserProvided,
  ssr,
} from "vike/plugin";
import { renderPage } from "vike/server";
import type { Connect, ViteDevServer } from "vite";

export type ElysiaVikeConfig = ViteConfig & {
    pluginSsr?: ConfigVpsUserProvided;
    onPluginSsrReady?(viteServer: ViteDevServer): void;
};

const log: (...args: any[]) => void = !!process.env?.DEBUG
    ? console.log.bind(console, "[elysia-vike]")
    : () => {
    };

export const elysiaVike =
    (config?: ElysiaVikeConfig) => async (app: Elysia) => {
        //@ts-expect-error (idk what's going on here but maybe it's fine)
        const _app = app.use(elysiaConnectDecorate());
        const {pluginSsr, onPluginSsrReady, ...resolvedConfig} =
        (await getViteConfig(config)) || {};
        if (!pluginSsr) return _app;
        log("resolvedConfig", resolvedConfig);

        const vite = require("vite");

        const viteServer: ViteDevServer = await vite.createServer({
            root: resolvedConfig?.root || path.resolve(import.meta.dir, "./"),
            ssr: true,
            ...resolvedConfig,
            server: {middlewareMode: true, ...resolvedConfig?.server},
            plugins: (resolvedConfig?.plugins || []).concat([
                ssr({
                    baseServer: resolvedConfig?.base,
                    ...pluginSsr,
                }),
            ]),
        });

        const viteDevMiddleware = viteServer.middlewares;
        log("viteDevMiddleware", !!viteDevMiddleware);

        if (onPluginSsrReady) {
            onPluginSsrReady?.(viteServer);
        }

        return _app
            .on("stop", async () => {
                log("onStop :: reached");
                return await viteServer.close();
            })
            .group(config?.base || "", (app) =>
                app
                    .onBeforeHandle(async (context) => {
                        log("onBeforeHandle :: reached", context.request.url);
                        const handled = await context.elysiaConnect(
                            viteDevMiddleware,
                            context
                        );
                        log("onBeforeHandle :: handle?", !!handled);
                        if (handled) return handled;
                    })
                    .get("*", async (context) => {
                        const handled = await context.elysiaConnect(
                            createVikeConnectMiddleware(
                                resolvedConfig
                            ),
                            context
                        );
                        if (handled) return handled;
                        return "NOT_FOUND";
                    })
            );
    };

function createVikeConnectMiddleware(
    config?: ElysiaVikeConfig
) {
    return async function vikeConnectMiddleware(
        req: Connect.IncomingMessage,
        res: ServerResponse,
        next: Connect.NextFunction
    ) {
        let urlOriginal = req.originalUrl || req.url || "";
        urlOriginal = urlOriginal.match(/^(https?:)/)
            ? new URL(urlOriginal).pathname
            : urlOriginal;

        if (urlOriginal.match(/(ts|tsx|js|jsx|css)$/)) {
            urlOriginal = req.url || "";
        }

        // fix redirect by remove trailing splash
        if (urlOriginal.endsWith("/")) {
            urlOriginal = urlOriginal.replace(/\/$/, "");
        }

        const pageContextInit = {
            urlOriginal,
        };
        log("pageContextInit", pageContextInit);

        const pageContext = await renderPage(pageContextInit);
        const {httpResponse} = pageContext;

        if (!httpResponse) {
            return next();
        } else {
            const {body, statusCode, earlyHints} = httpResponse;

            // @todo: does this work?
            if (res.writeEarlyHints)
                res.writeEarlyHints({
                    link: earlyHints.map((e) => e.earlyHintLink),
                });

            httpResponse?.headers.forEach(([name, value]) =>
                res.setHeader(name, value)
            );
            res.statusCode = statusCode;

            // @todo: can we do HTTP streams with Elysia?
            // For HTTP streams use httpResponse.pipe() instead, see https://vike.com/stream
            res.end(body);
        }
    };
}
