import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { AppState, MountedPath } from '../app-state'
import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { FileContentView } from './file-content-view'
import { map, take } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ExplorerView } from './explorer.view'
import { defaultLayout } from '../common/utils-nav'

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
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
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

    constructor({ router }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Mounted


This page allows to explore folders referenced by your laboratory.

These folders are added when clicking on the <i class="fas fa-folder-open"></i> associated to folder path on 
your hard drive.

`,
                router,
            }),
        ]
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
