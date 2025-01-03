import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import {
    Router,
    parseMd,
    Navigation,
    fromMarkdown,
    installCodeApiModule,
    installNotebookModule,
    DefaultLayout,
    segment,
} from 'mkdocs-ts'
import { pyYwDocLink } from '../common/py-yw-references.view'
import { AppState } from '../app-state'
import { setup } from '../../auto-generated'
import { defaultLayout, splitCompanionAction } from '../common/utils-nav'

function fromMd({
    file,
    placeholders,
}: {
    file: string
    placeholders?: { [_: string]: string }
}) {
    return fromMarkdown({
        url: `/api/assets-gateway/webpm/resources/${setup.assetId}/${setup.version}/assets/${file}`,
        placeholders,
    })
}

const CodeApiModule = await installCodeApiModule()
const NotebookModule = await installNotebookModule()
const notebookOptions = {
    runAtStart: true,
    defaultCellAttributes: {
        lineNumbers: false,
    },
    markdown: {},
}

const configuration = {
    ...CodeApiModule.configurationPython,
    codeUrl: ({ path, startLine }: { path: string; startLine: number }) => {
        const baseUrl = 'https://github.com/youwol/py-youwol/tree'
        const target = setup.version.endsWith('-wip')
            ? 'main'
            : `v${setup.version}`
        return `${baseUrl}/${target}/src/youwol/${path}#L${startLine}`
    },
}

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
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
        [segment('/tutorials')]: {
            name: 'Tutorials',
            header: decoration('fa-graduation-cap'),
            layout: defaultLayout(
                fromMd({
                    file: 'doc.tutorials.md',
                }),
            ),
            routes: {
                [segment('/quick-tour')]: {
                    name: 'Quick Tour',
                    header: decoration(''),
                    layout: defaultLayout(
                        fromMd({
                            file: 'doc.tutorials.quick-tour.md',
                        }),
                    ),
                },
            },
        },
        [segment('/how-to')]: {
            name: 'How-To',
            header: decoration('fa-question-circle'),
            layout: defaultLayout(
                fromMd({
                    file: 'doc.how-to.md',
                }),
            ),
            routes: {
                [segment('/start-yw')]: {
                    name: 'Start YouWol',
                    layout: defaultLayout(
                        fromMarkdown({
                            url: `/apps/@youwol/py-youwol-doc/*/assets/how-to.start-youwol.md`,
                        }),
                    ),
                },
                [segment('/config')]: {
                    name: 'Configuration',
                    layout: defaultLayout(
                        fromMd({
                            file: 'doc.how-to.config.md',
                        }),
                    ),
                    routes: {
                        [segment('/projects')]: {
                            name: 'Projects',
                            header: decoration(''),
                            layout: defaultLayout(
                                fromMd({
                                    file: 'doc.how-to.config.projects.md',
                                }),
                            ),
                        },
                    },
                },
                [segment('/custom-home')]: {
                    name: 'Custom Home Page',
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
        },
        [segment('/api')]: {
            name: 'API',
            header: decoration('fa-code'),
            layout: defaultLayout(
                fromMd({
                    file: 'doc.api.md',
                }),
            ),
            routes: {
                [segment('/youwol')]: CodeApiModule.codeApiEntryNode({
                    name: 'youwol',
                    icon: decoration('fa-box-open').icon,
                    entryModule: 'youwol',
                    docBasePath: '/apps/@youwol/py-youwol-doc/*/assets/api',
                    configuration: configuration,
                }),
                [segment('/yw-clients')]: CodeApiModule.codeApiEntryNode({
                    name: 'yw_clients',
                    icon: decoration('fa-box-open').icon,
                    entryModule: 'yw_clients',
                    docBasePath: '/apps/@youwol/py-youwol-doc/*/assets/api',
                    configuration: configuration,
                }),
                [segment('/co-lab')]: CodeApiModule.codeApiEntryNode({
                    name: 'co-lab',
                    icon: decoration('fa-box-open').icon,
                    entryModule: 'co-lab',
                    docBasePath: '../assets/api',
                    configuration: CodeApiModule.configurationTsTypedoc,
                }),
            },
        },
    },
})

const decoration = (icon: string) => {
    return {
        icon: { tag: 'i' as const, class: `fas ${icon}` },
        wrapperClass: DefaultLayout.NavHeaderView.DefaultWrapperClass,
    }
}

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router }: { router: Router }) {
        this.children = [
            parseMd({
                src: `
# Documentation

Welcome to the YouWol collaborative lab for consuming or producing web applications.
This space (the \`@youwol/co-lab\` application) lets you explore your lab's content.

At its core, the lab collects executable units, or components, treating them as independent entities that dynamically
 assemble during the execution of applications or user scripts. These components range from those interpreted in the
  browser, like JavaScript, WebAssembly, or Python via the Pyodide wrapper, to those processed on a PC as backends.
  Your lab grows as it automatically acquires components encountered during browsing or from your own project
  publications.

Collaboration is seamless in this ecosystem: when components are needed to run an application,
the system ensures the most up-to-date, compatible version is used, whether sourced from your ongoing projects
 or the broader YouWol network through updates. New or missing components are efficiently downloaded,
 enhancing performance for future access.

This dual local-cloud approach not only optimizes the development cycle and enhances flexibility but also opens up
new possibilities. Everything we've built leverages this innovative framework, and we're excited for you to experience
 its benefits.

Explore your lab and its features at your own pace:

- The [dashboard](@nav/dashboard) offers a streamlined view for quick access to information you've selected as most
 relevant, providing shortcuts and at-a-glance visualizations tailored to your preferences.

- The [environment](@nav/environment) section gives you a comprehensive look at your local server's configuration,
including which backends are active, the middlewares you've installed, and a tool for exploring logs, among others.

- In the [components](@nav/components) area, you can review everything that has been utilized and effectively
'installed' on your PC up to this point.

- The [projects](@nav/projects) section is dedicated to your work-in-progress projects, which you are preparing to
publish as components—first locally on your PC, and subsequently to the wider online ecosystem for community access.

 For a deeper insight into the workings of your new laboratory, don't hesitate to click on the info icon
  <i class="fas fa-info-circle fv-text-focus"></i> during your initial visits.
 If you're looking for a more comprehensive overview, we invite you to check out our
${pyYwDocLink('documentation', '/')}.

  `,
                router,
                emitHtmlUpdated: true,
            }),
        ]
    }
}
