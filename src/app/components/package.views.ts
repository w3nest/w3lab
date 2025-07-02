import {
    ChildrenLike,
    AnyVirtualDOM,
    VirtualDOM,
    ChildLike,
    child$,
    attr$,
} from 'rx-vdom'
import { State } from './state'

import { Local, Assets, raiseHTTPErrors } from '@w3nest/http-clients'
import { combineLatest, Observable, of, ReplaySubject, Subject } from 'rxjs'
import { MdWidgets, parseMd, Router } from 'mkdocs-ts'
import { ExplorerView } from './package-explorer.view'
import { map } from 'rxjs/operators'
import { ComponentCrossLinksView, CopyClipboardView } from '../common'
import { AppState } from '../app-state'
import { InstallManifestView } from './backends/backend.views'
import { getUrlBase } from '@w3nest/webpm-client'

function extraActions(
    name: string,
    kind: Local.Components.WebpmKind,
    version: string,
) {
    if (kind !== 'webapp') {
        return []
    }

    return [
        of({
            icon: 'fas fa-play',
            enabled: true,
            nav: `/apps/${name}/${version}`,
            hrefKind: 'external' as const,
        }),
    ]
}

export class PackageState {
    public readonly appState: AppState
    public readonly packageId: string
    public readonly selectedVersion$ = new ReplaySubject<string>(1)
    public readonly package$: Observable<Local.Components.CdnPackage>
    public readonly versionInfo$: Observable<Local.Components.CdnVersion>
    public readonly packageName: string

    constructor(params: { appState: AppState; packageId: string }) {
        Object.assign(this, params)
        this.appState.cdnState.openPackage(this.packageId)
        this.packageName = window.atob(this.packageId)
        this.package$ =
            this.appState.cdnState.packagesEvent[this.packageId].info$
        this.versionInfo$ = combineLatest([
            this.package$,
            this.selectedVersion$,
        ]).pipe(map(([p, v]) => p.versions.find((p) => p.version === v)))
        this.package$.subscribe((r) => {
            this.selectedVersion$.next(r.versions.slice(-1)[0].version)
        })
    }
}

export class PackageView implements VirtualDOM<'div'> {
    public readonly appState: AppState
    public readonly state: PackageState

    public readonly class = 'd-flex flex-column h-100'

    public readonly tag = 'div'

    public readonly packageId: string

    public readonly children: ChildLike[]

    constructor(params: {
        appState: AppState
        router: Router
        packageId: string
        kind: Local.Components.WebpmKind
    }) {
        Object.assign(this, params)
        this.state = new PackageState(params)

        const title: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center',
            children: [
                {
                    tag: 'h1',
                    class: 'd-flex align-items-center',
                    children: [
                        {
                            tag: 'i',
                            class: 'fas fa-box',
                        },
                        { tag: 'i', class: 'mx-2' },
                        { tag: 'div', innerText: this.state.packageName },
                    ],
                },
                {
                    tag: 'i',
                    class: 'mx-2',
                },
                {
                    tag: 'i',
                    class: 'fas fa-bookmark mx-1',
                },
                child$({
                    source$: this.state.package$,
                    vdomMap: (packageInfo) => {
                        this.state.selectedVersion$.next(
                            packageInfo.versions.slice(-1)[0].version,
                        )
                        return new VersionsDropDown({
                            cdnState: this.appState.cdnState,
                            package: packageInfo,
                            selectedVersion$: this.state.selectedVersion$,
                        })
                    },
                }),
            ],
        }
        this.children = [
            title,
            parseMd({
                src: `         

<header></header>

---

<versionInfo></versionInfo>


                `,
                router: params.router,
                views: {
                    header: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$: this.state.selectedVersion$,
                                    vdomMap: (version) => {
                                        return new ComponentCrossLinksView({
                                            appState: params.appState,
                                            component: this.state.packageName,
                                            withLinks: extraActions(
                                                this.state.packageName,
                                                params.kind,
                                                version,
                                            ),
                                            exclude: 'webpm',
                                        })
                                    },
                                }),
                            ],
                        }
                    },
                    versionInfo: () => ({
                        tag: 'div',
                        children: [
                            child$({
                                source$: this.state.versionInfo$,
                                vdomMap: (info) =>
                                    new PackageVersionInfo({
                                        appState: params.appState,
                                        packageId: this.state.packageId,
                                        packageName: this.state.packageName,
                                        info,
                                        router: params.router,
                                    }),
                            }),
                        ],
                    }),
                },
            }),
        ]
    }
}

