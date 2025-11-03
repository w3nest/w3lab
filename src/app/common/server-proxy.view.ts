import { Local } from '@w3nest/http-clients'
import { append$, attr$, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject, map, Observable } from 'rxjs'
import { LogsExplorerTree } from './logs.view'

export class ServerProxyView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    public readonly mode$ = new BehaviorSubject<'stdOut' | 'log'>('log')

    constructor({
        logs$,
        stdOuts$,
    }: {
        logs$: Observable<Local.System.LogsResponse>
        stdOuts$: Observable<{ text: string }>
    }) {
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'button',
                        class: attr$({
                            source$: this.mode$,
                            vdomMap: (mode): string =>
                                mode === 'log' ? 'btn-primary' : 'btn-light',
                            wrapper: (d) => `${d} btn btn-sm fas fa-list-ul`,
                        }),
                        onclick: () => this.mode$.next('log'),
                    },
                    { tag: 'div', class: 'mx-1' },
                    {
                        tag: 'button',
                        class: attr$({
                            source$: this.mode$,
                            vdomMap: (mode): string =>
                                mode === 'stdOut' ? 'btn-primary' : 'btn-light',
                            wrapper: (d) => `${d} btn btn-sm fas fa-terminal`,
                        }),
                        onclick: () => this.mode$.next('stdOut'),
                    },
                    { tag: 'div', class: 'mx-2' },
                    {
                        tag: 'div',
                        class: 'mkdocs-bg-warning mkdocs-text-0 p-2 rounded border d-flex align-items-center',
                        style: {
                            width: 'fit-content',
                        },
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-video',
                            },
                            { tag: 'i', class: 'mx-1' },
                            {
                                tag: 'div',
                                innerText: 'Streaming Activated',
                            },
                        ],
                    },
                ],
            },
            { tag: 'div', class: 'my-2' },
            child$({
                source$: this.mode$,
                vdomMap: (mode) => {
                    return mode === 'log'
                        ? new LogsExplorerTree({
                              firstLevelChildren$: logs$.pipe(
                                  map((resp) => resp.logs),
                              ),
                              stream: true,
                          })
                        : new StdOutsView({
                              stdOuts$,
                          })
                },
            }),
        ]
    }
}
class StdOutsView implements VirtualDOM<'pre'> {
    public readonly tag = 'pre'
    public readonly children: ChildrenLike
    public readonly style = {
        backgroundColor: 'black',
        color: 'white',
        fontSize: 'smaller',
        minHeight: '25vh',
        maxHeight: '100vh',
    }
    public readonly class = 'p-1'

    constructor({ stdOuts$ }: { stdOuts$: Observable<{ text: string }> }) {
        this.children = append$({
            policy: 'append',
            source$: stdOuts$.pipe(map((entry) => [entry])),
            vdomMap: (line) => {
                return {
                    tag: 'div',
                    innerText: line.text,
                }
            },
        })
    }
}
