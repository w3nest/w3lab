import { attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import {
    Router,
    parseMd,
    Navigation,
    Views,
    fromMarkdown,
    installCodeApiModule,
    installNotebookModule,
} from 'mkdocs-ts'
import { pyYwDocLink } from '../common/py-yw-references.view'
import { AppMode, AppState } from '../app-state'
import { getCompanionDocHref } from '../app-view'
import { setup } from '../../auto-generated'

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

export const navigation = (appState: AppState): Navigation => ({
    name: 'Doc',
    decoration: {
        ...decoration('fa-book', appState),
        actions: [
            splitDocBelow(appState),
            splitDocInTab(appState),
            closeDocBelow(appState),
        ],
    },
    tableOfContent: Views.tocView,
    html: fromMd({
        file: 'doc.md',
    }),
    '/tutorials': {
        name: 'Tutorials',
        decoration: decoration('fa-graduation-cap', appState),
        tableOfContent: Views.tocView,
        html: fromMd({
            file: 'doc.tutorials.md',
        }),
        '/quick-tour': {
            name: 'Quick Tour',
            decoration: decoration('', appState),
            tableOfContent: Views.tocView,
            html: fromMd({
                file: 'doc.tutorials.quick-tour.md',
            }),
        },
    },

    '/how-to': {
        name: 'How-To',
        decoration: decoration('fa-question-circle', appState),
        tableOfContent: Views.tocView,
        html: fromMd({
            file: 'doc.how-to.md',
        }),
        '/start-yw': {
            name: 'Start YouWol',
            tableOfContent: Views.tocView,
            html: fromMarkdown({
                url: `/apps/@youwol/py-youwol-doc/*/assets/how-to.start-youwol.md`,
            }),
        },
        '/config': {
            name: 'Configuration',
            tableOfContent: Views.tocView,
            html: fromMd({
                file: 'doc.how-to.config.md',
            }),
            '/projects': {
                name: 'Projects',
                decoration: decoration('', appState),
                tableOfContent: Views.tocView,
                html: fromMd({
                    file: 'doc.how-to.config.projects.md',
                }),
            },
        },
        '/custom-home': {
            name: 'Custom Home Page',
            tableOfContent: Views.tocView,
            html: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: '../assets/doc.how-to.custom-home.md',
                    router: router,
                    options: notebookOptions,
                }),
        },
    },
    '/api': {
        name: 'API',
        decoration: decoration('fa-code', appState),
        tableOfContent: Views.tocView,
        html: fromMd({
            file: 'doc.api.md',
        }),
        '/youwol': CodeApiModule.codeApiEntryNode({
            name: 'youwol',
            decoration: decoration('fa-box-open', appState),
            entryModule: 'youwol',
            docBasePath: '/apps/@youwol/py-youwol-doc/*/assets/api',
            configuration: configuration,
        }),
        '/yw-clients': CodeApiModule.codeApiEntryNode({
            name: 'yw_clients',
            decoration: decoration('fa-box-open', appState),
            entryModule: 'yw_clients',
            docBasePath: '/apps/@youwol/py-youwol-doc/*/assets/api',
            configuration: configuration,
        }),
        '/co-lab': CodeApiModule.codeApiEntryNode({
            name: 'co-lab',
            decoration: decoration('fa-box-open', appState),
            entryModule: 'co-lab',
            docBasePath: '../assets/api',
            configuration: CodeApiModule.configurationTsTypedoc,
        }),
    },
})

const decoration = (icon: string, appState: AppState) => {
    return {
        icon: { tag: 'i' as const, class: `fas ${icon}` },
        wrapperClass: attr$({
            source$: appState.appMode$,
            vdomMap: (mode: AppMode) =>
                ['normal', 'docCompanion'].includes(mode)
                    ? Views.NavigationHeader.DefaultWrapperClass
                    : 'd-none',
        }),
    }
}

const splitDocBelow = (appState: AppState): VirtualDOM<'i'> => ({
    tag: 'i' as const,
    class:
        appState.appMode$.value === 'normal'
            ? 'mx-1 fas fa-object-ungroup fv-pointer'
            : 'd-none',
    style: {
        padding: '0px',
    },
    onclick: () => {
        appState.appMode$.next('docRemoteBelow')
    },
})

const splitDocInTab = (appState: AppState): VirtualDOM<'i'> => ({
    tag: 'i' as const,
    class:
        appState.appMode$.value === 'normal'
            ? 'mx-1 fas fa-external-link-alt fv-pointer'
            : 'd-none',
    style: {
        padding: '0px',
    },
    onclick: () => {
        window.open(getCompanionDocHref(appState), '_blank')
        appState.appMode$.next('docRemoteInTab')
    },
})

const closeDocBelow = (appState: AppState): VirtualDOM<'i'> => ({
    tag: 'i' as const,
    class:
        appState.appMode$.value === 'docCompanion' &&
        parent.document !== document
            ? 'mx-1 fas fa-object-group fv-pointer'
            : 'd-none',
    style: {
        padding: '0px',
    },
    onclick: () => {
        appState.navBroadcastChannel.postMessage('done')
    },
})

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
