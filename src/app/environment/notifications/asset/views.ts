import { ExpandableGroupView } from '../../../common/expandable-group.view'
import { AssetDownloadEvent, State } from '../state'
import { filter } from 'rxjs/operators'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { downloadIcon } from '../views'
import { Observable } from 'rxjs'
import { LogsExplorerView } from '../../../common/logs-explorer.view'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { Router } from 'mkdocs-ts'

export class AssetDownloadNotificationView extends ExpandableGroupView {
    constructor({
        event,
        state,
    }: {
        event: AssetDownloadEvent
        state: State
        router: Router
    }) {
        const message$ = state.assetEvents.download$.pipe(
            filter((d) => d.rawId === event.rawId),
        )
        const statusIcon: AnyVirtualDOM = {
            tag: 'div',
            class: {
                source$: message$,
                vdomMap: (m: Local.System.DownloadEvent) => {
                    const factory = {
                        succeeded: 'fa-check text-success',
                        failed: 'fa-times text-danger',
                        enqueued: 'fa-clock text-warning',
                        started: 'fa-spinner fa-spin text-warning',
                    }
                    return `fas ${factory[m.type]}`
                },
                untilFirst: 'fas fa-spinner fa-spin',
            },
        }
        super({
            expanded: false,
            icon: downloadIcon(statusIcon),
            title: new HeaderAssetInstallView(event),
            content: () =>
                new ContentAssetInstallView({ notification$: message$ }),
        })
    }
}

export class ContentAssetInstallView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = ''
    public readonly children: ChildrenLike

    constructor({
        notification$,
    }: {
        notification$: Observable<AssetDownloadEvent>
    }) {
        this.children = [
            {
                tag: 'div',
                style: {
                    fontWeight: 'bolder',
                },
                innerText: {
                    source$: notification$,
                    vdomMap: (m: AssetDownloadEvent) => {
                        const factory = {
                            succeeded:
                                'The asset has been installed successfully.',
                            failed: 'An error occurred while downloading the asset.',
                            enqueued:
                                'The asset is enqueued for downloading, the task will be picked in a short delay.',
                            started: 'The asset is currently downloading.',
                        }
                        return factory[m.type]
                    },
                },
            },
            {
                source$: notification$,
                vdomMap: (notif: AssetDownloadEvent) => {
                    return new LogsExplorerView({
                        rootLogs$: new Local.Client().api.system
                            .queryLogs$({
                                parentId: notif.contextId,
                            })
                            .pipe(raiseHTTPErrors()),
                        title: 'Asset download',
                        showHeaderMenu: false,
                    })
                },
            },
        ]
    }
}

export class HeaderAssetInstallView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center'
    public readonly children: ChildrenLike

    constructor({ rawId, kind }: { rawId: string; kind: string }) {
        const sep: AnyVirtualDOM = {
            tag: 'div',
            class: 'mx-2',
        }
        this.children = [
            {
                tag: 'div',
                innerText: kind,
            },
            sep,
            {
                tag: 'div',
                innerText: kind === 'package' ? window.atob(rawId) : rawId,
            },
        ]
    }
}
