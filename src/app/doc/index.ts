import { Navigation, fromMarkdown, DefaultLayout, segment } from 'mkdocs-ts'
import { AppState } from '../app-state'
import pkgJson from '../../../package.json'
import { defaultLayout, splitCompanionAction } from '../common/utils-nav'
import { navigation as navW3NestAPI } from '@w3nest/doc/api'
import { resolveUrlWithFP, install } from '@w3nest/webpm-client'
import type * as CodeApiModule from '@mkdocs-ts/code-api'
import type * as NotebookModule from '@mkdocs-ts/notebook'
import { customNavigation } from '@w3nest/doc/how-to'

function fromMd({
    file,
    placeholders,
}: {
    file: string
    placeholders?: { [_: string]: string }
}) {
    const url = resolveUrlWithFP({
        package: pkgJson['name'],
        version: pkgJson['version'],
        path: `assets/${file}`,
    })

    return fromMarkdown({
        url,
        placeholders,
    })
}

export type NavApp = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>

export async function installCodeApiModule() {
    const version = pkgJson.dependencies['@mkdocs-ts/code-api']
    const { CodeApi } = await install<{
        CodeApi: typeof CodeApiModule
    }>({
        esm: [`@mkdocs-ts/code-api#${version} as CodeApi`],
        css: [`@mkdocs-ts/code-api#${version}~assets/ts-typedoc.css`],
    })
    return CodeApi
}

export const notebookOptions = {
    runAtStart: true,
    defaultCellAttributes: {
        lineNumbers: false,
    },
    markdown: { placeholders: {} },
}

export async function installNotebookModule() {
    const version = pkgJson.dependencies['@mkdocs-ts/notebook']
    const { Notebook } = await install<{
        Notebook: typeof NotebookModule
    }>({
        esm: [`@mkdocs-ts/notebook#${version} as Notebook`],
        css: [`@mkdocs-ts/notebook#${version}~assets/notebook.css`],
    })
    return Notebook
}

export const navigation = async (appState: AppState): Promise<NavApp> => {
    const [CodeApiModule, NotebookModule] = await Promise.all([
        installCodeApiModule(),
        installNotebookModule(),
    ])
    return {
        name: 'Doc',
        header: {
            ...decoration('fa-book'),
            actions: [splitCompanionAction('/doc', appState)],
        },
        layout: defaultLayout(
            fromMd({
                file: 'doc.md',
            }),
        ),
        routes: {
            [segment('/how-to')]: customNavigation([
                {
                    abstract: {
                        url: '../assets/doc.how-to.md',
                    },
                    nav: '/custom-home',
                    routes: {
                        name: 'Custom Home Page',
                        header: decoration('fa-home'),
                        layout: defaultLayout(
                            ({ router }) =>
                                new NotebookModule.NotebookPage({
                                    url: '../assets/doc.how-to.custom-home.md',
                                    router: router,
                                    options: notebookOptions,
                                }),
                        ),
                    },
                },
            ]),
            [segment('/server-api')]: navW3NestAPI({
                header: { name: 'Server API', actions: [] },
                rootModulesNav: { self: '@nav/doc/server-api' },
            }),
            [segment('/w3lab')]: CodeApiModule.codeApiEntryNode({
                name: 'W3Lab API',
                header: decoration('fa-code'),
                entryModule: 'w3lab',
                dataFolder: '../assets/api',
                rootModulesNav: {
                    w3lab: '@nav/doc/w3lab',
                },
                configuration: CodeApiModule.configurationTsTypedoc,
            }),
        },
    }
}

const decoration = (icon: string) => {
    return {
        icon: { tag: 'i' as const, class: `fas ${icon}` },
        wrapperClass: DefaultLayout.NavHeaderView.DefaultWrapperClass,
    }
}
