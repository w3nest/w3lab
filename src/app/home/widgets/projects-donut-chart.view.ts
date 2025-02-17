import { AppState } from '../../app-state'
import { Local } from '@w3nest/http-clients'
import { DonutChart, DonutChartSection } from './donut-chart.utils'
import { Router } from 'mkdocs-ts'

/**
 * A widget that displays a donut chart representing components.
 *
 * The chart's sections are determined by a selector function that takes a
 * [Project](@nav/doc/api/youwol/app/routers/projects.models_project.Project) as argument.
 *
 * This component is designed to be embedded in a `Markdown` page,
 * refer to {@link ProjectsDonutChart.fromHTMLElement}.
 */
export class ProjectsDonutChart extends DonutChart<Local.Projects.Project> {
    constructor(params: {
        appState: AppState
        width: string
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
     *
     * <code-snippet language="html">
     * <projectsDonutChart margin="70" width="75%">
     *     <section label="Typescript" class="pie-chart-ts">
     *        return (project) => project.pipeline.tags.includes('typescript')
     *     </section>
     *     <section label="Python" class="pie-chart-py">
     *        return (project) => project.pipeline.tags.includes('python')
     *     </section>
     *     <section  label="JavaScript" class="pie-chart-js">
     *        return (project) => project.pipeline.tags.includes('javascript')
     *     </section>
     * </projectsDonutChart>
     * </code-snippet>
     *
     * <note level="hint">
     * Attributes of the `project` variable, as defined in the example, are available
     * [here](@nav/doc/api/youwol/app/routers/projects.models_project.Project).
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
            width: elem.getAttribute('width') || '100%',
            sections: DonutChart.sections(elem),
        })
    }
}
