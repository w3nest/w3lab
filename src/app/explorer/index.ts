import {
    DefaultLayout,
    LazyRoutesReturn,
    MdWidgets,
    Navigation,
    Router,
} from 'mkdocs-ts'
import { Accounts, AssetsGateway, raiseHTTPErrors } from '@w3nest/http-clients'
import { map, switchMap, take } from 'rxjs/operators'
import { AssetView, ExplorerView } from './explorer.views'
import { forkJoin, Observable, of } from 'rxjs'
import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { ExplorerState } from './explorer.state'
import { defaultLayout } from '../common/utils-nav'
import { PageTitleView } from '../common'
import { GroupsView } from '../environment/user-connection.view'

export const navigation = ({
    session$,
}: {
    session$?: Observable<Accounts.SessionDetails>
}): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => {
    const explorerState = new ExplorerState()
    return {
        name: 'Explorer',
        header: { icon: { tag: 'i', class: 'fas fa-folder' } },
        layout: defaultLayout(({ router }) => {
            explorerState.setRouter(router)
            return new PageView({ session$ })
        }),
        routes: (session$ || of(undefined)).pipe(
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

    constructor({
        session$,
    }: {
        session$: Observable<Accounts.SessionDetails>
    }) {
        this.children = [
            new PageTitleView({
                title: 'Explorer',
                icon: 'fas fa-folder',
                helpNav: '@nav/doc.4-',
            }),
            {
                tag: 'div',
                children: [
                    child$({
                        source$: session$,
                        vdomMap: (session) => {
                            return new MdWidgets.NoteView({
                                level: 'info',
                                content: new GroupsView({ session }),
                                icon: 'fas fa-hdd',
                                label: 'Drives available',
                            })
                        },
                    }),
                ],
            },
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
}): LazyRoutesReturn<DefaultLayout.NavLayout, DefaultLayout.NavHeader> {
    const parts = path.split('/').filter((d) => d !== '')
    const client = new AssetsGateway.Client()
    if (parts.length === 0) {
        return client.accounts.getSessionDetails$().pipe(
            raiseHTTPErrors(),
            map((details) => {
                const children = details.userInfo.groups.map((group) => {
                    return {
                        name: group.path.split('/').slice(-1)[0],
                        header: {
                            icon: {
                                tag: 'div' as const,
                                class: group.id.includes('private')
                                    ? 'fas fa-user mx-2'
                                    : 'fas fa-users mx-2',
                            },
                        },
                        leaf: true,
                        id: group.id,
                        layout: {
                            toc: () => Promise.resolve({ tag: 'div' as const }),
                            content: () => {
                                const target =
                                    router.parseUrl().parameters['target']
                                if (!target || target.startsWith('folder_')) {
                                    return folderExplorerView({
                                        client,
                                        router,
                                        groupId: group.id,
                                        explorerState,
                                    })
                                }
                                return assetExplorerView({
                                    client,
                                    router,
                                    itemId: target.replace('item_', ''),
                                    explorerState,
                                })
                            },
                        },
                    }
                })
                return children.reduce(
                    (acc, c) => ({ ...acc, [`/${c.id}`]: c }),
                    {},
                )
            }),
        )
    }
}

function folderExplorerView({
    client,
    router,
    groupId,
    explorerState,
}: {
    client: AssetsGateway.Client
    router: Router
    groupId: string
    explorerState: ExplorerState
}): Observable<AnyVirtualDOM> {
    return client.explorer
        .getDefaultDrive$({
            groupId,
        })
        .pipe(
            take(1),
            raiseHTTPErrors(),
            switchMap(({ driveId }) => {
                const target = router.parseUrl().parameters['target']

                return client.explorer
                    .queryChildren$({
                        parentId: target
                            ? target.replace('folder_', '')
                            : driveId,
                    })
                    .pipe(
                        raiseHTTPErrors(),
                        map((response) => ({
                            response,
                            driveId,
                            target,
                        })),
                    )
            }),
            map(({ response, target }) => {
                return new ExplorerView({
                    response,
                    path: target ?? groupId,
                    explorerState,
                    router,
                    groupId,
                })
            }),
        )
}

function assetExplorerView({
    client,
    router,
    itemId,
    explorerState,
}: {
    client: AssetsGateway.Client
    router: Router
    itemId: string
    explorerState: ExplorerState
}): Observable<AnyVirtualDOM> {
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
            map(({ itemResponse, assetResponse, permissionResponse }) => {
                const target = router.parseUrl().parameters['target']
                return new AssetView({
                    itemResponse,
                    asset: assetResponse,
                    explorerState,
                    router,
                    path: target,
                    writePermission: permissionResponse.write,
                })
            }),
        )
}
