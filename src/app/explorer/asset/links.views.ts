import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import {
    Assets,
    AssetsGateway,
    Explorer,
    raiseHTTPErrors,
} from '@w3nest/http-clients'
import { ExpandableGroupView } from '../../common/expandable-group.view'
import { PathView } from '../path.views'
import { Router } from 'mkdocs-ts'
import { ExplorerState } from '../explorer.state'

export class LinkView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'my-1'
    constructor({
        item,
        explorerState,
        router,
    }: {
        item: Explorer.ItemBase
        explorerState: ExplorerState
        router: Router
    }) {
        const client = new AssetsGateway.Client().explorer
        const source$ = client
            .getPath$({ itemId: item.itemId })
            .pipe(raiseHTTPErrors())
        this.children = [
            child$({
                source$,
                vdomMap: (path) => {
                    return new PathView({
                        path,
                        router,
                        explorerState,
                        displayCtxMenu: false,
                    })
                },
            }),
        ]
    }
}
export class LinksView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        asset,
        explorerState,
        router,
    }: {
        asset: Assets.GetAssetResponse
        explorerState: ExplorerState
        router: Router
    }) {
        const client = new AssetsGateway.Client().explorer
        const items$ = client
            .queryItemsByAssetId$({ assetId: asset.assetId })
            .pipe(raiseHTTPErrors())
        this.children = [
            new ExpandableGroupView({
                title: 'Symbolic links',
                icon: 'fas fa-link',
                content: () => ({
                    tag: 'div',
                    class: 'py-1',
                    children: [
                        child$({
                            source$: items$,
                            untilFirst: {
                                tag: 'div',
                                class: 'fas fa-spinner fa-spin',
                            },
                            vdomMap: (resp) => {
                                const original = resp.items.find(
                                    (item) => item.itemId === item.assetId,
                                )
                                const remainings = resp.items.filter(
                                    (item) => item.itemId !== item.assetId,
                                )
                                return {
                                    tag: 'div',
                                    children: [
                                        {
                                            tag: 'div',
                                            innerText: 'Original:',
                                            style: {
                                                fontWeight: 'bolder',
                                            },
                                            children: [
                                                new LinkView({
                                                    item: original,
                                                    explorerState,
                                                    router,
                                                }),
                                            ],
                                        },
                                        remainings.length > 0
                                            ? {
                                                  tag: 'div',
                                                  innerText: 'Links:',
                                                  children: remainings.map(
                                                      (item) =>
                                                          new LinkView({
                                                              item,
                                                              explorerState,
                                                              router,
                                                          }),
                                                  ),
                                              }
                                            : {
                                                  tag: 'div',
                                                  innerText:
                                                      'Not exposed at other places.',
                                              },
                                    ],
                                }
                            },
                        }),
                    ],
                }),
                expanded: false,
            }),
        ]
    }
}
