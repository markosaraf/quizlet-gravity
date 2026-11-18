// Only new native builds understand this navigation. Browsers and older apps
// keep their current page; the native handler cancels navigation and asks once.
export function notificationOnboardingURL(userAgent:string):string|null {
 return userAgent.includes('QuizletGravityApp') && userAgent.includes('NotificationOnboarding/1')
  ? '/native/notifications?afterSignup=1' : null;
}

export function requestSignupNotifications(){
 const url=notificationOnboardingURL(navigator.userAgent);
 if(url)window.location.assign(url);
}
