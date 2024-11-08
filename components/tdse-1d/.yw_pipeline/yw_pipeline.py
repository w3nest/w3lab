# Youwol application
import base64
from pathlib import Path

from w3nest.app.environment import Environment
from w3nest.app.routers.projects import (
    BrowserAppBundle,
    BrowserAppGraphics,
    Execution,
    IPipelineFactory,
)

# Youwol utilities
from w3nest_client.context import Context

# Youwol pipelines
from w3nest.pipelines.pipeline_raw_app import PipelineConfig, pipeline, PublishConfig


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, _env: Environment, context: Context):

        img_path = Path(__file__).parent.parent / 'assets' / 'icon.svg'
        svg_content = img_path.read_bytes()
        img_base64 = base64.b64encode(svg_content).decode('utf-8')

        config = PipelineConfig(
            target=BrowserAppBundle(
                displayName="TDSE-1D",
                execution=Execution(standalone=True),
                graphics=BrowserAppGraphics(
                    appIcon={
                        "tag":'img',
                        "style":{"width": "100%"},
                        "src": f"data:image/svg+xml;base64,{img_base64}"
                    },
                    fileIcon={}
                ),
            ),
            publishConfig=PublishConfig(packagedFolders=["assets"])
        )
        return await pipeline(config, context)
