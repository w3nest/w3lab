import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { parseMd, Router } from 'mkdocs-ts'
import { mergeMap, of } from 'rxjs'
import {
    AssetsGateway,
    Explorer,
    onHTTPErrors,
    Local,
    raiseHTTPErrors,
} from '@w3nest/http-clients'

export const internalAnchor = ({
    path,
    router,
}: {
    path: string
    router: Router
}): VirtualDOM<'a'> => ({
    tag: 'a',
    href: `@nav${path}`,
    onclick: (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        router.navigateTo({ path })
    },
})

export class CdnLinkView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ name, router }: { name: string; router: Router }) {
        const client = new Local.Client().api.components
        type Resp = Local.Components.GetPackageResponse | undefined
        this.children = [
            child$({
                source$: client
                    .getPackage$({
                        packageId: window.btoa(name),
                    })
                    .pipe(
                        onHTTPErrors(() => undefined),
                        mergeMap((resp: Resp) => {
                            if (resp === undefined) {
                                return of(undefined)
                            }
                            return of(resp)
                        }),
                    ),
                vdomMap: (resp) => {
                    if (resp === undefined || resp.versions.length === 0) {
                        return parseMd({
                            src: 'The project has not been published in your components database yet.',
                            router,
                        })
                    }
                    const type = resp.versions.slice(-1)[0]['type']
                    const topics = {
                        'js/wasm': 'js-wasm',
                        backend: 'backends',
                        pyodide: 'pyodide',
                    }
                    return parseMd({
                        src: `The project is published in components 
                        [here](@nav/components/${topics[type]}/${resp.id}).`,
                        router,
                    })
                },
            }),
        ]
    }
}

export class ExplorerLinkView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ name, router }: { name: string; router: Router }) {
        const client = new AssetsGateway.Client().explorer
        const itemId = window.btoa(window.btoa(name))
        this.children = [
            child$({
                source$: client
                    .getItem$({
                        itemId,
                    })
                    .pipe(
                        onHTTPErrors(() => undefined),
                        mergeMap((resp?: Explorer.ItemBase) => {
                            if (resp === undefined) {
                                return of(undefined)
                            }
                            return client
                                .getPath$({ itemId })
                                .pipe(raiseHTTPErrors())
                        }),
                    ),
                vdomMap: (resp) => {
                    if (resp === undefined) {
                        return parseMd({
                            src: 'The project has not been published in your explorer yet.',
                            router,
                        })
                    }
                    const folders = resp.folders.reduce(
                        (acc, e) => `${acc}/folder_${e.folderId}`,
                        `${resp.drive.groupId}/folder_${resp.drive.driveId}`,
                    )
                    const url = `${folders}/item_${resp.item.itemId}`
                    return parseMd({
                        src: `The project is published in your explorer
                        [here](@nav/explorer/${url}).`,
                        router,
                    })
                },
            }),
        ]
    }
}
