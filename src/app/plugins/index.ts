/**
 * This module contains the implementation of the `Plugins` page.
 *
 * The `Plugins` page allows users to dynamically load and manage JavaScript libraries known as "Plugins."
 * Each plugin defines a navigation object that integrates into the application's navigation system.
 *
 * Plugins are referenced by JavaScript code that can be edited directly from the [Plugins page](@nav/plugins)
 * within the application. It implements a function that asynchronously loads and returns an array of plugins,
 * adhering to the {@link PluginsLoader} signature.
 *
 * Example:
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
 * The individual plugins are JavaScript modules that must expose an API that conforms to the
 * {@link PluginTrait} interface.
 *
 *
 * @module
 */
import { AppState } from '../app-state'
import { Views, MdWidgets, parseMd, Navigation } from 'mkdocs-ts'
import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'
import { State, Status } from './state'
export * from './state'

export async function navigation(appState: AppState): Promise<Navigation> {
    const pluginsState = new State()
    const plugins = await pluginsState.plugins()

    const navs = await Promise.all(
        plugins.map((plugin) => {
            const { name } = plugin.metadata()
            const id = name.split('/').slice(-1)[0]
            const nav = plugin.navigation({
                colabState: appState,
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
        decoration: {
            icon: { tag: 'i' as const, class: `fas fa-puzzle-piece me-2` },
        },
        tableOfContent: Views.tocView,
        html: () => new PluginsView({ appState }),
        ...children,
    }
}

export class PluginsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly children: ChildrenLike

    public readonly appState: AppState
    constructor(params: { appState: AppState }) {
        Object.assign(this, params)

        this.children = [
            parseMd({
                src: `
# Plugins

<note level="hint">
For assistance with implementing the function to load plugins, as well as information on plugin development, 
please refer to the API documentation for <apiLink target="ColabPlugins"></apiLink>.
</note>
        
        
Plugins are imported using the following function:

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
                    const editor = new MdWidgets.CodeSnippetView({
                        language: 'javascript',
                        content: jsContent,
                        cmConfig: {
                            readOnly: false,
                        },
                    })
                    this.content$ = editor.content$
                    return editor
                },
            }),
            {
                tag: 'button',
                class: 'btn btn-light btn-sm',
                innerText: 'Apply',
                onclick: () => {
                    this.appState.pluginsState
                        .updateJs(this.content$.value)
                        .then()
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
