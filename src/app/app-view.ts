import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { AppState } from './app-state'
import { DefaultLayout } from 'mkdocs-ts'
import { DisconnectedView } from './disconnected.view'
import { AuthBadge } from '@w3nest/ui-tk/Badges'
import { Footer } from '@w3nest/ui-tk/Mkdocs'

export const footer = new Footer({
    license: 'MIT',
    copyrights: [
        { year: '2021-2024', holder: 'YouWol' },
        { year: '2025', holder: 'Guillaume Reinisch' },
    ],
    github: 'https://github.com/w3nest/w3lab',
})

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
            bookmarks$: this.appState.bookmarks$,
            topBanner: {
                logo: { icon: '../assets/favicon.svg', title: 'W3Lab' },
                expandedContent: new DefaultLayout.BookmarksView({
                    bookmarks$: this.appState.bookmarks$,
                    router: this.appState.router,
                }),
                badge: new AuthBadge(),
                zIndex: 1001,
            },
            footer,
            navFooter: true,
            displayOptions: {
                pageVertPadding: '3rem',
            },
            companionNodes$: this.appState.companionPage$,
        })
        this.children = [
            layout,
            new DisconnectedView({ appState: this.appState }),
        ]
    }
}
