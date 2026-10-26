/**
 * Host half of the balance badge bundle.
 *
 * The badge is pure browser presentation: the Client module reads the account
 * balance through the Client account service and renders it in a frame slot.
 * The host row only has to exist so the bundle is selectable in a profile;
 * it owns no Host service, Config, or tool.
 */
export function apply() {}
