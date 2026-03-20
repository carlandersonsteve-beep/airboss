window.AirBossComponentBridge = window.AirBossComponentBridge || {
  requireDeps(componentName, deps, requiredKeys) {
    const missing = requiredKeys.filter((key) => typeof deps[key] === 'undefined' || deps[key] === null);
    if (missing.length > 0) {
      throw new Error(`${componentName} missing required deps: ${missing.join(', ')}`);
    }
    return deps;
  },
};
