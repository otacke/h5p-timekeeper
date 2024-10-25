/**
 * Retrieve state provider to get current state from.
 * @param {H5P.ContentType} contenTypeInstance Instance to get state provider from.
 * @returns {H5P.ContentType|null} Instance that can provide state.
 */
const retrieveStateProvider = (contenTypeInstance) => {
  let stateProvider = contenTypeInstance.isRoot() ? contenTypeInstance : null;
  if (stateProvider) {
    return stateProvider;
  }
  // Find root instance for our subcontent instance
  const rootInstance = H5P.instances
    .find((instance) => instance.contentId === contenTypeInstance.contentId);

  // Check root instance for having support for resume
  if (typeof rootInstance?.getCurrentState === 'function') {
    stateProvider = rootInstance;
  }

  return stateProvider;
};

/**
 * Store current state.
 * @param {H5P.contentType} contentTypeInstance Content type instance to store content for.
 */
export const storeState = (contentTypeInstance) => {
  const canStoreState = !Number.isNaN(parseInt(H5PIntegration?.saveFreq));
  if (!canStoreState) {
    return; // Server does not store state.
  }

  const stateProvider = retrieveStateProvider(contentTypeInstance);
  if (!stateProvider) {
    return; // No state provider or contentId available.
  }

  H5P.setUserData(
    contentTypeInstance.contentId,
    'state',
    stateProvider.getCurrentState(),
    { deleteOnChange: true } // Use default behavior of H5P core
  );
};
