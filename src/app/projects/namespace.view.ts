import { attr$, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { parseMd, Router } from 'mkdocs-ts'
import { AppState } from '../app-state'
import { Local } from '@w3nest/http-clients'
import { ComponentCrossLinksView } from '../common'
import { ReadMeView } from './project.view'
import { getProjectNav$ } from '../common/utils-nav'

export class NamespaceView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        router,
        namespace,
        finderPrefix,
        appState,
    }: {
        router: Router
        namespace: string
        finderPrefix: string
        appState: AppState
    }) {
        this.children = [
            parseMd({
                src: `
# Namespace \`${namespace}\`

<listProjects></listProjects>
`,
                router,
                views: {
                    listProjects: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$: appState.projectsState.projects$,
                                    vdomMap: (projects) => {
                                        return new ListProjectsView({
                                            allProjects: projects,
                                            namespace,
                                            finderPrefix,
                                            appState,
                                        })
                                    },
                                }),
                            ],
                        }
                    },
                },
            }),
        ]
    }
}

class ListProjectsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        namespace,
        finderPrefix,
        allProjects,
        appState,
    }: {
        namespace: string
        finderPrefix: string
        allProjects: Local.Projects.Project[]
        appState: AppState
    }) {
        const projects = allProjects
            .filter(
                (p) =>
                    p.path.startsWith(finderPrefix) && p.path !== finderPrefix,
            )
            .filter((p) => p.name.startsWith(namespace))

        this.children = projects.map((p) => {
            return {
                tag: 'div',
                class: 'my-4',
                children: [
                    {
                        tag: 'h2',
                        class: 'd-flex align-items-center',
                        children: [
                            {
                                tag: 'a',
                                href: attr$({
                                    source$: getProjectNav$({
                                        projectName: p.name,
                                        appState,
                                    }),
                                    vdomMap: (nav) => `@nav${nav}`,
                                }),
                                class: 'd-flex align-items-center',
                                children: [
                                    {
                                        tag: 'div',
                                        innerText: p.name,
                                    },
                                ],
                            },
                            { tag: 'div', class: 'mx-2' },
                            {
                                tag: 'div',
                                class: 'd-flex align-items-center',
                                style: {
                                    fontSize: '0.9rem',
                                },
                                children: [
                                    {
                                        tag: 'i',
                                        class: 'fas fa-bookmark me-1',
                                    },
                                    {
                                        tag: 'div',
                                        innerText: p.version,
                                    },
                                ],
                            },
                        ],
                    },
                    { tag: 'div', class: 'my-1' },
                    new ComponentCrossLinksView({
                        appState,
                        component: p.name,
                    }),
                    { tag: 'div', class: 'my-3' },
                    new ReadMeView({ project: p }),
                ],
            }
        })
    }
}
