import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AnyVirtualDOM,
    attr$,
    child$,
    replace$,
} from 'rx-vdom'
import { parseMd, Router } from 'mkdocs-ts'
import { BehaviorSubject, combineLatest, mergeMap, Observable, of } from 'rxjs'
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
    'd-flex border p-2 rounded  fv-bg-secondary fv-hover-xx-lighter w3lab-pointer mx-2 align-items-center'

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
                                `${d} fas fa-info-circle w3lab-pointer`,
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

export class CopyClipboardView implements VirtualDOM<'button'> {
    public readonly tag = 'button'

    public readonly class = 'btn btn-sm btn-light'

    public readonly children: ChildrenLike

    public readonly text: string

    public readonly onclick = () =>
        navigator.clipboard.writeText(this.text).then(() => {
            /*NOOP*/
        })

    constructor(params: { text: string }) {
        Object.assign(this, params)
        this.children = [{ tag: 'i', class: 'fas fa-clipboard' }]
    }
}

export class OpenFileFolderView implements VirtualDOM<'button'> {
    public readonly tag = 'button'

    public readonly class = 'btn btn-sm btn-light'

    public readonly children: ChildrenLike

    public readonly appState: AppState
    public readonly path: string
    public readonly type: 'folder' | 'file'

    public readonly onclick = () =>
        this.appState.mountHdPath(this.path, this.type)

    constructor(params: {
        appState: AppState
        path: string
        type: 'folder' | 'file'
    }) {
        Object.assign(this, params)
        this.children = [{ tag: 'i', class: 'fas fa-folder-open' }]
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

export class HdPathBookView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'd-flex align-items-center w-100'
    public readonly style = {
        minWidth: '0px',
    }

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
        const sep = {
            tag: 'i' as const,
            class: 'mx-1',
        }
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center flex-grow-1 mkdocs-bg-5 mkdocs-text-5 rounded me-3 px-2 py-1',
                style: { minWidth: '0px' },
                children: [
                    {
                        tag: 'i',
                        class:
                            type === 'file'
                                ? 'fas fa-file mkdocs-text-info'
                                : 'fas fa-folder mkdocs-text-hint',
                    },
                    sep,
                    {
                        tag: 'div',
                        style: {
                            fontFamily: 'monospace',
                            fontSize: 'smaller',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            direction: 'rtl',
                            textAlign: 'left',
                        },
                        innerText: attr$({
                            source$: path$,
                            vdomMap: (path) => {
                                if (type === 'file') {
                                    path = path.replace(/[\\/]+$/, '')
                                }
                                return path
                            },
                        }),
                    },
                ],
            },
            child$({
                source$: path$,
                vdomMap: (path) => {
                    return new CopyClipboardView({
                        text: path,
                    })
                },
            }),
            sep,
            child$({
                source$: path$,
                vdomMap: (path) => {
                    return new OpenFileFolderView({ appState, path, type })
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
        exclude?: 'webpm' | 'project'
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
            ...(params.exclude !== 'webpm'
                ? [
                      sep,
                      child$({
                          source$: appState.cdnState.status$,
                          vdomMap: (status) => {
                              const target = status.packages.find(
                                  (p) => p.name === component,
                              )
                              if (!target) {
                                  return this.linkView({
                                      icon: 'fa-boxes',
                                      nav: '',
                                      enabled: false,
                                  })
                              }
                              return this.linkView({
                                  icon: 'fa-boxes',
                                  nav: appState.cdnState.getNav(target),
                                  enabled: true,
                              })
                          },
                      }),
                  ]
                : []),
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
            ...(params.exclude !== 'project'
                ? [
                      sep,
                      child$({
                          source$: getProjectNav$({
                              projectName: component,
                              appState,
                          }).pipe(take(1)),
                          vdomMap: (nav: string | undefined) => {
                              return this.linkView({
                                  icon: 'fa-tools',
                                  nav: nav || '',
                                  enabled: nav !== undefined,
                              })
                          },
                          untilFirst: this.linkView({
                              icon: 'fa-tools',
                              nav: '',
                              enabled: false,
                          }),
                      }),
                  ]
                : []),
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
        const hrefBase =
            hrefKind && hrefKind === 'external' ? nav : `@nav/${nav}`
        const href = urlParams
            ? Object.entries(urlParams).reduce((acc, [k, v]) => {
                  return acc + `&${k}=${v}`
              }, hrefBase)
            : hrefBase
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
        //item_UUhjemJtVnpkQzluWVd4c1pYSjU%3D
        return {
            tag: 'i',
            class: `fas ${icon} text-muted`,
        }
    }
}

export class PageTitleView implements VirtualDOM<'h1'> {
    public readonly tag = 'h1'
    public readonly class = 'd-flex border-bottom align-items-center pb-1 mb-3'
    public readonly children: ChildrenLike

    constructor(params: {
        title: string
        icon: string
        actions?: AnyVirtualDOM[]
        helpNav?: string
    }) {
        const hSep = { tag: 'div' as const, class: 'mx-1' }
        this.children = [
            { tag: 'i', class: `${params.icon}` },
            hSep,
            hSep,
            { tag: 'div', innerText: params.title },
            hSep,
            params.actions
                ? {
                      tag: 'div',
                      class: 'd-flex align-items-center',
                      children: params.actions,
                  }
                : undefined,
            { tag: 'div' as const, class: 'flex-grow-1' },
            params.helpNav ? docAction(params.helpNav) : undefined,
        ]
    }
}

export const docAction = (nav: string): AnyVirtualDOM => {
    const icon = {
        tag: 'i' as const,
        class: 'fas fa-book',
    }
    return {
        tag: 'a',
        href: nav,
        children: [
            {
                tag: 'button',
                class: 'btn btn-sm btn-light',
                children: [icon],
                onclick: () => {},
            },
        ],
    }
}

export class QuickSearchSection<T extends { name: string }>
    implements VirtualDOM<'div'>
{
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly searchTerm$ = new BehaviorSubject('')

    constructor({
        input$,
        vdomMap,
    }: {
        input$: Observable<T[]>
        vdomMap: (t: T) => AnyVirtualDOM
    }) {
        const search: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center',
            children: [
                {
                    tag: 'input',
                    type: 'text',
                    class: 'form-control px-3',
                    placeholder: 'Search...',
                    oninput: (ev: MouseEvent) => {
                        const target = ev.target as HTMLInputElement
                        this.searchTerm$.next(target.value)
                    },
                    style: {
                        borderRadius: '3rem',
                        border: 'none',
                        boxShadow: '0 0 1rem rgba(0, 0, 0, 0.1)',
                    },
                },
            ],
        }
        const title: AnyVirtualDOM = {
            tag: 'h2',
            class: 'd-flex align-items-center',
            children: [
                { tag: 'i', class: 'fas fa-search' },
                { tag: 'div', innerText: 'Quick Search' },
                { tag: 'i', class: 'mx-2' },
                {
                    tag: 'div',
                    class: 'flex-grow-1',
                    children: [search],
                },
            ],
        }

        const selected$ = combineLatest([input$, this.searchTerm$]).pipe(
            map(([inputs, term]) => {
                return inputs.filter((input) => {
                    return term === '' ? true : input.name.includes(term)
                })
            }),
        )
        const result: AnyVirtualDOM = {
            tag: 'div',
            children: replace$({
                policy: 'replace',
                source$: selected$,
                vdomMap: (inputs) => {
                    return inputs
                        .sort((p0, p1) => p0.name.localeCompare(p1.name))
                        .map((p) => vdomMap(p))
                },
            }),
        }
        this.children = [title, result]
    }
}
