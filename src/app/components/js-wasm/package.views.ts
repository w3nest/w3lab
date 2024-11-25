import {
    ChildrenLike,
    AnyVirtualDOM,
    VirtualDOM,
    ChildLike,
} from 'rx-vdom'
import { State } from '../state'

import { Local, Assets, Webpm,
    raiseHTTPErrors } from '@w3nest/http-clients'
import {
    combineLatest,
    from,
    Observable,
    ReplaySubject,
    Subject,
    switchMap,
} from 'rxjs'
import { parseMd, Router } from 'mkdocs-ts'
import { ExplorerView } from '../package-explorer.view'
import { map, mergeMap } from 'rxjs/operators'
import { ComponentCrossLinksView } from '../../common'
import { AppState } from '../../app-state'

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
                            {
                                source$:
                                    this.appState.cdnState.packagesEvent[
                                        this.packageId
                                    ].info$,
                                vdomMap: (
                                    packageInfo: Local.Components.CdnPackage,
                                ) => {
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
                            },
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
                emitHtmlUpdated: true,
                src: `
## Type

<launch></launch>

## Explorer

<explorer></explorer>

## Links      

<links></links>
                    
                    `,
                router,
                views: {
                    launch: () => {
                        return new LinkLaunchAppLib({
                            selectedVersion$,
                            packageId,
                            router,
                        })
                    },
                    explorer: () =>
                        new FilesView({
                            selectedVersion$: selectedVersion$,
                            packageId: packageId,
                        }),
                    links: () =>
                        new LinksView({
                            selectedVersion$: selectedVersion$,
                            packageId: packageId,
                        }),
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
                        selected: {
                            source$: params.selectedVersion$,
                            vdomMap: (v) => v === p.version,
                        },
                    }
                }),
                onchange: (ev) => {
                    params.selectedVersion$.next(ev.target['value'])
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
            {
                source$: combineLatest([
                    new Assets.AssetsClient()
                        .getAsset$({
                            assetId: window.btoa(packageId),
                        })
                        .pipe(raiseHTTPErrors()),
                    selectedVersion$,
                ]),
                vdomMap: ([assetResponse, version]: [
                    Assets.GetAssetResponse,
                    string,
                ]): AnyVirtualDOM => {
                    return new ExplorerView({ asset: assetResponse, version })
                },
            },
        ]
    }
}

type YwMetadata = {
    links: { kind: string; name: string; url: string }[]
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
        this.children = [
            {
                source$: selectedVersion$.pipe(
                    mergeMap((version) =>
                        new Webpm.Client()
                            .getResource$({
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
                vdomMap: ({
                    resp,
                    version,
                }: {
                    resp: YwMetadata
                    version: string
                }) => {
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
            },
        ]
    }
}

export class LinkLaunchAppLib implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        selectedVersion$,
        packageId,
        router,
    }: {
        packageId: string
        selectedVersion$: Observable<string>
        router: Router
    }) {
        const packageName = window.atob(packageId)
        this.children = [
            {
                source$: selectedVersion$.pipe(
                    switchMap((version) => {
                        return from(
                            fetch(
                                `/api/assets-gateway/webpm/resources/${packageId}/${version}/.yw_metadata.json`,
                            )
                                .then((resp) => resp.json())
                                .then((resp) => ({
                                    ...resp,
                                    version,
                                })),
                        )
                    }),
                ),
                vdomMap: (resp: {
                    family?: string
                    version: string
                    execution?: { standalone: boolean }
                }) => {
                    if (resp.family === 'application') {
                        return new LinkLaunchAppView({
                            version: resp.version,
                            packageName,
                            execution: resp.execution,
                            router,
                        })
                    }
                    if (resp.family === 'library') {
                        return new LinkTryLibView({
                            version: resp.version,
                            packageName,
                            router,
                        })
                    }
                    return { tag: 'div' }
                },
            },
        ]
    }
}

export class LinkLaunchAppView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        version,
        packageName,
        execution,
        router,
    }: {
        version: string
        packageName: string
        execution: { standalone?: boolean; parametrized?: unknown[] }
        router: Router
    }) {
        this.children = [
            execution.standalone &&
                parseMd({
                    src: 'The package is a standalone application, you can launch it from <linkApp></linkApp>.',
                    router,
                    views: {
                        linkApp: () => {
                            return {
                                tag: 'a',
                                target: '_blank',
                                class: 'link-success',
                                href: `/apps/${packageName}/${version}`,
                                innerText: 'here',
                            }
                        },
                    },
                }),
            execution.parametrized.length > 0 &&
                parseMd({
                    src: `
The package is an application that can be launched from an asset.      
Refer to the file \`.yw_metadata.json\` for details. `,
                    router,
                }),
        ]
    }
}
const urlWebpm = '/webpm-client.js'

export const tryLibScript = (packageName: string, version: string) => `
<!DOCTYPE html>
<html lang="en">
    <head><script src="${urlWebpm}"></script></head>
    <body id="content"></body>    
    <script type="module">
        const {lib} = await webpm.install({
            esm:['${packageName}#${version} as lib'],
            displayLoadingScreen: true,
        })
        console.log(lib)
    </script>
</html>        
        `
export class LinkTryLibView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        version,
        packageName,
        router,
    }: {
        version: string
        packageName: string
        router: Router
    }) {
        const uri = encodeURIComponent(tryLibScript(packageName, version))
        const href = `/apps/@youwol/js-playground/latest?content=${uri}`
        this.children = [
            parseMd({
                src: `
The package is a library, you can try it from <linkLib></linkLib>.`,
                router,
                views: {
                    linkLib: () => ({
                        tag: 'a',
                        target: '_blank',
                        href,
                        innerText: 'here',
                    }),
                },
            }),
        ]
    }
}
