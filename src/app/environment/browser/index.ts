import { AppState } from '../../app-state'

import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { AnyVirtualDOM, attr$, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { map } from 'rxjs/operators'
import { Local } from '@w3nest/http-clients'
import { HdPathBookView } from '../../common'
import { BehaviorSubject, Subject } from 'rxjs'
import { defaultLayout } from '../../common/utils-nav'
export * from './state'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Browser',
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    header: { icon: { tag: 'i', class: 'fas fa-window-maximize' } },
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState, router }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Browser

## Emulated Cache

<info>
YouWol introduces its own emulation of a browser cache to mitigate the undesirable effects caused by the native 
cache system of browsers, particularly concerning side-effects when requesting resources.

This section compiles the elements stored in the cache, which you can clear as needed. Apart from a slight performance
 impact, there is no risk of causing harm.

</info>

<fileView></fileView>

### Entries <menuView></menuView>

<itemsView></itemsView>
                `,
                router,
                views: {
                    fileView: () => {
                        return new BrowserCacheFileView({ appState })
                    },
                    menuView: () => {
                        return new MenuView({ appState })
                    },
                    itemsView: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$:
                                        appState.environmentState.browserState
                                            .status$,
                                    vdomMap: (status) => {
                                        return new BrowserCacheItemsView({
                                            status,
                                            appState,
                                        })
                                    },
                                }),
                            ],
                        }
                    },
                },
            }),
        ]
    }
}

export class BrowserCacheFileView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState }: { appState: AppState }) {
        this.children = [
            child$({
                source$: appState.environmentState.browserState.status$,
                vdomMap: (status) => {
                    if (status.file && status.file !== 'None') {
                        return {
                            tag: 'div',
                            children: [
                                {
                                    tag: 'div',
                                    innerText:
                                        'The emulated browser cache is persisted on file:',
                                },
                                new HdPathBookView({
                                    appState,
                                    path: appState.environmentState.browserState.status$.pipe(
                                        map((resp) => {
                                            return resp.file
                                        }),
                                    ),
                                    type: 'file',
                                }),
                            ],
                        }
                    }
                    return {
                        tag: 'div',
                        innerText: 'The cache is persisted in memory',
                    }
                },
            }),
        ]
    }
}

export class BrowserCacheItemsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        status,
        appState,
    }: {
        status: Local.Environment.BrowserCacheStatusResponse
        appState: AppState
    }) {
        const mode$ = new BehaviorSubject<'flat' | 'hierarchical'>('flat')

        const icons = {
            flat: 'fas fa-list',
            hierarchical: 'fas fa-sitemap',
        }
        const btn = (target: 'flat' | 'hierarchical'): AnyVirtualDOM => ({
            tag: 'button',
            class: attr$({
                source$: mode$,
                vdomMap: (mode: 'flat' | 'hierarchical'): string => {
                    return mode === target ? 'active' : ''
                },
                wrapper: (d) => `btn btn-sm btn-primary ${d}`,
            }),
            children: [
                {
                    tag: 'i',
                    class: icons[target],
                },
            ],
            onclick: () => mode$.next(target),
        })
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center justify-content-around',
                children: [
                    {
                        tag: 'div' as const,
                        innerText: `The cache includes ${status.items.length} entries.`,
                    },
                    new MenuView({ appState }),
                ],
            },
            {
                tag: 'div',
                class: 'my-2',
            },
            {
                tag: 'div',
                class: 'btn-group btn-group-toggle',
                children: [
                    btn('flat'),
                    { tag: 'div', class: 'mx-2' },
                    btn('hierarchical'),
                ],
            },
            {
                tag: 'div',
                class: 'my-2',
            },
            child$({
                source$: mode$,
                vdomMap: (mode) => {
                    return mode === 'flat'
                        ? new FlatBrowserCacheItemsView({ status, appState })
                        : new HierarchicalBrowserCacheItemsView({
                              status,
                              appState,
                          })
                },
            }),
        ]
    }
}

class FlatBrowserCacheItemsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        status,
        appState,
    }: {
        status: Local.Environment.BrowserCacheStatusResponse
        appState: AppState
    }) {
        const formatted = formatPaths(
            status.items.map((item) =>
                item.key.replace(`${status.sessionKey}@`, ''),
            ),
        )
        this.children = formatted
            .reverse()
            .map((path: string, index: number) => {
                return new FlatItemView({ appState, status, index, path })
            })
    }
}

class FlatItemView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        status,
        appState,
        index,
        path,
    }: {
        status: Local.Environment.BrowserCacheStatusResponse
        appState: AppState
        index: number
        path: string
    }) {
        const expanded$ = new BehaviorSubject(false)
        this.children = [
            {
                tag: 'div',
                class: 'd-flex w-100 align-items-center',
                children: [
                    {
                        tag: 'i',
                        class: attr$({
                            source$: expanded$,
                            vdomMap: (expanded: boolean): string => {
                                return expanded
                                    ? 'fa-chevron-down'
                                    : 'fa-chevron-right'
                            },
                            wrapper: (d) =>
                                `fas ${d} w3lab-pointer fv-hover-text-focus`,
                        }),
                        onclick: () => expanded$.next(!expanded$.value),
                    },
                    { tag: 'div', class: 'mx-2' },
                    {
                        tag: 'pre' as const,
                        class: 'flex-grow-1 overflow-auto',
                        innerText: path,
                    },
                ],
            },
            child$({
                source$: expanded$,
                vdomMap: (expanded) => {
                    return expanded
                        ? new ItemView({
                              item: status.items[index],
                              appState,
                          })
                        : { tag: 'div' }
                },
            }),
        ]
    }
}

class HierarchicalBrowserCacheItemsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        status,
        appState,
    }: {
        status: Local.Environment.BrowserCacheStatusResponse
        appState: AppState
    }) {
        const formatted = formatPaths(
            status.items.map((item) =>
                item.key.replace(`${status.sessionKey}@`, ''),
            ),
        )
        const data = group(transformPaths(formatted))
        const selected$ = new Subject<string>()
        this.children = [
            new DropDownPathsView({
                title: '/',
                data,
                fullPath: '',
                selected$,
            }),
            child$({
                source$: selected$.pipe(
                    map((s?: string) => {
                        if (!s) {
                            return undefined
                        }
                        const index = formatted.indexOf(s)
                        return status.items[index]
                    }),
                ),
                vdomMap: (item) => {
                    if (!item) {
                        return { tag: 'div' }
                    }
                    return new ItemView({ item, appState })
                },
            }),
        ]
    }
}

class DropDownPathsView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex flex-wrap'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        title,
        data,
        fullPath,
        selected$,
    }: {
        title: string
        fullPath: string
        data: object
        selected$: Subject<string>
    }) {
        type T = {
            title: string
            fullPath: string
            data: object
        }
        const next$ = new Subject<T>()
        this.children = [
            {
                tag: 'div',
                class: 'dropdown',
                children: [
                    this.headerButton(title),
                    {
                        tag: 'div',
                        class: 'dropdown-menu p-0',
                        children: Object.entries(data).map(
                            ([key, value]: [string, T]) => {
                                return {
                                    tag: 'button' as const,
                                    class: 'btn btn-sm btn-light w-100 border',
                                    innerText: key,
                                    style: {
                                        display: 'block',
                                    },
                                    onclick: () => {
                                        if (Object.keys(value).length === 0) {
                                            selected$.next(`${fullPath}/${key}`)
                                        } else {
                                            selected$.next(undefined)
                                        }

                                        next$.next({
                                            title: key,
                                            data: value,
                                            fullPath: `${fullPath}/${key}`,
                                        })
                                    },
                                }
                            },
                        ),
                    },
                ],
            },
            child$({
                source$: next$,
                vdomMap: (p) => new DropDownPathsView({ ...p, selected$ }),
            }),
        ]
    }

    private headerButton(title: string): AnyVirtualDOM {
        return {
            tag: 'button',
            class: 'btn btn-sm dropdown-toggle d-flex align-items-center bg-light',
            customAttributes: {
                dataBsToggle: 'dropdown',
            },
            children: [{ tag: 'div', innerText: title }],
        }
    }
}
class ItemView implements VirtualDOM<'i'> {
    public readonly tag = 'i'
    public readonly children: ChildrenLike
    public readonly class = 'overflow-auto'
    constructor({
        item,
        appState,
    }: {
        item: Local.Environment.BrowserCacheItem
        appState: AppState
    }) {
        this.children = [
            parseMd({
                src: `
