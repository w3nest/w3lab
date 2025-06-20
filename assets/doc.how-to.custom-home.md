# Custom Home Page

This page explains how to define and edit a custom Home page.

To begin editing the Home page, click <colabButton target='HomeEdit'></colabButton> button 
in the <navNode target="Home"></navNode> navigation node.

While editing, three panels are available:
*  <img src='../assets/icon-md.svg' width='25px'></img> **Markdown**: 
   Defines the main content of the page using `MarkDown`.

*  <img src='../assets/icon-js.svg' width='25px'></img> **JavaScript**:
   Allows advanced users to define how the `Markdown` content is parsed.

*  <img src='../assets/icon-css.svg' width='25px'></img> **CSS**: 
   Enables customization of CSS styling properties.

---

## <img src='../assets/icon-md.svg' width='25px'></img> MarkDown Content

The **Markdown panel** is the core component of the editor.
It supports all standard `Markdown` syntax, allowing you to create rich content for your custom **Home page**. 
Additionally, you can enhance the page using special widgets and custom processing features.

<note level="hint">
The `Markdown` engine is powered by the **mkdocs-ts** library.
For more information, you can refer to the official documentation 
<ext-link target="mkdocs-ts">documentation</ext-link>.
</note>

### W3Lab Widgets
**W3Lab** provides a collection of widgets that can be directly integrated into your `Markdown` content.
Below are some brief examples. For more detailed information, refer to 
<api-link target="W3Lab.Widgets"></api-link>.


<note level="hint">
This section includes **interactive `Markdown` cells**. 
Feel free to experiment with them (use `Ctrl + Enter` to execute).
</note>

#### Launch-pad

This widget creates a launch-pad from target applications:

<md-cell>
This is an example of `LaunchPad`:

<launchPad size='50px'>
   <app name="@mkdocs-ts/doc"></app>
   <app name="@rx-vdom/doc"></app>
   <app name="@webpm-client/doc"></app>
</launchPad>
</md-cell>

More information in <api-link target="W3Lab.LaunchPadView"></api-link>.

#### Projects Donut Chart

This widget creates a donut chart displaying the distribution of projects based on given selectors:

<md-cell>
This is an example of donut chart regarding projects:

<projectsDonutChart margin="70" width="75%">
    <section label="Typescript" style="fill:darkblue">
       return (project) => project.ci.tags.includes('typescript')
    </section>
    <section label="Python" style="fill:rebeccapurple">
       return (project) => project.ci.tags.includes('python')
    </section>
    <section  label="JavaScript" style="fill:yellow">
       return (project) => project.ci.tags.includes('javascript')
    </section>
</projectsDonutChart>
</md-cell>

<note level="hint">
See <api-link target="w3nest.Project"></api-link> regarding the available attributes of the `project` variable 
referenced above.
<todo icon="warning">This is not exactly it, but it provides a global idea (documentation on its way).</todo>
</note>

More information in <api-link target="W3Lab.ProjectsDonutChart"></api-link>.

#### Components Donut Chart

This widget creates a donut chart displaying the distribution of components based on given selectors:

<md-cell>
This is an example of donut chart regarding components:

<componentsDonutChart margin="70" width="75%">
    <section label="JS/WASM" style="fill:darkblue">
       return (component) => component.versions.slice(-1)[0].kind === 'esm'
    </section>
    <section label="Pyodide" style="fill:rebeccapurple">
       return (component) => component.versions.slice(-1)[0].kind === 'pyodide'
    </section>
    <section  label="Backend" style="fill:yellow">
       return (component) => component.versions.slice(-1)[0].kind === 'backend'
    </section>
    <section  label="WebApp" style="fill:darkgreen">
       return (component) => component.versions.slice(-1)[0].kind === 'webapp'
    </section>
</componentsDonutChart>
</md-cell>

<note level="hint">
See <api-link target="w3nest.CdnPackageLight"></api-link> regarding the available attributes of the `component` variable 
referenced above.
</note>

