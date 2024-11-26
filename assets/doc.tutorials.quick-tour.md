# Quick Tour

<note level='hint'>
For an optimal experience while following this tutorial, it's recommended to enable dual view, keeping this 
documentation separate. 
To do this, click the <i class="fas fa-object-ungroup"></i> icon in the side navigation panel, 
located under the <i class="fas fa-book px-1"></i> **Doc** section.
</note>

## Objectives

*  Learn how to create a simple JavaScript application
*  Learn how to publish it on your PC and share it with your community.

---

## Project Creation

W3Nest provides several standard project templates, each implemented as a Python module. These templates also define a 
pipeline that outlines the necessary steps (e.g., `setup`, `build`, `test`) to create an executable component.

Let's create a simple JavaScript project starter:

*  Navigate to <navNode target="Projects"></navNode>.
*  Under the section **New project**:
   *  expand the **Raw JS Application** group
   *  provide the name <copyClipboard>tdse-1d</copyClipboard>
   *  click **Generate**.

The project should open with its pipeline displayed.


<expandable title="Additional info" icon="fas fa-question-circle text-success">
Here, we used a template for a basic web application, managed by the W3Nest’s Python module 
<apiLink target="pipeline_raw_app"></apiLink>.
The default configuration includes it among a couple of others.

For additional information regarding how W3Nest is looking for projects, or how to define your own template & pipeline,
a starting point can be found [here](@nav/doc/how-to/config/projects)
</expandable>

---

## Local Deployment

This pipeline is the least opinionated when it comes to the technology stack, making it suitable for any kind of
JavaScript project, as long as it produces a valid web application.
However, it does not provide built-in tools for tasks like building or testing—the responsibility for these steps lies
entirely with the user.

It features 3 steps:
*  **package**: Package selected files into an artifact named `package`.
*  **cdn-local**: Publish the `package` artifact into the local components' database.
*  **cdn_prod**: Publish the component from the local database to the remote one.

### Package

Select the first `package` step from the flow chart and execute it using the <i class='fas fa-play text-success'></i>
button.
Once complete, a `package` artifact is will appear under the **Artifacts** section.
You can expand it to view its contents.

### cdn-local

Select the `cdn-local` step and execute it. Once finished, the <i class='fas fa-play text-primary'></i> icon in the
project's page header will activate. Click it to open your application in a new tab.

<note level="hint" label="✨ Congratulations! You've successfully deployed a ToDo application ✨">
In the upcoming sections, we will explore smaller code examples to dive into specific topics. 
If you're interested in the ToDo application code and a step-by-step guide on how it was built,
you can find it <a href="/apps/rx-vdom-doc/latest?nav=/tutorials" target="_blank">here</a>.
</note>

The header also features an icon: <i class='fas fa-microchip text-primary'></i>, which links to the details page of 
the built component. This page provides an overview of the component and consolidates all published artifacts.
Although this specific pipeline doesn’t include links, standard pipelines typically offer links to resources such as 
documentation, bundle analysis, coverage reports, and more.

<expandable title="About Work In Progress (wip)" icon="fas fa-question-circle text-success">

As you've noticed, the application version is suffixed with `-wip`. 
When a component (library, application, or backend) has a version with this suffix, caching mechanisms are disabled,
ensuring that you always receive the latest changes for that version.

However, for final versions (those without the `-wip` suffix), caching is enabled at various levels to optimize 
performance. Since these versions are cached, they should be published only once—just like with any standard package 
release.
</expandable>

---

## Dynamic Resources Linking

One of the key features provided by the W3Nest environment is its ability to dynamically install and link the necessary
dependencies for your application. These dependencies come in three forms: 
*  JavaScript or WebAssembly (ESM) packages.
*  Python packages ported by Pyodide to run in the browser. 
*  Backend services running locally on your machine (usually in containers). 

To illustrate this:
*  Update the code:
    *  In the <projectNav project="tdse-1d"></projectNav> page's header, 
       click the <i class='fas fa-laptop text-primary'></i> icon to browse your project.
    *  In the top ribbon bar, click the <i class='fas fa-folder-open text-primary'></i> icon. 
       It opens your platform's files explorer.
    *  Copy/paste the content of the `script.js` and `style.css` files found 
     <a target="_blank" href="https://github.com/w3nest/co-lab/tree/main/components/tdse-1d/src">here</a>.
*  Back on <projectNav project="tdse-1d"></projectNav>, re-run the `package` and `cdn-local` steps.
*  Refresh the tab running your application and return here while the required backend is installing.

