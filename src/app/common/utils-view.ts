import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AnyVirtualDOM,
    attr$,
    child$,
} from 'rx-vdom'
import { parseMd, Router } from 'mkdocs-ts'
import { BehaviorSubject, mergeMap, Observable, of } from 'rxjs'
import pkgJson from '../../../package.json'
import { AppState } from '../app-state'
import { map, take } from 'rxjs/operators'
import { AssetsGateway, Explorer, onHTTPErrors } from '@w3nest/http-clients'
import { getProjectNav$ } from './utils-nav'

/**
 * Prefix for class name of views' type.
 */
export const colabClassPrefix = 'colab'

export const styleShellStdOut = {
    tag: 'pre' as const,
    class: 'px-2',
    style: {
        backgroundColor: 'black',
        color: 'white',
        fontSize: 'smaller',
        minHeight: '25vh',
        maxHeight: '50vh',
    },
}

export const classesButton =
    'd-flex border p-2 rounded  fv-bg-secondary fv-hover-xx-lighter fv-pointer mx-2 align-items-center'

export class NavIconSvg implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style: CSSAttribute
    constructor({ filename }: { filename: string }) {
        const assetId = window.btoa(pkgJson.name)
        const basePath = `/api/assets-gateway/webpm/resources/${assetId}/${pkgJson.version}`
        this.style = {
            width: '20px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '20px',
            backgroundImage: `url(${basePath}/assets/${filename})`,
        }
    }
}

export class InfoSectionView implements VirtualDOM<'div'> {
    /**
     * @group Immutable Constants
     */
    public readonly tag = 'div'

    public readonly children: ChildrenLike

    constructor({ text, router }: { text: string; router: Router }) {
        const expanded$ = new BehaviorSubject(false)
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'i',
                        class: attr$({
                            source$: expanded$,
                            vdomMap: (expanded): string =>
                                expanded
                                    ? 'fv-hover-text-focus fv-text-success'
                                    : 'fv-text-focus',
                            wrapper: (d) =>
                                `${d} fas fa-info-circle fv-pointer`,
                        }),
                    },
                ],
                onclick: () => expanded$.next(!expanded$.value),
            },
            child$({
                source$: expanded$,
                vdomMap: (expanded) =>
                    expanded
                        ? {
                              tag: 'div',
                              class: 'p-2 border-left border-bottom',
                              children: [
                                  parseMd({
                                      src: text,
                                      router,
                                  }),
                              ],
                          }
                        : { tag: 'div' },
            }),
        ]
    }
}

/**
 * @category View
 */
export class CopyClipboardView implements VirtualDOM<'div'> {
    /**
     * @group Immutable Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class =
        'fas fa-clipboard p-1 rounded border fv-pointer fv-hover-text-focus mx-2'

    /**
     * @group Immutable Constants
     */
    public readonly text: string

    /**
     * @group Immutable DOM Constants
     */
    public readonly onclick = () =>
        navigator.clipboard.writeText(this.text).then(() => {
            /*NOOP*/
        })

    constructor(params: { text: string }) {
        Object.assign(this, params)
    }
}

/**
 * @category View
 */
export class AttributeTitleView implements VirtualDOM<'div'> {
    /**
     * @group Immutable Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'col col-sm-3'

    /**
     * @group Immutable DOM Constants
     */
    public readonly innerText: string

    /**
     * @group Immutable Constants
     */
    public readonly text: string

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        fontWeight: 'bolder' as const,
        whiteSpace: 'nowrap' as const,
    }

    constructor(params: { text: string }) {
        Object.assign(this, params)
        this.innerText = this.text
    }
}

/**
 * @category View
 */
export class AttributeValueView implements VirtualDOM<'div'> {
    /**
     * @group Immutable Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex align-items-center flex-grow-1'

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        minWidth: '0px',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable Constants
     */
    public readonly value: string

    constructor(params: { value: string; [k: string]: string }) {
        this.value = params.value

        this.children = [
            {
                tag: 'div',
                innerText: this.value,
                style: {
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                },
                ...params,
            },
            new CopyClipboardView({ text: this.value }),
        ]
    }
}

/**
 * @category View
 */
export class AttributeView implements VirtualDOM<'div'> {
    /**
     * @group Immutable Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex align-items-center'

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({ text, value }: { text: string; value: string }) {
        this.children = [
            new AttributeTitleView({ text }),
            new AttributeValueView({ value }),
        ]
    }
}

/**
 * @category View
 */
export class DashboardTitle implements VirtualDOM<'h5'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'h5'

    /**
     * @group Immutable DOM Constants
     */
    public readonly innerText: string

    /**
     * @group Immutable Constants
     */
    public readonly title: string

    constructor(params: { title: string }) {
        Object.assign(this, params)
        this.innerText = this.title
    }
}

export class HdPathBookView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'd-flex align-items-center'

    constructor({
        path,
        appState,
        type,
    }: {
        path: string | Observable<string>
        appState: AppState
        type: 'folder' | 'file'
    }) {
        const path$ = typeof path === 'string' ? of(path) : path
        this.children = [
            {
                tag: 'div',
                class: 'flex-grow-1',
                style: {
                    fontFamily: 'monospace',
                    fontSize: 'smaller',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    direction: 'rtl',
                    textAlign: 'left',
                },
                innerText: attr$({
                    source$: path$,
                    vdomMap: (path) => {
                        return path
                    },
                }),
            },
            child$({
                source$: path$,
                vdomMap: (path) => {
                    return new CopyClipboardView({
                        text: path,
                    })
                },
            }),
            child$({
                source$: path$,
                vdomMap: (path) => {
                    return {
                        tag: 'i',
                        class: 'fas fa-folder-open p-1 rounded border fv-pointer fv-hover-text-focus mx-2',
                        onclick: () => appState.mountHdPath(path, type),
                    }
                },
            }),
        ]
    }
}

