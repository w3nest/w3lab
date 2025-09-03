/**
 * Main entry point of the **W3Lab** application.
 *
 * The documentation currently highlights external symbols most relevant for extending W3Lab:
 *
 * - Define a **custom Home page** → {@link Home}
 * - Install or implement **plugins** → {@link Plugins}
 *
 * ## For Developers
 *
 * Full API documentation for internal code is not yet planned.
 * However, the source code is open and available on GitHub: <github-link target="w3lab">here</github-link>.
 *
 * 💬 Join the discussion on Slack for questions, ideas, and community chat:
 * **send an email** to `contact@w3nest.org` to request an invitation and subscribe to the **W3Lab** channel.
 *
 * 🛠 Report bugs, suggest features, or dive into deeper technical conversations on
 * <github-link target="w3labDiscussions">GitHub Discussions</github-link>.
 *
 * @module
 */
export * from './on-load'
export * as Home from './home'
export * as Plugins from './plugins'
export { AppState } from './app-state'
