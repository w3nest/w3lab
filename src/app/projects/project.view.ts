import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    EmptyDiv,
    replace$,
    VirtualDOM,
} from 'rx-vdom'
import { MdWidgets, parseMd, Router } from 'mkdocs-ts'
import { DagFlowView } from './dag-flow.view'
import { State } from './state'
import { filterCtxMessage, raiseHTTPErrors, Local } from '@w3nest/http-clients'
import {
    ComponentCrossLinksView,
    FilesBrowserView,
    HdPathBookView,
} from '../common'
import { ExpandableGroupView } from '../common/expandable-group.view'
import { NewProjectFromTemplateView } from './new-project.view'
import { debounceTime, from, merge, mergeMap, of } from 'rxjs'
import { AppState } from '../app-state'
import { StepView } from './step.view'
import { CdnLinkView, ExplorerLinkView } from '../common/links.view'
import { filter, map } from 'rxjs/operators'
import { install } from '@w3nest/webpm-client'
import * as webpm from '@w3nest/webpm-client'
import type * as Notebook from '@mkdocs-ts/notebook'

function extraProjectLinks(
    appState: AppState,
    project: Local.Projects.Project,
) {
    if (project.webpmSpec.specification.kind !== 'webapp') {
        return []
    }

    return [
        appState.cdnState.status$.pipe(
            map((status) => {
                const target = status.packages.find(
                    (p) => p.name === project.name,
                )
                const version =
                    target &&
                    target.versions.find((v) => v.version === project.version)
                if (!version) {
                    return { icon: 'fas fa-play', enabled: false, nav: `` }
                }
                return {
                    icon: 'fas fa-play',
                    enabled: true,
                    nav: `/apps/${project.name}/${project.version}`,
                    hrefKind: 'external' as const,
                }
            }),
        ),
    ]
}

export class ProjectView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        router,
        project,
        appState,
    }: {
        router: Router
        project: Local.Projects.Project
        appState: AppState
    }) {
        const projectsState = appState.projectsState
        projectsState.openProject(project)
        const events = projectsState.projectEvents[project.id]
        const selectedStep$ = events.selectedStep$.pipe(
            filter(({ step }) => step !== undefined),
        )
        this.children = [
            parseMd({
                src: `
# ${project.name} <i class='fas fa-bookmark mx-1' style='font-size:0.8rem'></i>${project.version}

<header></header>

---

<readme></readme>

<tryme></tryme>

## CI

<flow></flow>

<steps></steps>

## Artifacts

<artifacts></artifacts>
`,
                router,
                views: {
                    header: () => {
                        return new ComponentCrossLinksView({
                            appState,
                            component: project.name,
                            withLinks: extraProjectLinks(appState, project),
                            exclude: 'project',
                        })
                    },
                    readme: () => {
                        return new ReadMeView({ project })
                    },
                    tryme: () => {
                        if (project.webpmSpec.specification.kind === 'webapp') {
                            return EmptyDiv
                        }
                        return new TryMeView({ project })
                    },
                    projectFolder: () => {
                        return new HdPathBookView({
                            path: project.path,
                            appState,
                            type: 'folder',
                        })
                    },
                    cdnLink: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$: appState.cdnState.status$,
                                    vdomMap: () =>
                                        new CdnLinkView({
                                            name: project.name.split('~')[0],
                                            router,
                                        }),
                                }),
                            ],
                        }
                    },
                    explorerLink: () => {
                        return new ExplorerLinkView({
                            name: project.name.split('~')[0],
                            router,
                        })
                    },
                    flow: () =>
                        new FlowView({
                            projectsState,
                            project,
                        }),
                    steps: () => {
                        return {
                            tag: 'div',
                            children: project.ci.steps.map((step) => {
                                return {
                                    tag: 'div',
                                    class: attr$({
                                        source$: selectedStep$,
                                        vdomMap: (selected) => {
                                            if (selected === undefined) {
                                                return 'd-none'
                                            }
                                            return selected.step.id === step.id
                                                ? ''
                                                : 'd-none'
                                        },
                                        untilFirst: 'd-none',
                                    }),
                                    children: [
                                        new StepView({
                                            projectsState,
                                            project,
                                            step,
                                        }),
                                    ],
                                }
                            }),
                        }
                    },
                    artifacts: () =>
                        new ArtifactsView({
                            router,
                            projectsState,
                            project,
                        }),
                },
            }),
        ]
    }
}

