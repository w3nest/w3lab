import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Assets, AssetsGateway } from '@w3nest/http-clients'
import { ExplorerState } from '../explorer.state'
import { BehaviorSubject, skip } from 'rxjs'
import { MdWidgets, parseMd } from 'mkdocs-ts'
import { filter, switchMap } from 'rxjs/operators'

export class DescriptionView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 mkdocs-bg-info p-2 rounded'
    public readonly children: ChildrenLike
    public readonly style = {
        position: 'relative' as const,
    }

    constructor({
        asset,
        explorerState,
    }: {
        asset: Assets.GetAssetResponse
        explorerState: ExplorerState
    }) {
        const edit$ = new BehaviorSubject<boolean>(false)
        const snippet = new MdWidgets.CodeSnippetView({
            language: 'markdown',
            content: asset.description,
            cmConfig: {
                readOnly: false,
                lineNumbers: false,
            },
        })
        edit$
            .pipe(
                skip(1),
                filter((edit) => !edit),
                switchMap(() => {
                    const client = new AssetsGateway.Client().assets
                    return client.updateAsset$({
                        assetId: asset.assetId,
                        body: { description: snippet.content$.value },
                    })
                }),
            )
            .subscribe(() => {
                explorerState.refresh()
            })
        const button: AnyVirtualDOM = {
            tag: 'div',
            class: {
                source$: edit$,
                vdomMap: (edit: boolean) =>
                    edit
                        ? 'fas fa-save fv-pointer p-1'
                        : 'fas fa-pen fv-pointer p-1',
            },
            style: {
                position: 'absolute',
                top: '0px',
                right: '0px',
            },
            onclick: () => {
                edit$.next(!edit$.value)
            },
        }

        const src =
            asset.description === ''
                ? 'No description provided'
                : asset.description
        this.children = [
            {
                source$: edit$,
                vdomMap: (edit: boolean) =>
                    edit
                        ? {
                              tag: 'div',
                              children: [
                                  {
                                      tag: 'div',
                                      innerText:
                                          'Enter description in Markdown:',
                                  },
                                  snippet,
                              ],
                          }
                        : parseMd({ src }),
            },
            button,
        ]
    }
}
