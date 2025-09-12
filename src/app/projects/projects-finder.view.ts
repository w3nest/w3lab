import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { parseMd, Router } from 'mkdocs-ts'
import { HdPathBookView, PageTitleView } from '../common'
import { AppState } from '../app-state'
import { FailuresView } from './failures.view'
import { Local } from '@w3nest/http-clients'
import { NewProjectsCard } from './project.view'

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
            new PageTitleView({
                title: `Projects finder '${finder.name}'`,
                icon: 'fas fa-search',
                helpNav: '@nav[w3nest-api]/app/config.projects.ProjectsFinder',
            }),
            parseMd({
                src: `

<failedListView></failedListView>

### **📁 Root Folder**  

<folder></folder>

---

### ⚙️ Settings
- **Lookup Depth**: \`${finder.lookUpDepth}\`
- **Watch Continuously**: \`${finder.watch ? '✅ Yes' : '❌ No'}\`

---

### 🚫 Ignored Folders
${ignored}

---

## <i class="fas fa-folder-plus"></i> Project Starters  <docLink nav='@nav[w3nest-api]/app/config.projects.ProjectTemplate'></docLink>

<newProject></newProject>

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
                    newProject: () => {
                        return new NewProjectsCard({
                            parentFolder: finder.fromPath,
                            projectsState: appState.projectsState,
                        })
                    },
                },
            }),
        ]
    }
}
