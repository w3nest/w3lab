import { AppState } from '../app-state'
import * as Backends from './backends'
import * as ESM from './esm'
import * as WebApps from './webapps'
import * as Pyodide from './pyodide'
import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'

import { DefaultLayout, Navigation, parseMd, Router, segment } from 'mkdocs-ts'
import { Local } from '@w3nest/http-clients'
import { PackageView } from './package.views'
import { State } from './state'
import { defaultLayout } from '../common/utils-nav'
import { ComponentsDonutChart, DonutChart } from '../home/widgets'
import { PageTitleView, QuickSearchSection } from '../common'
import { of } from 'rxjs'
import { CountSummary, SearchItemView } from './common'
export * from './state'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'WebPM',
    header: { icon: { tag: 'i', class: 'fas  fa-boxes' } },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    routes: {
        [segment('/webapp')]: WebApps.navigation(appState),
        [segment('/esm')]: ESM.navigation(appState),
        [segment('/pyodide')]: Pyodide.navigation(appState),
        [segment('/backend')]: Backends.navigation(appState),
    },
})

export function lazyResolver(
    packages: Local.Components.CdnPackageLight[],
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
        webapp: (params) => new PackageView({ ...params, kind: 'webapp' }),
        esm: (params) => new PackageView({ ...params, kind: 'esm' }),
        backend: (params) => new PackageView({ ...params, kind: 'backend' }),
        pyodide: (params) => new PackageView({ ...params, kind: 'pyodide' }),
    }
    return ({ path }: { path: string }) => {
        const parts = path.split('/').filter((d) => d !== '')
        if (parts.length === 0) {
            const children = packages
                .filter((elem) => elem.versions.slice(-1)[0].parent === null)
                .filter((elem) => {
                    return elem.versions[0].kind === target
                })
                .sort((a, b) => a['name'].localeCompare(b['name']))
                .map((component) => {
                    return {
                        name: component.name,
                        id: component.id,
                        leaf: true,
                        header: { icon: { tag: 'i', class: 'fas  fa-box' } },
                        layout: {
                            content: ({ router }: { router: Router }) => {
                                const params = {
                                    appState,
                                    router,
                                    cdnState: appState.cdnState,
                                    packageId: component.id,
                                }
                                return htmlFactory[target](params)
                            },
                            toc: ({
                                router,
                                html,
                            }: {
                                router: Router
                                html: HTMLElement
                            }) =>
                                new DefaultLayout.TOCView({
                                    html,
                                    router,
                                    maxHeadingsDepth: 15,
                                }),
                        },
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
    constructor({ router, appState }: { router: Router; appState: AppState }) {
        const chartTypes = new ComponentsDonutChart({
            appState,
            innerStyle: { width: '95%', maxWidth: '500px' },
            margin: 10,
            sections: [
                {
                    selector: (c) => c.versions.slice(-1)[0].kind === 'esm',
                    label: 'ESM',
                    fill: '#10B981',
                },
                {
                    selector: (c) => c.versions.slice(-1)[0].kind === 'webapp',
                    label: 'Web App.',
                    fill: '#3B82F6',
                },
                {
                    selector: (c) => c.versions.slice(-1)[0].kind === 'backend',
                    label: 'Backends',
                    fill: '#64748B',
                },
                {
                    selector: (c) => c.versions.slice(-1)[0].kind === 'pyodide',
                    label: 'Pyodide',
                    fill: '#8B5CF6',
                },
            ],
        })
        function generateNiceColor(index) {
            const hue = (index * 137.508) % 360 // Golden angle for good distribution
            const saturation = 60 // Soft, not too harsh
            const lightness = 60 // Balanced tone
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`
        }

        const chartOrigin = {
            tag: 'div' as const,
            children: [
                child$({
                    source$: appState.cdnState.status$,
                    vdomMap: ({ packages }) => {
                        const origins = packages
                            .map((p) => p.versions)
                            .flatMap((version) => version.map((v) => v.origin))
                        const set = new Set(origins)
                        return new DonutChart<string>({
                            appState,
                            innerStyle: { width: '95%', maxWidth: '500px' },
                            margin: 10,
                            entities$: of(origins),
                            sections: Array.from(set).map((origin, i) => {
                                return {
                                    selector: (c) => c === origin,
                                    label: origin,
                                    fill: generateNiceColor(i),
                                }
                            }),
                        })
                    },
                }),
            ],
        }
        this.children = [
            new PageTitleView({
                title: 'WebPM',
                icon: 'fas fa-boxes',
                helpNav: '@nav/doc.2-',
            }),
            parseMd({
                src: `

<countSummary></countSummary>

##  Types

<packageTypes></packageTypes>

##  Origins

<packageOrigins></packageOrigins>

---

<quickSearchSection></quickSearchSection>
`,
                router: router,
                views: {
                    packageTypes: () => chartTypes,
                    packageOrigins: () => chartOrigin,
                    quickSearchSection: () => {
                        return new QuickSearchSection({
                            input$: appState.cdnState.rootPackages$,
                            vdomMap: (item) =>
                                new SearchItemView({ item, appState }),
                        })
                    },
                    countSummary: () => new CountSummary({ appState }),
                },
            }),
        ]
    }
}
