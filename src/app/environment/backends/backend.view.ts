import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { AppState } from '../../app-state'
import { parseMd, Router, MdWidgets } from 'mkdocs-ts'
import { debounceTime, merge, of } from 'rxjs'
import { filter, map, mergeMap, shareReplay } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ComponentCrossLinksView } from '../../common'
import { ServerProxyView } from '../../common/server-proxy.view'

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
                    resp.name === backend.name &&
                    resp.version === backend.version,
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
        const stdOuts$ = merge(
            of({
                name: backend.name,
                version: backend.version,
                text: '👂 Start Recording Std Outs',
            }),
            appState.backendsState.stdOut$,
        ).pipe(
            filter(
                (resp) =>
                    resp.name === backend.name &&
                    resp.version === backend.version,
            ),
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

---

## Logs

<logs></logs>

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
                    logs: () => {
                        return new ServerProxyView({
                            logs$,
                            stdOuts$,
                        })
                    },
                },
            }),
        ]
    }
}

export class TerminateButton implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class =
        'btn btn-small btn-light d-flex align-items-center justify-content-center border rounded p-1 w3lab-pointer my-1 text-danger'

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
                            router.fireNavigateTo({
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
            child$({
                source$: backends$,
                vdomMap: ({ store }) => {
                    if (store.find((b) => b.uid === uid)) {
                        return new TerminateButton({ uid, router })
                    }
                    return new MdWidgets.NoteView({
                        level: 'warning',
                        content: 'This backend is not running anymore.',
                        parsingArgs: {},
                    })
                },
            }),
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
            new MdWidgets.NoteView({
                level: 'info',
                expandable: true,
                icon: 'fas fa-wrench',
                label: 'Configuration',
                content: this.content(),
                parsingArgs: {},
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
