import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Local } from '@w3nest/http-clients'
import { parseMd, Router } from 'mkdocs-ts'
import {
    ComponentCrossLinksView,
    LogsExplorerView,
    styleShellStdOut,
} from '../../common'
import { AppState } from '../../app-state'
import { Observable, scan } from 'rxjs'
import { map } from 'rxjs/operators'

export class EsmServerView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        esmServer,
        appState,
        router,
    }: {
        esmServer: Local.Environment.ProxiedEsmServer
        appState: AppState
        router: Router
    }) {
        const logs$ = appState.esmServersState.getStdOut$(esmServer.uid)

        const srcConsoleOutputs = esmServer.pid
            ? `<consoleOutputs></consoleOutputs>`
            : 'The server is not owned by py-youwol, console outputs not available.'

        this.children = [
            parseMd({
                src: `
# ${esmServer.package} 

<header></header>

---

**Version**: ${esmServer.version}

**Serving Port**: ${esmServer.port}

---
## Console Outputs 

${srcConsoleOutputs}

---

## Dispatch Logs 

<dispatchLogs></dispatchLogs>
`,
                router,
                views: {
                    header: () => {
                        return new ComponentCrossLinksView({
                            appState,
                            component: esmServer.package,
                        })
                    },
                    consoleOutputs: () => {
                        return new ConsoleOutputsView({
                            logs$,
                            maxCount: appState.esmServersState.maxStdOutCount,
                        })
                    },
                    dispatchLogs: () => {
                        return new LogsExplorerView({
                            rootLogs$: appState.esmServersState
                                .getDispatchLogs$(esmServer.uid)
                                .pipe(
                                    scan((acc, e) => [...acc, e], []),
                                    map((logs) => ({ logs })),
                                ),
                            title: 'Dispatch Logs',
                        })
                    },
                },
            }),
        ]
    }
}

class ConsoleOutputsView implements VirtualDOM<'pre'> {
    public readonly tag = styleShellStdOut.tag
    public readonly class = styleShellStdOut.class
    public readonly style = styleShellStdOut.style
    public readonly children: ChildrenLike

    constructor({
        logs$,
        maxCount,
    }: {
        logs$: Observable<{ text: string }>
        maxCount: number
    }) {
        const displayed$ = logs$.pipe(
            scan((acc, e) => [...acc, e].slice(0, maxCount), []),
        )
        this.children = {
            policy: 'replace',
            source$: displayed$,
            vdomMap: (elems: { text: string }[]) => {
                return [...elems.reverse()].map(({ text }) => ({
                    tag: 'div' as const,
                    innerText: text,
                }))
            },
        }
    }
}
