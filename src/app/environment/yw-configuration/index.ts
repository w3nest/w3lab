import { AppState } from '../../app-state'
import {
    DefaultLayout,
    MdWidgets,
    Navigation,
    parseMd,
    Router,
} from 'mkdocs-ts'
import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { HdPathBookView } from '../../common'
import { map, mergeMap } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { defaultLayout } from '../../common/utils-nav'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    layout: defaultLayout(({ router }) => new PageView({ appState, router })),
    header: { icon: { tag: 'i', class: 'fas fa-wrench' } },
    name: 'Server config.',
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor(params: { router: Router; appState: AppState }) {
        const { appState } = params
        this.children = [
            parseMd({
                src: `
# Configuration

The server configuration is located at:
<configPath></configPath>


Below is displayed the current configuration of the local YouWol server:
 
<fileView></fileView>
                `,
                router: params.router,
                views: {
                    configPath: () => {
                        return new HdPathBookView({
                            path: appState.environment$.pipe(
                                map((env) => env.pathsBook.config),
                            ),
                            appState,
                            type: 'file',
                        })
                    },
                    fileView: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$: appState.environment$.pipe(
                                        mergeMap(() =>
                                            new Local.Client().api.environment
                                                .getFileContent$()
                                                .pipe(raiseHTTPErrors()),
                                        ),
                                    ),
                                    vdomMap: (content) => {
                                        return new MdWidgets.CodeSnippetView({
                                            language: 'python',
                                            content,
                                        })
                                    },
                                }),
                            ],
                        }
                    },
                },
            }),
        ]
    }
}
