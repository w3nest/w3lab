import {
    ChildrenLike,
    AnyVirtualDOM,
    VirtualDOM,
    ChildLike,
    child$,
    attr$,
} from 'rx-vdom'
import { State } from './state'

import { Local, Assets, Webpm, raiseHTTPErrors } from '@w3nest/http-clients'
import { combineLatest, Observable, ReplaySubject, Subject } from 'rxjs'
import { parseMd, Router } from 'mkdocs-ts'
import { ExplorerView } from './package-explorer.view'
import { map, mergeMap } from 'rxjs/operators'
import { ComponentCrossLinksView } from '../common'
import { AppState } from '../app-state'

/**
 * @category View
 */
export class PackageView implements VirtualDOM<'div'> {
    /**
     * @group States
     */
    public readonly appState: AppState

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex flex-column h-100'
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable Constants
     */
    public readonly packageId: string

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildLike[]

    public readonly selectedVersion$ = new ReplaySubject<string>(1)
    constructor(params: {
        appState: AppState
        router: Router
        packageId: string
    }) {
        Object.assign(this, params)
        this.appState.cdnState.openPackage(this.packageId)
        const packageName = window.atob(this.packageId)
        this.children = [
            parseMd({
                src: `
# ${packageName}          

<header></header>

---

## Versions      

<versions></versions>

<details></details>


                `,
                router: params.router,
                views: {
                    header: () => {
                        return new ComponentCrossLinksView({
                            appState: params.appState,
                            component: packageName,
                        })
                    },
                    versions: () => ({
                        tag: 'div',
                        children: [
                            child$({
                                source$:
                                    this.appState.cdnState.packagesEvent[
                                        this.packageId
                                    ].info$,
                                vdomMap: (packageInfo) => {
                                    this.selectedVersion$.next(
                                        packageInfo.versions.slice(-1)[0]
                                            .version,
                                    )
                                    return new VersionsView({
                                        cdnState: this.appState.cdnState,
                                        package: packageInfo,
                                        selectedVersion$: this.selectedVersion$,
                                    })
                                },
                            }),
                        ],
                    }),
                    details: () => {
                        return new PackageDetailsView({
                            router: params.router,
                            selectedVersion$: this.selectedVersion$,
                            packageId: this.packageId,
                        })
                    },
                },
            }),
        ]
    }
}

export class PackageDetailsView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable Constants
     */
    public readonly package: Local.Components.CdnPackage

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        packageId,
        router,
        selectedVersion$,
    }: {
        packageId: string
        router: Router
        selectedVersion$: Subject<string>
    }) {
        this.children = [
            parseMd({
                src: `
## Explorer

<explorer></explorer>

                    
                    `,
                router,
                views: {
                    // launch: () => {
                    //     return new LinkLaunchAppLib({
                    //         selectedVersion$,
                    //         packageId,
                    //         router,
                    //     })
                    // },
                    explorer: () =>
                        new FilesView({
                            selectedVersion$: selectedVersion$,
                            packageId: packageId,
                        }),
                    // links: () =>
                    //     new LinksView({
                    //         selectedVersion$: selectedVersion$,
                    //         packageId: packageId,
                    //     }),
                },
            }),
        ]
    }
}

/**
 * @category View
 */
export class VersionsView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'overflow-auto mx-auto'

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        maxHeight: '50%',
    }

    /**
     * @group Immutable Constants
     */
    public readonly package: Local.Components.CdnPackage

    /**
     * @group Observables
     */
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
                children: params.package.versions.reverse().map((p) => {
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

export class FilesView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        selectedVersion$,
        packageId,
    }: {
        packageId: string
        selectedVersion$: Observable<string>
    }) {
        this.children = [
            child$({
                source$: combineLatest([
                    new Assets.AssetsClient()
                        .getAsset$({
                            assetId: window.btoa(packageId),
                        })
                        .pipe(raiseHTTPErrors()),
                    selectedVersion$,
                ]),
                vdomMap: ([assetResponse, version]): AnyVirtualDOM => {
                    return new ExplorerView({ asset: assetResponse, version })
                },
            }),
        ]
    }
}

export class LinksView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        selectedVersion$,
        packageId,
    }: {
        packageId: string
        selectedVersion$: Observable<string>
    }) {
        type Metadata = { links: { kind: string; name: string; url: string }[] }

        this.children = [
            child$({
                source$: selectedVersion$.pipe(
                    mergeMap((version) =>
                        new Webpm.Client()
                            .getResource$<Metadata>({
                                libraryId: packageId,
                                version,
                                restOfPath: '.yw_metadata.json',
                            })
                            .pipe(
                                raiseHTTPErrors(),
                                map((resp) => ({
                                    resp,
                                    version,
                                })),
                            ),
                    ),
                ),
                vdomMap: ({ resp, version }) => {
                    return {
                        tag: 'ul',
                        children: resp.links.map((link) => {
                            const href =
                                link.kind === 'artifactFile'
                                    ? `/api/webpm/resources/${packageId}/${version}/${link.url}`
                                    : link.url
                            return {
                                tag: 'li',
                                children: [
                                    {
                                        tag: 'a',
                                        target: '_blank',
                                        href,
                                        innerText: link.name,
                                    },
                                ],
                            }
                        }),
                    }
                },
            }),
        ]
    }
}
