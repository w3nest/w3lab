import { AnyVirtualDOM, child$ } from 'rx-vdom'
import { Router } from 'mkdocs-ts'
import { AppState } from '../app-state'
import { filter, map, switchMap } from 'rxjs/operators'
import { icon } from '../projects/icons'
import { raiseHTTPErrors, AssetsGateway } from '@w3nest/http-clients'
import { buttonsFactory } from '../common/buttons'

const inlineBlock = {
    style: {
        display: 'inline-block',
    },
}

export function apiLink(elem: HTMLElement): AnyVirtualDOM {
    const target = ApiLinksDict[elem.getAttribute('target')]
    const href = `@nav/doc/api/${target.path}`
    let text = elem.textContent
    if (text === '') {
        text = href.includes('.')
            ? href.split('.').slice(-1)[0]
            : href.split('/').slice(-1)[0]
    }

    return {
        tag: 'a',
        href,
        class: `mkapi-semantic-flag mkapi-role-${target.role}`,
        style: {
            width: 'fit-content',
            textDecoration: 'none',
        },
        children: [
            {
                tag: 'div',
                innerText: text,
                ...inlineBlock,
            },
            {
                tag: 'i',
                class: 'fas fa-code',
                style: {
                    transform: 'scale(0.6)',
                },
            },
        ],
    }
}

export function navNode(elem: HTMLElement): AnyVirtualDOM {
    const node = NodeLinksDict[elem.getAttribute('target')]
    return {
        tag: 'a',
        href: `@nav/${node.path}`,
        class: 'rounded bg-light px-1',
        children: [
            {
                tag: 'i',
                class: node.icon,
                style: {
                    transform: 'scale(0.8)',
                },
            },
            {
                tag: 'i',
                class: 'mx-1',
            },
            {
                tag: 'div',
                innerText: node.name,
                ...inlineBlock,
            },
        ],
    }
}

export function label(elem: HTMLElement): AnyVirtualDOM {
    return {
        tag: 'div',
        class: 'border px-1',
        ...inlineBlock,
        children: [
            {
                tag: 'i',
                class: elem.getAttribute('icon'),
                style: {
                    transform: 'scale(0.8)',
                },
            },
            {
                tag: 'i',
                class: 'mx-1',
            },
            {
                tag: 'div',
                innerText: elem.textContent,
                ...inlineBlock,
            },
        ],
    }
}

export function copyClipboard(elem: HTMLElement): AnyVirtualDOM {
    return {
        tag: 'div',
        style: {
            display: 'inline-block',
        },
        children: [
            {
                tag: 'i',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'div',
                        style: { fontWeight: 'bolder' },
                        innerText: elem.innerText,
                    },
                    {
                        tag: 'i',
                        class: 'mx-1',
                    },
                    {
                        tag: 'button',
                        class: 'btn btn-sm btn-light p-1',
                        children: [
                            {
                                tag: 'i',
                                class: `fas fa-copy`,
                            },
                        ],
                        onclick: () => {
                            navigator.clipboard.writeText(elem.innerText)
                        },
                    },
                ],
            },
        ],
    }
}

export function projectNav(
    elem: HTMLElement,
    { router }: { router: Router },
): AnyVirtualDOM {
    const appState: AppState = router['appState']
    const project = elem.getAttribute('project')
    const projectId = window.btoa(project)
    const nav$ = appState.projectsState.projects$.pipe(
        map((projects) => projects.find((p) => p.id == projectId)),
        filter((p) => p !== undefined),
        switchMap((p) => {
            return appState.environment$.pipe(
                map((env) =>
                    env.projects.finders.find((finder) =>
                        p.path.startsWith(finder.fromPath),
                    ),
                ),
                map((finder) => ({
                    project: p,
                    path: `projects/${window.btoa(finder.fromPath)}/${projectId}`,
                })),
            )
        }),
    )
    return {
        tag: 'button',
        class: 'btn btn-sm bg-light py-0 px-1 rounded',
        children: [
            child$({
                source$: nav$,
                vdomMap: ({ project, path }) => {
                    return {
                        tag: 'a',
                        href: `@nav/${path}`,
                        onclick: (ev: MouseEvent) => {
                            ev.preventDefault()
                            ev.stopPropagation()
                            router.navigateTo({ path })
                        },
                        class: 'd-flex',
                        children: [
                            icon(project),
                            {
                                tag: 'span',
                                style: {
                                    display: 'inline-block',
                                },
                                innerText: project.name,
                            },
                        ],
                    }
                },
                untilFirst: {
                    tag: 'i',
                    class: 'border rounded p-1 text-disabled',
                    innerText: `⚠️ Project '${project}' not available ⚠️`,
                },
            }),
        ],
    }
}

