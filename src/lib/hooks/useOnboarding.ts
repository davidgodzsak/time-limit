import { useState, useEffect } from "react";
import * as api from "@/lib/api";

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  isVisible: boolean;
  showSuccessMessage: boolean;
  successMessage: string;
}

// Step definitions
export const ONBOARDING_STEPS = {
  WELCOME: 0,
  ADD_SITE: 1,
  GROUPS_TAB: 2,
  ADD_TO_GROUP: 3,
  MESSAGES_TAB: 4,
  MESSAGES_LIST: 5,
  COMPLETION: 6,
  TOOLBAR_ICON: 7,
};

export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    hasCompletedOnboarding: false,
    currentStep: 0,
    isVisible: false,
    showSuccessMessage: false,
    successMessage: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load onboarding state from storage on mount
  useEffect(() => {
    const loadOnboardingState = async () => {
      const g = globalThis as unknown as { browser?: unknown; chrome?: unknown };
      if (!g.browser && !g.chrome) {
        // Not in extension context (e.g. demo page) — skip onboarding entirely
        setIsLoading(false);
        return;
      }
      try {
        const onboardingData = await api.getOnboardingState();
        setState((prev) => ({
          ...prev,
          hasCompletedOnboarding: onboardingData?.completed || false,
          isVisible: !onboardingData?.completed,
        }));
      } catch (error) {
        console.warn("Could not load onboarding state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboardingState();
  }, []);

  const nextStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 7), // 8 steps (0-7)
      showSuccessMessage: false,
    }));
  };

  const showSuccess = (message: string) => {
    setState((prev) => ({
      ...prev,
      showSuccessMessage: true,
      successMessage: message,
    }));

    // Auto-advance after 2 seconds
    setTimeout(() => {
      nextStep();
    }, 2000);
  };

  const goToStep = (step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(Math.max(step, 0), 7),
      showSuccessMessage: false,
    }));
  };

  const completeOnboarding = async () => {
    try {
      await api.completeOnboarding();
      setState((prev) => ({
        ...prev,
        hasCompletedOnboarding: true,
        isVisible: false,
      }));
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  };

  const skipOnboarding = async () => {
    await completeOnboarding();
  };

  const restartOnboarding = () => {
    setState((prev) => ({
      ...prev,
      currentStep: 0,
      isVisible: true,
      showSuccessMessage: false,
    }));
  };

  const closeOnboarding = () => {
    setState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  };

  return {
    ...state,
    isLoading,
    nextStep,
    goToStep,
    showSuccess,
    completeOnboarding,
    skipOnboarding,
    restartOnboarding,
    closeOnboarding,
  };
};
