import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Explorer } from '@w3nest/http-clients'
import { Router } from 'mkdocs-ts'
import { ExplorerState } from './explorer.state'
import { ContextMenuHandler } from './nav-context-menu.view'
import { FolderNode, ItemNode } from './nodes'

export function folderAnchorView({
    icon,
    name,
    nav,
    router,
}: {
    icon?: string
    name: string
    nav: string
    router: Router
}): AnyVirtualDOM {
    return {
        tag: 'a' as const,
        class: 'px-1 rounded mkdocs-hover-bg-4 mkdocs-hover-text-5 d-flex align-items-center',
        children: [
            icon && { tag: 'i', class: icon + ' mx-1' },
            {
                tag: 'div',
                innerText: name,
            },
        ],
        href: `${router.basePath}?nav=${nav}`,
        onclick: (e: MouseEvent) => {
            e.preventDefault()
            router.navigateTo({ path: nav })
        },
    }
}
export function groupAnchorView({
    groupId,
    router,
}: {
    groupId: string
    router: Router
}) {
    return groupId.startsWith('private_')
        ? folderAnchorView({
              name: 'private',
              nav: `/explorer/${groupId}`,
              icon: 'fas fa-user',
              router,
          })
        : folderAnchorView({
              name: window.atob(groupId).split('/').slice(-1)[0],
              nav: `/explorer/${groupId}`,
              icon: 'fas fa-users',
              router,
          })
}

export const separator: AnyVirtualDOM = {
    tag: 'div',
    class: 'p-0 mx-1',
    innerText: '/',
}
export const classPathAnchors =
    'w-100 d-flex flex-wrap align-items-center mkdocs-bg-1 rounded'
export class PathView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = classPathAnchors
    public readonly children: ChildrenLike

    constructor({
        path,
        router,
        explorerState,
        displayCtxMenu,
    }: {
        path: Explorer.GetPathFolderResponse
        router: Router
        explorerState: ExplorerState
        displayCtxMenu?: boolean
    }) {
        const groupView: AnyVirtualDOM = groupAnchorView({
            groupId: path.drive.groupId,
            router,
        })

        const target = path.item || path.folders.slice(-1)[0]
        const folders = [...path.folders, path.item]
            .filter((e) => e != undefined)
            .map((entity) => {
                const nav = Explorer.isInstanceOfItemResponse(entity)
                    ? `/explorer/${path.drive.groupId}/item_${entity.itemId}`
                    : `/explorer/${path.drive.groupId}/folder_${entity.folderId}`
                return [
                    folderAnchorView({ name: entity.name, nav: nav, router }),
                    separator,
                ] as AnyVirtualDOM[]
            })
            .flat()
            .slice(0, -1)
        const ctxMenu = new ContextMenuHandler({
            node: Explorer.isInstanceOfItemResponse(target)
                ? new ItemNode(target)
                : new FolderNode(target),
            explorerState: explorerState,
        })
        this.children = [
            groupView,
            separator,
            ...folders,
            displayCtxMenu && ctxMenu,
        ]
    }
}
