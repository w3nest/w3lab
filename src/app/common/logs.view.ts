import { Local, raiseHTTPErrors } from '@w3nest/http-clients'
import { ImmutableTree, ObjectJs } from '@w3nest/ui-tk/Trees'
import { parseMd } from 'mkdocs-ts'
import {
    AnyVirtualDOM,
    attr$,
    AttributeLike,
    child$,
    ChildrenLike,
    EmptyDiv,
    replace$,
    sync$,
    VirtualDOM,
} from 'rx-vdom'
import { BehaviorSubject, combineLatest, map, Observable, tap } from 'rxjs'

export class LeafNode extends ImmutableTree.Node {
    public readonly log: Local.System.LogResponse
    public readonly level: number

    constructor({
        log,
        level,
    }: {
        log: Local.System.LogResponse
        level: number
    }) {
        super({
            id: log.contextId,
            children: undefined,
        })
        this.log = log
        this.level = level
    }
}

function toChildrenNode(logs: Local.System.LogResponse[], level: number) {
    return logs.map((log) => {
        return log.labels.includes('Label.STARTED')
            ? new LogNode({
                  log,
                  level: level + 1,
              })
            : new LeafNode({
                  log,
                  level: level + 1,
              })
    })
}
export class LogNode extends ImmutableTree.Node {
    public readonly name: string
    public readonly log: Local.System.LogResponse
    public readonly level: number
    constructor({
        log,
        level,
    }: {
        log: Local.System.LogResponse
        level: number
    }) {
        super({
            id: log.contextId,
            children: new Local.Client().api.system
                .queryLogs$({
                    parentId: log.contextId,
                })
                .pipe(
                    raiseHTTPErrors(),
                    map((resp) => {
                        return toChildrenNode(resp.logs, level)
                    }),
                ),
        })
        this.log = log
        this.level = level
    }
}
export class RootLogNode extends ImmutableTree.Node {
    public readonly name = 'Root'
    public readonly level = 0
    constructor(logs: Local.System.LogResponse[]) {
        super({
            id: 'root',
            children: toChildrenNode(logs, 0),
        })
    }
}

export type Node = RootLogNode | LogNode | LeafNode

export class LogsExplorerTree implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 overflow-auto'
    public readonly children: ChildrenLike
    public readonly pending$: BehaviorSubject<boolean>
    constructor({
        firstLevelChildren$,
        stream,
        pending$,
    }: {
        firstLevelChildren$: Observable<Local.System.LogResponse[]>
        stream: boolean
        pending$?: BehaviorSubject<boolean>
    }) {
        this.pending$ = pending$ ? pending$ : new BehaviorSubject(true)
        const toChildView = (child: Local.System.LogResponse) => {
            const rootNode = new LogNode({ log: child, level: 1 })
            const state = new ImmutableTree.State<Node>({
                rootNode,
                expandedNodes: ['root'],
            })
            return new ImmutableTree.View({
                state,
                headerView: (p) => {
                    return new LogHeaderView(p)
                },
            })
        }
        const orderOperator = (
            d0: Local.System.LogResponse,
            d1: Local.System.LogResponse,
        ) => {
            return d1.timestamp - d0.timestamp
        }
        const source$ = firstLevelChildren$.pipe(
            tap(() => this.pending$.next(false)),
            map((logs) => {
                return logs.filter((l) => l.labels.includes('Label.STARTED'))
            }),
        )
        const children = stream
            ? sync$({
                  policy: 'sync',
                  source$,
                  vdomMap: (child) => {
                      return toChildView(child)
                  },
                  comparisonOperator: (d1, d2) => d1.contextId === d2.contextId,
                  orderOperator,
              })
            : replace$({
                  policy: 'replace',
                  source$,
                  vdomMap: (children) => {
                      return children.sort(orderOperator).map(toChildView)
                  },
              })

        this.children = [
            {
                tag: 'div',
                class: attr$({
                    source$: this.pending$,
                    vdomMap: (pending) =>
                        pending ? 'mx-2 fas fa-spinner fa-spin' : '',
                }),
            },
            {
                tag: 'div',
                class: 'd-flex flex-column',
                children,
            },
        ]
    }
}

export class LogHeaderView implements VirtualDOM<'div'> {
    static readonly CssSelector =
        'w3lab-log-header w3lab-pointer w3lab-no-p-margin mb-1'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class: AttributeLike<string>

