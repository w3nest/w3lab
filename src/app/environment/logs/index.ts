import { AppState } from '../../app-state'
import { Navigation, parseMd, Router, Views } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { LogsExplorerView } from '../../common/logs-explorer.view'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'

export const navigation = (appState: AppState): Navigation => ({
    name: 'Logs',
    decoration: { icon: { tag: 'i', class: 'fas fa-bug' } },
    tableOfContent: Views.tocView,
    html: ({ router }) => new PageView({ router, appState }),
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Logs

<logsView></logsView>

`,
                router,
                views: {
                    logsView: () =>
                        new LogsExplorerView({
                            rootLogs$: new Local.Client().api.system
                                .queryRootLogs$({
                                    fromTimestamp: Date.now(),
                                    maxCount: 1000,
                                })
                                .pipe(raiseHTTPErrors()),
                            showHeaderMenu: true,
                            title: 'Root logs',
                        }),
                },
            }),
        ]
    }
}
