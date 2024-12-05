import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    replace$,
    VirtualDOM,
} from 'rx-vdom'
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs'
import { Local, Label, raiseHTTPErrors } from '@w3nest/http-clients'
import { ExpandableGroupView } from './expandable-group.view'
import { DataView } from './data.view'

type LabelMethod =
    | 'Label.ADMIN'
    | 'Label.API_GATEWAY'
    | 'Label.MIDDLEWARE'
    | 'Label.END_POINT'
    | 'Label.APPLICATION'
    | 'Label.LOG'

export const labelMethodIcons: Record<LabelMethod, string> = {
    'Label.ADMIN': 'fas fa-users-cog',
    'Label.API_GATEWAY': 'fas fa-door-open',
    'Label.MIDDLEWARE': 'fas fa-ghost',
    'Label.END_POINT': 'fas fa-microchip',
    'Label.APPLICATION': 'fas fa-play',
    'Label.LOG': 'fas fa-edit',
}
export const labelLogIcons = {
    'Label.LOG_WARNING': 'fas fa-exclamation-circle fv-text-focus',
    'Label.LOG_ERROR': 'fas fa-times fv-text-error',
    'Label.DONE': 'fas fa-flag',
}

export class LogsExplorerState {
    public readonly title: string
    public readonly t0$ = new BehaviorSubject(Date.now())
    public readonly rootLogs$: Observable<Local.System.QueryLogsResponse>

    public readonly logs$ = new ReplaySubject<Local.System.LogsResponse>(1)

    public readonly fetchingLogs$ = new BehaviorSubject<boolean>(false)

    public readonly stack$ = new BehaviorSubject<Local.System.LogResponse[]>([])

    private rootLogsResponse: Local.System.LogsResponse
    public delta: Record<string, number> = {}

    constructor(params: {
        rootLogs$: Observable<Local.System.QueryLogsResponse> | string
        title: string
    }) {
        Object.assign(this, params)

        if (typeof params.rootLogs$ === 'string') {
            this.rootLogs$ = new Local.Client().api.system
                .queryLogs$({
                    parentId: params.rootLogs$,
                })
                .pipe(raiseHTTPErrors())
        }
    }
    refresh() {
        this.fetchingLogs$.next(true)
        if (this.stack$.value.length === 0) {
            this.t0$.next(Date.now())
            this.rootLogs$.subscribe((response) => {
                this.logs$.next(response)
                this.rootLogsResponse = response
                this.fetchingLogs$.next(false)
            })
        } else {
            new Local.Client().api.system
                .queryLogs$({
                    parentId: this.stack$.value.slice(-1)[0].contextId,
                })
                .pipe(raiseHTTPErrors())
                .subscribe((response) => {
                    this.logs$.next(response)
                    this.fetchingLogs$.next(false)
                })
        }
    }

    elapsedTime(log: Local.System.LogResponse): number | undefined {
        return log.labels.includes('Label.STARTED') && this.delta[log.contextId]
    }

    clear() {
        this.expandLog()
        this.fetchingLogs$.next(true)
        new Local.Client().api.system.clearLogs$().subscribe(() => {
            this.refresh()
        })
    }

    expandLog(log?: Local.System.LogResponse) {
        if (!log) {
            this.stack$.next([])
            this.logs$.next(this.rootLogsResponse)
            return
        }
        const stack = this.stack$.value

        new Local.Client().api.system
            .queryLogs$({ parentId: log.contextId })
            .pipe(raiseHTTPErrors())
            .subscribe((response) => {
                //  `Label.DONE` is not always found (e.g., if an exception has been raised).
                const end =
                    response.logs.find((l) =>
                        l.labels.includes('Label.DONE'),
                    ) || response.logs.slice(-1)[0]
                this.delta[log.contextId] = end
                    ? Math.floor((end.timestamp - log.timestamp) / 1000)
                    : -1
                this.logs$.next(response)
                if (stack.includes(log)) {
                    const index = stack.indexOf(log)
                    this.stack$.next(stack.slice(0, index + 1))
                } else {
                    this.stack$.next([...this.stack$.value, log])
                }
            })
    }
}