    constructor({
        node,
        expanded$,
        state,
    }: {
        node: Node
        expanded$: Observable<boolean>
        state: ImmutableTree.State<Node>
    }) {
        const handle = new ImmutableTree.DefaultHandleView({
            node,
            expanded$,
            state,
        })
        if (node instanceof RootLogNode) {
            this.class = LogHeaderView.CssSelector
            this.children = [handle]
            return
        }
        const { labels, attributes, data, text } = node.log

        const toggledData$ = new BehaviorSubject<boolean>(false)
        const toggledMetadata$ = new BehaviorSubject<boolean>(false)

        const isError = () => {
            if (Array.isArray(node.children)) {
                const error = node.children.find((l) => {
                    return (
                        l instanceof LogNode &&
                        l.log.labels.includes('Label.FAILED')
                    )
                })
                if (error) {
                    return true
                }
            }
            if (node.log.status === 'Failed') {
                return true
            }
            return false
        }
        function formatTimestamp(date: Date) {
            const pad = (n) => String(n).padStart(2, '0')
            return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
        }

        const date =
            node.level === 1
                ? {
                      tag: 'div' as const,
                      class: 'mx-1 bg-dark text-light rounded px-1',
                      style: { fontFamily: 'monospace', fontSize: '0.8rem' },
                      innerText: formatTimestamp(
                          new Date(node.log.timestamp / 1000),
                      ),
                  }
                : EmptyDiv
        this.class = attr$({
            source$: combineLatest([toggledData$, toggledMetadata$]),
            vdomMap: ([toggled1, toggled2]): string =>
                toggled1 || toggled2 ? 'border' : '',
            wrapper: (d) => {
                return `${d} ms-2 p-1 rounded ${LogHeaderView.CssSelector} ${isError() ? 'mkdocs-bg-danger' : ''}`
            },
        })

        const toggleClass$ = (faClass: string, toggled$: Observable<boolean>) =>
            attr$({
                source$: toggled$,
                vdomMap: (toggled): string =>
                    toggled ? 'btn-primary' : 'btn-light',
                wrapper: (d) => `${faClass} ${d} btn btn-sm mx-1`,
            })
        const icon = (): AnyVirtualDOM => {
            if (labels.includes('Label.DONE')) {
                return {
                    tag: 'i' as const,
                    class: 'fas fa-flag-checkered me-2',
                }
            }
            if (labels.includes('Label.FAILED')) {
                return {
                    tag: 'i' as const,
                    class: 'fas fa-times text-danger me-2',
                }
            }
            if (isError()) {
                return {
                    tag: 'i' as const,
                    class: 'fas fa-times text-danger me-2',
                }
            }

            return undefined
        }
        const title = () => {
            if (labels.includes('Label.DONE')) {
                return text.split(' in ')[1]
            }
            if (labels.includes('Label.STARTED')) {
                return text.replace('<START>', '')
            }
            return text
        }

        const dataView = (title: string, data: unknown) => ({
            tag: 'div' as const,
            style: {
                fontFamily: 'monospace',
                fontSize: '0.8rem',
            },
            children: [
                new ObjectJs.View({
                    state: new ObjectJs.State({
                        title,
                        data,
                        expandedNodes: [`${title}_0`],
                    }),
                }),
            ],
        })
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                style: {
                    whiteSpace: 'nowrap',
                },
                children: [
                    handle,
                    date,
                    icon(),
                    parseMd({ src: title() }),
                    data && Object.keys(data).length > 0
                        ? {
                              tag: 'button',
                              class: toggleClass$('fas fa-eye', toggledData$),
                              onclick: () =>
                                  toggledData$.next(!toggledData$.value),
                          }
                        : EmptyDiv,
                    {
                        tag: 'button',
                        class: toggleClass$('fas fa-tags', toggledMetadata$),
                        onclick: () =>
                            toggledMetadata$.next(!toggledMetadata$.value),
                    },
                ],
            },
            child$({
                source$: toggledData$,
                vdomMap: (toggled) => {
                    if (!toggled) {
                        return EmptyDiv
                    }
                    return dataView('data', data)
                },
            }),
            child$({
                source$: toggledMetadata$,
                vdomMap: (toggled) => {
                    if (!toggled) {
                        return EmptyDiv
                    }
                    return dataView('metadata', {
                        labels,
                        attributes,
                    })
                },
            }),
        ]
    }
}
