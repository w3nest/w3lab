/**
 * Implementation of the **Plugins** page.
 *
 * The `Plugins` page lets users **dynamically load and manage JavaScript libraries** known as "Plugins."
 * Each plugin defines a {@link mkdocs-ts.Navigation} object that integrates into the application's
 * {@link AppState.navigation}. In practice, plugins are JavaScript modules exposing an API
 * that conforms to the {@link PluginTrait} interface.
 *
 * Plugins can be referenced and edited directly from the <navNode target="Plugins"></navNode> page
 * within the application. The page uses a {@link PluginsLoader} function to asynchronously load plugins
 * and return them as an array:
 *
 * <code-snippet language='javascript'>
 * return async ({ webpm }) => {
 *     const { plugin } = await webpm.install({
 *         esm: [
 *             "plugin-example#^1.0.0 as plugin"
 *         ]
 *     });
 *     return [plugin];
 * }
 * </code-snippet>
 *
 * Each plugin installed this way automatically integrates with the navigation system
 * and becomes available to the application at runtime.
 *
 * @module
 */
import { AppState } from '../app-state'
import { MdWidgets, parseMd, Navigation, DefaultLayout } from 'mkdocs-ts'
import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'
import { State } from './state'
import { defaultLayout } from '../common/utils-nav'
import { CodeEditorView } from '../common/code-editor.view'
import { PageTitleView } from '../common'
export * from './state'

export async function navigation(
    appState: AppState,
): Promise<Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader>> {
    const pluginsState = new State()
    const plugins = await pluginsState.plugins()

    const navs = await Promise.all(
        plugins.map((plugin) => {
            const { name } = plugin.metadata()
            const id = name.split('/').slice(-1)[0]
            const nav = plugin.navigation({
                appState,
                basePath: `/plugins/${id}`,
            })
            if (nav instanceof Promise) {
                return nav.then((nav) => ({ id, nav }))
            }
            return { nav, id }
        }),
    )
    const children = navs.reduce(
        (acc, { id, nav }) => ({ ...acc, [`/${id}`]: nav }),
        {},
    )

    return {
        name: 'Plugins',
        header: {
            icon: { tag: 'i' as const, class: `fas fa-puzzle-piece` },
        },
        layout: defaultLayout(() => new PluginsView({ appState })),
        routes: children,
    }
}

export class PluginsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly children: ChildrenLike

    public readonly appState: AppState
    constructor(params: { appState: AppState }) {
        Object.assign(this, params)

        this.children = [
            new PageTitleView({
                title: 'Plugins',
                icon: 'fas fa-puzzle-piece',
                helpNav: '@nav/doc.6-',
            }),
            parseMd({
                src: `
        
Edit the following function to define the plugins list:

<editor></editor>
        `,
                views: {
                    editor: () =>
                        new PluginsCodeEditorView({ appState: this.appState }),
                },
            }),
        ]
    }
}

export class PluginsCodeEditorView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly children: ChildrenLike

    public readonly appState: AppState

    private content$: BehaviorSubject<string>
    constructor(params: { appState: AppState }) {
        Object.assign(this, params)
        const pluginsState = this.appState.pluginsState
        this.children = [
            child$({
                source$: pluginsState.jsContent$(),
                vdomMap: (jsContent) => {
                    this.content$ = new BehaviorSubject<string>(jsContent)
                    const editor = new CodeEditorView({
                        language: 'javascript',
                        content: this.content$,
                    })
                    return editor
                },
            }),
            {
                tag: 'button',
                class: 'btn btn-light btn-sm my-2',
                innerText: 'Apply',
                onclick: () => {
                    this.appState.pluginsState
                        .updateJs(this.content$.value)
                        .then(
                            () => {
                                /*NoOp*/
                            },
                            () => {
                                throw Error('Failed to update JS content')
                            },
                        )
                },
            },
            {
                tag: 'div',
                class: 'my-2',
            },
            child$({
                source$: pluginsState.status$,
                vdomMap: (status) => {
                    if (!status) {
                        return { tag: 'div' }
                    }
                    return new MdWidgets.NoteView({
                        level: status.ok ? 'hint' : 'warning',
                        content: status.message,
                        parsingArgs: {},
                    })
                },
            }),
        ]
    }
}
