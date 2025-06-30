import {
    AnyVirtualDOM,
    attr$,
    ChildrenLike,
    replace$,
    VirtualDOM,
} from 'rx-vdom'
import { map } from 'rxjs/operators'
import { BehaviorSubject, combineLatest } from 'rxjs'
import { Local } from '@w3nest/http-clients'
import { icon } from './icons'
import { getProjectNav$ } from '../common/utils-nav'
import { AppState } from '../app-state'

export class SearchView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'my-2'
    public readonly children: ChildrenLike

    public readonly searchTerm$ = new BehaviorSubject('')
    public readonly tags$ = new BehaviorSubject<string[]>([])
    constructor({ appState }: { appState: AppState }) {
        const allTags$ = appState.projectsState.projects$.pipe(
            map(
                (projects) =>
                    new Set(
                        projects
                            .map((p) => {
                                return p.ci.tags
                            })
                            .flat(),
                    ),
            ),
        )
        const selected$ = combineLatest([
            appState.projectsState.projects$,
            this.tags$,
            this.searchTerm$,
        ]).pipe(
            map(([projects, tags, term]) => {
                return projects
                    .filter((project) => {
                        return tags.reduce(
                            (acc, tag) => acc || project.ci.tags.includes(tag),
                            false,
                        )
                    })
                    .filter((p) => {
                        return term === '' ? true : p.name.includes(term)
                    })
            }),
        )
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    { tag: 'i', class: 'fas fa-search' },
                    { tag: 'span', class: 'mx-2' },
                    {
                        tag: 'input',
                        type: 'text',
                        oninput: (ev: MouseEvent) => {
                            const target = ev.target as HTMLInputElement
                            this.searchTerm$.next(target.value)
                        },
                    },
                ],
            },
            {
                tag: 'div',
                class: 'd-flex flex-wrap',
                children: replace$({
                    policy: 'replace',
                    source$: allTags$,
                    vdomMap: (tags) => {
                        return Array.from(tags).map((tag): AnyVirtualDOM => {
                            return {
                                tag: 'div',
                                class: 'd-flex mx-2 p-1',
                                children: [
                                    {
                                        tag: 'input',
                                        type: 'checkbox',
                                        onchange: (ev) => {
                                            const f = this.tags$.value.filter(
                                                (t) => t !== tag,
                                            )
                                            this.tags$.next(
                                                ev.target['checked']
                                                    ? [...f, tag]
                                                    : f,
                                            )
                                        },
                                    },
                                    { tag: 'div', class: 'mx-1' },
                                    {
                                        tag: 'div',
                                        innerText: tag,
                                    },
                                ],
                            }
                        })
                    },
                }),
            },
            {
                tag: 'div',
                class: '',
                children: {
                    policy: 'replace',
                    source$: selected$,
                    vdomMap: (projects: Local.Projects.Project[]) => {
                        return projects
                            .sort((p0, p1) => p0.name.localeCompare(p1.name))
                            .map((p) => ({
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
                            }))
                    },
                },
            },
        ]
    }
}
