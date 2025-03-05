import { AppState } from '../app-state'
import * as Backends from './backends'
import * as ESM from './esm'
import * as WebApps from './webapps'
import * as Pyodide from './pyodide'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'

import { DefaultLayout, Navigation, parseMd, Router, segment } from 'mkdocs-ts'
import { Local } from '@w3nest/http-clients'
import { PackageView } from './package.views'
import { BackendView } from './backends/backend.views'
import { State } from './state'
import { example1 } from './examples'
import { defaultLayout } from '../common/utils-nav'
import { WebAppView } from './webapps/webapp.views'
import { EsmView } from './esm/esm.view'
export * from './state'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'WebPM',
    header: { icon: { tag: 'i', class: 'fas  fa-microchip' } },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    routes: {
        [segment('/webapps')]: WebApps.navigation(appState),
        [segment('/esm')]: ESM.navigation(appState),
        [segment('/pyodide')]: Pyodide.navigation(appState),
        [segment('/backends')]: Backends.navigation(appState),
    },
})

export function lazyResolver(
    status: Local.Components.CdnStatusResponse,
    appState: AppState,
    target: Local.Components.WebpmKind,
) {
    const htmlFactory: Record<
        Local.Components.WebpmKind,
        (p: {
            appState: AppState
            cdnState: State
            router: Router
            packageId: string
        }) => AnyVirtualDOM
    > = {
        webapp: (params) => new WebAppView(params),
        esm: (params) => new EsmView(params),
        backend: (params) => new BackendView(params),
        pyodide: (params) => new PackageView(params),
    }
    return ({ path }: { path: string }) => {
        const parts = path.split('/').filter((d) => d !== '')
        if (parts.length === 0) {
            const children = status.packages
                .filter((elem) => {
                    return elem.versions[0].kind === target
                })
                .sort((a, b) => a['name'].localeCompare(b['name']))
                .map((component) => {
                    return {
                        name: component.name,
                        id: component.id,
                        leaf: true,
                        decoration: {
                            icon: { tag: 'div' as const },
                        },
                        layout: defaultLayout(
                            ({ router }: { router: Router }) => {
                                const params = {
                                    appState,
                                    router,
                                    cdnState: appState.cdnState,
                                    packageId: component.id,
                                }
                                return htmlFactory[target](params)
                            },
                        ),
                    }
                })
            return children.reduce(
                (acc, c) => ({ ...acc, [`/${c.id}`]: c }),
                {},
            )
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
<a href="/apps/@youwol/js-playground/latest?content=${encodeURIComponent(example1)}" target="_blank">here</a>.
</info>
`,
                router: router,
            }),
        ]
    }
}
