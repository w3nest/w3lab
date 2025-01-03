import { AppState } from '../../app-state'
import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { LogsExplorerView } from '../../common'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { defaultLayout } from '../../common/utils-nav'

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