export class LogsExplorerView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly class = `w-100 h-100 d-flex flex-column p-2`

    public readonly children: ChildrenLike

    public readonly state: LogsExplorerState

    public readonly style = {
        fontSize: 'smaller',
    }
    constructor(params: {
        rootLogs$: Observable<Local.System.QueryLogsResponse> | string
        title: string
        showHeaderMenu?: boolean
    }) {
        Object.assign(this, params)
        this.state = new LogsExplorerState({
            rootLogs$: params.rootLogs$,
            title: params.title,
        })
        this.children = [
            params.showHeaderMenu && clearButton(this.state),
            new StackView({ state: this.state }),
            new LogsListView({
                state: this.state,
            }),
        ]
        this.state.refresh()
    }
}

const stepIntoIcon = (
    state: LogsExplorerState,
    log?: Local.System.LogResponse,
): AnyVirtualDOM => ({
    tag: 'div',
    class: 'fas fa-sign-in-alt fv-text-focus fv-pointer',
    onclick: () => {
        if (log) {
            state.expandLog(log)
        } else {
            state.expandLog()
        }
    },
})

const refreshButton = (state: LogsExplorerState): AnyVirtualDOM => {
    return {
        tag: 'i',
        class: attr$({
            source$: state.fetchingLogs$,
            vdomMap: (isFetching): string =>
                isFetching
                    ? 'fas fa-spinner fa-spin'
                    : 'fas fa-sync  fv-pointer',
            wrapper: (d) => `${d} ms-1`,
        }),
        onclick: () => state.refresh(),
    }
}
const clearButton = (state: LogsExplorerState): AnyVirtualDOM => {
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
        onclick: () => state.clear(),
    }
}

const dateFormat = {
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
}

const rootElemStackView = (state: LogsExplorerState) =>
    new ExpandableGroupView({
        icon: {
            tag: 'div',
            ...labelsStyle,
            children: [
                {
                    tag: 'div',
                    innerText: attr$({
                        source$: state.t0$,
                        vdomMap: (t) =>
                            new Date(t).toLocaleTimeString([], dateFormat),
                    }),
                },
                {
                    tag: 'i',
                    class: 'fas fa-newspaper px-2',
                },
            ],
        },
        title: {
            tag: 'div',
            class: 'd-flex align-items-center',
            children: [
                stepIntoIcon(state),
                { tag: 'i', class: 'mx-1' },
                {
                    tag: 'div',
                    innerText: state.title,
                },
                { tag: 'i', class: 'mx-1' },
                child$({
                    source$: state.stack$,
                    vdomMap: (stack) =>
                        stack.length === 0
                            ? refreshButton(state)
                            : { tag: 'div' },
                }),
            ],
        },
        content: () => {
            return { tag: 'div' }
        },
    })

class StackView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly state: LogsExplorerState

    constructor(params: { state: LogsExplorerState }) {
        Object.assign(this, params)
        const items = (stack: Local.System.LogResponse[]) =>
            [
                rootElemStackView(this.state),
                ...stack.map((log) => {
                    return new LogView({
                        state: params.state,
                        log,
                    })
                }),
            ] as AnyVirtualDOM[]
        this.children = [
            {
                tag: 'div',
                children: replace$({
                    source$: this.state.stack$,
                    policy: 'replace',
                    vdomMap: (stack) => {
                        return items(stack).map((item, i) => {
                            return {
                                tag: 'div',
                                class: i === stack.length ? '' : 'text-muted',
                                style:
                                    i === stack.length
                                        ? { fontWeight: 'bolder' }
                                        : {},
                                children: [item],
                            }
                        })
                    },
                }),
            },
        ]
    }
}

class LogView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100'
    public readonly children: ChildrenLike
    public readonly state: LogsExplorerState
    public readonly log: Local.System.LogResponse
    constructor(params: {
        state: LogsExplorerState
        log: Local.System.LogResponse
    }) {
        Object.assign(this, params)
        this.children = [
            new ExpandableGroupView({
                title: new LogTitleView(params),
                icon: new LogLabelsView({
                    log: this.log,
                    state: this.state,
                }),
                content: () => new LogDetailsView({ log: this.log }),
            }),
        ]
    }
}

const labelsStyle = {
    class: 'd-flex align-items-center overflow-auto',
    style: {
        minHeight: '1.5rem',
        width: '33%',
    },
}
class LogLabelsView {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly connectedCallback: (elem: HTMLElement) => void
    public readonly state: LogsExplorerState
    public readonly log: Local.System.LogResponse

