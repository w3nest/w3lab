import { AppState } from '../../app-state'
import { Navigation, parseMd, Router, Views } from 'mkdocs-ts'
import { append$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import {
    AssetDownloadEvent,
    BackendInstallFlow,
    BackendInstallEvent,
    State,
} from './state'
import { map } from 'rxjs/operators'
import { BackendInstallNotificationView } from './backend/views'
import { merge } from 'rxjs'
import { AssetDownloadNotificationView } from './asset/views'

export * from './state'

export const navigation = (appState: AppState): Navigation => ({
    name: 'Notifications',
    html: ({ router }) => new PageView({ router, appState }),
    tableOfContent: Views.tocView,
    decoration: { icon: { tag: 'i', class: 'fas fa-envelope-open-text' } },
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState, router }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Notifications

<info>
This page gathers notifications about ongoing installations.

</info>

<notifications></notifications>
                `,
                router,
                views: {
                    notifications: () => {
                        return new NotificationsView({
                            state: appState.notificationsState,
                            router,
                        })
                    },
                },
            }),
        ]
    }
}

function isBackendInstallEvent(data: unknown): data is BackendInstallFlow {
    return (data as BackendInstallFlow).installId !== undefined
}

function isAssetDownloadEvent(data: unknown): data is AssetDownloadEvent {
    return (data as AssetDownloadEvent).rawId !== undefined
}

export class NotificationsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ state, router }: { state: State; router: Router }) {
        const backend$ = state.backendEvents.startInstall$
        const asset$ = state.assetEvents.enqueuedDownload$
        this.children = append$({
            policy: 'append',
            source$: merge(backend$, asset$).pipe(map((b) => [b])),
            vdomMap: (event) => {
                if (isBackendInstallEvent(event)) {
                    return new BackendInstallNotificationView({
                        router,
                        event,
                        state,
                    })
                }
                if (isAssetDownloadEvent(event)) {
                    return new AssetDownloadNotificationView({
                        event,
                        router,
                        state,
                    })
                }
            },
        })
    }
}
