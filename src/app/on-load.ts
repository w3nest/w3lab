import { render } from 'rx-vdom'
import { GlobalMarkdownViews } from 'mkdocs-ts'

import { AppState } from './app-state'
import { docAction, InfoSectionView } from './common'
import { AppView } from './app-view'
import {
    copyClipboard,
    defaultUserDrive,
    label,
    mkdocsDoc,
    navNode,
    projectNav,
    rxvdomDoc,
    SplitApiButton,
    todo,
    webpmDoc,
} from './doc/md-widgets'
import {
    componentsDonutChart,
    launchPad,
    projectsDonutChart,
    projectsHistoric,
} from './home/md-widgets'

const appState = new AppState()

GlobalMarkdownViews.factory = {
    ...GlobalMarkdownViews.factory,
    info: (elem: HTMLElement, { router }) => {
        return new InfoSectionView({
            text: elem.textContent,
            router,
        })
    },
    label,
    navNode,
    copyClipboard,
    projectNav,
    defaultUserDrive,
    launchPad,
    projectsHistoric,
    projectsDonutChart,
    componentsDonutChart,
    webpmDoc,
    mkdocsDoc,
    rxvdomDoc,
    todo,
    docLink: (elem) => {
        return docAction(elem.getAttribute('nav'))
    },
    'split-api': () => new SplitApiButton({ appState }),
    btn: (elem) => {
        const faClass = {
            edit: 'fas fa-pen',
            'open-folder': 'fas fa-folder-open',
        }[elem.getAttribute('target')]
        return {
            tag: 'button',
            class: `btn btn-sm btn-light`,
            children: [{ tag: 'i', class: faClass }],
        }
    },
}

document
    .getElementById('content')
    .appendChild(render(new AppView({ appState })))