<note level="hint" label="TDSE-1D">
The updated application's code solves the 1D Time-Dependent Schrödinger Equation (TDSE) for a custom potential energy. 
As mentioned below, the app requires 
[this backend](https://github.com/w3nest/co-lab/tree/main/components/colab-backend-project), which will need to be 
installed on first use (likely right now).

*  You can follow the installation progress from <a href="@nav/components/backends/Y29sYWJfYmFja2VuZA==">here</a>.
*  Once installed, the backend will start and the <i class='fas fa-network-wired text-primary'></i> icon will appear
   in the tob banner.
*  Under the <navNode target="Backends"></navNode> section, you can access the running instance, 
   view its properties, and check its logs.
</note>

The key takeaway from this example is the dynamic installation of dependencies, achieved in the code through the 
following snippet:

<code-snippet language='javascript'>
const { backend, rxjs, d3 } = await webpm.install({
    esm: ['rxjs#^7.5.6 as rxjs', 'd3#^7.7.0 as d3'],
    backends: ['colab_backend#^0.1.0 as backend'],
    displayLoadingScreen: true,
})
</code-snippet>

The `webpm` (Web Packages Manager) variable serves as the client for W3Nest's components service. 
It provides real-time resolution of dependency trees. When the `install` function is invoked:
*  It resolves the dependency tree for the requested components according to the **semantic versioning query**.
*  It installs and links the resolved dependencies (**both direct and indirect**) in your browser,
   **skipping those already available** in your browser's tab.
   The resolution considers packages from **both local & remote databases**.
*  It returns the requested resources under the alias names provided.


<expandable title="Additional info" icon="fas fa-question-circle text-success">
*  For more details about the WebPM client and its installation options, refer to the
<a target="_blank" href="/apps/@w3nest/webpm-client-doc/latest?nav=/">WebPM's documentation</a>.

*  To learn more about the resolution of the TDSE 1D equation and the plotting implementation, visit the interactive
   notebook available 
   <a target="_blank" href="/apps/@w3nest/gallery/latest?nav=/sciences/tdse-1d">here</a>.
   It uses the ability of WebPM to install and run python modules. 

*  If you are interested in some details on how backend installation is working, refer to
   <apiLink target="Backends"></apiLink>.
</expandable>

---

## Cloud Deployment

<note level="warning" label="Important">
 The project name `tdse-1d` has already been published online with restricted permissions, 
meaning you won’t be able to publish it yourself. If you were using a unique project name, simply running the 
`cdn_prod` step would publish your project online (accessible to you only by default, as explained in
the **Permissions** section below). 
</note>

Once an application is published online,  it can be accessed via the following URL:

https://w3nest.org/apps/{APP_NAME}/{APP_VERSION}`

Where:
*  `{APP_NAME}` is the name of your application.
*  `{APP_VERSION}` is the version of your application, supporting semantic versioning (*e.g.* `*` for the latest 
    version). 

<note level="warning">
Applications that require backend installation, like the one built here, can currently only be executed through the
local W3Nest server. In practice, you can share the URL for these applications only with users who have the local W3Nest
server installed and running.
</note>

### Permissions

By default, when an application is first published, it has private access. 
To change this, click the <i class="fas fa-folder text-primary"></i> icon in the
<projectNav project="tdse-1d"></projectNav> page's header and adjust 
the permissions under the **Access** section. Set the read policy for **Default access** to `Authorized`,
and then re-run the `cdn_prod` step.

Additionally, your component will be stored within W3Nest’s file system in a `Download` folder, 
which you can browse from <defaultUserDrive target="download"></defaultUserDrive>. 
You have the option to move the asset by cutting/pasting it to a different location.

---

## Key Takeaways

*  The **CoLab** application serves as a dashboard, providing everything you need to manage and navigate your 
   local environment.
*  Projects are the foundation for components, which are transformed through a pipeline. 
   Pipelines are implemented using Python modules, and we demonstrated a generic one capable of publishing any type
   of web application.
*  Projects can utilize the WebPM client to install dependencies dynamically. It enables backends to 
   be seamlessly integrated into your applications—opening up vast possibilities. Also, it offers a significant 
   advantage in scenarios where dependencies are unknown in advance, such as in applications like
   <a href="/apps/mkdocs-ts-doc/latest?nav=/tutorials/notebook" target="_blank">notebooks</a> or 
   <a href="/apps/@w3nest/gallery/latest?nav=/vs-flow" target="_blank">low-code environments</a>.