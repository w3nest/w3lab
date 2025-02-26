import { Local } from '@w3nest/http-clients'
import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { AppState } from '../app-state'
import { parseMd, Router } from 'mkdocs-ts'
import { ExpandableGroupView } from '../common/expandable-group.view'
import { HdPathBookView } from '../common'

type Failures =
    | Local.Projects.FailurePipelineNotFound[]
    | Local.Projects.FailureDirectoryNotFound[]
    | Local.Projects.FailureImportException[]

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
            vdomMap: (failures) => [
                new FailuresCategoryView({
                    appState: appState,
                    failures: failures.importExceptions.filter((error) =>
                        prefix ? error.path.startsWith(prefix) : true,
                    ),
                    title: 'Import Failures',
                }),
                new FailuresCategoryView({
                    appState: appState,
                    failures: failures.directoriesNotFound.filter((error) =>
                        prefix ? error.path.startsWith(prefix) : true,
                    ),
                    title: 'Directory Not Found Failures',
                }),
                new FailuresCategoryView({
                    appState: appState,
                    failures: failures.pipelinesNotFound.filter((error) =>
                        prefix ? error.path.startsWith(prefix) : true,
                    ),
                    title: 'Pipeline Not Found Failures',
                }),
            ],
        })
    }
}

class FailuresCategoryView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        failures,
        title,
    }: {
        appState: AppState
        failures: Failures
        title: string
    }) {
        if (failures.length === 0) {
            return
        }
        this.children = [
            parseMd({
                src: `
### ${title}

<failures></failures>
            `,
                router: undefined,
                views: {
                    failures: () => {
                        return {
                            tag: 'div',
                            children: failures.map(
                                (failure: Local.Projects.Failure) => ({
                                    tag: 'div' as const,
                                    class: 'my-4',
                                    children: [
                                        new ExpandableGroupView({
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
                                                                whiteSpace:
                                                                    'pre-wrap',
                                                            },
                                                            innerText:
                                                                (failure[
                                                                    'traceback'
                                                                ] as string) ??
                                                                failure.message,
                                                        },
                                                    ],
                                                }
                                            },
                                        }),
                                    ],
                                }),
                            ),
                        }
                    },
                },
            }),
        ]
    }
}
