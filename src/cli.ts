import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { getPluginApiToken, getTdStatus, isTdCommandError } from './todoist.js';

export function registerTodoistCli(api: OpenClawPluginApi): void {
  api.registerCli(
    ({ program }) => {
      const todoist = program
        .command('todoist')
        .description('Todoist plugin commands');

      todoist
        .command('status')
        .description('Check td availability and Todoist auth readiness')
        .action(async () => {
          try {
            const status = await getTdStatus({
              apiToken: getPluginApiToken(api.pluginConfig),
            });

            console.log(`td installed: ${status.available ? `yes (${status.version ?? 'unknown'})` : 'no'}`);
            console.log(`plugin config token: ${status.pluginConfigTokenPresent ? 'yes' : 'no'}`);
            console.log(
              `auth usable: ${status.authUsable ? 'yes' : 'no'}${status.authMessage ? ` — ${status.authMessage}` : ''}`,
            );

            if (!status.available || !status.authUsable) {
              process.exitCode = 1;
            }
          } catch (error: unknown) {
            const message = isTdCommandError(error)
              ? error.message
              : 'Unable to inspect Todoist CLI status.';
            console.error(message);
            process.exitCode = 1;
          }
        });
    },
    { commands: ['todoist'] },
  );
}
