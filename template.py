import shutil
from pathlib import Path

from w3nest.pipelines.pipeline_typescript_weback_npm import Template, PackageType, Dependencies, \
    RunTimeDeps, DevServer, Bundles, MainModule, AuxiliaryModule
from w3nest.pipelines.pipeline_typescript_weback_npm.regular import generate_template
from w3nest.utils import parse_json

folder_path = Path(__file__).parent

pkg_json = parse_json(folder_path / 'package.json')

externals_deps = {
    "@youwol/mkdocs-ts": "^0.6.3",
    "@youwol/rx-vdom": "^1.0.1",
    "bootstrap": "^5.3.0",
    "@youwol/webpm-client": "^3.0.0",
    '@youwol/http-clients': '^3.0.0',
    '@youwol/http-primitives': '^0.2.5',
    '@youwol/local-youwol-client': '^0.3.2',
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

template = Template(
    path=folder_path,
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

generate_template(template)
shutil.copyfile(
    src=folder_path / '.template' / 'src' / 'auto-generated.ts',
    dst=folder_path / 'src' / 'auto-generated.ts'
)
for file in ['README.md',
             'LICENSE', 'package.json',
             'tsconfig.json', 'webpack.config.ts']:
    shutil.copyfile(
        src=folder_path / '.template' / file,
        dst=folder_path / file
    )
