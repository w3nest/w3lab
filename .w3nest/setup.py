from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import (
    ProjectConfig,
    PackageType,
    Dependencies,
    RunTimeDeps,
    DevServer,
    Bundles,
    MainModule,
    generate_template,
)

from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")

externals_deps = {
    "mkdocs-ts": "^0.5.2",
    "rx-vdom": "^0.1.3",
    "bootstrap": "^5.3.0",
    "@w3nest/webpm-client": "^0.1.11",
    "@w3nest/http-clients": "^0.1.8",
    "@w3nest/rx-tree-views": "^0.2.0",
    "@floating-ui/dom": "^1.6.3",
    "rxjs": "^7.8.1",
    "d3": "^7.7.0",
    "@w3nest/ui-tk": "^0.1.6",
    "@w3nest/doc": "^0.1.13",
}

in_bundle_deps = {
    "d3-dag": "0.8.2",
    "prism-code-editor": "^4.0.0",
    # only for type definitions
    "@mkdocs-ts/code-api": "^0.2.0",
    # only for type definitions
    "@mkdocs-ts/notebook": "^0.1.2",
}
dev_deps = {
    "lz-string": "^1.4.4",
}

config = ProjectConfig(
    path=project_folder,
    type=PackageType.APPLICATION,
    name=pkg_json["name"],
    version=pkg_json["version"],
    shortDescription=pkg_json["description"],
    author=pkg_json["author"],
    dependencies=Dependencies(
        runTime=RunTimeDeps(externals=externals_deps, includedInBundle=in_bundle_deps),
        devTime=dev_deps,
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile="./app/main.ts",
            loadDependencies=[
                "mkdocs-ts",
                "rxjs",
                "rxjs/operators",
                "rx-vdom",
                "bootstrap",
                "@w3nest/webpm-client",
                "@w3nest/http-clients",
                "@w3nest/rx-tree-views",
                "@floating-ui/dom",
                "d3",
                "@w3nest/ui-tk/Badges",
                "@w3nest/ui-tk/Mkdocs",
                "@w3nest/ui-tk/Trees",
                "@w3nest/doc/api",
            ],
        ),
    ),
    userGuide=True,
    devServer=DevServer(port=3023),
    inPackageJson={
        "scripts": {"doc": "(cd .w3nest && npx tsx doc.ts)"},
    },
)

template_folder = Path(__file__).parent / ".template"

generate_template(config=config, dst_folder=template_folder)

files = [
    "README.md",
    "package.json",
    "tsconfig.json",
    "jest.config.ts",
    "webpack.config.ts",
]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
