import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { getApiStatus, getPluginApiToken } from './todoist.js';

export function registerTodoistCli(api: OpenClawPluginApi): void {
  api.registerCli(
    ({ program }) => {
      const todoist = program
        .command('todoist')
        .description('Todoist plugin commands');

      todoist
        .command('status')
        .description('Check Todoist API token and auth readiness')
        .action(async () => {
          try {
            const status = await getApiStatus({
              pluginConfigToken: getPluginApiToken(api.pluginConfig),
            });

            console.log(`plugin config token: ${status.tokenPresent && status.tokenSource === 'plugin-config' ? 'yes' : 'no'}`);
            console.log(`env token (TODOIST_API_TOKEN): ${status.tokenPresent && status.tokenSource === 'environment' ? 'yes' : 'no'}`);
            console.log(
              `auth usable: ${status.authUsable ? 'yes' : 'no'} — ${status.authMessage}`,
            );

            if (!status.authUsable) {
              process.exitCode = 1;
            }
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : 'Unable to inspect Todoist API status.';
            console.error(message);
            process.exitCode = 1;
          }
        });
    },
    { commands: ['todoist'] },
  );
}
