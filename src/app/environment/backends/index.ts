import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import {
    MdWidgets,
    Navigation,
    parseMd,
    Router,
    Views,
} from '@youwol/mkdocs-ts'
import { AppState } from '../../app-state'
import { Local } from '@w3nest/http-clients'
import { map } from 'rxjs/operators'
import { BackendView, TerminateButton } from './backend.view'
import { InstancesListView, PartitionView } from './partition.view'
import { ExpandableGroupView } from '../../common/expandable-group.view'

export * from './state'

function backendName(backend: Local.Environment.ProxiedBackend) {
    return `${backend.name}#${backend.version}`
}

export const navigation = (appState: AppState): Navigation => ({
    name: 'Backends',
    decoration: { icon: { tag: 'i', class: 'fas fa-server me-2' } },
    tableOfContent: Views.tocView,
    html: ({ router }) => new PageView({ router, appState }),
    '...': appState.environment$.pipe(
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
) {
    const parts = path.split('/').filter((d) => d != '')
    if (parts.length === 0) {
        const partitions = new Set(
            env.youwolEnvironment.proxiedBackends.map(
                (backend) => backend.partitionId,
            ),
        )
        const children = [...partitions].map((partition) => {
            return {
                name: partition.split('~')[0],
                id: partition,
                decoration: {
                    icon: {
                        tag: 'i' as const,
                        class: 'fas fa-network-wired me-2',
                    },
                },
            }
        })
        return {
            children: children,
            html: undefined,
        }
    }
    if (parts.length === 1) {
        const children = env.youwolEnvironment.proxiedBackends
            .filter((backend) => backend.partitionId == parts[0])
            .map((backend) => {
                return {
                    name: backendName(backend),
                    id: backend.uid,
                }
            })
            .sort((a, b) => a['name'].localeCompare(b['name']))
            .map(({ name, id }) => {
                return {
                    name,
                    id,
                    leaf: true,
                    decoration: {
                        icon: {
                            tag: 'i' as const,
                            class: 'fas fa-terminal me-2',
                        },
                    },
                }
            })
        return {
            children,
            html: () => new PartitionView({ partitionId: parts[0], appState }),
        }
    }
    const backend = env.youwolEnvironment.proxiedBackends.find(
        (backend) => backend.uid === parts[1],
    )
    return {
        tableOfContent: Views.tocView,
        children: [],
        html: () => {
            return new BackendView({
                backend,
                router,
                appState,
            })
        },
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
        this.children = {
            policy: 'replace',
            source$: appState.environment$,
            vdomMap: (env: Local.Environment.EnvironmentStatusResponse) => {
                const backends = env.youwolEnvironment.proxiedBackends
                if (backends.length === 0) {
                    return [
                        new MdWidgets.NoteView({
                            level: 'info',
                            content: 'No backends are currently running.',
                            parsingArgs: {},
                        }),
                    ]
                }
                const partitions = new Set(
                    backends.map((backend) => backend.partitionId),
                )
                return [...partitions].map((partitionId) => {
                    const count = backends.filter(
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
                                        appState.router.navigateTo({
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
        }
    }
}