export class ReadMeView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ project }: { project: Local.Projects.Project }) {
        this.children = [
            new MdWidgets.NoteView({
                level: 'hint',
                icon: 'fas fa-info-circle',
                label: 'Read Me',
                content: {
                    tag: 'div',
                    children: [
                        child$({
                            source$: new Local.Client().api.projects
                                .getProjectReadMe$({ projectId: project.id })
                                .pipe(raiseHTTPErrors()),
                            vdomMap: (content: string) => {
                                return parseMd({ src: content })
                            },
                        }),
                    ],
                },
                expandable: true,
                parsingArgs: {},
                mode: 'stateless',
            }),
        ]
    }
}

export class TryMeView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ project }: { project: Local.Projects.Project }) {
        const kind = project.webpmSpec.specification.kind
        const src = `
Run the following snippet **after the library has been published** in your local WebPM database:

<js-cell>
const { Mdl } = await webpm.install({${kind}:["${project.name}#${project.version} as Mdl"]})

display(Mdl)
</js-cell>
        `
        this.children = [
            new MdWidgets.NoteView({
                level: 'hint',
                icon: 'fas fa-code',
                label: 'Try Me',
                content: {
                    tag: 'div',
                    children: [
                        child$({
                            source$: from(
                                install<{ NB: typeof Notebook }>({
                                    esm: ['@mkdocs-ts/notebook#^0.1.3 as NB'],
                                }),
                            ),
                            vdomMap: ({ NB }) => {
                                return new NB.NotebookSection({
                                    src,
                                    router: undefined,
                                    initialScope: {
                                        const: {
                                            webpm,
                                        },
                                        let: {},
                                    },
                                })
                            },
                        }),
                    ],
                },
                expandable: true,
                parsingArgs: {},
                mode: 'stateless',
            }),
        ]
    }
}

export class FlowView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        projectsState,
        project,
    }: {
        projectsState: State
        project: Local.Projects.Project
    }) {
        this.children = [
            {
                tag: 'div',
                children: [new DagFlowView({ project, projectsState })],
            },
        ]
    }
}

export class ArtifactsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        projectsState,
        router,
        project,
    }: {
        projectsState: State
        router: Router
        project: Local.Projects.Project
    }) {
        const event$ = projectsState.projectEvents[project.id].messages$.pipe(
            filterCtxMessage({
                withLabels: ['CIStepStatusResponse'],
                withAttributes: { projectId: project.id },
            }),
            debounceTime(1000),
        )
        const source$ = merge(of(undefined), event$).pipe(
            mergeMap(() =>
                projectsState.projectsClient.getArtifacts$({
                    projectId: project.id,
                }),
            ),
            raiseHTTPErrors(),
        )
        this.children = replace$({
            policy: 'replace',
            source$,
            vdomMap: ({ artifacts }) => {
                return artifacts.map((artifact) => {
                    return new ArtifactView({ artifact, router })
                })
            },
        })
    }
}
export class ArtifactView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        artifact,
        router,
    }: {
        artifact: Local.Projects.Artifact
        router: Router
    }) {
        const linksStr = artifact.links
            .map((l) => `*  <a href="${l.url}" target="_blank">${l.name}</a>\n`)
            .reduce((acc, e) => acc + e, '')
        this.children = [
            new ExpandableGroupView({
                title: artifact.id,
                icon: 'fas fa-box',
                content: () => {
                    return parseMd({
                        src: `
Links:
${linksStr}

**Files included**:

<filesBrowser></filesBrowser>                        
                        `,
                        router,
                        views: {
                            filesBrowser: () =>
                                new FilesBrowserView({
                                    startingFolder: artifact.path,
                                    originFolderIndex:
                                        artifact.path.split('/').length - 1,
                                }),
                        },
                    })
                },
            }),
        ]
    }
}

export class NewProjectsCard implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ projectsState }: { projectsState: State }) {
        this.children = [
            {
                tag: 'div',
                class: 'flex-grow-1 overflow-auto',
                children: replace$({
                    policy: 'replace',
                    source$: projectsState.appState.environment$,
                    vdomMap: (environment) => {
                        if (environment.projects.templates.length === 0) {
                            return [
                                parseMd({
                                    src: '🪹 No template referenced in your configuration file.',
                                }),
                            ]
                        }
                        return environment.projects.templates.map(
                            (projectTemplate) => ({
                                tag: 'div',
                                class: 'my-2',
                                children: [
                                    new MdWidgets.NoteView({
                                        level: 'hint',
                                        expandable: true,
                                        label: projectTemplate.type,
                                        icon: projectTemplate.icon as AnyVirtualDOM,
                                        content: new NewProjectFromTemplateView(
                                            {
                                                projectsState,
                                                projectTemplate,
                                            },
                                        ),
                                        parsingArgs: {},
                                    }),
                                ],
                            }),
                        )
                    },
                }),
            },
        ]
    }
}
