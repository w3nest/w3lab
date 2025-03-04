import { Local } from '@w3nest/http-clients'
import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { AppState } from '../app-state'
import { Router } from 'mkdocs-ts'
import { ExpandableGroupView } from '../common/expandable-group.view'
import { HdPathBookView } from '../common'

export class FailuresView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        prefix,
    }: {
        appState: AppState
        router: Router
        prefix?: string
    }) {
        this.children = replace$({
            policy: 'replace',
            source$: appState.projectsState.projectsFailures$,
            vdomMap: (failures) => {
                return failures
                    .filter((failure) =>
                        prefix ? failure.path.startsWith(prefix) : true,
                    )
                    .map((failure) => {
                        return new FailureView({ failure, appState })
                    })
            },
        })
    }
}

class FailureView extends ExpandableGroupView {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        failure,
    }: {
        appState: AppState
        failure: Local.Projects.Failure
    }) {
        super({
            title: {
                tag: 'div',
                style: {
                    maxWidth: '75%',
                },
                children: [
                    new HdPathBookView({
                        path: failure.path,
                        appState,
                        type: 'folder',
                    }),
                ],
            },
            icon: 'fas fa-times fv-text-error',
            content: () => {
                return {
                    tag: 'pre',
                    children: [
                        {
                            tag: 'div',
                            class: 'pt-2 px-2 text-start overflow-auto fv-text-error ',
                            style: {
                                whiteSpace: 'pre-wrap',
                            },
                            innerText:
                                (failure['traceback'] as string) ??
                                failure.message,
                        },
                    ],
                }
            },
        })
    }
}
