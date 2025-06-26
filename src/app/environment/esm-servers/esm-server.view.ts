import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Local } from '@w3nest/http-clients'
import { parseMd, Router } from 'mkdocs-ts'
import { ComponentCrossLinksView } from '../../common'
import { AppState } from '../../app-state'

import { ServerProxyView } from '../../common/server-proxy.view'

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
        const stdOuts$ = appState.esmServersState.getStdOut$(esmServer.uid)
        const logs$ = appState.esmServersState.getDispatchLogs$(esmServer.uid)

        this.children = [
            parseMd({
                src: `
# ${esmServer.package} 

<header></header>

---

**Version**: ${esmServer.version}

**Serving Port**: ${esmServer.port}

---

## Logs

<logs></logs>
`,
                router,
                views: {
                    header: () => {
                        return new ComponentCrossLinksView({
                            appState,
                            component: esmServer.package,
                        })
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
