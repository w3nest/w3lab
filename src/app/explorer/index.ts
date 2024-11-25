import { Navigation, parseMd, Router, Views, CatchAllNav } from 'mkdocs-ts'
import { Accounts, AssetsGateway, raiseHTTPErrors } from '@w3nest/http-clients'
import { map, switchMap, take } from 'rxjs/operators'
import { AssetView, ExplorerView } from './explorer.views'
import { combineLatest, forkJoin, Observable, of } from 'rxjs'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Installer, PreferencesFacade } from '@youwol/os-core'
import { ExplorerState } from './explorer.state'
import { groupNavNodeInput } from './utils'

export { ExplorerState as State } from './explorer.state'

const tableOfContent = Views.tocView

export const navigation = ({
    session$,
}: {
    session$?: Observable<Accounts.SessionDetails>
}): Navigation => {
    const explorerState = new ExplorerState()
    return {
        name: 'Explorer',
        decoration: { icon: { tag: 'i', class: 'fas fa-folder me-2' } },
        tableOfContent,
        html: ({ router }) => {
            explorerState.setRouter(router)
            return new PageView({ router })
        },
        '...': (session$ || of(undefined)).pipe(
            map(() => ({ router, path }) => {
                explorerState.setRouter(router)
                return lazyResolver({
                    explorerState,
                    router,
                    path,
                })
            }),
        ),
    }
}

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    static readonly warmUp = () => {
        combineLatest([
            Installer.getApplicationsInfo$(),
            PreferencesFacade.getPreferences$(),
        ]).subscribe()
    }

    constructor({ router }: { router: Router }) {
        this.children = [
            parseMd({
                src: `
# Explorer

The explorer organize assets in a files-explorer like structure.

                 `,
                router,
            }),
        ]
    }
}

function lazyResolver({
    path,
    router,
    explorerState,
}: {
    path: string
    router: Router
    explorerState: ExplorerState
}): CatchAllNav {
    const parts = path.split('/').filter((d) => d != '')
    const client = new AssetsGateway.Client()
    if (parts.length == 0) {
        return lazyResolverGroups({ client })
    }
    if (parts.length == 1) {
        return lazyResolverDrive({
            groupId: parts[0],
            client,
            path,
            explorerState,
            router,
        })
    }
    if (
        parts.slice(-1)[0].startsWith('folder_') ||
        parts.slice(-1)[0].startsWith('trash_')
    ) {
        return lazyResolverFolders({
            path,
            parentId: parts.slice(-1)[0].replace('folder_', ''),
            client,
            explorerState,
            groupId: parts[0],
            isDrive: parts.length === 2,
            router,
        })
    }
    if (parts.slice(-1)[0].startsWith('item_')) {
        return lazyResolverItem({
            itemId: parts.slice(-1)[0].replace('item_', ''),
            client,
            router,
            path,
            explorerState,
        })
    }
}

function lazyResolverGroups({
    client,
}: {
    client: AssetsGateway.Client
}): CatchAllNav {
    return client.accounts.getSessionDetails$().pipe(
        raiseHTTPErrors(),
        map((details) => {
            return {
                children: details.userInfo.groups.map((group) => {
                    return groupNavNodeInput({ group })
                }),
                html: () => ({ tag: 'h1' as const, innerText: 'Groups' }),
            }
        }),
    )
}

function lazyResolverDrive({
    groupId,
    client,
    path,
    explorerState,
    router,
}: {
    groupId: string
    client: AssetsGateway.Client
    path: string
    explorerState: ExplorerState
    router: Router
}): CatchAllNav {
    return client.explorer
        .getDefaultDrive$({
            groupId,
        })
        .pipe(
            raiseHTTPErrors(),
            take(1),
            switchMap(({ driveId }) => {
                return client.explorer
                    .queryChildren$({ parentId: driveId })
                    .pipe(
                        raiseHTTPErrors(),
                        map((response) => ({ response, driveId })),
                    )
            }),
            map(({ response }) => {
                return {
                    isLeaf: true,
                    children: [],
                    html: () =>
                        new ExplorerView({
                            response,
                            path,
                            explorerState,
                            router,
                            groupId,
                        }),
                }
            }),
        )
}

function lazyResolverFolders({
    path,
    parentId,
    client,
    explorerState,
    groupId,
    router,
}: {
    path: string
    parentId: string
    client: AssetsGateway.Client
    explorerState: ExplorerState
    groupId: string
    isDrive: boolean
    router: Router
}): CatchAllNav {
    const source$ = parentId.startsWith('trash_')
        ? client.explorer.queryDeleted$({
              driveId: parentId.replace('trash_', ''),
          })
        : client.explorer.queryChildren$({
              parentId,
          })
    return source$.pipe(
        raiseHTTPErrors(),
        take(1),
        map((response) => {
            return {
                isLeaf: true,
                children: [],
                html: () =>
                    new ExplorerView({
                        response,
                        path,
                        explorerState,
                        router,
                        groupId,
                    }),
            }
        }),
    )
}

function lazyResolverItem({
    path,
    itemId,
    router,
    client,
    explorerState,
}: {
    path: string
    itemId: string
    router: Router
    client: AssetsGateway.Client
    explorerState: ExplorerState
}): CatchAllNav {
    return client.explorer
        .getItem$({
            itemId,
        })
        .pipe(
            raiseHTTPErrors(),
            switchMap((itemResponse) =>
                forkJoin([
                    client.assets
                        .getAsset$({ assetId: itemResponse.assetId })
                        .pipe(raiseHTTPErrors()),
                    client.assets
                        .getPermissions$({ assetId: itemResponse.assetId })
                        .pipe(raiseHTTPErrors()),
                ]).pipe(
                    map(([assetResponse, permissionResponse]) => ({
                        assetResponse,
                        itemResponse,
                        permissionResponse,
                    })),
                ),
            ),
            map(({ itemResponse, assetResponse, permissionResponse }) => ({
                leaf: true,
                children: [],
                tableOfContent,
                html: () =>
                    new AssetView({
                        itemResponse,
                        asset: assetResponse,
                        explorerState,
                        router,
                        path,
                        writePermission: permissionResponse.write,
                    }),
            })),
        )
}
