import { AppState } from '../../app-state'
import { Local } from '@w3nest/http-clients'
import { DonutChart, DonutChartSection } from './donut-chart.utils'
import { Router } from 'mkdocs-ts'
import { CSSAttribute } from 'rx-vdom'

/**
 * A widget that displays a donut chart representing components.
 *
 * The chart's sections are determined by a selector function that takes a {@link w3nest.Project} as argument.
 *
 * This component is designed to be embedded in a `Markdown` page,
 * refer to {@link ProjectsDonutChart.fromHTMLElement}.
 */
export class ProjectsDonutChart extends DonutChart<Local.Projects.Project> {
    constructor(params: {
        appState: AppState
        innerStyle: CSSAttribute
        margin: number
        sections: DonutChartSection<Local.Projects.Project>[]
    }) {
        super({
            ...params,
            entities$: params.appState.projectsState.projects$,
        })
    }

    /**
     * Constructs a `ProjectsDonutChart` from an `projectsDonutChart` HTML element, typically sourced from `Markdown`.
     * The HTML element must include specific attributes:
     *
     * - **margin**: Margin of the plot in pixels, defaults to `75`.
     * - **width**: Width of the plot in CSS units, defaults to `100%`.
     *
     * The sections of the chart are defined by `section` child elements. See {@link DonutChart.sections}
     * for more details.
     *
     * **Example**
     * <code-snippet language="html">
     * <projectsDonutChart margin="70" width="75%">
     *     <section label="Typescript" style="fill:darkblue">
     *        return (p) => p.ci.tags.includes('typescript')
     *     </section>
     *     <section label="Python" class="pie-chart-py" style="fill:rebeccapurple">
     *        return (p) => p.ci.tags.includes('python')
     *     </section>
     *     <section  label="JavaScript" style="fill:yellow">
     *        return (p) => p.ci.tags.includes('javascript')
     *     </section>
     * </projectsDonutChart>
     * </code-snippet>
     *
     * <note level="hint">
     * Attributes of the `p` variable, as defined in the example, are available in {@link w3nest.Project}.
     * </note>
     *
     * @param elem The HTML element containing the chart configuration.
     * @param router The application router.
     * @returns An instance of `ProjectsDonutChart`.
     */
    static fromHTMLElement(
        elem: HTMLElement,
        router: Router,
    ): ProjectsDonutChart {
        return new ProjectsDonutChart({
            appState: router.userStore as AppState,
            margin: parseFloat(elem.getAttribute('margin')) || 75,
            innerStyle: { width: elem.getAttribute('width') || '100%' },
            sections: DonutChart.sections(elem),
        })
    }
}
