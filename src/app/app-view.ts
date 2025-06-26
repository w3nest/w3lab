import { child$, ChildrenLike, EmptyDiv, VirtualDOM } from 'rx-vdom'
import { AppState } from './app-state'
import { DefaultLayout } from 'mkdocs-ts'
import { DisconnectedView } from './disconnected.view'
import { AuthBadge } from '@w3nest/ui-tk/Badges'
import { Footer } from '@w3nest/ui-tk/Mkdocs'
import {
    BackendServingView,
    EsmServingView,
    NotificationsView,
} from './environment/nav-badges.view'
import { Local } from '@w3nest/http-clients'

export const footer = new Footer({
    license: 'MIT',
    copyrights: [
        { year: '2021-2024', holder: 'YouWol' },
        { year: '2025', holder: 'Guillaume Reinisch' },
    ],
    github: 'https://github.com/w3nest/w3lab',
})

class TopBannerContent implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'd-flex align-items-center w-100 justify-content-center'
    public readonly children: ChildrenLike

    constructor({ appState }: { appState: AppState }) {
        this.children = [
            new NotificationsView({
                appState: appState,
            }),
            new BackendServingView({ appState }),
            new EsmServingView({ appState }),
            { tag: 'div', class: 'mx-2' },
            child$({
                source$: appState.projectsState.historic$,
                vdomMap: (projects) => {
                    return projects.length > 0
                        ? new RecentProjectsView({ projects })
                        : EmptyDiv
                },
            }),
        ]
    }
}

class RecentProjectsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'dropdown'
    public readonly children: ChildrenLike

    constructor({ projects }: { projects: Local.Projects.Project[] }) {
        const id = 'RecentProjectsViewDropDownButton'
        this.children = [
            {
                tag: 'button',
                id,
                class: 'btn btn-light btn-sm dropdown-toggle d-flex align-items-center',
                customAttributes: {
                    'data-bs-toggle': 'dropdown',
                    'aria-expanded': 'false',
                },
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-tools mx-1',
                    },
                    {
                        tag: 'div',
                        innerText: 'Recent Projects',
                    },
                ],
            },
            {
                tag: 'ul',
                class: 'dropdown-menu',
                customAttributes: { 'aria-labelledby': id },
                children: projects.map((project) => {
                    return {
                        tag: 'li',
                        children: [
                            {
                                tag: 'a',
                                href: '/foo/bar',
                                class: 'dropdown-item',
                                innerText: project.name,
                            },
                        ],
                    }
                }),
            },
        ]
    }
}

export class AppView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 h-100 d-flex'
    public readonly style = {
        position: 'relative' as const,
    }
    public readonly children: ChildrenLike
    public readonly appState: AppState

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)
        const layout = new DefaultLayout.LayoutWithCompanion({
            router: this.appState.router,
            bookmarks$: this.appState.bookmarks$,
            topBanner: {
                logo: { icon: '../assets/favicon.svg', title: 'W3Lab' },
                expandedContent: new TopBannerContent({
                    appState: this.appState,
                }),
                badge: new AuthBadge(),
                zIndex: 1001,
            },
            footer,
            navFooter: true,
            displayOptions: {
                pageVertPadding: '3rem',
            },
            companionNodes$: this.appState.companionPage$,
        })
        this.children = [
            layout,
            new DisconnectedView({ appState: this.appState }),
        ]
    }
}
