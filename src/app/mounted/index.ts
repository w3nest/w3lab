import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { AppState, MountedPath } from '../app-state'
import { DefaultLayout, MdWidgets, Navigation, Router } from 'mkdocs-ts'
import { FileContentView } from './file-content-view'
import { map, take } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ExplorerView } from './explorer.view'
import { defaultLayout } from '../common/utils-nav'
import { HdPathBookView, PageTitleView } from '../common'

export function encodeHdPath(str: string) {
    return window.btoa(encodeURIComponent(str))
}

export function decodeHdPath(encodedStr: string) {
    return decodeURIComponent(window.atob(encodedStr))
}

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Mounted',
    header: { icon: { tag: 'i', class: 'fas fa-laptop' } },
    layout: defaultLayout(() => new PageView({ appState })),
    routes: appState.mountedHdPaths$.pipe(
        map(
            (folders: MountedPath[]) =>
                ({ path, router }: { path: string; router: Router }) => {
                    return lazyResolver(folders, path, router)
                },
        ),
    ),
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ appState }: { appState: AppState }) {
        this.children = [
            new PageTitleView({
                title: 'Mounted',
                icon: 'fas fa-laptop',
                helpNav: '@nav/doc.5-',
            }),
            {
                tag: 'div',
                children: [
                    child$({
                        source$: appState.mountedHdPaths$,
                        vdomMap: (paths) => {
                            return new MdWidgets.NoteView({
                                level: 'info',
                                content: new MountedItemsView({
                                    appState,
                                    paths,
                                }),
                                icon: 'fas fa-link',
                                label: 'Mounted from local disk',
                            })
                        },
                    }),
                ],
            },
        ]
    }
}

class MountedItemsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        paths,
    }: {
        appState: AppState
        paths: MountedPath[]
    }) {
        this.children = paths.map(({ type, path }) => {
            return {
                tag: 'div',
                class: 'd-flex align-items-center px-2',
                children: [
                    {
                        tag: 'div',
                        class: 'flex-grow-1',
                        style: {
                            minWidth: '0px',
                        },
                        children: [
                            new HdPathBookView({
                                path,
                                appState,
                                type,
                            }),
                        ],
                    },
                    {
                        tag: 'button',
                        class: 'btn btn-danger btn-sm fas fa-times',
                        onclick: () => {
                            appState.unmountHdPath(path)
                        },
                    },
                ],
            }
        })
    }
}
export function decodeHRef(path: string) {
    return path
        .split('/')
        .map((p) => decodeHdPath(p))
        .join('/')
}
export function encodeHRef(path: string) {
    return path
        .split('/')
        .map((p) => encodeHdPath(p))
        .join('/')
}

//
function lazyResolver(
    mountedPaths: MountedPath[],
    path: string,
    router: Router,
) {
    const parts = path.split('/').filter((d) => d !== '')

    if (parts.length === 0) {
        const children = mountedPaths.map((mountedPath) => {
            const encodedOrigin = encodeHdPath(mountedPath.path)
            const id =
                mountedPath.type === 'folder'
                    ? encodedOrigin
                    : `file_${encodedOrigin}`
            return {
                id,
                leaf: true,
                name: mountedPath.path.split('/').slice(-1)[0],
                header: {
                    icon: {
                        tag: 'div' as const,
                        class:
                            mountedPath.type === 'folder'
                                ? 'fas fa-folder mx-2'
                                : 'fas fa-file mx-2',
                    },
                },
                layout: {
                    content: () => {
                        const encodedPath =
                            router.parseUrl().parameters['target']
                        if (
                            mountedPath.type === 'file' ||
                            (encodedPath && encodedPath.startsWith('file_'))
                        ) {
                            const path = encodedPath
                                ? decodeHdPath(encodedPath.replace('file_', ''))
                                : ''
                            return new FileContentView({
                                full: `${mountedPath.path}${path}`,
                                origin: encodedOrigin,
                                path,
                                router,
                            })
                        }
                        const path = encodedPath
                            ? decodeHdPath(encodedPath)
                            : ''
                        const fullPath = `${mountedPath.path}${path}`

                        return new Local.Client().api.system
                            .queryFolderContent$({
                                path: fullPath,
                            })
                            .pipe(
                                raiseHTTPErrors(),
                                take(1),
                                map((response) => {
                                    return new ExplorerView({
                                        response,
                                        path: path ?? '/',
                                        router,
                                        origin: encodedOrigin,
                                    })
                                }),
                            )
                    },
                },
            }
        })
        return children.reduce((acc, c) => ({ ...acc, [`/${c.id}`]: c }), {})
    }
}
