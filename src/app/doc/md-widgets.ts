import { AnyVirtualDOM, child$, VirtualDOM } from 'rx-vdom'
import { Router } from 'mkdocs-ts'
import { filter, map, switchMap } from 'rxjs/operators'
import { icon } from '../projects/icons'
import { raiseHTTPErrors, AssetsGateway } from '@w3nest/http-clients'
import { copyInClipboard } from '../common/utlis-misc'
import { AppState } from '../app-state'

const inlineBlock = {
    style: {
        display: 'inline-block',
    },
}

import LinksDict from './links.json'
import { GlobalMarkdownViews, IconFactory, MdWidgets } from 'mkdocs-ts'
import { Tooltip } from '@w3nest/ui-tk/Mkdocs'

import * as W3NestHowTo from '@w3nest/doc/how-to'

MdWidgets.ApiLink.Mapper = (target: string) => {
    if (W3NestHowTo.ApiLinkMapper(target)) {
        return W3NestHowTo.ApiLinkMapper(target)
    }
    return LinksDict.apiLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
MdWidgets.ExtLink.Mapper = (target: string) => {
    if (W3NestHowTo.ExtLinkMapper(target)) {
        return W3NestHowTo.ExtLinkMapper(target)
    }
    return LinksDict.extLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
MdWidgets.CrossLink.Mapper = (target: string) => {
    if (W3NestHowTo.CrossLinkMapper(target)) {
        return W3NestHowTo.CrossLinkMapper(target)
    }
    return LinksDict.crossLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
MdWidgets.GitHubLink.Mapper = (target: string) => {
    if (W3NestHowTo.GithubLinkMapper(target)) {
        return W3NestHowTo.GithubLinkMapper(target)
    }
    return LinksDict.githubLinks[
        target
    ] as unknown as ReturnType<MdWidgets.LinkMapper>
}
GlobalMarkdownViews.factory = {
    ...GlobalMarkdownViews.factory,
    tooltip: (elem: HTMLElement, options) =>
        Tooltip.fromHtmlElement(elem, options),
}

IconFactory.register({
    publish: { tag: 'i', class: 'fas fa-cloud-upload-alt' },
    ci: { tag: 'i', class: 'fas fa-sync-alt' },
})

export function navNode(elem: HTMLElement): AnyVirtualDOM {
    const key = elem.getAttribute('target')
    if (!key || !(key in NodeLinksDict)) {
        return { tag: 'div' as const }
    }
    const node = NodeLinksDict[key]
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
                            copyInClipboard(elem.innerText)
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
    const appState = router.userStore as AppState
    const project = elem.getAttribute('project')
    const projectId = window.btoa(project)
    const nav$ = appState.projectsState.projects$.pipe(
        map((projects) => projects.find((p) => p.id === projectId)),
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
                            router.fireNavigateTo({ path })
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
    const factory: Record<
        string,
        { name: string; icon: string; attr: string }
    > = {
        download: {
            name: 'Download',
            icon: 'fas fa-download',
            attr: 'downloadFolderId',
        },
    }
    if (!target || !(target in factory)) {
        return { tag: 'div' }
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
                            router.fireNavigateTo({ path })
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

interface NodeLink {
    path: string
    name: string
    icon: string
}
const NodeLinksDict: Record<string, NodeLink> = {
    Environment: {
        path: 'environment',
        name: 'Environment',
        icon: 'fas fa-tasks',
    },
    WebPM: {
        path: 'webpm',
        name: 'WebPM',
        icon: 'fas fa-boxes',
    },
    Projects: {
        path: 'projects',
        name: 'Projects',
        icon: 'fas fa-tools',
    },
    Explorer: {
        path: 'explorer',
        name: 'Explorer',
        icon: 'fas fa-folder',
    },
    Mounted: {
        path: 'mounted',
        name: 'Mounted',
        icon: 'fas fa-laptop',
    },
    Plugins: {
        path: 'plugins',
        name: 'Plugins',
        icon: 'fas fa-puzzle-piece',
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

export class SplitApiButton implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class = 'btn btn-sm btn-light fas fa-columns'
    public readonly onclick: (ev: MouseEvent) => void
    constructor({ appState }: { appState: AppState }) {
        this.onclick = () => {
            const path = '/doc'
            const selected = appState.companionPage$.value.find(
                (prefix) => path === prefix,
            )
            if (selected) {
                const newNodes = appState.companionPage$.value.filter(
                    (prefix) => path !== prefix,
                )
                appState.companionPage$.next(newNodes)
                return
            }
            appState.companionPage$.next([
                ...appState.companionPage$.value,
                path,
            ])
        }
    }
}
