/**
 * This module offers a collection of widgets designed for use when editing the `Home` page.
 *
 *
 * ## {@link LaunchPadView}
 *
 * A container for applications' link, *e.g.*:
 *
 * <launchPad size='50px'>
 *    <app name="mkdocs-ts-doc"></app>
 *    <app name="rx-vdom-doc"></app>
 *    <app name="@w3nest/webpm-client-doc"></app>
 * </launchPad>
 *
 * ## {@link ProjectsDonutChart}
 *
 * A donut chart that displays a histogram of
 * [projects](@nav/doc/api/youwol/app/routers/projects.models_project.Project), *e.g.*:
 *
 * <projectsDonutChart margin="70" width="75%">
 *     <section label="Typescript" style="fill:darkblue">
 *        return (p) => p.pipeline.tags.includes('typescript')
 *     </section>
 *     <section label="Python" class="pie-chart-py" style="fill:rebeccapurple">
 *        return (p) => p.pipeline.tags.includes('python')
 *     </section>
 *     <section  label="JavaScript" style="fill:yellow">
 *        return (p) => p.pipeline.tags.includes('javascript')
 *     </section>
 * </projectsDonutChart>
 *
 * ## {@link ComponentsDonutChart}
 *
 * A donut chart that visualizes a histogram of
 * [components](@nav/doc/api/youwol/app/routers/local_cdn.models.CdnPackageLight), *e.g.*:
 *
 * <componentsDonutChart margin="70" width="75%">
 *     <section label="JS/WASM" style="fill:darkblue">
 *        return (c) => c.versions.slice(-1)[0].type === 'js/wasm'
 *     </section>
 *     <section label="Pyodide" style="fill:rebeccapurple">
 *        return (c) => c.versions.slice(-1)[0].type === 'pyodide'
 *     </section>
 *     <section  label="Backend" style="fill:yellow">
 *        return (c) => c.versions.slice(-1)[0].type === 'backend'
 *     </section>
 * </componentsDonutChart>
 *
 * ## Recent Projects
 *
 * This widget displays a list of the most recently edited projects, *e.g.*:
 *
 * <projectsHistoric count="5"></projectsHistoric>
 *
 *
 * @module
 */
export * from './launch-pad.view'
export * from './projects-historic.view'
export * from './projects-donut-chart.view'
export * from './components-donut-chart.view'
export * from './donut-chart.utils'
