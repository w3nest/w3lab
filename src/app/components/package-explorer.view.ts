import { BehaviorSubject, Observable } from 'rxjs'
import {
    AssetsGateway,
    Webpm,
    Assets,
    raiseHTTPErrors,
} from '@w3nest/http-clients'

import { mergeMap, share } from 'rxjs/operators'

import {
    child$,
    ChildrenLike,
    CSSAttribute,
    replace$,
    VirtualDOM,
} from 'rx-vdom'
import { getUrlBase } from '@w3nest/webpm-client'

export class ExplorerState {
    public readonly asset: Assets.GetAssetResponse
    public readonly version: string
    public readonly items$: Observable<Webpm.QueryExplorerResponse>
    public readonly selectedFolder$ = new BehaviorSubject<string>('')

    public readonly client = new AssetsGateway.Client().webpm

    constructor(params: { asset: Assets.GetAssetResponse; version: string }) {
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

const commonClass = 'mkdocs-hover-bg-1 p-1'

const withEllipsis: CSSAttribute = {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
}
export class FolderView implements VirtualDOM<'tr'> {
    public readonly tag = 'tr'
    static ClassSelector = 'folder-view'
    public readonly class = `${FolderView.ClassSelector} ${commonClass} w3lab-pointer `
    public readonly children: ChildrenLike
    public readonly folder: Webpm.FolderResponse
    public readonly state: ExplorerState
    public readonly onclick: () => void

    constructor(params: {
        state: ExplorerState
        folder: Webpm.FolderResponse
    }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'td',
                class: '',
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center',
                        children: [
                            { tag: 'div', class: 'fas fa-folder' },
                            { tag: 'div', class: 'mx-1' },
                            { tag: 'div', innerText: this.folder.name },
                        ],
                    },
                ],
            },
            {
                tag: 'td',
                class: 'text-center',
                innerText: `${this.folder.size / 1000}`,
                style: withEllipsis,
            },
            { tag: 'td', class: 'text-center', innerText: '-' },
        ]

        this.onclick = () => {
            this.state.openFolder(this.folder.path)
        }
    }
}

export class FileView implements VirtualDOM<'tr'> {
    public readonly tag = 'tr'
    static ClassSelector = 'file-view'
    public readonly class = `${FileView.ClassSelector} ${commonClass}`
    public readonly children: ChildrenLike
    public readonly file: Webpm.FileResponse
    public readonly state: ExplorerState

    constructor(params: { file: Webpm.FileResponse; state: ExplorerState }) {
        Object.assign(this, params)
        const url = `${getUrlBase(
            this.state.asset.name,
            this.state.version,
        )}/${this.state.selectedFolder$.getValue()}/${this.file.name}`
        this.children = [
            {
                tag: 'td',
                class: '',
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center',
                        children: [
                            { tag: 'div', class: 'fas fa-file' },
                            { tag: 'div', class: 'mx-1' },
                            {
                                tag: 'a',
                                innerText: this.file.name,
                                href: url,
                                style: withEllipsis,
                                customAttributes: {
                                    dataBsToggle: 'tooltip',
                                    dataBsPlacement: 'top',
                                    title: this.file.name,
                                },
                            },
                            { tag: 'div', class: 'flex-grow-1' },
                        ],
                    },
                ],
            },
            {
                tag: 'td',
                class: 'text-center',
                innerText: `${this.file.size / 1000}`,
            },
            {
                tag: 'td',
                class: 'text-center',
                innerText: this.file.encoding,
            },
        ]
    }
}

export class ExplorerView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    static ClassSelector = 'explorer-view'
    public readonly class = `${ExplorerView.ClassSelector} h-100 overflow-auto`
    public readonly state: ExplorerState
    public readonly children: ChildrenLike
    public readonly asset: Assets.GetAssetResponse

    constructor(params: { asset: Assets.GetAssetResponse; version: string }) {
        Object.assign(this, params)
        this.state = new ExplorerState(params)

        this.children = [
            child$({
                source$: this.state.selectedFolder$,
                vdomMap: (path) =>
                    new PathView({ state: this.state, folderPath: path }),
            }),
            {
                tag: 'table',
                style: { tableLayout: 'fixed', width: '100%' },
                children: [
                    {
                        tag: 'colgroup',
                        children: [
                            {
                                tag: 'col',
                                style: { width: '100%' },
                            },
                            {
                                tag: 'col',
                                style: { width: '7rem' },
                            },
                            {
                                tag: 'col',
                                style: { width: '7rem' },
                            },
                        ],
                    },
                    {
                        tag: 'thead',
                        children: [
                            {
                                tag: 'tr',
                                children: [
                                    {
                                        tag: 'th',
                                        innerText: 'Name',
                                        class: 'font-medium',
                                    },
                                    {
                                        tag: 'th',
                                        innerText: 'Size (kB)',
                                        class: 'font-medium',
                                    },
                                    {
                                        tag: 'th',
                                        innerText: 'Encoding',
                                        class: 'font-medium',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        tag: 'tbody',
                        children: replace$({
                            policy: 'replace',
                            source$: this.state.items$,
                            vdomMap: ({ files, folders }) => {
                                return [
                                    ...folders.map(
                                        (folder) =>
                                            new FolderView({
                                                state: this.state,
                                                folder,
                                            }),
                                    ),
                                    ...files.map(
                                        (file) =>
                                            new FileView({
                                                file,
                                                state: this.state,
                                            }),
                                    ),
                                ]
                            },
                        }),
                    },
                ],
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
        classIcon?: string
        state: ExplorerState
    }) {
        Object.assign(this, params)

        this.children = [
            {
                tag: 'div',
                class: `border rounded py-1 px-2 mx-1 w3lab-pointer mkdocs-hover-bg-1 ${params.classIcon ?? ''}`,
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
                name: '',
                class: 'fas fa-home',
            },
            ...this.folderPath
                .split('/')
                .map((name, i) => {
                    return {
                        path: parts.slice(0, i + 1).join('/'),
                        name,
                        class: '',
                    }
                })
                .filter(({ name }) => name !== ''),
        ]

        this.children = elems.map((part) => {
            return new PathElementView({
                state: this.state,
                name: part.name,
                folderPath: part.path,
                classIcon: part.class,
            })
        })
    }
}
