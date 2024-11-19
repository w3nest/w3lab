import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { AppState, MountedPath } from '../app-state'
import {
    CatchAllNav,
    Navigation,
    parseMd,
    Router,
    Views,
} from '@youwol/mkdocs-ts'
import { FileContentView } from './file-content-view'
import { map, take } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ExplorerView } from './explorer.view'

export function encodeHdPath(str) {
    return window.btoa(encodeURIComponent(str))
}

export function decodeHdPath(encodedStr) {
    return decodeURIComponent(window.atob(encodedStr))
}

export const navigation = (appState: AppState): Navigation => ({
    name: 'Mounted',
    decoration: { icon: { tag: 'i', class: 'fas fa-laptop me-2' } },
    tableOfContent: Views.tocView,
    html: ({ router }) => new PageView({ router, appState }),
    '...': appState.mountedHdPaths$.pipe(
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

export function decodeHRef(path) {
    return path
        .split('/')
        .map((p) => decodeHdPath(p))
        .join('/')
}
export function encodeHRef(path) {
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
): CatchAllNav {
    const parts = path.split('/').filter((d) => d != '')

    if (parts.length === 0) {
        return {
            children: mountedPaths.map((mountedPath) => {
                const encodedPath = encodeHdPath(mountedPath.path)
                const id =
                    mountedPath.type === 'folder'
                        ? encodedPath
                        : `file_${encodedPath}`
                return {
                    id,
                    leaf: true,
                    name: mountedPath.path.split('/').slice(-1)[0],
                    decoration: {
                        icon: {
                            tag: 'div' as const,
                            class:
                                mountedPath.type === 'folder'
                                    ? 'fas fa-folder mx-2'
                                    : 'fas fa-file mx-2',
                        },
                    },
                }
            }),
            html: undefined,
        }
    }
    if (parts.slice(-1)[0].startsWith('file_')) {
        parts[parts.length - 1] = parts[parts.length - 1].replace('file_', '')
        const path = decodeHRef(`${parts[0]}/${parts.slice(1).join('/')}`)
        return {
            tableOfContent: Views.tocView,
            children: [],
            html: () =>
                new FileContentView({
                    // remove trailing '/'
                    full: path.replace(/\/$/, ''),
                    origin: parts[0], //path.replace(/\/$/, ''),
                    path: decodeHRef(`${parts.slice(1).join('/')}`),
                    router,
                }),
        }
    }
    const origin = parts[0]
    const from = parts.slice(1).join('/')

    const fromDecoded = from != '' ? decodeHRef(from) : ''

    return new Local.Client().api.system
        .queryFolderContent$({
            path: `${decodeHdPath(origin)}/${fromDecoded}`,
        })
        .pipe(
            raiseHTTPErrors(),
            take(1),
            map((response) => {
                return {
                    tableOfContent: Views.tocView,
                    children: [],
                    html: () => {
                        return new ExplorerView({
                            response,
                            path: fromDecoded,
                            router,
                            origin,
                        })
                    },
                }
            }),
        )
}
