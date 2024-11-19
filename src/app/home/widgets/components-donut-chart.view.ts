import { AppState } from '../../app-state'
import { map } from 'rxjs/operators'
import { DonutChart, DonutChartSection } from './donut-chart.utils'
import { Local } from '@w3nest/http-clients'
import { Router } from '@youwol/mkdocs-ts'

/**
 * A widget that displays a donut chart representing components.
 *
 * The chart's sections are determined by a selector function that takes a
 * [CdnPackageLight](@nav/doc/api/youwol/app/routers/local_cdn.models.CdnPackageLight) as argument.
 *
 * This component is designed to be embedded in a `Markdown` page,
 * refer to {@link ComponentsDonutChart.fromHTMLElement}.
 */
export class ComponentsDonutChart extends DonutChart<Local.Routers.LocalCdn.CdnPackageLight> {
    constructor(params: {
        appState: AppState
        width: string
        margin: number
        sections: DonutChartSection<Local.Routers.LocalCdn.CdnPackage>[]
    }) {
        super({
            ...params,
            entities$: params.appState.cdnState.status$.pipe(
                map((resp) => resp.packages),
            ),
        })
    }

    /**
     * Constructs a `ComponentsDonutChart` from an `componentsDonutChart` HTML element, typically sourced from
     * `Markdown`.
     *
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
     * <componentsDonutChart margin='50'>
     *     <section label="Foo" class='donut-foo'>
     *         return (component) => component.name.includes("foo")
     *     </section>
     *     <section label="Bar" class='donut-bar'>
     *         return (component) => component.name.includes("bar")
     *     </section>
     * </componentsDonutChart>
     * </code-snippet>
     *
     * <note level="hint">
     * Attributes of the `component` variable, as defined in the example, are available
     * [here](@nav/doc/api/youwol/app/routers/local_cdn.models.CdnPackageLight).
     * </note>
     *
     * @param elem The HTML element containing the chart configuration.
     * @param router The application router.
     * @returns An instance of `ComponentsDonutChart`.
     */
    static fromHTMLElement(
        elem: HTMLElement,
        router: Router,
    ): ComponentsDonutChart {
        return new ComponentsDonutChart({
            appState: router['appState'] as unknown as AppState,
            margin: parseFloat(elem.getAttribute('margin')) || 75,
            width: elem.getAttribute('width') || '100%',
            sections: DonutChart.sections(elem),
        })
    }
}
