process.env.NODE_ENV = "production";

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import Module, { createRequire, registerHooks } from "node:module";

const loaderFileUrl = import.meta.url;
const frontendRootDir = path.resolve(
    path.dirname(fileURLToPath(loaderFileUrl)),
    "../.."
);
const frontendNodeModules = path.join(frontendRootDir, "node_modules");
process.env.NODE_PATH = frontendNodeModules;
Module._initPaths();

const frontendPkgUrl = pathToFileURL(
    path.join(frontendRootDir, "package.json")
).href;

const requireFromFrontend = createRequire(
    path.join(frontendRootDir, "package.json")
);
const { transform } = requireFromFrontend("sucrase");

const frontendSrcDir = path.join(frontendRootDir, "src");

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "next/link") {
            return {
                shortCircuit: true,
                url: `${loaderFileUrl}?mock=next-link`,
            };
        }
        if (specifier === "next/navigation") {
            return {
                shortCircuit: true,
                url: `${loaderFileUrl}?mock=next-navigation`,
            };
        }
        if (specifier === "recharts") {
            return {
                shortCircuit: true,
                url: `${loaderFileUrl}?mock=recharts`,
            };
        }
        if (specifier.startsWith("@/")) {
            const targetBase = path.join(frontendSrcDir, specifier.slice(2));
            const candidates = [
                `${targetBase}.ts`,
                `${targetBase}.tsx`,
                path.join(targetBase, "index.ts"),
                path.join(targetBase, "index.tsx"),
            ];
            for (const candidate of candidates) {
                if (existsSync(candidate)) {
                    return {
                        shortCircuit: true,
                        url: pathToFileURL(candidate).href,
                    };
                }
            }
        }
        if (
            (specifier.startsWith("./") || specifier.startsWith("../")) &&
            !path.extname(specifier) &&
            context.parentURL &&
            context.parentURL.startsWith("file:")
        ) {
            const cleanParentUrl = context.parentURL.split("?")[0];
            const parentDir = path.dirname(fileURLToPath(cleanParentUrl));
            const targetBase = path.resolve(parentDir, specifier);
            for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
                if (existsSync(`${targetBase}${ext}`)) {
                    return {
                        shortCircuit: true,
                        url: pathToFileURL(`${targetBase}${ext}`).href,
                    };
                }
            }
        }
        if (
            !specifier.startsWith(".") &&
            !specifier.startsWith("file:") &&
            !specifier.startsWith("node:")
        ) {
            return nextResolve(specifier, {
                ...context,
                parentURL: frontendPkgUrl,
            });
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.endsWith("?mock=next-link")) {
            return {
                format: "module",
                shortCircuit: true,
                source: `import React from "react";
export default function Link({ href, children, ...props }) {
    return React.createElement("a", { href: typeof href === "string" ? href : String(href), ...props }, children);
}`,
            };
        }
        if (url.endsWith("?mock=next-navigation")) {
            return {
                format: "module",
                shortCircuit: true,
                source: `export function usePathname() {
    return globalThis.__TEST_PATHNAME__ ?? "/organization/console";
}
export function useSearchParams() {
    return new URLSearchParams(globalThis.__TEST_SEARCH_PARAMS__ ?? "");
}
export function useRouter() {
    return { push: () => {}, replace: () => {}, refresh: () => {} };
}`,
            };
        }
        if (url.endsWith("?mock=recharts")) {
            return {
                format: "module",
                shortCircuit: true,
                source: `import React from "react";
export const BarChart = ({ children, data }) => React.createElement("div", { className: "recharts-barchart", "data-items": data?.length }, children);
export const Bar = () => null;
export const XAxis = () => null;
export const YAxis = () => null;
export const CartesianGrid = () => null;
export const Tooltip = () => null;
export const Legend = () => null;
export const ResponsiveContainer = ({ children }) => React.createElement("div", { className: "recharts-responsive-container" }, children);
`,
            };
        }
        if (url.startsWith("file:") && (url.endsWith(".ts") || url.endsWith(".tsx"))) {
            const filePath = fileURLToPath(url);
            const source = readFileSync(filePath, "utf8");
            const compiled = transform(source, {
                transforms: ["typescript", "jsx"],
                jsxRuntime: "automatic",
                production: true,
                filePath,
            });
            return {
                format: "module",
                shortCircuit: true,
                source: compiled.code,
            };
        }
        return nextLoad(url, context);
    },
});
