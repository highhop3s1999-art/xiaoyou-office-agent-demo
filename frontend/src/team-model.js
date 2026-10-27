// Team spaces own independent resource snapshots and member roles. Personal
// tasks keep their input/output and frozen resource configuration; account
// connections always belong to the current user.
const clone = value => structuredClone(value);
const now = () => Date.now();
const uid = prefix => `${prefix}-${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const list = value => Array.isArray(value) ? value : [];
const currentUser = state => state.teamSpace?.userId || 'me';
const types = ['plugin', 'expert', 'knowledge'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const normalizedEmail = value => String(value || '').trim().toLowerCase();

export function getTeam(state, teamId) {
  return list(state.teamSpace?.teams).find(team => team.id === teamId) || null;
}
export function teamRole(state, teamId) {
  const team = getTeam(state, teamId);
  const member = list(team?.members).find(item => item.id === currentUser(state));
  if (!member) return '';
  return team.ownerId === member.id ? 'owner' : member.role === 'admin' ? 'admin' : 'member';
}
export function visibleTeams(state) {
  return list(state.teamSpace?.teams).filter(team => teamRole(state, team.id));
}
export function canManageTeam(state, teamId) {
  return ['owner', 'admin'].includes(teamRole(state, teamId));
}
export const canManageMembers = canManageTeam;
function managementError(state, teamId) {
  if (!getTeam(state, teamId)) return '团队空间不存在。';
  return canManageTeam(state, teamId) ? '' : '只有创建者和管理员可以管理空间资源与成员。';
}
function validateName(name, label = '名称') {
  return typeof name !== 'string' || !name.trim() || name.trim().length > 50 ? `${label}需要填写 1–50 个字符。` : '';
}
function validateDescription(description) {
  return typeof description !== 'string' || description.length > 300 ? '说明不能超过 300 个字符。' : '';
}
export function createTeam(state, values = {}) {
  const error = validateName(values.name, '空间名称') || validateDescription(values.description || '');
  if (error) return { error };
  const name = values.name.trim();
  if (visibleTeams(state).some(team => team.name === name)) return { error: '你已加入同名空间，请使用其他名称。' };
  const user = currentUser(state);
  const existingMember = list(state.teamSpace.teams).flatMap(team => list(team.members)).find(member => member.id === user);
  const team = { id: uid('team'), name, description: (values.description || '').trim(), ownerId: user,
    members: [{ id: user, name: existingMember?.name || (user === 'me' ? '我' : '当前用户'), email: existingMember?.email || '', role: 'owner', joinedAt: now() }],
    resources: [], invitations: [], createdAt: now(), updatedAt: now() };
  state.teamSpace.teams.push(team);
  state.teamSpace.currentTeamId = team.id;
  return { team };
}

function sourceCollection(state, type) {
  if (type === 'expert') return list(state.catalog?.experts);
  if (type === 'plugin') return list(state.catalog?.plugins);
  if (type === 'knowledge') return [...list(state.workspace?.knowledge?.local), ...list(state.workspace?.knowledge?.remote)];
  return [];
}
function cleanSource(item, type) {
  const { auth, ...configuration } = clone(item);
  return { ...configuration, sourceId: item.sourceId || item.id, type, source: item.source || (item.custom ? '自定义资源' : '内置示例'), sourceKind: item.custom ? 'custom' : 'builtin' };
}
function snapshotSource(state, item, type) {
  if (!item) return null;
  const snapshot = cleanSource(item, type);
  if (type === 'expert') {
    const plugins = list(item.plugins).map(reference => typeof reference === 'object' ? reference : list(state.catalog?.plugins).find(plugin => plugin.id === reference)).filter(Boolean).map(plugin => cleanSource(plugin, 'plugin'));
    const skills = list(item.skills).map(reference => typeof reference === 'object' ? reference : list(state.catalog?.skills).find(skill => skill.id === reference)).filter(Boolean).map(skill => cleanSource(skill, 'skill'));
    snapshot.pluginIds = list(item.plugins).map(reference => typeof reference === 'object' ? reference.id : reference);
    snapshot.skillIds = list(item.skills).map(reference => typeof reference === 'object' ? reference.id : reference);
    snapshot.plugins = plugins;
    snapshot.skills = skills;
    snapshot.dependencies = clone({ plugins, skills });
  }
  if (type === 'knowledge') {
    snapshot.documents = clone(list(item.documents || (Array.isArray(item.docs) ? item.docs : [])));
    snapshot.content = String(item.content || '');
    // A personal library subscription is not a team-resource enable switch.
    snapshot.enabled = true;
  }
  return snapshot;
}
export function resourceCatalog(state, type) {
  return (type ? [type] : types).flatMap(kind => sourceCollection(state, kind).map(item => ({ ...snapshotSource(state, item, kind), sourceId: item.id })));
}
function rawResource(state, teamId, resourceId) {
  return list(getTeam(state, teamId)?.resources).find(resource => resource.id === resourceId) || null;
}
// Expert links point to resources in this space, never directly to global
// catalog IDs. The catalog snapshot only stores the expert's own method.
function coversExpertAudience(expert, dependency) {
  if (!Array.isArray(dependency.allowedMemberIds)) return true;
  if (!Array.isArray(expert.allowedMemberIds)) return false;
  return expert.allowedMemberIds.every(id => dependency.allowedMemberIds.includes(id));
}
function matchingSpacePlugins(state, teamId, expert, snapshot) {
  const wanted = new Set([...list(snapshot.plugins).map(plugin => typeof plugin === 'object' ? plugin.sourceId || plugin.id : plugin), ...list(snapshot.pluginIds)]);
  return list(getTeam(state, teamId)?.resources).filter(resource => resource.type === 'plugin' && wanted.has(resource.sourceId) && resource.snapshot?.enabled !== false && coversExpertAudience(expert, resource)).map(resource => resource.id);
}
function ownExpertSnapshot(snapshot) {
  const result = clone(snapshot);
  result.plugins = [];
  result.pluginIds = [];
  result.dependencies = { ...result.dependencies, plugins: [], knowledgeBases: [] };
  delete result.pluginResourceIds;
  delete result.knowledgeResourceIds;
  delete result.knowledgeBases;
  delete result.boundResources;
  return result;
}
function checkedExpertLinks(state, teamId, expert, values, snapshot) {
  const links = {};
  for (const [field, type, label] of [['pluginResourceIds', 'plugin', '插件'], ['knowledgeResourceIds', 'knowledge', '知识库']]) {
    const input = own(values, field) ? values[field] : own(expert, field) ? expert[field] : type === 'plugin' ? matchingSpacePlugins(state, teamId, expert, snapshot) : [];
    if (!Array.isArray(input) || input.some(id => typeof id !== 'string' || !id)) return { error: `关联${label}的配置无效，请重新选择。` };
    links[field] = [...new Set(input)];
    for (const id of links[field]) {
      const dependency = rawResource(state, teamId, id);
      if (!dependency || dependency.type !== type) return { error: `只能关联当前空间内的${label}，请重新选择。` };
      if (!coversExpertAudience(expert, dependency)) return { error: `「${dependency.name}」尚未向这位助理的全部使用成员开放，不能关联。` };
      if (dependency.snapshot?.enabled === false) return { error: `「${dependency.name}」已停用，请取消关联或先启用这项资源。` };
    }
  }
  return links;
}
function expertAsset(state, teamId, resource) {
  const asset = ownExpertSnapshot(resource.snapshot);
  asset.pluginResourceIds = [...list(resource.pluginResourceIds)];
  asset.knowledgeResourceIds = [...list(resource.knowledgeResourceIds)];
  asset.plugins = []; asset.knowledgeBases = []; asset.boundResources = [];
  let error = '';
  for (const [field, type, target] of [['pluginResourceIds', 'plugin', 'plugins'], ['knowledgeResourceIds', 'knowledge', 'knowledgeBases']]) {
    for (const id of asset[field]) {
      const dependency = rawResource(state, teamId, id);
      if (!dependency || dependency.type !== type) { error ||= '助理关联的资源已从这个空间移除，请联系创建者或管理员重新配置。'; continue; }
      if (!coversExpertAudience(resource, dependency)) error ||= `「${dependency.name}」尚未向这位助理的全部使用成员开放。`;
      if (!inResourceAudience(state, dependency)) error ||= `你还不能使用助理关联的「${dependency.name}」。`;
      if (dependency.snapshot?.enabled === false) error ||= `助理关联的「${dependency.name}」已停用，请联系创建者或管理员。`;
      asset[target].push({ ...clone(dependency.snapshot), teamResourceId: dependency.id, resourceVersion: dependency.version });
      asset.boundResources.push({ resourceId: dependency.id, type, sourceId: dependency.sourceId, name: dependency.name, version: dependency.version });
    }
  }
  asset.pluginIds = asset.plugins.map(plugin => plugin.id);
  asset.dependencies = { ...asset.dependencies, plugins: clone(asset.plugins), knowledgeBases: clone(asset.knowledgeBases) };
  return { asset, error };
}
export function resolveTeamExpert(state, teamId, resourceId) {
  const team = getTeam(state, teamId);
  const resource = rawResource(state, teamId, resourceId);
  if (!team || !teamRole(state, teamId)) return { error: '你已不在这个空间中，无法继续使用空间资源。' };
  if (!resource || resource.type !== 'expert') return { team, error: '这位助理已从空间移除。' };
  if (!inResourceAudience(state, resource)) return { team, error: '这位助理尚未向你开放。' };
  const resolved = expertAsset(state, teamId, resource);
  // Do not expose protected library bodies to a caller who cannot use them.
  if (resolved.error && [...list(resource.pluginResourceIds), ...list(resource.knowledgeResourceIds)].some(id => { const dependency = rawResource(state, teamId, id); return dependency && !inResourceAudience(state, dependency); })) return { team, error: resolved.error };
  return { team, resource, ...resolved };
}
function inResourceAudience(state, resource) {
  return !Array.isArray(resource?.allowedMemberIds) || resource.allowedMemberIds.includes(currentUser(state));
}
export function teamResources(state, teamId, type) {
  if (!teamRole(state, teamId)) return [];
  return list(getTeam(state, teamId)?.resources).filter(resource => (!type || resource.type === type) && (canManageTeam(state, teamId) || inResourceAudience(state, resource)));
}
export function getResource(state, teamId, resourceId) {
  return teamResources(state, teamId).find(resource => resource.id === resourceId) || null;
}
function snapshotAvailability(asset) {
  if (asset.enabled === false) return `「${asset.name}」已停用。`;
  if (asset.type === 'expert') {
    if (list(asset.pluginIds).some(id => !list(asset.plugins).some(plugin => plugin.id === id))) return `「${asset.name}」的插件配置不完整。`;
    if (list(asset.skillIds).some(id => !list(asset.skills).some(skill => skill.id === id))) return `「${asset.name}」的技能配置不完整。`;
    const stopped = [...list(asset.plugins), ...list(asset.skills)].find(dependency => dependency.enabled === false);
    if (stopped) return `「${asset.name}」使用的「${stopped.name}」已停用。`;
  }
  return '';
}
function createResourceRecord(state, type, sourceId, snapshot, values = {}) {
  return { id: uid('resource'), type, sourceId, name: snapshot.name, description: snapshot.description || '',
    snapshot: clone(snapshot), version: 1, createdBy: currentUser(state), createdAt: now(), updatedAt: now(), ...values };
}
function checkedResourceValues(values, current = {}) {
  const name = own(values, 'name') ? values.name : current.name;
  const description = own(values, 'description') ? values.description : current.description || '';
  const error = typeof name !== 'string' || !name.trim() || name.trim().length > 80 ? '资源名称需要填写 1–80 个字符。'
    : typeof description !== 'string' || description.length > 500 ? '资源说明不能超过 500 个字符。' : '';
  if (error) return { error };
  for (const field of ['instructions', 'content']) if (own(values, field) && (typeof values[field] !== 'string' || values[field].length > 50000)) return { error: `${field === 'content' ? '知识内容' : '助理指令'}不能超过 50000 个字符。` };
  if (own(values, 'documents') && (!Array.isArray(values.documents) || values.documents.some(document => !document || typeof document !== 'object' || typeof document.name !== 'string'))) return { error: '知识库文件格式无效。' };
  return { name: name.trim(), description: description.trim() };
}
export function addTeamResource(state, teamId, values = {}) {
  const error = managementError(state, teamId);
  if (error) return { error };
  const team = getTeam(state, teamId);
  if (!types.includes(values.type)) return { error: '请选择插件、助理或知识库。' };
  let sourceId = values.sourceId || values.id || '';
  let snapshot;
  if (sourceId) snapshot = snapshotSource(state, sourceCollection(state, values.type).find(item => item.id === sourceId), values.type);
  else if (values.type === 'knowledge') {
    sourceId = uid('team-knowledge');
    snapshot = { id: sourceId, sourceId, type: 'knowledge', name: values.name, description: values.description || '', content: '', documents: [], source: '空间内创建', sourceKind: 'team', enabled: true };
  }
  if (!snapshot) return { error: '所选资源已不存在，请重新选择。' };
  if (list(team.resources).some(resource => resource.type === values.type && resource.sourceId === sourceId)) return { error: '这个资源已经在空间里，无需重复添加。' };
  const checked = checkedResourceValues(values, snapshot);
  if (checked.error) return checked;
  Object.assign(snapshot, checked);
  if (snapshot.type === 'expert' && own(values, 'instructions')) snapshot.instructions = values.instructions;
  if (snapshot.type === 'knowledge') {
    if (own(values, 'content')) snapshot.content = values.content;
    if (own(values, 'documents')) snapshot.documents = clone(values.documents);
  }
  const resource = createResourceRecord(state, values.type, sourceId, snapshot);
  if (resource.type === 'expert') {
    const links = checkedExpertLinks(state, teamId, resource, values, snapshot);
    if (links.error) return links;
    Object.assign(resource, links);
    resource.snapshot = ownExpertSnapshot(snapshot);
  }
  const unavailable = snapshotAvailability(resource.snapshot);
  if (unavailable) return { error: unavailable };
  team.resources ||= [];
  team.resources.push(resource);
  team.updatedAt = now();
  return { resource };
}
export function updateTeamResource(state, teamId, resourceId, values = {}) {
  const error = managementError(state, teamId);
  if (error) return { error };
  const resource = rawResource(state, teamId, resourceId);
  if (!resource) return { error: '资源已不在这个空间里。' };
  let snapshot = clone(resource.snapshot);
  if (values.refreshFromSource) {
    snapshot = snapshotSource(state, sourceCollection(state, resource.type).find(item => item.id === resource.sourceId), resource.type);
    if (!snapshot) return { error: '源资源已不存在，现有空间副本仍可使用。' };
  }
  const checked = checkedResourceValues(values, snapshot);
  if (checked.error) return checked;
  Object.assign(snapshot, checked);
  if (resource.type === 'expert' && own(values, 'instructions')) snapshot.instructions = values.instructions;
  if (resource.type === 'knowledge') {
    if (own(values, 'content')) snapshot.content = values.content;
    if (own(values, 'documents')) snapshot.documents = clone(values.documents);
  }
  if (own(values, 'enabled')) snapshot.enabled = values.enabled !== false;
  let links;
  if (resource.type === 'expert') {
    links = checkedExpertLinks(state, teamId, resource, values, snapshot);
    if (links.error) return links;
    snapshot = ownExpertSnapshot(snapshot);
  }
  if (links) Object.assign(resource, links);
  resource.snapshot = snapshot;
  resource.name = snapshot.name;
  resource.description = snapshot.description;
  resource.version = (resource.version || 1) + 1;
  resource.updatedAt = now();
  getTeam(state, teamId).updatedAt = now();
  return { resource };
}
export function removeTeamResource(state, teamId, resourceId) {
  const error = managementError(state, teamId);
  if (error) return { error };
  const team = getTeam(state, teamId);
  if (!rawResource(state, teamId, resourceId)) return { error: '资源已不在这个空间里。' };
  const referencingExperts = list(team.resources).filter(resource => resource.type === 'expert' && [...list(resource.pluginResourceIds), ...list(resource.knowledgeResourceIds)].includes(resourceId));
  if (referencingExperts.length) return { error: `「${referencingExperts.map(expert => expert.name).join('」「')}」正在使用这项资源，请先编辑助理并解除关联。`, referencingExperts: referencingExperts.map(expert => ({ id: expert.id, name: expert.name })) };
  team.resources = team.resources.filter(resource => resource.id !== resourceId);
  team.updatedAt = now();
  return { ok: true };
}

export function inviteTeamMember(state, teamId, values = {}) {
  const error = managementError(state, teamId) || validateName(values.name, '成员姓名');
  if (error) return { error };
  const role = values.role || 'member';
  if (!['admin', 'member'].includes(role)) return { error: '只能邀请管理员或普通成员。' };
  const email = normalizedEmail(values.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: '请输入有效的成员邮箱。' };
  const team = getTeam(state, teamId);
  if (list(team.members).some(member => normalizedEmail(member.email) === email)) return { error: '这个邮箱对应的成员已在空间中。' };
  if (list(team.invitations).some(invitation => invitation.status === 'pending' && normalizedEmail(invitation.email) === email)) return { error: '这个邮箱已有待接受的邀请。' };
  const invitation = { id: uid('invite'), name: values.name.trim(), email, role, status: 'pending', invitedBy: currentUser(state), createdAt: now() };
  team.invitations ||= [];
  team.invitations.push(invitation);
  team.updatedAt = now();
  return { invitation };
}
function mutableMember(state, teamId, memberId) {
  const error = managementError(state, teamId);
  if (error) return { error };
  const team = getTeam(state, teamId);
  const member = list(team.members).find(candidate => candidate.id === memberId);
  if (!member) return { error: '成员已不在这个空间中。' };
  if (member.id === team.ownerId) return { error: '创建者的角色不能更改，也不能被移出空间。' };
  if (member.id === currentUser(state)) return { error: '不能更改自己的角色或将自己移出空间。' };
  return { team, member };
}
export function updateMemberRole(state, teamId, memberId, role) {
  const resolved = mutableMember(state, teamId, memberId);
  if (resolved.error) return resolved;
  if (!['admin', 'member'].includes(role)) return { error: '请选择管理员或普通成员。' };
  resolved.member.role = role;
  resolved.team.updatedAt = now();
  return { ok: true, member: resolved.member };
}
export function removeTeamMember(state, teamId, memberId) {
  const resolved = mutableMember(state, teamId, memberId);
  if (resolved.error) return resolved;
  resolved.team.members = resolved.team.members.filter(member => member.id !== memberId);
  resolved.team.updatedAt = now();
  return { ok: true };
}
export function cancelTeamInvitation(state, teamId, invitationId) {
  const error = managementError(state, teamId);
  if (error) return { error };
  const team = getTeam(state, teamId);
  const invitation = list(team.invitations).find(item => item.id === invitationId && item.status === 'pending');
  if (!invitation) return { error: '这条邀请已撤销或不存在。' };
  invitation.status = 'cancelled';
  invitation.cancelledAt = now();
  team.updatedAt = now();
  return { ok: true, invitation };
}

function resolveResource(state, teamId, type, resourceId) {
  const team = getTeam(state, teamId);
  if (!team || !teamRole(state, teamId)) return { error: '你已不在这个空间中，无法继续使用空间资源。' };
  const resource = rawResource(state, teamId, resourceId);
  if (!resource || resource.type !== type) return { error: '这项资源已从空间移除，不能开始新的执行。' };
  if (!inResourceAudience(state, resource)) return { error: '这项资源尚未向你开放。' };
  if (type === 'expert') return { team, resource, ...expertAsset(state, teamId, resource) };
  return { team, resource, asset: resource.snapshot };
}
function requiredPlugins(asset) {
  return (asset.type === 'plugin' ? [asset] : asset.type === 'expert' ? list(asset.plugins) : []).filter(plugin => plugin.requiresAuth);
}
function missingPluginConsent(state, asset) {
  const grants = state.teamSpace.authorizations?.[currentUser(state)] || {};
  return requiredPlugins(asset).filter(plugin => grants[plugin.id] !== 'demo-authorized');
}
function accessForSnapshot(state, asset) {
  const unavailable = snapshotAvailability(asset);
  if (unavailable) return { available: false, reason: unavailable, missingPlugins: [] };
  const missingPlugins = clone(missingPluginConsent(state, asset));
  return { available: missingPlugins.length === 0, reason: missingPlugins.length ? `需要你本人连接：${missingPlugins.map(plugin => plugin.name).join('、')}。` : '', missingPlugins };
}
export function teamAssetStatus(state, teamId, type, resourceId) {
  const resolved = resolveResource(state, teamId, type, resourceId);
  return resolved.error ? { available: false, reason: resolved.error, missingPlugins: [] } : accessForSnapshot(state, resolved.asset);
}
export function authorizeTeamAsset(state, teamId, type, resourceId) {
  const access = teamAssetStatus(state, teamId, type, resourceId);
  if (!access.available && !access.missingPlugins.length) return { error: access.reason };
  state.teamSpace.authorizations ||= {};
  const grants = state.teamSpace.authorizations[currentUser(state)] ||= {};
  for (const plugin of access.missingPlugins) grants[plugin.id] = 'demo-authorized';
  return { ok: true };
}
function assetInstructions(asset) {
  return asset.type === 'expert' ? [asset.instructions || '', ...list(asset.skills).map(skill => `技能：${skill.name}\n${skill.content || skill.description || ''}`)].filter(Boolean).join('\n\n') : '';
}
function knowledgeText(asset) {
  return [asset.content || '', ...list(asset.documents).map(document => `${document.name}\n${document.content || document.text || ''}`)].filter(Boolean).join('\n\n');
}
export function teamTaskOptions(state, teamId, type, resourceId, { allowUnconnected = false } = {}) {
  const status = teamAssetStatus(state, teamId, type, resourceId);
  if (!status.available && !(allowUnconnected && status.missingPlugins.length)) return { error: status.reason };
  const { team, resource, asset } = resolveResource(state, teamId, type, resourceId);
  const teamOrigin = { teamId: team.id, teamName: team.name, resourceId: resource.id, sourceId: resource.sourceId, version: resource.version, assetId: asset.id, assetType: asset.type, assetName: asset.name };
  const instructions = assetInstructions(asset);
  return { options: {
    project: '', expert: asset.type === 'expert' ? asset.name : '', origin: 'team',
    context: [{ type: 'team-asset', id: `${team.id}:${resource.id}`, name: asset.name, assetType: asset.type, ...(asset.type === 'expert' ? { boundToTeamExpert: true } : {}),
      text: [asset.description, asset.type === 'knowledge' ? knowledgeText(asset) : instructions, asset.type === 'expert' && list(asset.plugins).length ? `使用插件：${asset.plugins.map(plugin => plugin.name).join('、')}` : ''].filter(Boolean).join('\n\n'),
      source: `${team.name} · ${asset.name}`, snapshotAt: now() }, ...list(asset.knowledgeBases).map(knowledge => ({ type: 'team-expert-knowledge', id: `${team.id}:${knowledge.teamResourceId}`, resourceId: knowledge.teamResourceId, name: knowledge.name, assetType: 'knowledge', boundToTeamExpert: true,
        text: [knowledge.description, knowledgeText(knowledge)].filter(Boolean).join('\n\n'), source: `${team.name} · ${knowledge.name}`, snapshotAt: now() }))],
    teamOrigin, teamAssetSnapshot: clone(asset), customInstructions: instructions
  } };
}
function migrateTaskOrigin(space, task) {
  const origin = task?.teamOrigin;
  if (!origin || origin.resourceId || !origin.bundleId) return;
  const mapped = space.legacyResourceMap?.[`${origin.bundleId}:${origin.assetType}:${origin.assetId}`];
  if (!mapped) return;
  const { bundleId, bundleName, ...rest } = origin;
  task.teamOrigin = { ...rest, ...mapped, sourceId: origin.assetId };
}
export function teamTaskAccess(state, task) {
  const denied = reason => ({ available: false, reason, missingPlugins: [] });
  if (!task?.teamOrigin) return { available: true, reason: '', missingPlugins: [] };
  migrateTaskOrigin(state.teamSpace, task);
  const origin = task.teamOrigin;
  const team = getTeam(state, origin.teamId);
  const resource = rawResource(state, origin.teamId, origin.resourceId);
  if (!team || !teamRole(state, origin.teamId)) return denied('你已不在这个空间中，无法继续使用空间资源。');
  if (!resource || resource.type !== origin.assetType) return denied('这项资源已从空间移除，不能开始新的执行。');
  if (!inResourceAudience(state, resource)) return denied('这项资源尚未向你开放。');
  const resolved = origin.assetType === 'expert' ? expertAsset(state, origin.teamId, resource) : { asset: resource.snapshot };
  const snapshot = task.teamAssetSnapshot || resolved.asset;
  // Unsent drafts must use today's configuration. Started conversations keep
  // their saved content and links, even after the expert is reconfigured.
  if (task.isTeamDraft && !list(task.messages).length) {
    if (resolved.error) return denied(resolved.error);
    const unavailable = snapshotAvailability(resolved.asset);
    if (unavailable) return denied(unavailable);
    if (origin.version !== resource.version || JSON.stringify(snapshot) !== JSON.stringify(resolved.asset)) return denied('空间资源配置已更新，请重新核对草稿后发送。');
  }
  if (!task.teamAssetSnapshot && resolved.error) return denied(resolved.error);
  if (snapshot.type !== origin.assetType || snapshot.id !== origin.assetId || (origin.sourceId && origin.sourceId !== resource.sourceId)) return denied('任务保存的资源与空间来源不一致，不能继续运行。');
  if (resource.snapshot.enabled === false) return denied('这项空间资源已停用，不能开始新的执行。');
  if (snapshot.type === 'expert') {
    // The current expert may have changed its links. Existing conversations use
    // their frozen links and content, while their source resources stay checked.
    let bindings = list(snapshot.boundResources);
    if (!own(snapshot, 'boundResources')) {
      bindings = list(snapshot.plugins).map(plugin => {
        const dependency = list(team.resources).find(item => item.type === 'plugin' && item.sourceId === (plugin.sourceId || plugin.id));
        return { resourceId: dependency?.id, type: 'plugin', sourceId: plugin.sourceId || plugin.id, name: plugin.name };
      });
    }
    const expected = [...list(snapshot.pluginResourceIds).map(resourceId => ({ resourceId, type: 'plugin' })), ...list(snapshot.knowledgeResourceIds).map(resourceId => ({ resourceId, type: 'knowledge' }))];
    if (expected.some(link => !bindings.some(binding => binding.resourceId === link.resourceId && binding.type === link.type))) return denied('任务保存的助理关联配置不完整，不能继续运行。');
    if (own(snapshot, 'boundResources')) {
      const savedAssets = [...list(snapshot.plugins).map(asset => ({ asset, type: 'plugin' })), ...list(snapshot.knowledgeBases).map(asset => ({ asset, type: 'knowledge' }))];
      if (savedAssets.some(({ asset, type }) => !bindings.some(binding => binding.resourceId === asset.teamResourceId && binding.type === type && binding.sourceId === (asset.sourceId || asset.id)))) return denied('任务保存的助理关联来源不一致，不能继续运行。');
    }
    for (const binding of bindings) {
      const dependency = rawResource(state, origin.teamId, binding.resourceId);
      if (!dependency || dependency.type !== binding.type || dependency.sourceId !== binding.sourceId) return denied(`助理关联的「${binding.name || '资源'}」已从这个空间移除，不能继续执行。`);
      if (!inResourceAudience(state, dependency)) return denied(`你还不能使用助理关联的「${dependency.name}」。`);
      if (dependency.snapshot?.enabled === false) return denied(`助理关联的「${dependency.name}」已停用，不能继续执行。`);
    }
  }
  return accessForSnapshot(state, snapshot);
}
export function authorizeTeamTask(state, task) {
  if (!task?.teamOrigin) return { error: '这个任务没有需要连接的空间资源。' };
  const access = teamTaskAccess(state, task);
  if (!access.available && !access.missingPlugins.length) return { error: access.reason };
  state.teamSpace.authorizations ||= {};
  const grants = state.teamSpace.authorizations[currentUser(state)] ||= {};
  for (const plugin of access.missingPlugins) grants[plugin.id] = 'demo-authorized';
  return { ok: true };
}
export function validateTeamTask(state, task) {
  return teamTaskAccess(state, task).reason;
}

function normalizedMembers(team) {
  return list(team.members).map(member => ({ ...member, email: member.email || '', role: member.id === team.ownerId ? 'owner' : member.role === 'admin' ? 'admin' : 'member' }));
}
function seedTeam(state, id, name, ownerId, description) {
  const team = { id, name, ownerId, description, members: [{ id: 'me', name: '我', email: 'me@example.com', role: ownerId === 'me' ? 'owner' : 'member' }, { id: 'member-a', name: '示例成员 A', email: 'member-a@example.com', role: ownerId === 'member-a' ? 'owner' : 'admin' }, { id: 'member-b', name: '示例成员 B', email: 'member-b@example.com', role: 'member' }], resources: [], invitations: [], createdAt: now(), updatedAt: now() };
  state.teamSpace.teams.push(team);
  const resources = [{ type: 'expert', id: id === 'data' ? 'artnova' : 'general' }, { type: 'plugin', id: 'office' }, { type: 'knowledge', id: id === 'data' ? 'kb-data' : 'kb-general' }];
  for (const reference of resources) {
    const sources = reference.type === 'knowledge' ? list(state.workspace?.knowledge?.remote) : sourceCollection(state, reference.type);
    const source = sources.find(item => item.id === reference.id);
    const snapshot = snapshotSource(state, source, reference.type);
    if (snapshot) team.resources.push(createResourceRecord(state, reference.type, source.id, snapshot, { createdBy: ownerId }));
  }
  return team;
}
function migrateBundles(state) {
  const space = state.teamSpace;
  const bundles = list(space.bundles);
  space.legacyBundleArchive ||= { archivedAt: now(), bundles: clone(bundles) };
  space.legacyResourceMap ||= {};
  for (const team of space.teams) {
    team.resources ||= [];
    const published = bundles.filter(bundle => bundle.teamId === team.id && bundle.published).sort((a, b) => (a.published.publishedAt || 0) - (b.published.publishedAt || 0));
    for (const bundle of published) for (const original of list(bundle.published.assets)) {
      if (!types.includes(original.type)) continue;
      const snapshot = clone(original);
      snapshot.sourceId ||= snapshot.id;
      delete snapshot.auth;
      for (const plugin of list(snapshot.plugins)) if (typeof plugin === 'object') delete plugin.auth;
      for (const plugin of list(snapshot.dependencies?.plugins)) delete plugin.auth;
      // Different published configurations may contain different private data.
      // Only identical snapshots can share an audience union; otherwise retain
      // a separate migrated resource with its original audience.
      let resource = team.resources.find(item => item.type === snapshot.type && item.sourceId === snapshot.id && JSON.stringify(item.snapshot) === JSON.stringify(snapshot));
      const selected = bundle.published.audience?.mode === 'selected';
      const audience = selected ? [...new Set(list(bundle.published.audience.memberIds))] : null;
      if (!resource) {
        resource = createResourceRecord(state, snapshot.type, snapshot.id, snapshot, { createdBy: bundle.published.publishedBy || team.ownerId, version: bundle.published.version || 1 });
        if (audience) resource.allowedMemberIds = audience;
        team.resources.push(resource);
      } else {
        if (resource.allowedMemberIds && audience) resource.allowedMemberIds = [...new Set([...resource.allowedMemberIds, ...audience])];
        else delete resource.allowedMemberIds;
        resource.snapshot = snapshot;
        resource.name = snapshot.name;
        resource.description = snapshot.description || '';
        resource.version = Math.max(resource.version, bundle.published.version || 1);
      }
      space.legacyResourceMap[`${bundle.id}:${snapshot.type}:${snapshot.id}`] = { teamId: team.id, resourceId: resource.id };
    }
  }
  delete space.bundles;
  for (const task of list(state.tasks)) migrateTaskOrigin(space, task);
  for (const [oldKey, draft] of Object.entries(state.teamDrafts || {})) {
    migrateTaskOrigin(space, draft);
    if (!draft.teamOrigin?.resourceId) continue;
    const origin = draft.teamOrigin;
    const userId = draft.ownerId || oldKey.split(':')[0] || space.userId;
    const newKey = `${userId}:${origin.teamId}:${origin.assetType}:${origin.resourceId}`;
    if (newKey === oldKey) continue;
    // Preserve both drafts when distinct old entries resolve to one resource.
    // Never replace an existing unsent prompt or its attachments.
    if (!state.teamDrafts[newKey]) {
      state.teamDrafts[newKey] = draft;
      draft.teamDraftKey = newKey;
      delete state.teamDrafts[oldKey];
    }
  }
  if (state.composer) migrateTaskOrigin(space, state.composer);
}
export function initTeamSpace(state) {
  if (!state.teamSpace?.version) {
    state.teamSpace = { version: 2, currentTeamId: 'product', userId: 'me', teams: [], authorizations: {} };
    seedTeam(state, 'product', '产品体验团队', 'me', '集中管理常用插件、助理和知识库。');
    seedTeam(state, 'data', '数据分析团队', 'member-a', '在这里使用团队准备的数据分析资源。');
  }
  const space = state.teamSpace;
  space.teams ||= []; space.authorizations ||= {}; space.userId ||= 'me';
  // Draft-only markers must never make a persisted conversation follow future
  // resource edits. This also cleans older locally saved tasks defensively.
  for (const task of list(state.tasks)) {
    delete task.isTeamDraft; delete task.teamDraftKey; delete task.teamDraftError;
  }
  for (const team of space.teams) {
    team.members = normalizedMembers(team);
    if (team.description === '团队负责人配置常用助理与插件，成员直接开始自己的任务。') team.description = '集中管理常用插件、助理和知识库。';
    if (team.description === '示例团队：你是普通成员，使用负责人已发布的能力。') team.description = '在这里使用团队准备的数据分析资源。';
    team.resources ||= []; team.invitations ||= [];
    if (['集中管理常用插件、\u4e13\u5bb6和知识库。','团队负责人配置常用\u4e13\u5bb6与插件，成员直接开始自己的任务。'].includes(team.description)) team.description='集中管理常用插件、助理和知识库。';
    for (const resource of team.resources) {
      if (resource.type!=='expert') continue;
      const source=list(state.catalog?.experts).find(x=>x.id===resource.sourceId&&!x.custom);
      if (!source) continue;
      const previousName=source.name.replaceAll('助理','\u4e13\u5bb6');
      if(resource.name===previousName) resource.name=source.name;
      if(resource.snapshot?.name===previousName) resource.snapshot.name=source.name;
      if(resource.snapshot && typeof source.instructions==='string' && resource.snapshot.instructions===source.instructions.replaceAll('助理','\u4e13\u5bb6')) resource.snapshot.instructions=source.instructions;
    }
  }
  if (space.version < 2) {
    migrateBundles(state);
    // Add only the existing public demonstration libraries to the two built-in
    // example spaces. Never copy a personal/local library during migration.
    for (const [teamId, libraryId] of [['product', 'kb-general'], ['data', 'kb-data']]) {
      const team = getTeam(state, teamId);
      const library = list(state.workspace?.knowledge?.remote).find(item => item.id === libraryId);
      if (team && library && !team.resources.some(resource => resource.type === 'knowledge')) {
        team.resources.push(createResourceRecord(state, 'knowledge', library.id, snapshotSource(state, library, 'knowledge'), { createdBy: team.ownerId }));
      }
    }
    space.version = 2;
  }
  if (space.version < 3) {
    for (const team of space.teams) for (const resource of list(team.resources)) if (resource.type === 'expert') {
      if (!own(resource, 'pluginResourceIds')) resource.pluginResourceIds = matchingSpacePlugins(state, team.id, resource, resource.snapshot);
      if (!own(resource, 'knowledgeResourceIds')) resource.knowledgeResourceIds = [];
      resource.snapshot = ownExpertSnapshot(resource.snapshot);
    }
    // Preserve existing task snapshots and unsent personal inputs. New task
    // configuration is resolved from these explicit links from now on.
    space.version = 3;
  }
  if (!space.legacyMigrationVersion) {
    if (!state.legacyProjectArchive) state.legacyProjectArchive = { archivedAt: now(), projects: clone(list(state.projects)), projectDrafts: clone(state.projectDrafts || {}) };
    for (const task of list(state.tasks)) if (task.project) { task.legacyProjectId ||= task.project; task.project = ''; }
    state.projects = [];
    state.projectDrafts = {};
    if (state.composer) state.composer.project = '';
    space.legacyMigrationVersion = 1;
  }
  if (!visibleTeams(state).some(team => team.id === space.currentTeamId)) space.currentTeamId = visibleTeams(state)[0]?.id || '';
  return space;
}
