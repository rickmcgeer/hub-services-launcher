# hub-services-launcher

A small JupyterLab extension that adds a **Hub Services** row to the Launcher:
one tile for each JupyterHub service the user can reach - the same list as the
Hub's own *Services* menu (services registered with `display: True`), without
leaving JupyterLab. Each tile opens the service in a new tab.

Outside a JupyterHub (e.g. a plain local `jupyter lab`) it does nothing.

## How it works

The browser can't ask the Hub for the service list itself: the Hub checks XSRF
even on `GET`s to its API, using a cookie scoped to `/hub/` that JavaScript on a
`/user/<name>/lab` page can't read. So a small Jupyter Server extension in the
single-user server asks the Hub instead - authenticating with the server's own
API token (`JUPYTERHUB_API_TOKEN`), which skips the XSRF check - and the
Launcher tiles ask that: `GET <base_url>hub-services-launcher/services`.

## Hub configuration required

Listing services needs two scopes the default `server` role does not have.
Grant them to the `server` role (not `user` - only the single-user servers need
them):

```python
c.JupyterHub.load_roles.append({
    "name": "server",
    "scopes": ["access:servers!server", "users:activity!user",
               "list:services", "read:services"],
})
```

(Roles are replaced, not merged, by `load_roles` with the same name - keep the
default `server` scopes shown above.) Without the new scopes the Hub answers
403, the extension shows no tiles, and the server log says why.

Only services with `display: True` and a proxied URL are shown - the Hub's own
Services menu rules. Outside a JupyterHub (no `JUPYTERHUB_API_TOKEN`) the
extension does nothing.

Limitation: the Hub's own Services menu also hides services the user lacks
`access:services` for. The server's token can't see that, so a tile can appear
for a service a particular user can't open (the click then gets a 403 from the
Hub). Fine when every user can access every service.

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
