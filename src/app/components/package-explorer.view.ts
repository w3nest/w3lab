import { BehaviorSubject, Observable } from 'rxjs'
import { AssetsGateway, Webpm,
    raiseHTTPErrors } from '@w3nest/http-clients'

import { mergeMap, share } from 'rxjs/operators'

import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { getUrlBase } from '@w3nest/webpm-client'
import { AssetLightDescription } from '@youwol/os-core'

export class ExplorerState {
    public readonly asset: AssetLightDescription
    public readonly version: string
    public readonly items$: Observable<Webpm.QueryExplorerResponse>
    public readonly selectedFolder$ = new BehaviorSubject<string>('')

    public readonly client = new AssetsGateway.Client().webpm

    constructor(params: { asset: AssetLightDescription; version: string }) {
        Object.assign(this, params)

        this.items$ = this.selectedFolder$.pipe(
            mergeMap((folder) => {
                return this.client.queryExplorer$({
                    libraryId: this.asset.rawId,
                    version: this.version,
                    restOfPath: folder,
                })
            }),
            raiseHTTPErrors(),
            share(),
        )
    }

    openFolder(path: string) {
        this.selectedFolder$.next(path)
    }
}

export class FolderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    static ClassSelector = 'folder-view'
    public readonly class = `${FolderView.ClassSelector} d-flex align-items-center fv-pointer fv-hover-text-focus`
    public readonly children: ChildrenLike
    public readonly folder: Webpm.FolderResponse
    public readonly state: ExplorerState
    public readonly ondblclick: () => void

    constructor(params: {
        state: ExplorerState
        folder: Webpm.FolderResponse
    }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'div',
                class: 'w-25 d-flex align-items-center',
                children: [
                    { tag: 'div', class: 'fas fa-folder px-2' },
                    { tag: 'div', innerText: this.folder.name },
                ],
            },
            {
                tag: 'div',
                class: 'w-25 text-center',
                innerText: `${this.folder.size / 1000}`,
            },
            { tag: 'div', class: 'w-25 text-center', innerText: '-' },
        ]

        this.ondblclick = () => {
            this.state.openFolder(this.folder.path)
        }
    }
}

export class FileView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    static ClassSelector = 'file-view'
    public readonly class = `${FileView.ClassSelector} d-flex align-items-center fv-pointer fv-hover-text-focus`
    public readonly children: ChildrenLike
    public readonly file: Webpm.FileResponse
    public readonly state: ExplorerState

    constructor(params: {
        file: Webpm.FileResponse
        state: ExplorerState
    }) {
        Object.assign(this, params)
        const url = `${getUrlBase(
            this.state.asset.name,
            this.state.version,
        )}/${this.state.selectedFolder$.getValue()}/${this.file.name}`
        this.children = [
            {
                tag: 'div',
                class: 'w-25 d-flex align-items-center',
                children: [
                    { tag: 'div', class: 'fas fa-file px-2' },
                    { tag: 'div', innerText: this.file.name },
                ],
            },
            {
                tag: 'div',
                class: 'w-25 text-center',
                innerText: `${this.file.size / 1000}`,
            },
            {
                tag: 'div',
                class: 'w-25 text-center',
                innerText: this.file.encoding,
            },
            {
                tag: 'div',
                class: 'w-25 text-center fas fa-link',
                onclick: () => window.open(url, '_blank'),
            },
        ]
    }
}

export class ExplorerView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    static ClassSelector = 'explorer-view'
    public readonly class = `${ExplorerView.ClassSelector} border rounded p-3 h-100 overflow-auto`
    public readonly state: ExplorerState
    public readonly children: ChildrenLike

    constructor(params: { asset: AssetLightDescription; version: string }) {
        Object.assign(this, params)
        this.state = new ExplorerState(params)

        this.children = [
            {
                source$: this.state.selectedFolder$,
                vdomMap: (path: string) =>
                    new PathView({ state: this.state, folderPath: path }),
            },
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                style: {
                    fontWeight: 'bolder',
                },
                children: [
                    {
                        tag: 'div',
                        class: 'w-25 text-center',
                        innerText: 'Name',
                    },
                    {
                        tag: 'div',
                        class: 'w-25 text-center',
                        innerText: 'Size (kB)',
                    },
                    {
                        tag: 'div',
                        class: 'w-25 text-center',
                        innerText: 'Encoding',
                    },
                ],
            },
            {
                source$: this.state.items$,
                vdomMap: ({ files, folders }: Webpm.QueryExplorerResponse) => {
                    return {
                        tag: 'div',
                        class: 'd-flex flex-column',
                        children: [
                            ...folders.map(
                                (folder) =>
                                    new FolderView({
                                        state: this.state,
                                        folder,
                                    }),
                            ),
                            ...files.map(
                                (file) =>
                                    new FileView({ file, state: this.state }),
                            ),
                        ],
                    }
                },
            },
        ]
    }
}

export class PathElementView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    static ClassSelector = 'path-element-view'
    public readonly class = `${PathElementView.ClassSelector} d-flex align-items-center`
    public readonly state: ExplorerState
    public readonly name: string
    public readonly folderPath: string
    public readonly children: ChildrenLike
    public readonly onclick: () => void
    constructor(params: {
        folderPath: string
        name: string
        state: ExplorerState
    }) {
        Object.assign(this, params)

        this.children = [
            {
                tag: 'div',
                class: 'border rounded p-1 mx-1 fv-pointer fv-hover-text-focus',
                innerText: this.name,
            },
            { tag: 'div', innerText: '/' },
        ]

        this.onclick = () => {
            this.state.openFolder(this.folderPath)
        }
    }
}

export class PathView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    static ClassSelector = 'path-view'
    public readonly class = `${PathView.ClassSelector} d-flex align-items-center my-2`
    public readonly children: ChildrenLike
    public readonly folderPath: string
    public readonly state: ExplorerState
    constructor(params: { state: ExplorerState; folderPath: string }) {
        Object.assign(this, params)
        const parts = this.folderPath.split('/')
        const elems = [
            {
                path: '',
                name: `${this.state.asset.name}@${this.state.version}`,
            },
            ...this.folderPath
                .split('/')
                .map((name, i) => {
                    return {
                        path: parts.slice(0, i + 1).join('/'),
                        name,
                    }
                })
                .filter(({ name }) => name != ''),
        ]

        this.children = elems.map((part) => {
            return new PathElementView({
                state: this.state,
                name: part.name,
                folderPath: part.path,
            })
        })
    }
}
