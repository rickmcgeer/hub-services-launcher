try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'hub_services_launcher' outside a proper installation.")
    __version__ = "dev"
