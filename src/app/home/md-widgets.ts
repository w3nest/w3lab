import { AnyVirtualDOM } from 'rx-vdom'
import { Router } from 'mkdocs-ts'
import {
    ProjectsDonutChart,
    LaunchPadView,
    ProjectsHistoricView,
    ComponentsDonutChart,
} from './widgets'

export function launchPad(elem: HTMLElement): AnyVirtualDOM {
    return LaunchPadView.fromHTMLElement(elem)
}

export function projectsHistoric(
    elem: HTMLElement,
    { router }: { router: Router },
): AnyVirtualDOM {
    return ProjectsHistoricView.fromHTMLElement(elem, router)
}

export function projectsDonutChart(
    elem: HTMLElement,
    { router }: { router: Router },
): AnyVirtualDOM {
    return ProjectsDonutChart.fromHTMLElement(elem, router)
}

export function componentsDonutChart(
    elem: HTMLElement,
    { router }: { router: Router },
): AnyVirtualDOM {
    return ComponentsDonutChart.fromHTMLElement(elem, router)
}
