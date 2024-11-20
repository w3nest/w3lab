import {
    AnyVirtualDOM,
    ChildrenLike,
    RxChild,
    VirtualDOM,
} from '@youwol/rx-vdom'
import {
    Assets,
    AssetsGateway,
    Explorer,
    Local,
    raiseHTTPErrors,
} from '@w3nest/http-clients'
import { parseMd, Router } from '@youwol/mkdocs-ts'
import {
    PathView,
    groupAnchorView,
    folderAnchorView,
    separator,
    classPathAnchors,
} from './path.views'
import {
    FolderView,
    ItemView,
    TrashedFolderView,
    TrashedItemView,
    TrashView,
} from './item.view'
import { ContextMenuHandler } from './nav-context-menu.view'
import { ExplorerState } from './explorer.state'
import { TrashNode } from './nodes'
import { AccessView, WritePermission } from './asset/access.views'
import { DescriptionView } from './asset/descriptions.views'
import { LinksView } from './asset/links.views'
import { OverViews } from './asset/overviews.views'
import {
    LaunchView,
    OpeningAppsViews,
    PackageLogoView,
} from './asset/opening-apps.views'

export function headerViewWrapper(headerView: AnyVirtualDOM): AnyVirtualDOM {
    return {
        tag: 'div' as const,
        class: 'mkdocs-bg-0',
        style: { position: 'sticky', top: '0px', zIndex: 1 },
        children: [headerView, { tag: 'div', class: 'my-2 border-bottom' }],
    }
}
export class HeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = classPathAnchors
    public readonly children: ChildrenLike
    constructor({
        explorerState,
        router,
        path,
    }: {
        path: string
        explorerState: ExplorerState
        router: Router
    }) {
        const groupId = path.split('/')[0]
        const target = path.split('/').slice(-1)[0]
        const pathView = (entityId: string): RxChild => {
            const client = new AssetsGateway.Client().explorer
            const path$ = target.startsWith('item_')
                ? client.getPath$({ itemId: entityId }).pipe(raiseHTTPErrors())
                : client
                      .getPathFolder$({ folderId: entityId })
                      .pipe(raiseHTTPErrors())

            return {
                source$: path$,
                vdomMap: (path: Explorer.GetPathFolderResponse) =>
                    new PathView({
                        path,
                        router,
                        explorerState,
                        displayCtxMenu: target.startsWith('folder_'),
                    }),
                untilFirst: {
                    tag: 'div',
                    class: 'fas fa-spinner fa-spin',
                },
            }
        }

        if (target.startsWith('folder_')) {
            const folderId = target.replace('folder_', '')
            this.children = [pathView(folderId)]
            return
        }
        if (target.startsWith('item_')) {
            const folderId = target.replace('item_', '')
            this.children = [pathView(folderId)]
            return
        }
        if (target.startsWith('trash_')) {
            const ctxMenu = new ContextMenuHandler({
                node: new TrashNode({
                    driveId: target.replace('trash_', ''),
                    groupId,
                }),
                explorerState: explorerState,
            })
            this.children = [
                groupAnchorView({ groupId: groupId, router }),
                separator,
                folderAnchorView({
                    name: 'trash',
                    nav: path,
                    icon: 'fas fa-trash',
                    router,
                }),
                ctxMenu,
            ]
            return
        }
        this.children = [groupAnchorView({ groupId: target, router })]
    }
}

export class OpenFolderInHostView implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class = 'btn btn-sm btn-light fas fa-folder-open'
    public readonly onclick: () => undefined
    constructor(params: { folder: string }) {
        this.onclick = () => {
            const client = new Local.Client().api.system
            console.log('Open folder in explorer', params.folder)
            client
                .openFolder$({ body: { path: params.folder } })
                .subscribe(() => {})
        }
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
        explorerState,
        router,
        groupId,
    }: {
        response: Explorer.QueryChildrenResponse
        path: string
        explorerState: ExplorerState
        router: Router
        groupId: string
    }) {
        const sortFct = (a, b) => a.name.localeCompare(b.name)
        const isRoot = path.endsWith(groupId)
        const isTrash = path.split('/').slice(-1)[0].startsWith('trash_')

        this.children = [
            headerViewWrapper(new HeaderView({ explorerState, router, path })),
            ...response.folders.sort(sortFct).map((folder) =>
                isTrash
                    ? new TrashedFolderView({ folder })
                    : new FolderView({
                          groupId,
                          folder,
                          explorerState,
                      }),
            ),
            ...response.items.sort(sortFct).map((item) =>
                isTrash
                    ? new TrashedItemView({ item })
                    : new ItemView({
                          groupId,
                          item,
                          explorerState,
                      }),
            ),
            isRoot && new TrashView({ groupId, explorerState }),
        ]
    }
}

export class AssetView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = ''
    public readonly children: ChildrenLike

    constructor({
        itemResponse,
        asset,
        explorerState,
        router,
        path,
        writePermission,
    }: {
        itemResponse: Explorer.ItemBase
        asset: Assets.GetAssetResponse
        explorerState: ExplorerState
        router: Router
        writePermission: boolean
        path?: string
    }) {
        this.children = [
            parseMd({
                src: `
<path></path>

<title></title>       
<logo></logo>
<launch></launch>
<writePermission></writePermission>


---

**Opening applications:**

<openingApps></openingApps>

---


**Description:**

<description></description>

<permissions></permissions>

<links></links>

<overviews></overviews>
                `,
                router,
                views: {
                    title: () => {
                        return {
                            tag: 'div',
                            class: 'w-100 text-center',
                            innerText: itemResponse.name,
                            style: {
                                fontSize: 'Larger',
                                fontWeight: 'bolder',
                            },
                        }
                    },
                    logo: () => new PackageLogoView({ asset }),
                    writePermission: () => new WritePermission({ asset }),
                    path: () =>
                        new HeaderView({
                            explorerState,
                            path: path,
                            router: router,
                        }),
                    launch: () => new LaunchView({ asset }),
                    openingApps: () => new OpeningAppsViews({ asset }),
                    description: () =>
                        new DescriptionView({
                            asset: asset,
                            explorerState,
                        }),
                    permissions: () =>
                        writePermission && new AccessView({ asset }),
                    links: () =>
                        writePermission &&
                        new LinksView({
                            asset: asset,
                            explorerState,
                            router,
                        }),
                    overviews: () => new OverViews({ asset }),
                },
            }),
        ]
    }
}
