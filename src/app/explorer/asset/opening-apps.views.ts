import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Assets, AssetsGateway, raiseHTTPErrors } from '@w3nest/http-clients'

import { launchPackage$ } from '../actions.factory'

export class PackageLogoView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex justify-content-center'
    public readonly children: ChildrenLike
    public readonly style = {}
    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        if (asset.kind === 'package') {
            const source$ = new AssetsGateway.Client().webpm
                .getMetadataInfo$({ libraryId: asset.rawId, version: 'latest' })
                .pipe(raiseHTTPErrors())
            this.children = [
                child$({
                    source$,
                    untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                    vdomMap: (resp) => {
                        if (resp.icon === undefined) {
                            return {
                                tag: 'div',
                                class: 'fas fa-microchip fa-2x',
                            }
                        }
                        return new CustomIconView(resp.icon)
                    },
                }),
            ]
        }
    }
}

export class CustomIconView implements VirtualDOM<'img'> {
    public readonly tag = 'img'
    public readonly style = {
        width: '80px',
        height: '80px',
    }
    public readonly children: ChildrenLike
    public readonly src: string
    constructor(iconUrl: string) {
        this.src = iconUrl
    }
}
export class LaunchView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 d-flex justify-content-center'
    public readonly children: ChildrenLike

    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        if (asset.kind !== 'package') {
            return
        }
        const labelView = (
            href: string,
            innerText: string,
            icon: string,
        ): AnyVirtualDOM => ({
            tag: 'a',
            target: '_blank',
            href,
            class: 'd-flex align-items-center my-1',
            style: {
                fontWeight: 'bolder',
            },
            children: [
                {
                    tag: 'i',
                    class: icon,
                },
                { tag: 'i', class: 'mx-1' },
                {
                    tag: 'div',
                    innerText,
                },
            ],
        })
        const source$ = launchPackage$(asset.rawId)

        this.children = [
            child$({
                source$,
                untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                vdomMap: (resp) => {
                    if (!resp) {
                        return { tag: 'div' }
                    }
                    if (resp?.kind === 'webapp') {
                        return labelView(
                            resp.href,
                            'Launch App.',
                            'fas fa-play',
                        )
                    }
                    if (resp?.kind === 'esm') {
                        return labelView(resp.href, 'Try Lib.', 'fas fa-code')
                    }
                    return { tag: 'div' }
                },
            }),
        ]
    }
}
