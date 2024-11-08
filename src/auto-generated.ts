
const runTimeDependencies = {
    "externals": {
        "@floating-ui/dom": "^1.6.3",
        "@youwol/http-clients": "^3.0.0",
        "@youwol/http-primitives": "^0.2.5",
        "@youwol/local-youwol-client": "^0.3.2",
        "@youwol/mkdocs-ts": "^0.6.3",
        "@youwol/os-core": "^0.2.0",
        "@youwol/rx-code-mirror-editors": "^0.5.0",
        "@youwol/rx-tree-views": "^0.3.1",
        "@youwol/rx-vdom": "^1.0.1",
        "@youwol/webpm-client": "^3.0.0",
        "bootstrap": "^5.3.0",
        "d3": "^7.7.0",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {
        "d3-dag": "0.8.2"
    }
}
const externals = {
    "@floating-ui/dom": "window['@floating-ui/dom_APIv1']",
    "@youwol/http-clients": "window['@youwol/http-clients_APIv3']",
    "@youwol/http-primitives": "window['@youwol/http-primitives_APIv02']",
    "@youwol/local-youwol-client": "window['@youwol/local-youwol-client_APIv03']",
    "@youwol/mkdocs-ts": "window['@youwol/mkdocs-ts_APIv06']",
    "@youwol/os-core": "window['@youwol/os-core_APIv02']",
    "@youwol/rx-code-mirror-editors": "window['@youwol/rx-code-mirror-editors_APIv05']",
    "@youwol/rx-tree-views": "window['@youwol/rx-tree-views_APIv03']",
    "@youwol/rx-vdom": "window['@youwol/rx-vdom_APIv1']",
    "@youwol/webpm-client": "window['@youwol/webpm-client_APIv3']",
    "bootstrap": "window['bootstrap_APIv5']",
    "d3": "window['d3_APIv7']",
    "rxjs": "window['rxjs_APIv7']",
    "rxjs/fetch": "window['rxjs_APIv7']['fetch']",
    "rxjs/operators": "window['rxjs_APIv7']['operators']"
}
const exportedSymbols = {
    "@floating-ui/dom": {
        "apiKey": "1",
        "exportedSymbol": "@floating-ui/dom"
    },
    "@youwol/http-clients": {
        "apiKey": "3",
        "exportedSymbol": "@youwol/http-clients"
    },
    "@youwol/http-primitives": {
        "apiKey": "02",
        "exportedSymbol": "@youwol/http-primitives"
    },
    "@youwol/local-youwol-client": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/local-youwol-client"
    },
    "@youwol/mkdocs-ts": {
        "apiKey": "06",
        "exportedSymbol": "@youwol/mkdocs-ts"
    },
    "@youwol/os-core": {
        "apiKey": "02",
        "exportedSymbol": "@youwol/os-core"
    },
    "@youwol/rx-code-mirror-editors": {
        "apiKey": "05",
        "exportedSymbol": "@youwol/rx-code-mirror-editors"
    },
    "@youwol/rx-tree-views": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/rx-tree-views"
    },
    "@youwol/rx-vdom": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/rx-vdom"
    },
    "@youwol/webpm-client": {
        "apiKey": "3",
        "exportedSymbol": "@youwol/webpm-client"
    },
    "bootstrap": {
        "apiKey": "5",
        "exportedSymbol": "bootstrap"
    },
    "d3": {
        "apiKey": "7",
        "exportedSymbol": "d3"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./main.ts",
    "loadDependencies": [
        "@youwol/mkdocs-ts",
        "@youwol/rx-vdom",
        "bootstrap",
        "@youwol/webpm-client",
        "@youwol/http-clients",
        "@youwol/http-primitives",
        "@youwol/local-youwol-client",
        "@youwol/os-core",
        "@youwol/rx-tree-views",
        "@youwol/rx-code-mirror-editors",
        "@floating-ui/dom",
        "rxjs",
        "d3"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {}

const entries = {
     '@w3nest/co-lab': './main.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@w3nest/co-lab/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@w3nest/co-lab',
        assetId:'QHczbmVzdC9jby1sYWI=',
    version:'0.7.0-wip',
    shortDescription:"The W3Nest's collaborative laboratory application.",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@w3nest/co-lab&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@w3nest/co-lab',
    sourceGithub:'https://github.com/w3nest/co-lab',
    userGuide:'https://l.youwol.com/doc/@w3nest/co-lab',
    apiVersion:'07',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@w3nest/co-lab_APIv07`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@w3nest/co-lab#0.7.0-wip~dist/@w3nest/co-lab/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@w3nest/co-lab/${entry.name}_APIv07`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
