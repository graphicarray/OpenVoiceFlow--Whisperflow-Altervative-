function createWorkspacePolicyManager() {
  const unmanagedSnapshot = () => ({
    success: true,
    status: "unmanaged",
    revision: 1,
    accountId: null,
    authGeneration: 0,
    managed: false,
    policy: null,
    policyUpdatedAt: null,
    endpointSupported: false,
  });

  return {
    getPolicy: async () => unmanagedSnapshot(),
    refreshPolicy: async () => unmanagedSnapshot(),
    peekPolicy: () => unmanagedSnapshot(),
    getCachedSnapshot: () => unmanagedSnapshot(),
    isManagedPolicyRequired: () => false,
    clear: () => {},
  };
}

function isScreenContextBlocked(snapshot) {
  if (!snapshot || !snapshot.managed || !snapshot.policy) return false;
  return snapshot.policy.features?.screenContextEnabled === false;
}

module.exports = {
  createWorkspacePolicyManager,
  isScreenContextBlocked,
};
