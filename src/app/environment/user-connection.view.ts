import {
    AnyVirtualDOM,
    ChildrenLike,
    CustomAttribute,
    VirtualDOM,
} from 'rx-vdom'
import { mergeMap } from 'rxjs/operators'
import { Accounts, Local } from '@w3nest/http-clients'
import { MdWidgets, parseMd } from 'mkdocs-ts'

export class CloudsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly class = ''

    public readonly children: ChildrenLike

    constructor({ env }: { env: Local.Environment.EnvironmentStatusResponse }) {
        this.children = [
            {
                tag: 'div',
                children: env.remotes.map((remote) => {
                    return {
                        tag: 'p',
                        children: [
                            new MdWidgets.NoteView({
                                level:
                                    remote.envId === env.currentConnection.envId
                                        ? 'hint'
                                        : 'info',
                                icon: 'fas fa-cloud',
                                label: remote.host,
                                content: new CloudEnvironmentView({
                                    remote,
                                    connection: env.currentConnection,
                                }),
                                expandable: true,
                                parsingArgs: {},
                            }),
                        ],
                    }
                }),
            },
        ]
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
                        class: `fas fa-shield-alt`,
                    },
                    {
                        tag: 'i',
                        class: 'mx-1',
                    },
                    {
                        tag: 'div',
                        class: '',
                        innerText: 'Authentications:',
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
            { tag: 'div', class: 'my-2' },
            parseMd({
                src: `**Open ID base URL**: ${remote.authProvider.openidBaseUrl}`,
            }),
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
                        const text =
                            authId === connection.authId &&
                            envId === connection.envId
                                ? `${authId} (connected)`
                                : authId
                        const classes =
                            'w-100 my-1 d-flex align-items-center ' +
                            (authId === connection.authId &&
                            envId === connection.envId
                                ? 'text-success'
                                : 'text-secondary')
                        return {
                            tag: 'div',
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
                                    innerText: text,
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
export class UserInfo implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike
    /**
     * @group Immutable DOM Constants
     */
    public readonly customAttributes: CustomAttribute

    constructor(session: Accounts.SessionDetails) {
        const hSep = { tag: 'i' as const, class: 'mx-1' }
        const groupView: AnyVirtualDOM = {
            tag: 'ul',
            children: session.userInfo.groups.map((g) => ({
                tag: 'li' as const,
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'i',
                        class: g.id.startsWith('private')
                            ? 'fas fa-user'
                            : 'fas fa-users',
                    },
                    hSep,
                    {
                        tag: 'div',
                        innerText: g.path,
                    },
                    hSep,
                    hSep,
                    {
                        tag: 'a',
                        href: `@nav/explorer/${g.id}`,
                        children: [
                            {
                                tag: 'button',
                                class: 'btn btn-sm btn-light fas fa-folder-open',
                            },
                        ],
                    },
                ],
            })),
        }
        this.children = [
            new MdWidgets.NoteView({
                level: 'info',
                icon: 'fas fa-user',
                label: 'User Info',
                expandable: true,
                content:
                    `*  **E-mail**: ${session.userInfo.email}\n` +
                    `*  **Account Manager**: ${session.accountManagerUrl}\n\n` +
                    `**Groups**:\n<groups></groups>`,
                parsingArgs: {
                    views: {
                        groups: () => groupView,
                    },
                },
            }),
        ]
    }
}