export const spinnerView: AnyVirtualDOM = {
    tag: 'i',
    class: 'fas fa-spinner fa-spin',
}

export type LinkInput = {
    icon: string
    enabled: boolean
    nav: string
    hrefKind?: 'internal' | 'external'
}

export class ComponentCrossLinksView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'colab-ComponentCrossLinksView d-flex align-items-center rounded p-1'
    public readonly children: ChildrenLike
    public readonly appState: AppState
    public readonly component: string
    public readonly withLinks: Observable<LinkInput>[] = []

    constructor(params: {
        component: string
        appState: AppState
        withLinks?: Observable<LinkInput>[]
    }) {
        Object.assign(this, params)
        const { component, appState } = params
        const client = new AssetsGateway.Client().explorer
        const itemId = window.btoa(window.btoa(component))
        const sep: AnyVirtualDOM = {
            tag: 'i',
            class: 'mx-2',
        }
        const untilFirst: AnyVirtualDOM = {
            tag: 'div',
            class: 'fas fa-spinner fa-spin',
        }
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-link',
                        style: {
                            fontSize: '0.7rem',
                        },
                    },
                ],
            },
            sep,
            child$({
                source$: appState.cdnState.status$,
                vdomMap: (status) => {
                    const target = status.packages.find(
                        (p) => p.name === component,
                    )
                    if (!target) {
                        return this.linkView({
                            icon: 'fa-microchip',
                            nav: '',
                            enabled: false,
                        })
                    }
                    const latest = target.versions.slice(-1)[0]
                    const type = {
                        'js/wasm': 'js-wasm',
                        pyodide: 'pyodide',
                        backend: 'backends',
                    }[latest.type]
                    return this.linkView({
                        icon: 'fa-microchip',
                        nav: `components/${type}/${window.btoa(component)}`,
                        enabled: true,
                    })
                },
            }),
            sep,
            child$({
                source$: appState.cdnState.status$.pipe(
                    mergeMap(() =>
                        client.getItem$({
                            itemId,
                        }),
                    ),
                    onHTTPErrors(() => undefined),
                    map((resp?: Explorer.ItemBase) => {
                        if (resp === undefined) {
                            return undefined
                        }
                        return { groupId: resp.groupId, itemId: resp.itemId }
                    }),
                ),
                vdomMap: (resp) => {
                    const nav = resp ? `explorer/${resp.groupId}` : ''

                    return this.linkView({
                        icon: 'fa-folder',
                        nav,
                        urlParams: resp
                            ? { target: `item_${resp.itemId}` }
                            : {},
                        enabled: resp !== undefined,
                    })
                },
                untilFirst,
            }),
            sep,
            child$({
                source$: getProjectNav$({
                    projectName: component,
                    appState,
                }).pipe(take(1)),
                vdomMap: (nav: string | undefined) => {
                    return this.linkView({
                        icon: 'fa-boxes',
                        nav: nav || '',
                        enabled: nav !== undefined,
                    })
                },
            }),
            sep,
            child$({
                source$: appState.projectsState.projects$,
                vdomMap: (projects) => {
                    const project = projects.find(
                        (p) => p.name.split('~')[0] === component,
                    )
                    return this.linkView({
                        icon: 'fa-laptop',
                        nav: '',
                        enabled: project !== undefined,
                        onclick: (ev: MouseEvent) => {
                            ev.preventDefault()
                            if (project) {
                                appState.mountHdPath(project.path, 'folder')
                            }
                        },
                    })
                },
            }),
            ...this.withLinks
                .map((linkInput$) => {
                    return [
                        sep,
                        child$({
                            source$: linkInput$,
                            vdomMap: (linkInput): AnyVirtualDOM =>
                                this.linkView(linkInput),
                            untilFirst,
                        }),
                    ]
                })
                .flat(),
        ]
    }

    private linkView({
        icon,
        enabled,
        nav,
        onclick,
        hrefKind,
        urlParams,
    }: {
        icon: string
        enabled: boolean
        nav?: string
        onclick?: (ev: MouseEvent) => void
        hrefKind?: 'internal' | 'external'
        urlParams?: Record<string, string>
    }): AnyVirtualDOM {
        const href = hrefKind && hrefKind === 'external' ? nav : `@nav/${nav}`
        if (enabled) {
            return {
                tag: 'a',
                href: onclick ? undefined : href,
                class: `fas ${icon} `,
                onclick: (ev: MouseEvent) => {
                    ev.preventDefault()
                    if (onclick) {
                        onclick(ev)
                        return
                    }
                    if (hrefKind === 'external') {
                        window.open(href, '_blank')
                        return
                    }
                    this.appState.router.fireNavigateTo({
                        path: nav,
                        parameters: urlParams ?? {},
                    })
                },
            }
        }
        return {
            tag: 'i',
            class: `fas ${icon} text-muted`,
        }
    }
}
