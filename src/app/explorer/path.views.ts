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
    target,
    router,
}: {
    icon?: string
    name: string
    nav: string
    target?: string
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
        href: target
            ? `${router.basePath}?nav=${nav}&target=${target}`
            : `${router.basePath}?nav=${nav}`,
        onclick: (e: MouseEvent) => {
            e.preventDefault()
            router.fireNavigateTo({
                path: nav,
                parameters: target ? { target } : {},
            })
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
    const params = {
        nav: `/explorer/${groupId}`,
        target: undefined,
        router,
    }
    return groupId.startsWith('private_')
        ? folderAnchorView({
              name: 'private',
              icon: 'fas fa-user',
              ...params,
          })
        : folderAnchorView({
              name: window.atob(groupId).split('/').slice(-1)[0],
              icon: 'fas fa-users',
              ...params,
          })
}

export const separator: AnyVirtualDOM = {
    tag: 'div',
    class: 'p-0 mx-1',
    innerText: '/',
}
export const classPathAnchors =
    'd-flex flex-wrap align-items-center mkdocs-bg-1 rounded'
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

        const target = path.item
        const folders = [...path.folders, target]
            .filter((e) => e ?? false)
            .map((entity) => {
                return [
                    folderAnchorView({
                        name: entity.name,
                        nav: `/explorer/${path.drive.groupId}`,
                        target: `folder_${entity.folderId}`,
                        router,
                    }),
                    separator,
                ] as AnyVirtualDOM[]
            })
            .flat()
            .slice(0, -1)
        const ctxMenu =
            displayCtxMenu &&
            new ContextMenuHandler({
                node: target
                    ? new ItemNode(target)
                    : new FolderNode(path.folders.slice(-1)[0]),
                explorerState: explorerState,
            })
        this.children = [groupView, separator, ...folders, ctxMenu]
    }
}
