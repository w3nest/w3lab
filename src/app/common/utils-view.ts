import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AnyVirtualDOM,
    attr$,
    child$,
} from 'rx-vdom'
import { fromMarkdown, parseMd, Router } from 'mkdocs-ts'
import { BehaviorSubject, mergeMap, Observable, of, Subject, timer } from 'rxjs'
import { setup } from '../../auto-generated'
import { AppState } from '../app-state'
import { take } from 'rxjs/operators'
import {
    AssetsGateway,
    Explorer,
    onHTTPErrors,
    raiseHTTPErrors,
} from '@w3nest/http-clients'
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
        const basePath = `/api/assets-gateway/webpm/resources/${setup.assetId}/${setup.version}`
        this.style = {
            width: '20px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '20px',
            backgroundImage: `url(${basePath}/assets/${filename})`,
        }
    }
}

export class CoLabLogo implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href = 'index.html?nav=/'
    public readonly onclick: (ev: MouseEvent) => void
    public readonly style = {
        fontSize: '22px',
        fontWeight: 700,
    }
    public readonly class = 'ilab d-flex  align-items-baseline fv-pointer'
    public readonly children: ChildrenLike

    constructor({ router }: { router: Router }) {
        this.onclick = (ev) => {
            ev.preventDefault()
            router.navigateTo({ path: '/' })
        }
        this.children = [
            {
                tag: 'img',
                src: '../assets/logo.svg',
                style: {
                    height: '30px',
                },
            },
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                style: {
                    fontSize: '18px',
                    color: '#e63946',
                },
                children: [
                    {
                        tag: 'div',
                        style: {
                            fontStyle: 'italic',
                        },
                        innerText: 'C',
                    },
                    {
                        tag: 'div',
                        class: ' me-1 fas fa-globe',
                        style: {
                            fontSize: '12px',
                            fontStyle: 'italic',
                        },
                    },
                ],
            },
            {
                tag: 'span',
                class: 'light',
                style: {
                    fontWeight: 'lighter',
                    color: '#58a4b0',
                },
                innerText: 'Lab',
            },
        ]
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

export function fromMd(file: string) {
    return fromMarkdown({
        url: `../assets/${file}`,
    })
}

export class CoLabBanner implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'h-100 w-100 mb-5'
    public readonly children: ChildrenLike
    public readonly style = {
        position: 'relative' as const,
    }

    constructor({
        router,
        loaded$,
    }: {
        loaded$: Subject<boolean>
        router: Router
    }) {
        const timer$ = timer(0, 1000).pipe(take(2))
        const basePath = `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets`
        const style = { width: '100%', opacity: 0.1, filter: 'invert(1)' }
        this.children = [
            {
                tag: 'img',
                class: attr$({
                    source$: timer$,
                    vdomMap: (i) => (i === 0 ? '' : 'd-none'),
                }),
                style,
                src: `${basePath}/co-lab-light.png`,
                onload: () => loaded$.next(true),
            },
            {
                tag: 'img',
                class: attr$({
                    source$: timer(0, 1000).pipe(take(2)),
                    vdomMap: (i) => (i === 0 ? 'd-none' : ''),
                }),
                style,
                src: `${basePath}/co-lab-high.png`,
            },
            {
                tag: 'div',
                class: attr$({
                    source$: loaded$,
                    vdomMap: () => 'w-100',
                    untilFirst: 'd-none',
                }),
                style: {
                    position: 'absolute' as const,
                    top: '50%',
                },
                children: [
                    {
                        style: {
                            transform: 'scale(3)',
                        },
                        tag: 'div',
                        class: 'd-flex justify-content-center',
                        children: [new CoLabLogo({ router })],
                    },
                ],
            },
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
                    mergeMap((resp?: Explorer.ItemBase) => {
                        if (resp === undefined) {
                            return of(undefined)
                        }
                        return client
                            .getPath$({ itemId })
                            .pipe(raiseHTTPErrors())
                    }),
                ),
                vdomMap: (resp) => {
                    let nav = ''
                    if (resp) {
                        const folders = resp.folders.reduce(
                            (acc, e) => `${acc}/folder_${e.folderId}`,
                            `${resp.drive.groupId}/folder_${resp.drive.driveId}`,
                        )
                        nav = `/explorer/${folders}/item_${resp.item.itemId}`
                    }
                    return this.linkView({
                        icon: 'fa-folder',
                        nav,
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
    }: {
        icon: string
        enabled: boolean
        nav?: string
        onclick?: (ev) => void
        hrefKind?: 'internal' | 'external'
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
                    this.appState.router.navigateTo({
                        path: nav,
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
