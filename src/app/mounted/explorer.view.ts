import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Router } from 'mkdocs-ts'
import { Local } from '@w3nest/http-clients'
import { classFolderFileBase } from '../explorer/item.view'
import { decodeHdPath, encodeHdPath, encodeHRef } from './index'
import {
    classPathAnchors,
    folderAnchorView,
    separator,
} from '../explorer/path.views'
import {
    headerViewWrapper,
    OpenFolderInHostView,
} from '../explorer/explorer.views'

export class HeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly innerText: string
    public readonly children: ChildrenLike
    public readonly class = classPathAnchors
    constructor({
        origin,
        path,
        router,
        type,
    }: {
        origin: string
        path: string
        type: 'file' | 'folder'
        router: Router
    }) {
        let file = undefined
        let folderPath = path
        if (type === 'file' && path !== '') {
            folderPath = path.split('/').slice(0, -1).join('/')
            const name = path.split('/').slice(-1)[0]
            file = {
                name,
                nav: `@nav/mounted/${origin}/${encodeHRef(folderPath)}/file_${encodeHdPath(name)}`,
                path,
            }
        }
        const getRec = (
            path: string,
            parents: { name: string; nav: string; path: string }[] = [],
        ) => {
            const nav = `@nav/mounted/${origin}/${encodeHRef(path)}`
            const name = path.split('/').slice(-1)[0]
            if (name !== '') {
                parents.push({ name, nav, path })
            }
            if (path.split('/').length > 1) {
                return getRec(path.split('/').slice(0, -1).join('/'), parents)
            }
            return parents
        }

        const originEntity =
            type === 'file' && path === ''
                ? {
                      name: decodeHdPath(origin).split('/').slice(-1)[0],
                      nav: `@nav/mounted/file_${origin}`,
                      path: path,
                  }
                : {
                      name: decodeHdPath(origin).split('/').slice(-1)[0],
                      nav: `@nav/mounted/${origin}`,
                      path: decodeHdPath(origin),
                  }
        const parents = getRec(folderPath)

        const openView = new OpenFolderInHostView({
            folder: decodeURIComponent(`${window.atob(origin)}/${path}`),
        })
        const pathItems = [originEntity, ...parents.reverse(), file]
            .filter((e) => e != undefined)
            .map((entity) => {
                return [
                    folderAnchorView({
                        name: entity.name,
                        nav: entity.nav,
                        router,
                    }),
                    separator,
                ] as AnyVirtualDOM[]
            })
            .flat()
            .slice(0, -1)
        this.children = [
            ...pathItems,
            { tag: 'div', class: 'flex-grow-1' },
            file === undefined && openView,
        ]
    }
}

export class FolderView implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href: string
    public readonly class = classFolderFileBase
    public readonly children: ChildrenLike
    constructor(params: { name: string; parent: string; origin: string }) {
        const pathFromOrigin = encodeHdPath(`${params.parent}/${params.name}`)
        this.href = `@nav/mounted/${params.origin}/${pathFromOrigin}`
        this.children = [
            {
                tag: 'i',
                class: 'fas fa-folder',
            },
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: params.name,
            },
        ]
    }
}

export class FileView implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href: string
    public readonly class = classFolderFileBase
    public readonly children: ChildrenLike
    constructor(params: { parent: string; name: string; origin: string }) {
        this.href = `@nav/mounted/${params.origin}/${encodeHdPath(params.parent)}/file_${encodeHdPath(params.name)}`
        this.children = [
            {
                tag: 'i',
                class: 'fas fa-file',
            },
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: params.name,
            },
        ]
    }
}

export class ExplorerView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = ''
    public readonly children: ChildrenLike
    public readonly style = {
        position: 'relative' as const,
    }
    constructor({
        response,
        path,
        origin,
        router,
    }: {
        response: Local.System.QueryFolderContentResponse
        path: string
        origin: string
        router: Router
    }) {
        const sortFct = (a, b) => a.localeCompare(b)
        this.children = [
            headerViewWrapper(
                new HeaderView({
                    path,
                    origin,
                    router,
                    type: 'folder',
                }),
            ),
            ...response.folders
                .sort(sortFct)
                .map((name) => new FolderView({ name, parent: path, origin })),
            ...response.files
                .sort(sortFct)
                .map((name) => new FileView({ name, parent: path, origin })),
        ]
    }
}
