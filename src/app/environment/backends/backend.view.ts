import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { AppState } from '../../app-state'
import { parseMd, Router, MdWidgets } from '@youwol/mkdocs-ts'
import { debounceTime, merge, Observable, of } from 'rxjs'
import { filter, map, mergeMap, shareReplay } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ComponentCrossLinksView, LogsExplorerView } from '../../common'
import { ExpandableGroupView } from '../../common/expandable-group.view'

export class BackendView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        backend,
        router,
        appState,
    }: {
        backend: Local.Environment.ProxiedBackend
        appState: AppState
        router: Router
    }) {
        const logs$ = merge(
            of({ name: backend.name, version: backend.version }),
            appState.backendsState.response$,
        ).pipe(
            filter(
                (resp) =>
                    resp.name == backend.name &&
                    resp.version == backend.version,
            ),
            debounceTime(500),
            mergeMap(() =>
                new Local.Client().api.system.queryBackendLogs$({
                    name: backend.name,
                    version: backend.version,
                }),
            ),
            raiseHTTPErrors(),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        this.children = [
            parseMd({
                src: `
# ${backend.name} 

<header></header>

---

<status></status>


**Version**: ${backend.version}

<config></config>

You can find the associated component in your database [here](@nav/components/backends/${window.btoa(backend.name)}).

---



## Server outputs 

<backendOut></backendOut>

## Logs 

<backendLogs></backendLogs>
`,
                router,
                views: {
                    header: () => {
                        return new ComponentCrossLinksView({
                            appState,
                            component: backend.name,
                        })
                    },
                    config: () => {
                        return new ConfigView({ backend })
                    },
                    status: () => {
                        return new StatusView({ ...backend, router, appState })
                    },
                    backendLogs: () => {
                        return new LogsExplorerView({
                            rootLogs$: logs$,
                            title: 'Backend logs',
                            showHeaderMenu: false,
                        })
                    },
                    backendOut: () => {
                        return new OutputsView({
                            logs$,
                        })
                    },
                },
            }),
        ]
    }
}

class OutputsView implements VirtualDOM<'pre'> {
    public readonly tag = 'pre'
    public readonly children: ChildrenLike
    public readonly style = {
        backgroundColor: 'black',
        color: 'white',
        fontSize: 'smaller',
        minHeight: '25vh',
        maxHeight: '50vh',
    }
    constructor({
        logs$,
        reverse,
    }: {
        logs$: Observable<Local.System.BackendLogsResponse>
        reverse?: boolean
    }) {
        this.children = {
            policy: 'replace',
            source$: logs$,
            vdomMap: (resp: Local.System.BackendLogsResponse) => {
                const outputs = reverse
                    ? resp.server_outputs.reverse()
                    : resp.server_outputs
                return outputs.map((text) => ({
                    tag: 'div',
                    innerText: text,
                }))
            },
        }
    }
}

export class TerminateButton implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class =
        'btn btn-small btn-light d-flex align-items-center justify-content-center border rounded p-1 fv-pointer my-1 text-danger'

    public readonly style = {
        width: 'fit-content',
        fontSize: 'inherit' as const,
    }
    public readonly children: ChildrenLike
    constructor({ uid, router }: { uid: string; router: Router }) {
        this.children = [
            {
                tag: 'i',
                class: 'fas fa-ban me-1',
            },
            {
                tag: 'div',
                innerText: 'Terminate',
                onclick: () => {
                    new Local.Client().api.system
                        .terminateBackend$({
                            uid,
                        })
                        .subscribe(() =>
                            router.navigateTo({
                                path: '/environment/backends',
                            }),
                        )
                },
            },
        ]
    }
}

export class StatusView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        uid,
        router,
    }: {
        appState: AppState
        uid: string
        router: Router
    }) {
        const backends$ = appState.environment$.pipe(
            map((resp) => resp.proxiedBackends),
        )
        this.children = [
            {
                source$: backends$,
                vdomMap: ({
                    store,
                }: {
                    store: Local.Environment.ProxiedBackend[]
                }) => {
                    if (store.find((b) => b.uid === uid)) {
                        return new TerminateButton({ uid, router })
                    }
                    return new MdWidgets.NoteView({
                        level: 'warning',
                        content: 'This backend is not running anymore.',
                        parsingArgs: {},
                    })
                },
            },
        ]
    }
}

export class ConfigView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly backend: Local.Environment.ProxiedBackend

    constructor(params: { backend: Local.Environment.ProxiedBackend }) {
        Object.assign(this, params)
        this.children = [
            new ExpandableGroupView({
                icon: 'fas fa-wrench',
                title: 'Configuration',
                content: () => {
                    return this.content()
                },
            }),
        ]
    }

    private content(): AnyVirtualDOM {
        return {
            tag: 'div',
            class: 'p-2',
            children: [this.buildSection()],
        }
    }

    private buildSection(): AnyVirtualDOM {
        if (Object.keys(this.backend.configuration.build).length === 0) {
            return {
                tag: 'div',
                style: {
                    fontWeight: 'bolder',
                },
                innerText: 'No build arguments',
            }
        }
        return {
            tag: 'div',
            children: [
                {
                    tag: 'div',
                    style: {
                        fontWeight: 'bolder',
                    },
                    innerText: 'Build arguments:',
                },
                {
                    tag: 'ul',
                    children: Object.entries(
                        this.backend.configuration.build,
                    ).map(([k, v]) => {
                        return {
                            tag: 'li',
                            class: 'd-flex align-items-center',
                            children: [
                                {
                                    tag: 'div',
                                    innerText: `${k} :`,
                                },
                                {
                                    tag: 'div',
                                    class: 'ps-2 mkdocs-text-2',
                                    innerText: `'${v}'`,
                                },
                            ],
                        }
                    }),
                },
            ],
        }
    }
}