export function defaultUserDrive(
    elem: HTMLElement,
    { router }: { router: Router },
): AnyVirtualDOM {
    const target = elem.getAttribute('target')
    const factory = {
        download: {
            name: 'Download',
            icon: 'fas fa-download',
            attr: 'downloadFolderId',
        },
    }
    const client = new AssetsGateway.Client().explorer
    const target$ = client.getDefaultUserDrive$().pipe(
        raiseHTTPErrors(),
        map((d) => `explorer/${d.groupId}/folder_${d[factory[target].attr]}`),
    )
    return {
        tag: 'button',
        class: 'btn btn-sm bg-light py-0 px-1 rounded',
        children: [
            child$({
                source$: target$,
                vdomMap: (path) => {
                    return {
                        tag: 'a',
                        href: `@nav/${path}`,
                        onclick: (ev: MouseEvent) => {
                            ev.preventDefault()
                            ev.stopPropagation()
                            router.navigateTo({ path })
                        },
                        class: 'd-flex align-items-center',
                        children: [
                            {
                                tag: 'i',
                                class: `fas fa-${factory[target].icon} me-1`,
                            },
                            {
                                tag: 'div',
                                style: {
                                    display: 'inline-block',
                                },
                                innerText: factory[target].name,
                            },
                        ],
                    }
                },
            }),
        ],
    }
}

export function colabButton(elem: HTMLElement): AnyVirtualDOM {
    const target = elem.getAttribute('target')
    return buttonsFactory[target]
}

function docLink(name: string, nav: string, text: string): AnyVirtualDOM {
    return {
        tag: 'a',
        href: `/apps/@youwol/${name}/latest?nav=${nav}`,
        target: '_blank',
        innerText: text,
    }
}
export function webpmDoc(elem: HTMLElement): AnyVirtualDOM {
    const nav = elem.getAttribute('nav') || ''
    return docLink('webpm-client-doc', nav, elem.innerText)
}
export function mkdocsDoc(elem: HTMLElement): AnyVirtualDOM {
    const nav = elem.getAttribute('nav') || ''
    return docLink('mkdocs-ts-doc', nav, elem.innerText)
}
export function rxvdomDoc(elem: HTMLElement): AnyVirtualDOM {
    const nav = elem.getAttribute('nav') || ''
    return docLink('rx-vdom-doc', nav, elem.innerText)
}

export function todo(elem: HTMLElement): AnyVirtualDOM {
    return { tag: 'div', innerText: `⚠️ ${elem.textContent}` }
}
const ApiLinksDict = {
    ProjectsFinder: {
        path: 'youwol/app/environment/models.models_project.ProjectsFinder',
        role: 'class',
    },
    Projects: {
        path: 'youwol/app/environment/models.models_project.Projects',
        role: 'class',
    },
    ProjectsTemplate: {
        path: 'youwol/app/environment/models.models_project.ProjectsTemplate',
        role: 'class',
    },
    pipeline_raw_app: {
        path: 'youwol/pipelines/pipeline_raw_app',
        role: 'module',
    },
    'pipeline_raw_app.template': {
        path: 'youwol/pipelines/pipeline_raw_app.template.template',
        role: 'function',
    },
    Backends: {
        path: 'youwol/app/routers/backends',
        role: 'module',
    },
    CdnPackageLight: {
        path: 'youwol/app/routers/local_cdn.models.CdnPackageLight',
        role: 'class',
    },
    Project: {
        path: 'youwol/app/routers/projects.models_project.Project',
        role: 'class',
    },
    LaunchPadView: {
        path: 'co-lab/Home/Widgets.LaunchPadView',
        role: 'class',
    },
    ComponentsDonutChart: {
        path: 'co-lab/Home/Widgets.ComponentsDonutChart',
        role: 'class',
    },
    ProjectsDonutChart: {
        path: 'co-lab/Home/Widgets.ProjectsDonutChart',
        role: 'class',
    },
    ProjectsHistoricView: {
        path: 'co-lab/Home/Widgets.ProjectsHistoricView',
        role: 'class',
    },
    ColabWidgets: {
        path: 'co-lab/Home/Widgets',
        role: 'module',
    },
    ColabPlugins: {
        path: 'co-lab/Plugins',
        role: 'module',
    },
}

const NodeLinksDict = {
    Projects: {
        path: 'projects',
        name: 'Projects',
        icon: 'fas fa-boxes',
    },
    Backends: {
        path: 'environment/backends',
        name: 'Backends',
        icon: 'fas fa-server',
    },
    Home: {
        path: '/',
        name: 'Home',
        icon: 'fas fa-home',
    },
}
