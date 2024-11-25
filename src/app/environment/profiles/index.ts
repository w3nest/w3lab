import { AppState } from '../../app-state'
import {
    InstallersView,
    PreferencesView,
    ProfilesListView,
} from './profiles.view'
import { Navigation, parseMd, Router, Views } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { ProfilesState } from './profiles.state'

export const navigation = (appState: AppState): Navigation => ({
    name: 'Profiles',
    html: ({ router }) => new PageView({ router, appState }),
    tableOfContent: Views.tocView,
    decoration: { icon: { tag: 'i', class: 'fas fa-user-friends me-2' } },
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor(params: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Profiles

Profiles correspond to configurations that defines:
*  **Widgets** : those displayed in the top banner or in the dashboard tab
*  **applicative logic**: context menu action from the explorer, list of applications in the launchpad, *etc.*.

One profile is selected at a time, among the profiles available there is always a (read-only) default profile.
                
## Profiles available

Here is the list of the available profiles, you can change the selection and eventually update it latter on this page.


<profiles></profiles>

                `,
                router: params.router,
                views: {
                    profiles: () => {
                        return {
                            tag: 'div',
                            children: [
                                {
                                    source$: params.appState.session$,
                                    vdomMap: () => {
                                        const profilesState =
                                            new ProfilesState()
                                        return parseMd({
                                            src: `
## Current profile

<selectProfile></selectProfile>
### Preferences
<preferences></preferences>    

### Installers
<installer></installer>
`,
                                            router: params.router,
                                            emitHtmlUpdated: true,
                                            views: {
                                                selectProfile: () =>
                                                    new ProfilesListView({
                                                        profilesState,
                                                    }),
                                                preferences: () =>
                                                    new PreferencesView({
                                                        profilesState,
                                                    }),
                                                installer: () =>
                                                    new InstallersView({
                                                        profilesState,
                                                    }),
                                            },
                                        })
                                    },
                                },
                            ],
                        }
                    },
                },
            }),
        ]
    }
}
