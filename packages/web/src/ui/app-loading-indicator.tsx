import loadingIndicator from "/loading-indicator.svg";

export const AppLoadingIndicator = () => (
  <div
    id="app-loading-indicator"
    className="flex h-screen w-screen items-center justify-center"
  >
    <img src={loadingIndicator} alt="Loading indicator" />
  </div>
);
