import { VirtualDOM, ChildLike } from '@youwol/rx-vdom'
import { State } from '../state'

import { Local } from '@w3nest/http-clients'
import { ReplaySubject } from 'rxjs'
import { parseMd, Router } from '@youwol/mkdocs-ts'
import { VersionsView } from '../js-wasm/package.views'

/**
 * @category View
 */
export class PyodideView implements VirtualDOM<'div'> {
    /**
     * @group States
     */
    public readonly cdnState: State

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex flex-column h-100'
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable Constants
     */
    public readonly packageId: string

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildLike[]

    public readonly selectedVersion$ = new ReplaySubject<string>(1)
    constructor(params: {
        cdnState: State
        router: Router
        packageId: string
    }) {
        Object.assign(this, params)
        this.cdnState.openPackage(this.packageId)

        this.children = [
            parseMd({
                src: `
# ${window.atob(this.packageId)}          

## Versions      
<versions></versions>

                `,
                router: params.router,
                views: {
                    versions: () => ({
                        tag: 'div',
                        children: [
                            {
                                source$:
                                    this.cdnState.packagesEvent[this.packageId]
                                        .info$,
                                vdomMap: (
                                    packageInfo: Local.Components.CdnPackage,
                                ) => {
                                    this.selectedVersion$.next(
                                        packageInfo.versions.slice(-1)[0]
                                            .version,
                                    )
                                    return new VersionsView({
                                        cdnState: this.cdnState,
                                        package: packageInfo,
                                        selectedVersion$: this.selectedVersion$,
                                    })
                                },
                            },
                        ],
                    }),
                },
            }),
        ]
    }
}
