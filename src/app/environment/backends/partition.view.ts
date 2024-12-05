import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { parseMd } from 'mkdocs-ts'
import { AppState } from '../../app-state'
import { TerminateButton } from './backend.view'

export class PartitionView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor(params: { partitionId: string; appState: AppState }) {
        const { partitionId, appState } = params
        this.children = [
            parseMd({
                src: `
# Partition ${partitionId.split('~')[0]}

**Id:** ${partitionId}

<terminate></terminate>

**Running Instances**

<instances></instances>
`,
                views: {
                    instances: () =>
                        new InstancesListView({ appState, partitionId }),
                    terminate: () =>
                        new TerminateButton({
                            uid: partitionId,
                            router: appState.router,
                        }),
                },
            }),
        ]
    }
}

export class InstancesListView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        partitionId,
    }: {
        appState: AppState
        partitionId: string
    }) {
        this.children = replace$({
            policy: 'replace',
            source$: appState.environment$,
            vdomMap: (env) => {
                return env.proxiedBackends.store
                    .filter((backend) => backend.partitionId === partitionId)
                    .map((backend) => {
                        return {
                            tag: 'li',
                            class: 'w-100 d-flex ps-3 align-items-center',
                            children: [
                                {
                                    tag: 'i',
                                    class: 'fas fa-terminal',
                                },
                                {
                                    tag: 'i',
                                    class: 'mx-2',
                                },
                                {
                                    tag: 'a',
                                    href: `@nav/environment/backends/${partitionId}/${backend.uid}`,
                                    innerText: `${backend.name}#${backend.version}`,
                                    onclick: (ev: MouseEvent) => {
                                        ev.preventDefault()
                                        appState.router.navigateTo({
                                            path: `/environment/backends/${partitionId}/${backend.uid}`,
                                        })
                                    },
                                },
                                {
                                    tag: 'i',
                                    class: 'flex-grow-1',
                                },
                                {
                                    tag: 'div',
                                    innerText: new Date(
                                        backend.startedAt * 1000,
                                    ).toLocaleString(),
                                },
                            ],
                        }
                    })
            },
        })
    }
}
