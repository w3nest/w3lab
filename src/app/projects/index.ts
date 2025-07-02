import { NewProjectsCard, ProjectView } from './project.view'
import { AppState } from '../app-state'
import { Navigation, parseMd, Router, DefaultLayout } from 'mkdocs-ts'
import { AnyVirtualDOM, attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Local } from '@w3nest/http-clients'
import { BehaviorSubject, combineLatest } from 'rxjs'
import { delay, distinctUntilChanged, map } from 'rxjs/operators'
import { icon } from './icons'
import { ProjectsFinderView } from './projects-finder.view'
import { defaultLayout, getProjectNav$ } from '../common/utils-nav'
import { NavNodeData } from 'mkdocs-ts'
import { FailuresView } from './failures.view'
import { PageTitleView, QuickSearchSection } from '../common'
import { ProjectsDonutChart } from '../home/widgets'
import { NamespaceView } from './namespace.view'

export * from './state'

const skipNamespace = (name: string) => {
    return name.split('/').slice(-1)[0]
}
const refresh$ = new BehaviorSubject(false)
export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Projects',
    header: {
        icon: { tag: 'i', class: 'fas fa-tools' },
        actions: [refreshAction(appState)],
    },
    layout: defaultLayout(
        ({ router }) =>
            new PageView({
                router,
                appState,
            }),
    ),
    routes: combineLatest([
        appState.environment$,
        appState.projectsState.projects$,
    ]).pipe(
        distinctUntilChanged((prev, curr) => {
            const isSameEnv =
                JSON.stringify(prev[0].projects) ===
                JSON.stringify(curr[0].projects)
            const isSameProjects =
                JSON.stringify(prev[1]) === JSON.stringify(curr[1])
            return isSameProjects && isSameEnv
        }),
        map(([env, projects]) => {
            return ({ path }: { path: string; router: Router }) => {
                return lazyResolver(path, env, projects, appState)
            }
        }),
    ),
})

const refreshAction = (appState: AppState) =>
    new DefaultLayout.NavActionView({
        content: {
            tag: 'i',
            class: attr$({
                source$: refresh$,
                vdomMap: (r): string => (r ? 'fa-spin' : ''),
                wrapper: (d) => `${d} fas fa-sync`,
            }),
        },
        action: () => {
            refresh$.next(true)
            appState.projectsState.projectsClient
                .index$()
                .pipe(delay(500))
                .subscribe(() => {
                    refresh$.next(false)
                })
        },
    })

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router, appState }: { router: Router; appState: AppState }) {
        const { projectsState } = appState

        const searchItemView = (p: Local.Projects.Project): AnyVirtualDOM => {
            return {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    icon(p),
                    { tag: 'i', class: 'mx-1' },
                    {
                        tag: 'a',
                        class: 'd-flex align-items-center m-2',
                        href: attr$({
                            source$: getProjectNav$({
                                projectName: p.name,
                                appState,
                            }),
                            vdomMap: (nav) => `@nav${nav}`,
                        }),
                        children: [
                            {
                                tag: 'div',
                                innerText: p.name,
                            },
                        ],
                    },
                    { tag: 'i', class: 'mx-2' },
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center',
                        style: { fontSize: '0.8rem' },
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-bookmark',
                            },
                            { tag: 'i', class: 'mx-1' },
                            {
                                tag: 'div',
                                innerText: p.version,
                            },
                        ],
                    },
                ],
            }
        }
        this.children = [
            new PageTitleView({
                title: 'Projects',
                icon: 'fas fa-tools',
                helpNav: '@nav/doc/how-to/publish',
            }),
            parseMd({
                src: `

<projectTypes></projectTypes>

<failedListView></failedListView>

---

## <i class="fas fa-folder-plus"></i> Project Starters  <docLink nav='@nav[w3nest-api]/app/config.projects.ProjectTemplate'></docLink>

<newProject></newProject>

---

<quickSearchSection></quickSearchSection>

`,
                router,
                views: {
                    projectTypes: () => {
                        return new ProjectsDonutChart({
                            appState,
                            innerStyle: { width: '95%', maxWidth: '500px' },
                            margin: 10,
                            sections: [
                                {
                                    selector: (p) =>
                                        p.webpmSpec.specification.kind ===
                                        'webapp',
                                    label: 'Apps.',
                                    fill: '#3B82F6',
                                },
                                {
                                    selector: (p) =>
                                        p.webpmSpec.specification.kind ===
                                        'esm',
                                    label: 'ESM',
                                    fill: '#10B981',
                                },
                                {
                                    selector: (p) =>
                                        p.webpmSpec.specification.kind ===
                                        'backend',
                                    label: 'Backends',
                                    fill: '#64748B',
                                },
                            ],
                        })
                    },
                    newProject: () => {
                        return new NewProjectsCard({
                            projectsState,
                        })
                    },
                    quickSearchSection: () => {
                        return new QuickSearchSection({
                            input$: appState.projectsState.projects$,
                            vdomMap: searchItemView,
                        })
                    },
                    failedListView: () =>
                        new FailuresView({ appState, router }),
                },
            }),
        ]
    }
}

