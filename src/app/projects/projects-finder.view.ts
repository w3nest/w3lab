import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { parseMd, Router } from 'mkdocs-ts'
import { HdPathBookView } from '../common'
import { AppState } from '../app-state'
import { FailuresView } from './failures.view'
import { Local } from '@w3nest/http-clients'

export class ProjectsFinderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        router,
        appState,
        finder,
    }: {
        router: Router
        appState: AppState
        finder: Local.Environment.ProjectFinders
    }) {
        const ignored = finder.lookUpIgnore
            .filter((pattern) => !pattern.includes('/.'))
            .map((pattern) => `\n    *  ${pattern}`)
            .reduce(
                (acc, e) => acc + e,
                "\n    *  **Any folder's name starting with '.'**",
            )
        this.children = [
            parseMd({
                src: `
# Projects finder **${finder.name}**



<info>
A project finder scans a specified directory on your computer, searching recursively for projects. 
It operates up to a defined maximum depth in the directory structure. Optionally, it can continuously monitor the
 directory for any newly added or removed projects.
 
 More inforation can be found 
 <a target="_blank" href="/doc?nav=/references/youwol/app/environment/models.models_project.Projects">here</a>.
 
</info>


*  Root folder: <folder></folder>

*  Lookup depth: ${finder.lookUpDepth}

*  Continuously watched: ${finder.watch}

*  Ignored folders (and associated children) in look-up: ${ignored}


## Failures

The following projects have failed to load:            

<failedListView></failedListView>

`,
                router,
                views: {
                    folder: () => {
                        return new HdPathBookView({
                            path: finder.fromPath,
                            appState,
                            type: 'folder',
                        })
                    },
                    failedListView: () =>
                        new FailuresView({
                            appState,
                            router,
                            prefix: finder.fromPath,
                        }),
                },
            }),
        ]
    }
}
