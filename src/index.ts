import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { URLExt } from '@jupyterlab/coreutils';
import { ILauncher } from '@jupyterlab/launcher';
import { ServerConnection } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';

const CATEGORY = 'Hub Services';

/**
 * A service the Hub lists in its Services menu, as returned by this
 * extension's server component. `prefix` is the path the Hub proxies the
 * service under (e.g. /services/gdp/).
 */
interface IHubService {
  name: string;
  prefix: string;
}

// Muted palette; a service always gets the same colour (hash of its name).
const COLORS = [
  '#2F6DB5',
  '#B5542F',
  '#2F9E7A',
  '#8B4FB5',
  '#B58A2F',
  '#B52F6D',
  '#4F7AB5',
  '#5C8A2F'
];

function iconFor(name: string): LabIcon {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const color = COLORS[hash % COLORS.length];
  const letters = monogram(name);
  return new LabIcon({
    name: `hub-services-launcher:icon:${name}`,
    svgstr:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="10" fill="${color}"/>` +
      `<text x="32" y="42" font-family="sans-serif" font-size="26" ` +
      `font-weight="700" text-anchor="middle" fill="white">${letters}</text></svg>`
  });
}

/**
 * Two characters, so services sharing an initial (galyleo / gdp) stay
 * distinguishable: the initials of the first two words of a name like
 * "cmrr-report-service" (CR), otherwise its first two letters ("gdp" -> GD).
 * Only [A-Z0-9] is ever returned, so it is safe to drop into the SVG.
 */
function monogram(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(w => w.length > 0);
  const raw =
    words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? '').slice(0, 2);
  return raw.toUpperCase() || '#';
}

/**
 * Lists the services the Hub would show in its Services menu, by asking this
 * extension's server component (which talks to the Hub with the single-user
 * server's own API token). The browser can't ask the Hub directly: the Hub
 * checks XSRF even on GETs to its API, with a cookie scoped to /hub/ that
 * JavaScript on a /user/<name>/lab page can't read.
 *
 * Resolves to [] (never rejects) when not running under a Hub, when the
 * server component isn't installed, or when the Hub refuses (the server
 * role needs the `list:services` and `read:services` scopes).
 */
async function fetchServices(): Promise<IHubService[]> {
  try {
    const settings = ServerConnection.makeSettings();
    const url = URLExt.join(settings.baseUrl, 'hub-services-launcher', 'services');
    const response = await ServerConnection.makeRequest(url, {}, settings);
    if (!response.ok) {
      console.debug(`hub-services-launcher: ${url} returned ${response.status}`);
      return [];
    }
    return (await response.json()) as IHubService[];
  } catch (error) {
    console.debug('hub-services-launcher: could not list Hub services', error);
    return [];
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'hub-services-launcher:plugin',
  description:
    'Launcher tiles for the JupyterHub services the user can reach (the Hub Services menu, inside JupyterLab).',
  autoStart: true,
  requires: [ILauncher],
  activate: (app: JupyterFrontEnd, launcher: ILauncher) => {
    void fetchServices().then(services => {
      services
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((service, index) => {
          const command = `hub-services-launcher:open:${service.name}`;
          app.commands.addCommand(command, {
            label: service.name,
            caption: `Open the ${service.name} service`,
            icon: iconFor(service.name),
            execute: () => {
              window.open(service.prefix, '_blank', 'noopener');
            }
          });
          launcher.add({ command, category: CATEGORY, rank: index + 1 });
        });
    });
  }
};

export default plugin;
