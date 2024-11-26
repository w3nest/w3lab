# <apiLink target="Projects">Projects Configuration</apiLink>

Projects configuration is managed using an instance of <apiLink target="Projects"></apiLink>. 
This configuration encompasses:
*  The definition of one or more <apiLink target="ProjectsFinder"></apiLink>
   These are used to locate projects on your computer. Each project finder is displayed as a node under 
   <navNode target="Projects"></navNode> (using <i class='fas fa-object-group'></i> icon).
*  A list of <apiLink target="ProjectsTemplate"></apiLink>.
   A project template provides a starter project and is accessible from the **New project** section of the
   <navNode target="Projects"></navNode> page.

<note level="hint">
 If no custom configuration for the `Projects` attribute is provided in the configuration file, 
a default setup is applied:
*  A single project finder is included, looking in the
[default path](@nav/doc/api/w3nest/app/environment/models.defaults.default_path_projects_dir).
*  A few project templates are made available as starters.
</note>

## <apiLink target="ProjectsFinder"></apiLink>

Below is an example showcasing various configuration options for `ProjectsFinder`.

<code-snippet language="python">
from pathlib import Path

from w3nest.app.environment import (
    Configuration,
    Projects,
    ProjectsFinder
)

folder_js = Path.home() / 'Projects-JS'
folder_ts = Path.home() / 'Projects-TS'
folder_py = Path.home() / 'Projects-Py'

Configuration(
    projects=Projects(
        finder = [
            ProjectsFinder(
                fromPaths=folder_js,
            ),
            ProjectsFinder(
                fromPaths=folder_ts,
                lookUpDepth=2,
                watch=True
            )
            ProjectsFinder(
                fromPaths=folder_py,
                lookUpDepth=3,
                watch=False,
                lookUpIgnore=["**/__pycache__"]
            ),
        ]
    )
)
</code-snippet>

## <apiLink target="ProjectsTemplate"></apiLink>

A project template is essentially a Python function that generates a starter project in a specified folder.
These templates are typically part of a Python package that also defines the pipeline associated with that type of 
project.

For example, W3Nest provides the <apiLink target="pipeline_raw_app"></apiLink> - a basic pipeline
for packaging and publishing JavaScript applications. This package also exposes the
<apiLink target="pipeline_raw_app.template"></apiLink> function.


To include this project starter in your configuration:

<code-snippet language="python" highlightedLines="18-20">
from w3nest.app.configuration import (
    Configuration,
    ProjectsFinder,
    Projects
)
import w3nest.ci.js_app as js_app

projects_folder = Path.home() / 'js_apps'
Configuration(
    projects=Projects(
        finder=[
            ProjectsFinder(
                fromPath=projects_folder,
                lookUpDepth=1,
                watch=True
            ),
        ],
        templates=[
            js_apps.template(
                folder=projects_folder
            )
        ]
    )
)
</code-snippet>


By doing so:
*  A `Raw JS Application` option will be available under the **New project** section 
   of the <navNode target="Projects"></navNode> page.
*  When a project is created, it will be placed in the `projects_folder`.
*  Since a `ProjectsFinder` is set to watch this folder, CoLab will automatically update and display the newly
   created project under a <label icon='fas fa-object-group'>raw_apps</label> node within
   <navNode target="Projects"></navNode>. 

<note level="hint">
Defining a custom pipeline and project template is generally straightforward.
You can explore several examples in the W3Nest repository, such as:
<a href="https://github.com/w3nest/py-w3nest/tree/main/src/w3nest/ci/js_app" target="_blank">
Pipeline Raw App</a>,
<a href="https://github.com/w3nest/py-w3nest/tree/main/src/w3nest/ci/py_backend" target="_blank">
Pipeline Python Backend</a>, and
<a href="https://github.com/w3nest/py-w3nest/tree/main/lib/py-w3nest_client/.w3nest/ci.py" target="_blank">
W3Nest Clients Pipeline</a>.

</note>