More information in  <api-link target="W3Lab.ComponentsDonutChart"></api-link>.


#### Projects Historic

This widget displays a list of the most recently edited projects, *e.g.*:

<md-cell>
This is an example to display recently edited projects:

<projectsHistoric count="5"></projectsHistoric>
</md-cell>

More information in  <api-link target="W3Lab.ProjectsHistoricView"></api-link>.


### Other Widgets

####  `mkdocs-ts` Widgets

The **mkdocs-ts** library also offers several widgets for use. 
Below is an example combining `note`, `expandable` and `code-snippet`:

<md-cell>
<note level="hint">
I'm a note featuring an expandable content:
<note level="question" icon="fas fa-question-circle" title="Details" expandable="true">
   Itself including a code-snippet:
   
<code-snippet language="javascript">
// An embedded code.
function foo(){}
</code-snippet>
</note>
</note>
</md-cell>

For more details on the **`mkdocs-ts`** widgets, visit its
<ext-link target="mkdocs-ts-MD">documentation</ext-link>.

#### Custom Widgets

You can also define custom widgets through the **JavaScript panel**, as described in the following section.

---

## <img src='../assets/icon-js.svg' width='25px'></img> JavaScript Content

The **JavaScript panel** is typically used to enhance the `Markdown` parser, for instance, 
by enabling pre-processing or defining custom views.

The default content in this panel is:

<code-snippet language='javascript'>
return async({mdSrc, webpm, mkdocs, router}) => {

    return mkdocs.parseMd({src: mdSrc, router})
}
</code-snippet>

**Parameters**:
*  **mdSrc**: The raw content of the `Markdown` source.
*  **<ext-link target="webpm">webpm</ext-link>**: The installer module from w3nest. 
   This module can be used to install required packages, for instance when defining custom views. 
*  **<ext-link target="mkdocs-ts">mkdocs</ext-link>**: It is the **mkdocs-ts** module, which provides 
   the `Markdown` parser, see <ext-link target='mkdocs-ts-parseMD'>parseMd</ext-link> function.
*  **<ext-link target='mkdocs-ts-router'>router</ext-link>**: The router for this application, 
   often only forwarded to `parseMd`.

**Returns**:
*  The function should return a <ext-link target='rx-vdom.VirtualDOM'></ext-link> or an 
   <ext-link target='HTMLElement'></ext-link>

<note level="hint">
In most cases, the `VirtualDOM` returned from this function is generated using `parseMd`. 
However, this is not a requirement, you can ignore it and use any alternative ways to produce a `VirtualDOM`.
</note>

### Custom Widgets

A common use of the **JavaScript panel** is to define custom views that can be referenced in the `Markdown` content.

Here's an example of how to define a custom widget:

<code-snippet language='javascript'>
return async({mdSrc, webpm, mkdocs, router}) => {

    const {rxjs} = await webpm.install({esm:['rxjs#^7.5.6 as rxjs']})
    return mkdocs.parseMd({
        src: mdSrc, 
        router,
        views: {
            date: (elem) => ({
                tag: 'div',
                innerText: {
                    source$: rxjs.timer(0, parseInt(elem.getAttribute('period'))),
                    vdomMap: (_tick) =>  new Date().toLocaleString()
                }
            })
        }
    })
}
</code-snippet>

With this custom widget definition, adding `<date period='1000'></date>` in the `Markdown` source will display the 
current date, refreshed every second.

---

## <img src='../assets/icon-css.svg' width='25px'></img> CSS Content

The **CSS panel** allows you to define custom `CSS` rules for the **Home page**. 
These rules can be used to customize the appearance of both standard and custom widgets.

For example, you can style custom widgets like this:

<code-snippet language='css'>
.custom-widget {
    background-color: lightblue;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
}
</code-snippet>

This will apply a light blue background and rounded corners to any elements with the class `custom-widget`.