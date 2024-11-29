import { attr$, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { AppState } from './app-state'
import { Views } from 'mkdocs-ts'
import { DisconnectedView } from './disconnected.view'

export class AppView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 h-100'
    public readonly style = {
        position: 'relative' as const,
    }
    public readonly children: ChildrenLike
    public readonly appState: AppState

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)

        const mainView = new Views.DefaultLayoutView({
            router: this.appState.router,
            footer: () => {
                return parent.document === document
                    ? new Views.FooterView()
                    : { tag: 'div' }
            },
            bookmarks$: this.appState.bookmarks$,
        })
        this.children = [
            {
                tag: 'div',
                class: attr$({
                    source$: this.appState.appMode$,
                    vdomMap: (mode) => {
                        return mode === 'docRemoteBelow'
                            ? 'h-50 w-100 border'
                            : 'h-100 w-100'
                    },
                }),
                children: [mainView],
            },
            child$({
                source$: this.appState.appMode$,
                vdomMap: (mode) => {
                    if (mode !== 'docRemoteBelow') {
                        return { tag: 'div' }
                    }
                    return {
                        tag: 'div',
                        class: 'w-100 h-50',
                        children: [
                            {
                                tag: 'iframe',
                                width: '100%',
                                height: '100%',
                                src: getCompanionDocHref(this.appState),
                            },
                        ],
                    }
                },
            }),
            new DisconnectedView({ appState: this.appState }),
        ]
    }
}

export function getCompanionDocHref(appState: AppState) {
    const location = document.location
    const parameters = `appMode=docCompanion&channelId=${appState.navBroadcastChannel.name}`
    if (location.search.startsWith('?nav=/doc')) {
        return `${document.location.href}&${parameters}`
    }
    return `${location.pathname}?nav=/doc&${parameters}`
}
