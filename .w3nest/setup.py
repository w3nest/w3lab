from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import (ProjectConfig, PackageType, Dependencies, RunTimeDeps, DevServer, Bundles, MainModule,
                                   generate_template)

from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / 'package.json')

externals_deps = {
    "@youwol/mkdocs-ts": "^0.6.3",
    "@youwol/rx-vdom": "^1.0.1",
    "bootstrap": "^5.3.0",
    "@youwol/webpm-client": "^3.0.0",
    '@w3nest/http-clients': '^0.1.0',
    '@youwol/os-core': '^0.2.0',
    "@youwol/rx-tree-views": "^0.3.1",
    "@youwol/rx-code-mirror-editors": "^0.5.0",
    "@floating-ui/dom": "^1.6.3",
    "rxjs": "^7.5.6",
    'd3': '^7.7.0',
}

in_bundle_deps = {
    "d3-dag": "0.8.2"
}
dev_deps = {
    "lz-string": "^1.4.4",
}

config = ProjectConfig(
    path=project_folder,
    type=PackageType.APPLICATION,
    name=pkg_json['name'],
    version=pkg_json['version'],
    shortDescription=pkg_json['description'],
    author=pkg_json['author'],
    dependencies=Dependencies(
        runTime=RunTimeDeps(
            externals=externals_deps,
            includedInBundle=in_bundle_deps
        ),
        devTime=dev_deps
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile='./main.ts',
            loadDependencies=list(externals_deps.keys())
        ),
    ),
    userGuide=True,
    devServer=DevServer(
        port=3023
    ),
    inPackageJson={
        "scripts" :{
            "doc": "typedoc && python doc.py"
        },
    }
)

template_folder = Path(__file__).parent / '.template'

generate_template(config=config, dst_folder=template_folder)

files = [
    Path("src") / "auto-generated.ts",
    "README.md",
    "package.json",
    "tsconfig.json",
    "jest.config.ts",
    "webpack.config.ts",
    ]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
