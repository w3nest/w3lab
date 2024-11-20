# @w3nest/co-lab

The W3Nest's collaborative laboratory application.

This library is part of the hybrid cloud/local ecosystem
[YouWol](https://platform.youwol.com/apps/@youwol/platform/latest).

## Links

[Running app.](https://platform.youwol.com/apps/@w3nest/co-lab/latest)

[Online user-guide](https://l.youwol.com/doc/@w3nest/co-lab)

[Developers documentation](https://platform.youwol.com/apps/@youwol/cdn-explorer/latest?package=@w3nest/co-lab&tab=doc)

[Package on npm](https://www.npmjs.com/package/@w3nest/co-lab)

[Source on GitHub](https://github.com/w3nest/co-lab)

# Installation, Build, Test

To install the required dependencies:

```shell
yarn
```

---

To build for development:

```shell
yarn build:dev
```

To build for production:

```shell
yarn build:prod
```

---

<!-- no specific test configuration documented -->

To run tests:

```shell
yarn test
```

Coverage can be evaluated using:

```shell
yarn test-coverage
```

---

To start the 'dev-server':

```shell
yarn start
```

In order to use the dev-server within Py-YouWol and to serve resources in place of the usual CDN database,
the Py-YouWol configuration needs to be updated to include a `WebpackDevServerSwitch` within a
`FlowSwitcherMiddleware`. For example:

```python
from w3nest.app.environment import *
from w3nest.pipelines.pipeline_typescript_weback_npm import WebpackDevServerSwitch

Configuration(
    customization = Customization(
        middlewares = [
            FlowSwitcherMiddleware(
                name = 'front-end dev-servers',
                oneOf = [
                    WebpackDevServerSwitch(packageName="@w3nest/co-lab", port=3023),
                ]
            )
        ]
    )
)
```

Additional information on the `Configuration` class can be found in the "Configuration API" page of the
[Py-YouWol guide](https://l.youwol.com/doc/py-youwol).

Once Py-YouWol is running with the updated configuration,
the application can be accessed from [here](http://localhost:2000/apps/@w3nest/co-lab/latest)
(providing py-youwol running using the default port `2000`).

---

To generate code's documentation:

```shell
yarn doc
```
