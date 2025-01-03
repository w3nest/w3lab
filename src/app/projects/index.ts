import { FailuresView, NewProjectsCard, ProjectView } from './project.view'
import { AppState } from '../app-state'
import { Navigation, parseMd, Router, DefaultLayout } from 'mkdocs-ts'
import { attr$, ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { SearchView } from './search.view'
import { pyYwDocLink } from '../common/py-yw-references.view'
import { Local } from '@w3nest/http-clients'
import { BehaviorSubject, combineLatest } from 'rxjs'
import { delay, map } from 'rxjs/operators'
import { icon } from './icons'
import { ProjectsFinderView } from './projects-finder.view'
import { defaultLayout } from '../common/utils-nav'
import { NavNodeData } from 'mkdocs-ts/dist/src'

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
        icon: { tag: 'i', class: 'fas  fa-boxes' },
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
        this.children = [
            parseMd({
                src: `
# Projects

<info>
This page gathers the projects you are working on, they correspond to folder including a \`.yw_pipeline.py\` file.

</info>

## New project

<info>
To create a new project from a template, you need to reference the associated python module in your configuration 
file. Below is an example using the youwol's \`pipeline_typescript_weback_npm\`:

\`\`\`python
from w3nest.app.environment import (
    Configuration,
    Projects,
)
from w3nest.pipelines.pipeline_typescript_weback_npm \
    import app_ts_webpack_template

projects_folder = Path.home() / 'auto-generated'

Configuration(
    projects=Projects(
        templates=[app_ts_webpack_template(folder=projects_folder)],
    )
)          
\`\`\`                    

Find out more on 
${pyYwDocLink('ProjectTemplate', '/references/youwol/app/environment/models.ProjectTemplate')}.

</info>


<newProject></newProject>

## Browse projects

<searchView></searchView>


## Failures

The following projects have failed to load:            

<failedListView></failedListView>

`,
                router,
                views: {
                    newProject: () => {
                        return new NewProjectsCard({
                            projectsState,
                        })
                    },
                    searchView: () => new SearchView({ projectsState, router }),
                    projectsListView: () => ({
                        tag: 'ul',
                        children: replace$({
                            policy: 'replace',
                            source$: projectsState.projects$,
                            vdomMap: (projects) =>
                                projects.map((p) =>
                                    parseMd({
                                        src: `*  [${p.name}](@nav/projects/${p.id})`,
                                        router,
                                    }),
                                ),
                        }),
                    }),
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
        const children = env.projects.finders
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => {
                return {
                    name: p.name,
                    id: window.btoa(p.fromPath),
                    header: {
                        icon: {
                            tag: 'i' as const,
                            class: 'fas fa-object-group',
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
        const prefix = window.atob(parts[0])
        const directChildren = getDirectChildren(prefix, projects)
        const children = formatChildren(directChildren, projects, appState)
        return children.reduce((acc, e) => ({ ...acc, [`/${e.id}`]: e }), {})
    }
    if (parts.length === 2) {
        const projectId = parts[1]
        const project = projects.find((p) => p.id === projectId)
        const directChildren = getDirectChildren(project.path, projects)
        const children = formatChildren(directChildren, projects, appState)
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
    children: Local.Projects.Project[],
    allProjects: Local.Projects.Project[],
    appState: AppState,
): (NavNodeData<DefaultLayout.NavLayout, DefaultLayout.NavHeader> & {
    id: string
})[] {
    return children
        .map((p) => {
            const project = allProjects.find((project) => project.id === p.id)
            return {
                name: skipNamespace(p.name),
                id: p.id,
                header: {
                    icon: icon(p),
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
}
