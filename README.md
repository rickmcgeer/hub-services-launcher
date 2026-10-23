# hub-services-launcher

A small JupyterLab extension that adds a **Hub Services** row to the Launcher:
one tile for each JupyterHub service the user can reach - the same list as the
Hub's own *Services* menu (services registered with `display: True`), without
leaving JupyterLab. Each tile opens the service in a new tab.

Outside a JupyterHub (e.g. a plain local `jupyter lab`) it does nothing.

## Hub configuration required

The extension calls `GET /hub/api/services` as the logged-in user. Listing
services needs two scopes the default `user` role does not have, so grant them
in the Hub config:

```python
c.JupyterHub.load_roles.append({
    "name": "user",
    "scopes": ["self", "access:servers", "access:services",
               "list:services", "read:services"],
    "users": ["*"],
})
```

(Keep whatever scopes your `user` role already has - roles are replaced, not
merged, by `load_roles` with the same name.) Without them the Hub answers 403
and the extension quietly shows no tiles; the reason is logged at debug level
in the browser console.

Only services with `display: True` are shown. Services without a proxied URL
(managed processes, culler, etc.) are skipped.

Limitation: the Hub's own Services menu also hides services the user lacks
`access:services` for; the API doesn't expose that, so with `list:services`
granted broadly a tile can appear for a service the user can't open (the click
then gets a 403 from the Hub). Fine when every user can access every service.

The extension accepts both response shapes of `GET /hub/api/services` (JupyterHub
5.x returns an object keyed by service name).

## Install

```bash
pip install hub_services_launcher
```

Requires JupyterLab 4.

## Development install

```bash
pip install -e "."
jupyter labextension develop . --overwrite
jlpm build
```
