import { Router } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM, RxAttribute, attr$, child$ } from 'rx-vdom'
import { AppState } from './app-state'
import { internalAnchor } from './common/links.view'
import { map } from 'rxjs/operators'
import { combineLatest } from 'rxjs'

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

    constructor({ state, router }: { state: AppState; router: Router }) {
        const notifState = state.notificationsState
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

/**
 * @category View
 */
export class UserBadgeDropdownView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'dropdown'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({ state }: { state: AppState }) {
        this.children = [
            child$({
                source$: state.environment$.pipe(
                    mergeMap((env) => {
                        return new Accounts.AccountsClient()
                            .getSessionDetails$()
                            .pipe(
                                raiseHTTPErrors(),
                                map((session) => [session, env] as const),
                            )
                    }),
                ),
                vdomMap: ([sessionInfo, env]) => {
                    return {
                        tag: 'div',
                        class: 'dropdown',
                        children: [
                            this.headerButton(sessionInfo),
                            {
                                tag: 'div',
                                class: 'dropdown-menu bg-dark',
                                customAttributes: {
                                    ariaLabelledby: 'dropdownMenuButton',
                                },
                                children: [this.currentConnection(env)],
                            },
                        ],
                    }
                },
            }),
        ]
    }

    private headerButton(sessionInfo: Accounts.SessionDetails): AnyVirtualDOM {
        return {
            tag: 'button',
            class: 'btn btn-sm  dropdown-toggle d-flex align-items-center text-light',
            style: {
                backgroundColor: '#58a4b0',
            },
            customAttributes: {
                dataBsToggle: 'dropdown',
            },
            children: [new RegisteredBadgeView(sessionInfo)],
        }
    }

    private currentConnection(
        env: Local.Environment.EnvironmentStatusResponse,
    ): AnyVirtualDOM {
        return {
            tag: 'div',
            class: 'px-4',
            children: env.remotes.map((remote) => {
                const connection = env.currentConnection
                return new CloudEnvironmentView({ remote, connection })
            }),
        }
    }
}

export class CloudEnvironmentView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = ''
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        remote,
        connection,
    }: {
        remote: Local.Environment.CloudEnvironment
        connection: Local.Environment.Connection
    }) {
        const browserAuths = remote.authentications.filter(
            (auth) => auth.type === 'BrowserAuth',
        )
        const directAuths = remote.authentications.filter(
            (auth) => auth.type === 'DirectAuth',
        )
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'i',
                        class: `fas fa-cloud ${
                            remote.envId === connection.envId
                                ? 'text-success'
                                : 'text-secondary'
                        }`,
                    },
                    {
                        tag: 'i',
                        class: 'mx-2',
                    },
                    {
                        tag: 'div',
                        class: 'text-light',
                        innerText: remote.host,
                    },
                ],
            },
            {
                tag: 'div',
                class: 'px-3',
                children: [
                    this.authsSection(
                        'Browser',
                        remote.envId,
                        connection,
                        browserAuths,
                    ),
                    this.authsSection(
                        'Direct',
                        remote.envId,
                        connection,
                        directAuths,
                    ),
                ],
            },
        ]
    }

    private authsSection(
        type: 'Browser' | 'Direct',
        envId: string,
        connection: Local.Environment.Connection,
        auths: { authId: string }[],
    ): AnyVirtualDOM {
        return {
            tag: 'div',
            children: [
                {
                    tag: 'div',
                    children: auths.map(({ authId }) => {
                        const classes =
                            'btn w-100 my-1 btn-sm d-flex align-items-center ' +
                            (authId === connection.authId &&
                            envId === connection.envId
                                ? 'btn-info'
                                : 'btn-outline-info')
                        return {
                            tag: 'button',
                            class: classes,
                            children: [
                                {
                                    tag: 'i',
                                    class:
                                        type === 'Browser'
                                            ? 'fas fa-passport'
                                            : 'fas fa-id-card-alt',
                                },
                                {
                                    tag: 'i',
                                    class: 'mx-2',
                                },
                                {
                                    tag: 'div',
                                    innerText: authId,
                                },
                            ],
                            onclick: () => {
                                new Local.Client().api.environment
                                    .login$({
                                        body: { authId, envId },
                                    })
                                    .pipe(
                                        mergeMap(() => {
                                            return new Local.Client().api.environment.getStatus$()
                                        }),
                                    )
                                    .subscribe(() => {})
                            },
                        }
                    }),
                },
            ],
        }
    }
}

/**
 * @category View
 */
export class RegisteredBadgeView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex align-items-center'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike
    /**
     * @group Immutable DOM Constants
     */
    public readonly customAttributes: CustomAttribute

    constructor(userDetails: Accounts.SessionDetails) {
        this.customAttributes = {
            dataBSToggle: 'tooltip',
            title: userDetails.userInfo.name,
        }
        this.children = [
            {
                tag: 'div',
                class: 'text-light rounded text-center',
                style: {
                    fontWeight: 'bold',
                    fontSize: 'small',
                },
                innerText: userDetails.userInfo.name
                    .split(' ')
                    .map((name) => name.charAt(0))
                    .join(''),
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

    constructor({ state, router }: { state: AppState; router: Router }) {
        Object.assign(
            this,
            internalAnchor({ path: '/environment/backends', router }),
        )
        this.children = [
            child$({
                source$: state.environment$.pipe(
                    map((env) => env.proxiedBackends),
                ),
                vdomMap: (proxieds) => {
                    return proxieds.store.length == 0
                        ? { tag: 'i' }
                        : { tag: 'i', class: 'fas fa-network-wired me-1' }
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

    constructor({ state, router }: { state: AppState; router: Router }) {
        Object.assign(
            this,
            internalAnchor({ path: '/environment/esm-servers', router }),
        )
        this.children = [
            child$({
                source$: state.environment$.pipe(
                    map((env) => env.proxiedEsmServers),
                ),
                vdomMap: (proxieds) => {
                    return proxieds.store.length == 0
                        ? { tag: 'i' }
                        : { tag: 'i', class: 'fas fa-laptop-code me-1' }
                },
            }),
        ]
    }
}
