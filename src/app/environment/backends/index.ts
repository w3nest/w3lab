import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import {
    DefaultLayout,
    MdWidgets,
    Navigation,
    parseMd,
    Router,
    LazyRoutesReturn,
} from 'mkdocs-ts'
import { AppState } from '../../app-state'
import { Local } from '@w3nest/http-clients'
import { map } from 'rxjs/operators'
import { BackendView, TerminateButton } from './backend.view'
import { InstancesListView, PartitionView } from './partition.view'
import { ExpandableGroupView } from '../../common/expandable-group.view'
import { defaultLayout } from '../../common/utils-nav'

export * from './state'

function backendName(backend: Local.Environment.ProxiedBackend) {
    return `${backend.name}#${backend.version}`
}

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Backends',
    header: { icon: { tag: 'i', class: 'fas fa-server' } },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    routes: appState.environment$.pipe(
        map((env) => ({ path, router }: { path: string; router: Router }) => {
            return lazyResolver(path, env, router, appState)
        }),
    ),
})

function lazyResolver(
    path: string,
    env: Local.Environment.EnvironmentStatusResponse,
    router: Router,
    appState: AppState,
): LazyRoutesReturn<DefaultLayout.NavLayout, DefaultLayout.NavHeader> {
    const parts = path.split('/').filter((d) => d !== '')
    if (parts.length === 0) {
        const partitions = new Set(
            env.proxiedBackends.store.map((backend) => backend.partitionId),
        )
        const children = [...partitions].map((partition) => {
            return {
                name: partition.split('~')[0],
                id: partition,
                header: {
                    icon: {
                        tag: 'i' as const,
                        class: 'fas fa-network-wired',
                    },
                },
                layout: defaultLayout(
                    () =>
                        new PartitionView({ partitionId: partition, appState }),
                ),
            }
        })
        return children.reduce((acc, c) => ({ ...acc, [`/${c.id}`]: c }), {})
    }
    if (parts.length === 1) {
        const children = env.proxiedBackends.store
            .filter((backend) => backend.partitionId === parts[0])
            .map((backend) => {
                return {
                    name: backendName(backend),
                    id: backend.uid,
                }
            })
            .sort((a, b) => a['name'].localeCompare(b['name']))
            .map(({ name, id }) => {
                const backend = env.proxiedBackends.store.find(
                    (backend) => backend.uid === id,
                )
                return {
                    name,
                    id,
                    leaf: true,
                    decoration: {
                        icon: {
                            tag: 'i' as const,
                            class: 'fas fa-terminal',
                        },
                    },
                    layout: defaultLayout(() => {
                        return new BackendView({
                            backend,
                            router,
                            appState,
                        })
                    }),
                }
            })
        return children.reduce((acc, c) => ({ ...acc, [`/${c.id}`]: c }), {})
    }
}

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router, appState }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Backends

<info>
This page gathers information related to the running backends.
</info>


**Partitions**

<instances></instances>
`,
                router,
                views: {
                    instances: () => new PartitionsListView({ appState }),
                },
            }),
        ]
    }
}

export class PartitionsListView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ appState }: { appState: AppState }) {
        this.children = replace$({
            policy: 'replace',
            source$: appState.environment$,
            vdomMap: (env) => {
                const backends = env.proxiedBackends
                if (backends.store.length === 0) {
                    return [
                        new MdWidgets.NoteView({
                            level: 'info',
                            content: 'No backends are currently running.',
                            parsingArgs: {},
                        }),
                    ]
                }
                const partitions = new Set(
                    backends.store.map((backend) => backend.partitionId),
                )
                return [...partitions].map((partitionId) => {
                    const count = backends.store.filter(
                        (backend) => backend.partitionId === partitionId,
                    ).length
                    return new ExpandableGroupView({
                        icon: 'fas fa-network-wired',
                        title: {
                            tag: 'div',
                            class: 'd-flex align-items-center w-100',
                            children: [
                                {
                                    tag: 'a',
                                    href: `@nav/environment/backends/${partitionId}`,
                                    innerText: `${partitionId.split('~')[0]}`,
                                    onclick: (ev: MouseEvent) => {
                                        ev.preventDefault()
                                        appState.router.fireNavigateTo({
                                            path: `/environment/backends/${partitionId}`,
                                        })
                                    },
                                },
                                {
                                    tag: 'i',
                                    class: 'mx-2',
                                },
                                {
                                    tag: 'div',
                                    innerText: `${count} instance(s)`,
                                },
                            ],
                        },
                        content: () => {
                            return {
                                tag: 'div',
                                class: 'py-2',
                                children: [
                                    {
                                        tag: 'div',
                                        style: { fontWeight: 'bolder' },
                                        innerText: 'Running Instances:',
                                    },
                                    new InstancesListView({
                                        appState,
                                        partitionId,
                                    }),
                                    {
                                        tag: 'div',
                                        class: 'my-4',
                                    },
                                    new TerminateButton({
                                        uid: partitionId,
                                        router: appState.router,
                                    }),
                                ],
                            }
                        },
                    })
                })
            },
        })
    }
}