Link to file:

<file></file>

Expiration date:

<expirationDate></expirationDate>

Headers:

<headers></headers>
                `,
                router: undefined,
                views: {
                    file: () =>
                        new HdPathBookView({
                            appState,
                            path: item.file,
                            type: 'file',
                        }),
                    expirationDate: () => ({
                        tag: 'div' as const,
                        innerText: new Date(
                            item.expirationTime * 1000,
                        ).toLocaleString(),
                    }),
                    headers: () => {
                        return {
                            tag: 'ul',
                            class: 'w-100 overflow-auto',
                            children: Object.entries(item.headers).map(
                                ([k, v]) => {
                                    return {
                                        tag: 'li',
                                        innerText: `${k} : ${v}`,
                                    }
                                },
                            ),
                        }
                    },
                },
            }),
        ]
    }
}

class MenuView implements VirtualDOM<'i'> {
    public readonly tag = 'i'
    public readonly children: ChildrenLike
    public readonly style = {
        display: 'inline-block',
    }
    constructor({ appState }: { appState: AppState }) {
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'button',
                        class: 'btn btn-sm btn-primary',
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-sync',
                            },
                        ],
                        onclick: () =>
                            appState.environmentState.browserState.sync(),
                    },
                    {
                        tag: 'div',
                        class: 'mx-1',
                    },
                    {
                        tag: 'button',
                        class: 'btn btn-sm btn-warning',
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-trash-alt',
                            },
                        ],
                        onclick: () =>
                            appState.environmentState.browserState.clear(),
                    },
                ],
            },
        ]
    }
}

function group(obj: object) {
    let r = {}
    if (!obj) {
        return obj
    }
    let modified = false
    Object.entries(obj).forEach(([k, v]: [string, Record<string, string>]) => {
        if (Object.keys(v).length === 1) {
            const k2 = Object.keys(v)[0]
            r[`${k}/${k2}`] = v[k2]
            modified = true
        } else {
            r[k] = v
        }
    })
    if (modified) {
        r = group(r)
    } else {
        Object.entries(r).forEach(([k, v]: [string, string[]]) => {
            r[k] = group(v)
        })
    }
    return r
}

function formatPaths(paths: string[]) {
    const regexFormaters = [
        /webpm\/resources\/([^/]+)\/(.+)/,
        /raw\/package\/([^/]+)\/(.+)/,
    ]
    return paths.map((path) => {
        regexFormaters.forEach((regex) => {
            const match = regex.exec(path)

            if (match && match.length > 1) {
                const id = match[1]
                const decodedId = atob(id) // Decoding base64
                path = path.replace(id, decodedId)
            }
        })
        return path
    })
}
function transformPaths(paths: string[]) {
    const result = {}

    paths.forEach((path) => {
        const components = path.split('/')
        addPath(result, components, 1)
    })

    return result
}

function addPath(obj: unknown, components: string[], index: number) {
    if (index >= components.length) {
        return
    }

    const component = components[index]
    if (!obj[component]) {
        if (index === components.length - 1) {
            obj[component] = true
        } else {
            obj[component] = {}
        }
    }

    addPath(obj[component], components, index + 1)
}
