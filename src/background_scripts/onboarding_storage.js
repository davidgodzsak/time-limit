const ONBOARDING_KEY = 'onboarding_state';
const INITIAL_SETUP_KEY = 'initial_setup_done';

async function getOnboardingState() {
  try {
    const data = await browser.storage.local.get([ONBOARDING_KEY]);
    return data[ONBOARDING_KEY] || { completed: false };
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return { completed: false };
  }
}

async function completeOnboarding() {
  try {
    await browser.storage.local.set({
      [ONBOARDING_KEY]: {
        completed: true,
        completedAt: new Date().toISOString(),
      },
    });
    return { completed: true };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}

async function hasCompletedOnboarding() {
  const state = await getOnboardingState();
  return state.completed === true;
}

async function markInitialSetupDone() {
  try {
    await browser.storage.local.set({
      [INITIAL_SETUP_KEY]: true,
    });
  } catch (error) {
    console.error('Error marking initial setup as done:', error);
  }
}

async function hasInitialSetupDone() {
  try {
    const data = await browser.storage.local.get([INITIAL_SETUP_KEY]);
    return data[INITIAL_SETUP_KEY] === true;
  } catch {
    return false;
  }
}

export {
  getOnboardingState,
  completeOnboarding,
  hasCompletedOnboarding,
  markInitialSetupDone,
  hasInitialSetupDone,
};
