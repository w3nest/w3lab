import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Assets, AssetsGateway } from '@w3nest/http-clients'
import { AssetPreview, Installer } from '@youwol/os-core'
import { map } from 'rxjs/operators'
import { ExpandableGroupView } from '../../common/expandable-group.view'
import { from, of } from 'rxjs'

export class OverViews implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly children: ChildrenLike
    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        const views$ = Installer.getInstallManifest$().pipe(
            map(({ assetPreviews }) => {
                return assetPreviews({
                    asset: asset,
                    permissions: { write: true, read: true, share: true },
                    cdnClient: undefined,
                    fluxView: undefined,
                    assetsGtwClient: new AssetsGateway.Client() as any,
                }).filter((preview) => preview.applicable())
            }),
        )
        const customView = (viewGen: AssetPreview): AnyVirtualDOM => {
            const view = viewGen.exe()
            return new ExpandableGroupView({
                title: viewGen.name,
                icon: viewGen.icon,
                content: () => {
                    return {
                        tag: 'div' as const,
                        untilFirst: [
                            {
                                tag: 'div',
                                class: 'fas fa-spinner fa-spin',
                            },
                        ],
                        children: [
                            {
                                source$:
                                    view instanceof Promise
                                        ? from(view)
                                        : of(view),
                                vdomMap: (v: AnyVirtualDOM) => v,
                            },
                        ],
                    }
                },
            })
        }
        this.children = {
            policy: 'replace',
            source$: views$,
            untilFirst: [{ tag: 'div', class: 'fas fa-spinner fa-spin' }],
            vdomMap: (views: AssetPreview[]) => {
                return views.map(customView)
            },
        }
    }
}
