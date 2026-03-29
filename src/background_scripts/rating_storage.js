const RATING_KEY = 'rating_state';

async function getRatingState() {
  try {
    const data = await browser.storage.local.get([RATING_KEY]);
    return data[RATING_KEY] || {
      hasRated: false,
      declineCount: 0,
      lastPromptDate: null,
      nextPromptAfter: null,
    };
  } catch (error) {
    console.error('Error getting rating state:', error);
    return {
      hasRated: false,
      declineCount: 0,
      lastPromptDate: null,
      nextPromptAfter: null,
    };
  }
}

async function shouldShowRatingPrompt() {
  try {
    const ratingState = await getRatingState();
    const onboardingData = await getOnboardingState();

    // Rule 1: Already rated
    if (ratingState.hasRated) return false;

    // Rule 2: Declined too many times
    if (ratingState.declineCount >= 5) return false;

    // Rule 3: Check nextPromptAfter gate
    if (ratingState.nextPromptAfter) {
      const nextPromptTime = new Date(ratingState.nextPromptAfter).getTime();
      if (Date.now() < nextPromptTime) return false;
    }

    // Rule 4: Onboarding not completed
    if (!onboardingData || !onboardingData.completed) return false;

    // Rule 5: Install age >= 4 days
    if (onboardingData.completedAt) {
      const completedTime = new Date(onboardingData.completedAt).getTime();
      const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
      if (Date.now() - completedTime < fourDaysMs) return false;
    }

    return true;
  } catch (error) {
    console.error('Error evaluating rating prompt trigger:', error);
    return false;
  }
}

async function markRated() {
  try {
    await browser.storage.local.set({
      [RATING_KEY]: {
        hasRated: true,
        declineCount: 0,
        lastPromptDate: new Date().toISOString(),
        nextPromptAfter: null,
      },
    });
  } catch (error) {
    console.error('Error marking rated:', error);
    throw error;
  }
}

async function declineRating() {
  try {
    const currentState = await getRatingState();
    await browser.storage.local.set({
      [RATING_KEY]: {
        ...currentState,
        declineCount: currentState.declineCount + 1,
        lastPromptDate: new Date().toISOString(),
        nextPromptAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error declining rating:', error);
    throw error;
  }
}

async function recordPromptShown() {
  try {
    const currentState = await getRatingState();
    await browser.storage.local.set({
      [RATING_KEY]: {
        ...currentState,
        lastPromptDate: new Date().toISOString(),
        nextPromptAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error recording prompt shown:', error);
    throw error;
  }
}

// Helper to get onboarding state
async function getOnboardingState() {
  try {
    const data = await browser.storage.local.get(['onboarding_state']);
    return data['onboarding_state'];
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return null;
  }
}

export {
  getRatingState,
  shouldShowRatingPrompt,
  markRated,
  declineRating,
  recordPromptShown,
};