function lazyResolver(
    path: string,
    env: Local.Environment.EnvironmentStatusResponse,
    projects: Local.Projects.Project[],
    appState: AppState,
) {
    const parts = path.split('/').filter((d) => d !== '')
    if (parts.length === 0) {
        const children = env.projects.finders.map((p) => {
            return {
                name: p.name,
                id: window.btoa(p.fromPath),
                header: {
                    icon: {
                        tag: 'i' as const,
                        class: 'fas fa-search',
                    },
                },
                layout: defaultLayout(({ router }: { router: Router }) => {
                    const finder = env.projects.finders.find(
                        (f) => f.fromPath === p.fromPath,
                    )
                    return new ProjectsFinderView({
                        finder,
                        appState,
                        router,
                    })
                }),
            }
        })
        return children.reduce((acc, c) => ({ ...acc, [`/${c.id}`]: c }), {})
    }
    if (parts.length === 1) {
        // ProjectsFinder selected
        const prefix = window.atob(parts[0])
        const directChildren = getDirectChildren(prefix, projects)
        const namespaces = new Set(
            directChildren
                .map((p) => {
                    if (p.name.includes('/')) {
                        return p.name.split('/')[0]
                    }
                    return undefined
                })
                .filter((n) => n !== undefined),
        )
        const childrenNamespace = formatNamespaces(prefix, namespaces, appState)
        const childrenNoNamespace = directChildren.filter(
            (p) => !p.name.includes('/'),
        )
        const childrenProject = formatChildren(
            path,
            childrenNoNamespace,
            projects,
            appState,
        )
        return [...childrenNamespace, ...childrenProject].reduce(
            (acc, e) => ({ ...acc, [`/${e.id}`]: e }),
            {},
        )
    }
    if (parts.length >= 2) {
        const projectId = parts[parts.length - 1]
        if (projectId.startsWith('ns_')) {
            const finderPrefix = window.atob(parts[0])
            const ns = projectId.split('ns_')[1]
            const directChildren = getDirectChildren(
                finderPrefix,
                projects,
            ).filter((p) => p.name.startsWith(`${ns}/`))
            const children = formatChildren(
                path,
                directChildren,
                projects,
                appState,
            )
            return children.reduce(
                (acc, e) => ({ ...acc, [`/${e.id}`]: e }),
                {},
            )
        }
        const project = projects.find((p) => p.id === projectId)
        const directChildren = getDirectChildren(project.path, projects)
        const children = formatChildren(
            path,
            directChildren,
            projects,
            appState,
        )
        return children.reduce((acc, e) => ({ ...acc, [`/${e.id}`]: e }), {})
    }
}

function getDirectChildren(
    prefix: string,
    projects: Local.Projects.Project[],
): Local.Projects.Project[] {
    const children = projects.filter(
        (p) => p.path.startsWith(prefix) && p.path !== prefix,
    )
    return children.filter((p) => {
        const isChild = children.find(
            (maybeParent) =>
                p.path !== maybeParent.path &&
                p.path.startsWith(maybeParent.path),
        )
        return !isChild
    })
}

function formatChildren(
    path: string,
    children: Local.Projects.Project[],
    allProjects: Local.Projects.Project[],
    appState: AppState,
): (NavNodeData<DefaultLayout.NavLayout, DefaultLayout.NavHeader> & {
    id: string
})[] {
    const directChildren = children
        .map((p) => {
            const project = allProjects.find((project) => project.id === p.id)
            const nameView: AnyVirtualDOM = {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'div',
                        innerText: skipNamespace(p.name),
                    },
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center mx-2 mkdocs-text-3',
                        style: {
                            fontSize: '0.8rem',
                        },
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-bookmark mx-1',
                                style: {
                                    fontSize: '0.6rem',
                                },
                            },
                            {
                                tag: 'i' as const,
                                innerText: p.version,
                            },
                        ],
                    },
                ],
            }
            return {
                name: skipNamespace(p.name),
                id: p.id,
                header: {
                    icon: icon(p),
                    name: nameView,
                },
                layout: defaultLayout(
                    ({ router }: { router: Router }) =>
                        new ProjectView({
                            router,
                            project,
                            appState,
                        }),
                ),
                leaf: getDirectChildren(p.path, allProjects).length === 0,
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    appState.projectsState.registerNavIdMap({
        origin: path,
        ids: directChildren.map((p) => p.id),
    })
    return directChildren
}

function formatNamespaces(
    finderPrefix: string,
    children: Set<string>,
    appState: AppState,
): (NavNodeData<DefaultLayout.NavLayout, DefaultLayout.NavHeader> & {
    id: string
})[] {
    return [...children].map((namespace) => {
        return {
            name: namespace,
            id: `ns_${namespace}`,
            header: {
                icon: { tag: 'i', class: 'fas fa-object-group' },
            },
            layout: defaultLayout(
                ({ router }: { router: Router }) =>
                    new NamespaceView({
                        router,
                        appState,
                        namespace,
                        finderPrefix,
                    }),
            ),
        }
    })
}
