import {
    attr$,
    AttributeLike,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
} from 'rx-vdom'
import { Explorer } from '@w3nest/http-clients'
import { Observable, of } from 'rxjs'
import { ExplorerState, ItemCut } from './explorer.state'
import { ContextMenuHandler } from './nav-context-menu.view'
import { FolderNode, TrashNode } from './nodes'
import { ApplicationInfo } from '../common/patches'

export const classFolderFileBase =
    'colab-ExplorerItem mkdocs-text-0 text-decoration-none d-flex align-items-center my-1 px-1 rounded mkdocs-hover-bg-4 mkdocs-hover-text-5 fv-pointer'

export class ItemView implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href: string
    public readonly class = `colab-ItemView ${classFolderFileBase}`
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike

    constructor({
        groupId,
        item,
        explorerState,
    }: {
        groupId: string
        item: Explorer.GetItemResponse
        explorerState: ExplorerState
    }) {
        this.style = attr$({
            source$: explorerState.itemCut$,
            vdomMap: (itemCut) => {
                return itemCut?.node.id === item.itemId
                    ? { opacity: 0.5 }
                    : { opacity: 1 }
            },
        })
        this.href = `@nav/explorer/${groupId}/item_${item.itemId}`
        this.children = [
            new ItemIconView({ item }),
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: `${item.name}`,
            },
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            item.borrowed && {
                tag: 'i',
                class: 'fas fa-link',
                style: { transform: 'scale(0.75)' },
            },
            item['origin'] && new OriginView(item['origin']),
            new ContextMenuHandler({
                node: explorerState.getItemData(item),
                explorerState: explorerState,
            }),
        ]
    }
}

export class TrashedItemView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = `colab-TrashedItemView mkdocs-text-0 d-flex align-items-center my-1 px-1`
    public readonly children: ChildrenLike
    constructor({ item }: { item: Explorer.GetItemResponse }) {
        this.children = [
            new ItemIconView({ item }),
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: `${item.name}`,
            },
        ]
    }
}

export class FolderView implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href: string
    public readonly class = `colab-FolderView ${classFolderFileBase}`
    public readonly children: ChildrenLike
    public readonly style: AttributeLike<CSSAttribute>
    constructor({
        groupId,
        folder,
        explorerState,
    }: {
        groupId: string
        folder: Explorer.GetFolderResponse
        explorerState: ExplorerState
    }) {
        this.style = attr$({
            source$: explorerState.itemCut$,
            vdomMap: (itemCut: ItemCut) => {
                return itemCut?.node.id === folder.folderId
                    ? { opacity: 0.5, fontWeight: 'bolder' }
                    : { opacity: 1, fontWeight: 'bolder' }
            },
        })

        this.href = `@nav/explorer/${groupId}/folder_${folder.folderId}`
        this.children = [
            new FolderIconView({ folder }),
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: `${folder.name}`,
            },
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            folder['origin'] && new OriginView(folder['origin']),
            new ContextMenuHandler({
                node: new FolderNode(folder),
                explorerState: explorerState,
            }),
        ]
    }
}

export class TrashedFolderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = `colab-TrashedFolderView mkdocs-text-0 d-flex align-items-center pb-1 px-1`
    public readonly children: ChildrenLike
    public readonly style = {
        fontWeight: 'bolder' as const,
    }
    constructor({ folder }: { folder: Explorer.GetFolderResponse }) {
        this.children = [
            new FolderIconView({ folder }),
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: `${folder.name}`,
            },
        ]
    }
}

export class FolderIconView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex justify-content-center align-items-center'
    public readonly style = {
        height: '25px',
        width: '25px',
    }
    public readonly children: ChildrenLike = [
        {
            tag: 'div',
            class: 'fas fa-folder mkdocs-text-0',
        },
    ]
    constructor({ folder }: { folder: Explorer.GetFolderResponse }) {
        if (folder.folderId.endsWith('_download')) {
            this.children = [
                {
                    tag: 'div',
                    class: 'fas fa-download text-primary',
                },
            ]
        }
        if (folder.folderId.endsWith('_home')) {
            this.children = [
                {
                    tag: 'div',
                    class: 'fas fa-home text-primary',
                },
            ]
        }
        if (folder.folderId.endsWith('_system')) {
            this.children = [
                {
                    tag: 'div',
                    class: 'fas fa-wrench text-primary',
                },
            ]
        }
    }
}

export class ItemIconView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'd-flex justify-content-center align-items-center mkdocs-text-0'
    public readonly style = {
        height: '25px',
        width: '25px',
    }
    public readonly children: ChildrenLike

    constructor({ item }: { item: Explorer.GetItemResponse }) {
        const defaultView = {
            tag: 'img' as const,
            src: '../assets/undefined_icon_file.svg',
            style: { width: '100%', height: '100%' },
        }
        this.children = [defaultView]
    }
}

export class OriginView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = {
        transform: 'scale(0.75)',
        // color: 'initial',
    }
    public readonly children: ChildrenLike

    constructor({ local, remote }: { local: boolean; remote: boolean }) {
        this.children = [
            local ? { tag: 'div', class: 'fas fa-laptop' } : undefined,
            remote ? { tag: 'div', class: 'fas fa-cloud' } : undefined,
        ]
    }
}

export class TrashIconView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex justify-content-center align-items-center'
    public readonly style = {
        height: '25px',
        width: '25px',
    }
    public readonly children: ChildrenLike = [
        {
            tag: 'div',
            class: 'fas fa-trash text-danger',
        },
    ]
}

export class TrashView implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href: string
    public readonly class = `colab-TrashView ${classFolderFileBase}`
    public readonly children: ChildrenLike
    public readonly style = {
        fontWeight: 'bolder' as const,
    }
    constructor({
        groupId,
        explorerState,
    }: {
        groupId: string
        explorerState: ExplorerState
    }) {
        const driveId = groupId + '_default-drive'
        this.href = `@nav/explorer/${groupId}/trash_${driveId}`

        this.children = [
            new TrashIconView(),
            { tag: 'span', class: 'mx-1' },
            {
                tag: 'div',
                innerText: 'Trash',
            },
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            new ContextMenuHandler({
                node: new TrashNode({
                    driveId: groupId + '_default_drive',
                    groupId,
                }),
                explorerState: explorerState,
            }),
        ]
    }
}
