import { ExpandableGroupView } from '../../../common/expandable-group.view'
import { BackendInstallEvent, State } from '../state'
import { filter, map, takeUntil } from 'rxjs/operators'
import { styleShellStdOut } from '../../../common'
import { ContextMessage, Local } from '@w3nest/http-clients'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Observable } from 'rxjs'
import { installIcon } from '../views'
import { CdnLinkView } from '../../../common/links.view'
import { Router } from 'mkdocs-ts'

export class BackendInstallNotificationView extends ExpandableGroupView {
    constructor({
        event,
        router,
        state,
    }: {
        event: BackendInstallEvent
        router: Router
        state: State
    }) {
        const { name, version, installId } = event
        const done$ = state.backendEvents.endInstall$.pipe(
            filter(
                (d) =>
                    d.name === name &&
                    d.version === version &&
                    d.installId === installId,
            ),
        )
        const statusIcon: AnyVirtualDOM = {
            tag: 'div',
            class: {
                source$: done$,
                vdomMap: (m: Local.System.InstallBackendEvent) => {
                    return m.event == 'succeeded'
                        ? 'fas fa-check text-success'
                        : 'fas fa-times text-danger'
                },
                untilFirst: 'fas fa-spinner fa-spin',
            },
        }
        super({
            expanded: false,
            icon: installIcon(statusIcon),
            title: new HeaderBackendInstallView({
                backend: name,
                version,
            }),
            content: () =>
                new ContentBackendInstallView({
                    router,
                    installId,
                    done$,
                    state,
                    backend: name,
                    version,
                }),
        })
    }
}

export class ContentBackendInstallView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        done$,
        installId,
        router,
        state,
        backend,
        version,
    }: {
        done$: Observable<unknown>
        installId: string
        router: Router
        state: State
        backend: string
        version: string
    }) {
        const dynamicSource$ = state.backendEvents.installStdOut$.pipe(
            takeUntil(done$),
            filter(
                (m) =>
                    m.name === backend &&
                    m.version === version &&
                    m.installId === installId,
            ),
            map((m) => [m]),
        )
        const untilFirst: AnyVirtualDOM = {
            ...styleShellStdOut,
            children: {
                policy: 'append',
                source$: dynamicSource$,
                vdomMap: (m: ContextMessage<unknown>) => ({
                    tag: 'span',
                    innerText: m.text,
                }),
            },
        }
        this.children = [
            {
                source$: done$,
                vdomMap: () => {
                    return new CdnLinkView({ name: backend, router })
                },
                untilFirst,
            },
        ]
    }
}
export class HeaderBackendInstallView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center'
    public readonly children: ChildrenLike

    constructor({ backend, version }: { backend: string; version: string }) {
        const sep: AnyVirtualDOM = {
            tag: 'div',
            class: 'mx-2',
        }
        this.children = [
            {
                tag: 'div',
                innerText: backend,
            },
            sep,
            {
                tag: 'div',
                innerText: version,
            },
        ]
    }
}
