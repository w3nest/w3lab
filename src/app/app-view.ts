import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { AppState } from './app-state'
import { DefaultLayout } from 'mkdocs-ts'
import { DisconnectedView } from './disconnected.view'

export class AppView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 h-100 d-flex'
    public readonly style = {
        position: 'relative' as const,
    }
    public readonly children: ChildrenLike
    public readonly appState: AppState

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)
        const layout = new DefaultLayout.LayoutWithCompanion({
            router: this.appState.router,
            companionNodes$: this.appState.companionPage$,
            bookmarks$: this.appState.bookmarks$,
            displayOptions: {
                pageVertPadding: '2.5rem',
            },
            sideNavFooter: () =>
                new DefaultLayout.FooterView({
                    sourceName: '@w3nest/w3lab',
                    sourceUrl: 'https://github.com/w3nest/w3lab',
                }),
        })
        this.children = [
            layout,
            new DisconnectedView({ appState: this.appState }),
        ]
    }
}
