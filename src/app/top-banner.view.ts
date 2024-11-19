import { Router, Views } from '@youwol/mkdocs-ts'
import {
    AnyVirtualDOM,
    ChildrenLike,
    VirtualDOM,
    CustomAttribute,
    RxAttribute,
} from '@youwol/rx-vdom'
import { Local, Accounts } from '@w3nest/http-clients'
import { AppState } from './app-state'
import { internalAnchor } from './common/links.view'
import { map, mergeMap } from 'rxjs/operators'
import { combineLatest } from 'rxjs'
import { CoLabLogo } from './common'

export class TopBannerView extends Views.TopBannerClassicView {
    constructor(params, appState: AppState) {
        super({
            ...params,
            title: new CoLabLogo({ router: appState.router }),
            logo: {
                tag: 'img',
                src: '../assets/logo.svg',
                style: {
                    height: '30px',
                },
            },
            badge: {
                tag: 'div',
                style: {
                    width: 'fit-content',
                },
                children: [
                    new UserBadgeDropdownView({
                        state: appState,
                    }),
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center justify-content-left my-1 ',
                        children: [
                            new NotificationsView({
                                state: appState,
                                router: appState.router,
                            }),
                            new BackendServingView({
                                state: appState,
                                router: appState.router,
                            }),
                            new EsmServingView({
                                state: appState,
                                router: appState.router,
                            }),
                        ],
                    },
                ],
            },
        })
    }
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

    constructor({ state, router }: { state: AppState; router: Router }) {
        const notifState = state.notificationsState
        this.class = {
            source$: combineLatest([
                notifState.backendEvents.installing$,
                notifState.assetEvents.downloading$,
            ]),
            vdomMap: ([install, download]: [unknown[], unknown[]]) => {
                return install.length + download.length === 0
                    ? 'd-none'
                    : 'd-flex align-items-center'
            },
        }
        this.children = [
            {
                ...internalAnchor({
                    path: '/environment/notifications',
                    router,
                }),
                children: [
                    {
                        tag: 'i',
                        class: {
                            source$: notifState.backendEvents.installing$,
                            vdomMap: (installing: unknown[]) => {
                                return installing.length > 0
                                    ? 'fas fa-plug text-success fv-blink me-1'
                                    : 'd-none'
                            },
                        },
                    },
                    { tag: 'i', class: 'mx-1' },
                    {
                        tag: 'i',
                        class: {
                            source$: notifState.assetEvents.downloading$,
                            vdomMap: (installing: unknown[]) => {
                                return installing.length > 0
                                    ? 'fas fa-download text-success fv-blink'
                                    : 'd-none'
                            },
                        },
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
            {
                source$: state.environment$.pipe(
                    mergeMap((env) => {
                        return new Accounts.AccountsClient()
                            .getSessionDetails$()
                            .pipe(map((session) => [session, env]))
                    }),
                ),
                vdomMap: ([sessionInfo, env]: [
                    Accounts.SessionDetails,
                    Local.Routers.Environment.EnvironmentStatusResponse,
                ]) => {
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
            },
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
        env: Local.Routers.Environment.EnvironmentStatusResponse,
    ): AnyVirtualDOM {
        return {
            tag: 'div',
            class: 'px-4',
            children: env.youwolEnvironment.remotes.map((remote) => {
                const connection = env.youwolEnvironment.currentConnection
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
        remote: Local.Routers.Environment.CloudEnvironment
        connection: Local.Routers.Environment.Connection
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
        connection: Local.Routers.Environment.Connection,
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
                                new Local.Client().admin.environment
                                    .login$({
                                        body: { authId, envId },
                                    })
                                    .pipe(
                                        mergeMap(() => {
                                            return new Local.Client().admin.environment.getStatus$()
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
            {
                source$: state.environment$.pipe(
                    map((env) => env.youwolEnvironment.proxiedBackends),
                ),
                vdomMap: (
                    proxieds: Local.Routers.Environment.ProxiedBackend[],
                ) => {
                    return proxieds.length == 0
                        ? { tag: 'i' }
                        : { tag: 'i', class: 'fas fa-network-wired me-1' }
                },
            },
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
            {
                source$: state.environment$.pipe(
                    map((env) => env.youwolEnvironment.proxiedEsmServers),
                ),
                vdomMap: (
                    proxieds: Local.Routers.Environment.ProxiedBackend[],
                ) => {
                    return proxieds.length == 0
                        ? { tag: 'i' }
                        : { tag: 'i', class: 'fas fa-laptop-code me-1' }
                },
            },
        ]
    }
}
