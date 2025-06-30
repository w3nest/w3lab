import { Local } from '@w3nest/http-clients'
import { child$, ChildrenLike, EmptyDiv, VirtualDOM } from 'rx-vdom'
import { AppState } from '../app-state'
import { MdWidgets, Router } from 'mkdocs-ts'
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
        this.children = [
            child$({
                source$: appState.projectsState.projectsFailures$,
                vdomMap: (failures) => {
                    if (failures.length === 0) {
                        return EmptyDiv
                    }
                    return new MdWidgets.NoteView({
                        level: 'warning',
                        label: 'Some projects have failed to load',
                        expandable: true,
                        parsingArgs: {},
                        content: {
                            tag: 'div',
                            children: failures
                                .filter((failure) =>
                                    prefix
                                        ? failure.path.startsWith(prefix)
                                        : true,
                                )
                                .map((failure) => {
                                    return new FailureView({
                                        failure,
                                        appState,
                                    })
                                }),
                        },
                    })
                },
            }),
        ]
    }
}

class FailureView extends MdWidgets.NoteView {
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
            level: 'failure',
            expandable: true,
            parsingArgs: {},
            label: {
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
            content: {
                tag: 'pre',
                children: [
                    {
                        tag: 'div',
                        class: 'pt-2 px-2 text-start overflow-auto fv-text-error ',
                        style: {
                            whiteSpace: 'pre-wrap',
                        },
                        innerText:
                            (failure['traceback'] as string) ?? failure.message,
                    },
                ],
            },
        })
    }
}
