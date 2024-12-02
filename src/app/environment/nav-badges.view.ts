import { Router } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM, RxAttribute, attr$, child$ } from 'rx-vdom'
import { AppState } from '../app-state'
import { internalAnchor } from '../common/links.view'
import { map } from 'rxjs/operators'
import { combineLatest } from 'rxjs'

const style = {
    transform: 'scale(0.75)',
}

export class NotificationsView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class: RxAttribute<unknown, string>

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({ appState, router }: { appState: AppState; router: Router }) {
        const notifState = appState.notificationsState
        this.class = attr$({
            source$: combineLatest([
                notifState.backendEvents.installing$,
                notifState.assetEvents.downloading$,
            ]),
            vdomMap: ([install, download]) => {
                return install.length + download.length === 0
                    ? 'd-none'
                    : 'd-flex align-items-center'
            },
        })
        this.children = [
            {
                ...internalAnchor({
                    path: '/environment/notifications',
                    router,
                }),
                children: [
                    {
                        tag: 'i',
                        style,
                        class: attr$({
                            source$: notifState.backendEvents.installing$,
                            vdomMap: (installing) => {
                                return installing.length > 0
                                    ? 'fas fa-plug text-success fv-blink me-1'
                                    : 'd-none'
                            },
                        }),
                    },
                    { tag: 'i', class: 'mx-1' },
                    {
                        tag: 'i',
                        style,
                        class: attr$({
                            source$: notifState.assetEvents.downloading$,
                            vdomMap: (installing) => {
                                return installing.length > 0
                                    ? 'fas fa-download text-success fv-blink'
                                    : 'd-none'
                            },
                        }),
                    },
                ],
            },
        ]
    }
}

export class BackendServingView implements VirtualDOM<'a'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'a'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = ''

    /**
     * @group Immutable DOM Constants
     */
    public readonly customAttributes = {
        dataToggle: 'tooltip',
        title: 'Backend(s) serving',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({ appState, router }: { appState: AppState; router: Router }) {
        Object.assign(
            this,
            internalAnchor({
                path: '/environment/backends',
                router: router,
            }),
        )
        this.children = [
            child$({
                source$: appState.environment$.pipe(
                    map((env) => env.proxiedBackends),
                ),
                vdomMap: (proxieds) => {
                    return proxieds.store.length === 0
                        ? { tag: 'i' }
                        : {
                              tag: 'i',
                              style,
                              class: 'fas fa-network-wired me-1',
                          }
                },
            }),
        ]
    }
}

export class EsmServingView implements VirtualDOM<'a'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'a'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = ''

    /**
     * @group Immutable DOM Constants
     */
    public readonly customAttributes = {
        dataToggle: 'tooltip',
        title: 'ESM server(s) serving',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({ appState, router }: { appState: AppState; router: Router }) {
        Object.assign(
            this,
            internalAnchor({ path: '/environment/esm-servers', router }),
        )
        this.children = [
            child$({
                source$: appState.environment$.pipe(
                    map((env) => env.proxiedEsmServers),
                ),
                vdomMap: (proxieds) => {
                    return proxieds.store.length === 0
                        ? { tag: 'i' }
                        : { tag: 'i', style, class: 'fas fa-laptop-code me-1' }
                },
            }),
        ]
    }
}
