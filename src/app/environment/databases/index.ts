import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Navigation, parseMd, Router, Views } from '@youwol/mkdocs-ts'
import { map } from 'rxjs/operators'
import { AppState } from '../../app-state'
import { HdPathBookView } from '../../common'

export const navigation = (appState: AppState): Navigation => ({
    name: 'Databases',
    decoration: { icon: { tag: 'i', class: 'fas fa-database me-2' } },
    tableOfContent: Views.tocView,
    html: ({ router }) => new PageView({ router, appState }),
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ appState, router }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Databases

<info>
This page gathers information related to the databases persisting data on your PC.

</info>

## Components (CDN)

<paths type="databases"></paths>

This folder persist the components & explorer data.

### Cache

<paths type="system"></paths>

This folder persist the artifacts & manifests created when working with projects.

`,
                router,
                views: {
                    paths: (elem) =>
                        new HdPathBookView({
                            appState,
                            path: appState.environment$.pipe(
                                map(
                                    (env) =>
                                        env.pathsBook[
                                            elem.getAttribute('type')
                                        ],
                                ),
                            ),
                            type: 'folder',
                        }),
                },
            }),
        ]
    }
}
