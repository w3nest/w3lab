import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CustomAttribute,
    VirtualDOM,
} from 'rx-vdom'
import { AppState } from '../app-state'
import { map, mergeMap } from 'rxjs/operators'
import { Accounts, Local, raiseHTTPErrors } from '@w3nest/http-clients'

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

    constructor({ appState }: { appState: AppState }) {
        this.children = [
            child$({
                source$: appState.environment$.pipe(
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
