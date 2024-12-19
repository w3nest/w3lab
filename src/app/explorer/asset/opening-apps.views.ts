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
            type Metadata = {
                graphics: { appIcon: AnyVirtualDOM }
            }
            const source$ = new AssetsGateway.Client().webpm
                .getResource$<Metadata>({
                    libraryId: asset.rawId,
                    version: 'latest',
                    restOfPath: '.yw_metadata.json',
                })
                .pipe(raiseHTTPErrors())
            this.children = [
                child$({
                    source$,
                    untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                    vdomMap: (resp) => {
                        if (resp.graphics?.appIcon === undefined) {
                            return {
                                tag: 'div',
                                class: 'fas fa-microchip fa-2x',
                            }
                        }
                        return new CustomIconView(resp.graphics.appIcon)
                    },
                }),
            ]
        }
    }
}

export class CustomIconView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = {
        width: '80px',
        height: '80px',
    }
    public readonly children: ChildrenLike

    constructor(icon: AnyVirtualDOM) {
        if (
            typeof icon.class === 'string' &&
            (icon.class.includes('fas') ||
                icon.class.includes('far') ||
                icon.class.includes('fab'))
        ) {
            this.children = [
                {
                    tag: 'div',
                    class: 'd-flex flex-column justify-content-center h-100 w-100 text-center',
                    children: [icon],
                },
            ]
            return
        }
        this.children = [icon]
    }
}
export class LaunchView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 d-flex justify-content-center'
    public readonly children: ChildrenLike

    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
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

        if (asset.kind === 'package') {
            const source$ = launchPackage$(asset.rawId)

            this.children = [
                child$({
                    source$,
                    untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                    vdomMap: (resp) => {
                        if (!resp) {
                            return { tag: 'div' }
                        }
                        if (resp?.type === 'app') {
                            return labelView(
                                resp.href,
                                'Launch App.',
                                'fas fa-play',
                            )
                        }
                        if (resp?.type === 'lib') {
                            return labelView(
                                resp.href,
                                'Try Lib.',
                                'fas fa-code',
                            )
                        }
                        return { tag: 'div' }
                    },
                }),
            ]
        }
    }
}