    constructor(params: {
        log: Local.System.LogResponse
        state: LogsExplorerState
    }) {
        Object.assign(this, params, labelsStyle)
        function isLabelMethod(l: unknown): l is LabelMethod {
            if (l === null || !(typeof l === 'string')) {
                return false
            }
            return labelMethodIcons[l as LabelMethod] !== undefined
        }
        const labelsView = this.log.labels
            .filter((label) => isLabelMethod(label))
            .map((label: LabelMethod) => {
                return {
                    tag: 'div' as const,
                    class: labelMethodIcons[label],
                }
            })
            .reduce((acc: AnyVirtualDOM[], e, index, array) => {
                acc.push(e)
                if (index < array.length - 1) {
                    acc.push({ tag: 'i', style: { marginRight: '2px' } })
                }
                return acc
            }, [])

        this.children = [
            {
                tag: 'i',
                innerText: new Date(
                    this.log.timestamp / 1000,
                ).toLocaleTimeString([], dateFormat),
            },
            {
                tag: 'div',
                class: 'd-flex  align-items-center px-2',
                children: labelsView,
            },
        ]
        this.connectedCallback = (elem: HTMLElement) => {
            elem.scrollLeft = elem.scrollWidth - elem.clientWidth
        }
    }
}
class LogTitleView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center'
    public readonly style = {
        maxWidth: '50%',
        minWidth: '50%',
    }
    public readonly state: LogsExplorerState
    public readonly log: Local.System.LogResponse
    public readonly children: ChildrenLike

    constructor(params: {
        state: LogsExplorerState
        log: Local.System.LogResponse
    }) {
        Object.assign(this, params)
        const isMethodCall = this.log.labels.includes('Label.STARTED')
        const labelsLogType: AnyVirtualDOM[] = this.log.labels
            .filter((label: Label) => labelLogIcons[label])
            .map((label) => {
                return {
                    tag: 'div',
                    class: `${labelLogIcons[label]} me-1`,
                }
            })
        const stepInto = stepIntoIcon(this.state, this.log)
        const labelStatus = {
            Failed: {
                tag: 'i' as const,
                class: 'fas fa-times text-danger me-1',
            },
            Unresolved: {
                tag: 'i' as const,
                class: 'fas fa-question-circle text-warning me-1',
            },
        }
        const labels = [
            this.log.status && labelStatus[this.log.status],
            ...labelsLogType,
            isMethodCall && stepInto,
        ].filter((l) => l !== undefined)

        const timingView: AnyVirtualDOM = this.state.elapsedTime(this.log) &&
            this.state.delta[this.log.contextId] && {
                tag: 'div',
                class: 'mx-2',
                innerText: `(${this.state.elapsedTime(this.log)}ms)`,
            }
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: labels,
            },
            { tag: 'i', class: 'mx-1' },
            {
                tag: 'div',
                class: 'overflow-auto',
                innerText: this.log.text,
            },
            timingView,
            this.log === this.state.stack$.value.slice(-1)[0] &&
                refreshButton(this.state),
            { tag: 'i', class: 'flex-grow-1', style: { minWidth: '0px' } },
        ]
    }
}

class LogDetailsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'py-2 overflow-auto'
    public readonly children: ChildrenLike
    public readonly log: Local.System.LogResponse
    public readonly style = {
        fontSize: 'small',
        fontWeight: 'normal' as const,
    }
    constructor(params: { log: Local.System.LogResponse }) {
        Object.assign(this, params)
        const attributes: AnyVirtualDOM[] = Object.entries(
            this.log.attributes,
        ).map(([k, v]) => {
            return {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'li',
                        innerText: `${k}:`,
                        style: {
                            fontWeight: 'bolder',
                        },
                    },
                    { tag: 'i', class: 'mx-1' },
                    {
                        tag: 'div',
                        innerText: v,
                    },
                ],
            }
        })
        const labels: AnyVirtualDOM[] = this.log.labels.map((l) => {
            return {
                tag: 'li',
                innerText: l,
            }
        })
        this.children = [
            {
                tag: 'ul',
                innerText: 'Attributes list:',
                children: attributes,
            },
            {
                tag: 'ul',
                innerText: 'Labels list:',
                children: labels,
            },
            {
                tag: 'ul',
                children: [new DataView(this.log.data, true)],
            },
        ]
    }
}

class LogsListView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 ps-3 bg-dark text-light border-left'
    public readonly children: ChildrenLike

    public readonly state: LogsExplorerState

    constructor(params: { state: LogsExplorerState }) {
        Object.assign(this, params)
        this.children = replace$({
            policy: 'replace',
            source$: this.state.logs$,
            vdomMap: (response) =>
                response.logs.map((log) => {
                    return new LogView({ state: this.state, log })
                }),
        })
    }
}
