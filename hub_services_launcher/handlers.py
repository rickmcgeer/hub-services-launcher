import json
import os

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPRequest


def visible_services(payload):
    """Reduces the Hub's GET /services payload to [{name, prefix}] for the
    services the Hub would list in its Services menu (display set, proxied URL).

    JupyterHub 5.x answers with an object keyed by service name; accept a
    plain list too, in case other versions differ.
    """
    services = list(payload.values()) if isinstance(payload, dict) else payload
    shown = [
        {"name": s["name"], "prefix": s["prefix"]}
        for s in services
        if s.get("display") and s.get("prefix")
    ]
    return sorted(shown, key=lambda s: s["name"])


class ServicesHandler(APIHandler):
    """GET /hub-services-launcher/services

    The browser can't ask the Hub itself: the Hub checks XSRF even on GETs to
    its API, and its XSRF cookie is scoped to /hub/, so JavaScript on a
    /user/<name>/lab page can't supply a token. The single-user server can -
    it authenticates to the Hub with its own API token, which skips XSRF - so
    it does the lookup and hands the browser the result.

    Needs the Hub's `server` role to carry list:services and read:services.
    Returns [] (never an error) when not running under a Hub or when the Hub
    refuses, so the Launcher simply shows no Services row.
    """

    @tornado.web.authenticated
    async def get(self):
        api_url = os.environ.get("JUPYTERHUB_API_URL")
        token = os.environ.get("JUPYTERHUB_API_TOKEN")
        if not api_url or not token:
            self.finish(json.dumps([]))
            return
        request = HTTPRequest(
            api_url.rstrip("/") + "/services",
            headers={"Authorization": "token " + token},
            request_timeout=10,
        )
        try:
            response = await AsyncHTTPClient().fetch(request)
            services = visible_services(json.loads(response.body))
        except Exception as error:  # Hub down, 403 (missing scopes), bad JSON, ...
            self.log.warning(
                "hub_services_launcher: could not list Hub services (%s); the server "
                "role needs list:services and read:services",
                error,
            )
            services = []
        self.finish(json.dumps(services))


def setup_handlers(web_app):
    route = url_path_join(web_app.settings["base_url"], "hub-services-launcher", "services")
    web_app.add_handlers(".*$", [(route, ServicesHandler)])
