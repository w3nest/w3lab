import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Assets } from '@w3nest/http-clients'
import {
    openingApps$,
    OpenWithParametrization,
    evaluateParameters,
} from '@youwol/os-core'
import { fromFetch } from 'rxjs/fetch'
import { switchMap } from 'rxjs/operators'
import { launchPackage$, LaunchPackageData } from '../actions.factory'
import { ApplicationInfo } from '../../common/patches'

type openingApp = {
    appInfo: ApplicationInfo
    parametrization: OpenWithParametrization
}
export class OpeningAppsViews implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        this.children = [
            {
                source$: openingApps$(asset),
                untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                vdomMap: (apps: openingApp[]) => {
                    if (apps.length === 0) {
                        return {
                            tag: 'div',
                            innerText:
                                'No application available to open the asset.',
                        }
                    }
                    return {
                        tag: 'div',
                        class: 'd-flex flex-wrap',
                        children: apps.map((app) => {
                            const params = evaluateParameters(
                                asset,
                                app.parametrization,
                            )
                            const queryParams = Object.entries(params).reduce(
                                (acc, [k, v]) => `${acc}&${k}=${v}`,
                                '',
                            )
                            const url = `/apps/${app.appInfo.cdnPackage}/latest?${queryParams}`

                            return {
                                tag: 'a',
                                href: url,
                                target: '_blank',
                                class: 'd-flex flex-column align-items-center rounded p-2 mx-2 mkdocs-hover-bg-1 fv-pointer',
                                children: [
                                    new CustomIconView(
                                        app.appInfo.graphics.appIcon,
                                    ),
                                    {
                                        tag: 'div',
                                        class: 'my-1',
                                    },
                                    {
                                        tag: 'div',
                                        innerText: app.appInfo.displayName,
                                    },
                                ],
                            }
                        }),
                    }
                },
            },
        ]
    }
}

export class PackageLogoView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex justify-content-center'
    public readonly children: ChildrenLike
    public readonly style = {}
    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        if (asset.kind === 'package') {
            const source$ = fromFetch(
                `/api/assets-gateway/webpm/resources/${asset.rawId}/latest/.yw_metadata.json`,
            ).pipe(switchMap((resp) => resp.json()))

            this.children = [
                {
                    source$,
                    untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                    vdomMap: (resp: {
                        graphics: { appIcon: AnyVirtualDOM }
                    }) => {
                        if (resp.graphics?.appIcon === undefined) {
                            return {
                                tag: 'div',
                                class: 'fas fa-microchip fa-2x',
                            }
                        }
                        return new CustomIconView(resp.graphics.appIcon)
                    },
                },
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
                {
                    source$,
                    untilFirst: { tag: 'i', class: 'fas fa-spinner fa-spin' },
                    vdomMap: (resp: LaunchPackageData | undefined) => {
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
                    },
                },
            ]
        }
    }
}
