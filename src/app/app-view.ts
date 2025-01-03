import { attr$, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
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

        const mainView = new DefaultLayout.View({
            router: this.appState.router,
            page: ({ router }) =>
                new DefaultLayout.PageView({
                    router,
                    filter: (d) => {
                        const prefixCompanion =
                            this.appState.companionPage$.value
                        if (prefixCompanion === undefined) {
                            return true
                        }
                        return !d.path.startsWith(prefixCompanion)
                    },
                }),
            bookmarks$: this.appState.bookmarks$,
        })
        this.children = [
            {
                tag: 'div',
                class: 'h-100',
                style: attr$({
                    source$: this.appState.companionPage$,
                    vdomMap: (d) =>
                        d === undefined ? { width: '100%' } : { width: '60%' },
                }),
                children: [mainView],
            },
            child$({
                source$: this.appState.companionPage$,
                vdomMap: (target) => {
                    if (target === undefined) {
                        return { tag: 'div' }
                    }
                    if (this.appState.router.parseUrl().path === target) {
                        this.appState.router.fireNavigateTo({ path: '/' })
                    }
                    return {
                        tag: 'div',
                        class: 'h-100 px-5 pt-5 overflow-auto',
                        style: {
                            width: '40%',
                        },
                        children: [
                            new DefaultLayout.PageView({
                                router: this.appState.router,
                                filter: (d) => {
                                    return d.path.startsWith(target)
                                },
                            }),
                        ],
                    }
                },
            }),
            new DisconnectedView({ appState: this.appState }),
        ]
    }
}
