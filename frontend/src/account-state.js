const currentUser = state => state.teamSpace?.userId || 'me';

// Personal connection state is shared across entry points. Only the original
// local user may fall back to legacy catalogue consent; another member must
// never inherit that user's account connection.
export function isPluginConnected(state, plugin) {
  if (!plugin) return false;
  const userId = currentUser(state);
  const grants = state.teamSpace?.authorizations?.[userId];
  if (grants && Object.prototype.hasOwnProperty.call(grants, plugin.id)) return grants[plugin.id] === 'demo-authorized';
  return userId === 'me' && plugin.auth === 'demo-authorized';
}

export function setPluginConnection(state, plugin, connected) {
  if (!plugin) return;
  const userId = currentUser(state);
  state.teamSpace ||= {};
  state.teamSpace.authorizations ||= {};
  const grants = state.teamSpace.authorizations[userId] ||= {};
  grants[plugin.id] = connected ? 'demo-authorized' : 'unconnected';
  if (userId === 'me') plugin.auth = grants[plugin.id];
}
