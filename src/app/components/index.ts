import { AppState } from '../app-state'
import * as Backends from './backends'
import * as JsWasm from './js-wasm'
import * as Pyodide from './pyodide'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'

import { Navigation, parseMd, Router, Views } from '@youwol/mkdocs-ts'
import { Local } from '@w3nest/http-clients'
import { PackageView } from './js-wasm/package.views'
import { BackendView } from './backends/package.views'
import { State } from './state'
import { PyodideView } from './pyodide/package.views'
import { example1 } from './examples'
export * from './state'

type Target = 'js/wasm' | 'backend' | 'pyodide'
export const navigation = (appState: AppState): Navigation => ({
    name: 'Components',
    decoration: { icon: { tag: 'i', class: 'fas  fa-microchip me-2' } },
    html: ({ router }) => new PageView({ router, appState }),
    '/js-wasm': JsWasm.navigation(appState),
    '/pyodide': Pyodide.navigation(appState),
    '/backends': Backends.navigation(appState),
})

export function formatChildren(
    { packages }: Local.Routers.LocalCdn.CdnStatusResponse,
    target: Target,
) {
    return packages
        .filter((elem) => {
            return elem.versions[0].type === target
        })
        .sort((a, b) => a['name'].localeCompare(b['name']))
        .map((component) => {
            return {
                name: component.name,
                id: component.id,
                leaf: true,
                decoration: {
                    icon: { tag: 'div' as const, class: 'mx-2' },
                },
            }
        })
}

export function lazyResolver(
    status: Local.Routers.LocalCdn.CdnStatusResponse,
    appState: AppState,
    target: Local.Routers.LocalCdn.WebpmLibraryType,
) {
    const htmlFactory: Record<
        Local.Routers.LocalCdn.WebpmLibraryType,
        (p: {
            appState: AppState
            cdnState: State
            router: Router
            packageId: string
        }) => AnyVirtualDOM
    > = {
        'js/wasm': (params) => new PackageView(params),
        backend: (params) => new BackendView(params),
        pyodide: (params) => new PyodideView(params),
    }
    return ({ path }: { path: string }) => {
        const parts = path.split('/').filter((d) => d != '')
        if (parts.length === 0) {
            return {
                children: formatChildren(status, target),
                html: ({ router }) => {
                    return new PackageView({
                        router,
                        appState,
                        packageId: parts.slice(-1)[0],
                    })
                },
            }
        }
        return {
            tableOfContent: Views.tocView,
            children: [],
            html: ({ router }) => {
                const params = {
                    appState,
                    router,
                    cdnState: appState.cdnState,
                    packageId: parts.slice(-1)[0],
                }
                return htmlFactory[target](params)
            },
        }
    }
}

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ router }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Components

<info>
Gathers the installed components (executables).

They are retrieved either:
*  when requested by an *e.g.* application
*  when published from your projects

Executables can be:
*  applications
*  libraries
*  python: Python modules running in the browser using pyodide.
*  backends

**Examples:**

To help you get started, here are a few examples:
- Electronic density computations using PySCF: 
<a href="/applications/@youwol/js-playground/latest?content=${encodeURIComponent(example1)}" target="_blank">here</a>.
</info>
`,
                router: router,
            }),
        ]
    }
}
