try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'hub_services_launcher' outside a proper installation.")
    __version__ = "dev"

from .handlers import setup_handlers


def _jupyter_server_extension_points():
    return [{"module": "hub_services_launcher"}]


def _load_jupyter_server_extension(server_app):
    """Registers the server-side lookup the Launcher tiles call."""
    setup_handlers(server_app.web_app)
    server_app.log.info("hub_services_launcher: registered /hub-services-launcher/services")