export class VersionsDropDown implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'overflow-auto'
    public readonly style = {
        maxHeight: '50%',
    }
    public readonly package: Local.Components.CdnPackage
    public readonly selectedVersion$: Subject<string>

    constructor(params: {
        cdnState: State
        package: Local.Components.CdnPackage
        selectedVersion$: Subject<string>
    }) {
        Object.assign(this, params)

        this.children = [
            {
                tag: 'select',
                class: 'form-select',
                customAttributes: {
                    ariaLabel: 'Default select example',
                },
                children: [...params.package.versions].reverse().map((p) => {
                    return {
                        tag: 'option',
                        innerText: p.version,
                        value: p.version,
                        selected: attr$({
                            source$: params.selectedVersion$,
                            vdomMap: (v) => v === p.version,
                        }),
                    }
                }),
                onchange: (ev: MouseEvent) => {
                    const target = ev.target as HTMLSelectElement
                    params.selectedVersion$.next(target.value)
                },
            },
        ]
    }
}

class PackageVersionInfo implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor(params: {
        appState: AppState
        packageName: string
        packageId: string
        info: Local.Components.CdnVersion
        router: Router
    }) {
        const dependenciesView = (info: {
            dependencies: Record<string, string>
        }) => {
            if (Object.entries(info.dependencies).length === 0) {
                return parseMd({
                    src: 'The package does not depends on other packages.',
                })
            }
            return parseMd({
                src: Object.entries(info.dependencies).reduce(
                    (acc, [k, v]) => `${acc}\n*  **${k}**: \`${v}\``,
                    '',
                ),
            })
        }
        const baseUrl = getUrlBase(
            params.packageName,
            params.info.version,
        ).replace(location.origin, '')
        const backendInstall =
            params.info.kind === 'backend'
                ? `
## Manifest

<installManifest></installManifest>

---

`
                : ''
        const entryView = (dependencyName: string) => {
            return new MdWidgets.NoteView({
                level: 'info',
                expandable: true,
                label: dependencyName,
                content: {
                    tag: 'div',
                    children: [
                        child$({
                            source$: params.appState.cdnState.status$,
                            vdomMap: ({ packages }) => {
                                const d = packages.find(
                                    (p) =>
                                        p.name === dependencyName.split('#')[0],
                                )
                                const v = d.versions.find(
                                    ({ version }) =>
                                        version ===
                                        dependencyName.split('#')[1],
                                )
                                return parseMd({
                                    src: `
**Entry Point** : \`${v['entryPoint']}\`

**WebPM Dependencies**

<dependencies></dependencies>

                                    `,
                                    views: {
                                        dependencies: () => dependenciesView(v),
                                    },
                                })
                            },
                        }),
                    ],
                },
            })
        }

        this.children = [
            parseMd({
                src: `

<main></main>

## WebPM Dependencies

<dependencies></dependencies>

---

## Extra Entry Points

<extraEntries></extraEntries>

---

${backendInstall}

## Files


<baseUrl></baseUrl>

<files></files>


                `,
                router: params.router,
                views: {
                    main: () =>
                        parseMd({
                            src: `**Entry Point** : \`${params.info.entryPoint}\` (${params.info.entryPointSize / 1000} kB)`,
                        }),
                    dependencies: () => dependenciesView(params.info),
                    extraEntries: () => {
                        if (params.info.children.length === 0) {
                            return parseMd({
                                src: 'No additional entries declared.',
                            })
                        }
                        return {
                            tag: 'div',
                            children: params.info.children.map((name) =>
                                entryView(name),
                            ),
                        }
                    },
                    files: () => {
                        return new FilesView({
                            version: params.info.version,
                            packageId: params.packageId,
                        })
                    },
                    baseUrl: () => ({
                        tag: 'div',
                        class: 'd-flex align-items-baseline w-100',
                        children: [
                            {
                                tag: 'div',
                                innerText: 'Served from : ',
                                style: {
                                    whiteSpace: 'nowrap',
                                    fontWeight: 'bolder',
                                },
                            },
                            {
                                tag: 'div',
                                class: 'mx-1',
                            },
                            {
                                tag: 'code',
                                style: {
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    direction: 'rtl',
                                },
                                innerText: baseUrl,
                            },
                            {
                                tag: 'div',
                                class: 'mx-1',
                            },
                            new CopyClipboardView({ text: baseUrl }),
                        ],
                    }),
                    installManifest: () => {
                        return new InstallManifestView({
                            packageId: params.packageId,
                            appState: params.appState,
                            version: params.info.version,
                        })
                    },
                },
            }),
        ]
    }
}
export class FilesView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        version,
        packageId,
    }: {
        packageId: string
        version: string
    }) {
        const source$ = new Assets.AssetsClient()
            .getAsset$({
                assetId: window.btoa(packageId),
            })
            .pipe(raiseHTTPErrors())
        this.children = [
            child$({
                source$,
                vdomMap: (assetResponse): AnyVirtualDOM => {
                    return new ExplorerView({ asset: assetResponse, version })
                },
            }),
        ]
    }
}
