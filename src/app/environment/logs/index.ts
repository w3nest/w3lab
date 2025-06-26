import { AppState } from '../../app-state'
import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { defaultLayout } from '../../common/utils-nav'
import { LogsExplorerTree } from '../../common/logs.view'
import { BehaviorSubject, map, merge, Subject, switchMap, tap } from 'rxjs'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Logs',
    header: { icon: { tag: 'i', class: 'fas fa-bug' } },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Logs

<logs></logs>

`,
                router,
                views: {
                    logs: () => new LogsView(),
                },
            }),
        ]
    }
}

class LogsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    private readonly refresh$ = new BehaviorSubject(true)
    private readonly pending$ = new BehaviorSubject(true)
    private readonly clear$ = new Subject<boolean>()

    constructor() {
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    this.clearBtn(),
                    {
                        tag: 'div',
                        class: 'mx-1',
                    },
                    this.refreshBtn(),
                ],
            },
            {
                tag: 'div',
                class: 'my-2',
            },
            new LogsExplorerTree({
                stream: false,
                pending$: this.pending$,
                firstLevelChildren$: merge(
                    this.refresh$,
                    this.clear$.pipe(
                        switchMap(() => {
                            return new Local.Client().api.system.clearLogs$()
                        }),
                    ),
                ).pipe(
                    switchMap(() => {
                        this.pending$.next(true)
                        return new Local.Client().api.system
                            .queryRootLogs$({
                                fromTimestamp: Date.now(),
                                maxCount: 1000,
                            })
                            .pipe(
                                raiseHTTPErrors(),
                                map(({ logs }) => logs),
                            )
                    }),
                    tap(() => this.pending$.next(false)),
                ),
            }),
        ]
    }

    private clearBtn(): AnyVirtualDOM {
        return {
            tag: 'button',
            class: `btn btn-danger btn-sm`,
            children: [
                {
                    tag: 'i',
                    class: 'fas fa-trash',
                },
            ],
            style: {
                width: 'fit-content',
            },
            onclick: () => {
                this.clear$.next(true)
            },
        }
    }
    private refreshBtn(): AnyVirtualDOM {
        return {
            tag: 'button',
            class: `btn btn-light btn-sm`,
            children: [
                {
                    tag: 'i',
                    class: 'fas fa-sync',
                },
            ],
            style: {
                width: 'fit-content',
            },
            onclick: () => {
                this.refresh$.next(true)
            },
        }
    }
}
