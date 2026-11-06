(function () {
  if (location.protocol !== 'https:' || !['www.quizletgravity.com', 'quizletgravity.com'].includes(location.hostname)) return;
  if (!document.getElementById('gravity-native-layout')) {
    const style = document.createElement('style');
    style.id = 'gravity-native-layout';
    // The site's phone controls, selected by input device instead of iPad width.
    // Keep the real viewport width: don't magnify text or falsify game coordinates.
    style.textContent = `
      html[data-gravity-input="touch"] .GravityModeLayout-sidebar { display: none; }
      html[data-gravity-input="touch"] .GravityMobileControlsBar { display: none; }
      html[data-gravity-input="touch"] .GravitySiteHeader-mobileControls { display: flex; }
      html[data-gravity-input="touch"] .GravitySiteHeader-setTitle { display: none; }
      html[data-gravity-input="touch"] .GravitySiteHeader { height: auto; min-height: 3.5rem; padding: .5rem 1rem; }
      html[data-gravity-input="touch"] .GravityModeLayout { min-height: auto; }
      html[data-gravity-input="touch"] .GravityModeLayout-main { min-height: calc(100vh - 3.5rem); }
      html[data-gravity-input="touch"] .GravityGameplayView-typingPrompt { width: 100%; }
      html[data-gravity-input="touch"] .GravityUIRow { flex-direction: column; gap: 1.5rem; }
      html[data-gravity-input="keyboard"] .GravityModeLayout-sidebar { display: flex; }
      html[data-gravity-input="keyboard"] .GravitySiteHeader-mobileControls { display: none; }
      html[data-gravity-input="keyboard"] .GravitySiteHeader-setTitle { display: block; }
      html[data-gravity-input="keyboard"] .GravitySiteHeader { height: 3rem; min-height: 0; padding: 0 1rem; }
      html[data-gravity-input="keyboard"] .GravityModeLayout,
      html[data-gravity-input="keyboard"] .GravityModeLayout-main { min-height: calc(100vh - 3rem); }
      html[data-gravity-input="keyboard"] .GravityUIRow { flex-direction: row; gap: 2rem; }

      /* Only the game occupies one viewport. Import/FAQ pages keep normal scrolling.
         The native view itself shrinks above the keyboard, like Android adjustResize.
         Flex shares that height between the actual header and the remaining game;
         don't add a second 100vh/min-height below the header. */
      html:has(.gravity-root > .GravityModeLayout),
      html:has(.gravity-root > .GravityModeLayout) body {
        height: 100%;
        overflow: hidden;
        overscroll-behavior: none;
      }
      html[data-gravity-input] .gravity-root:has(> .GravityModeLayout) {
        position: fixed;
        inset: 0;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      html[data-gravity-input] .gravity-root > .GravitySiteHeader { flex: 0 0 auto; }
      html[data-gravity-input] .gravity-root > .GravityModeLayout {
        flex: 1 1 0;
        min-height: 0;
        overflow: hidden;
      }
      html[data-gravity-input] .GravityModeLayout-body,
      html[data-gravity-input] .GravityModeLayout-main { min-height: 0; }
      html[data-gravity-input] .GravityModeLayout-sidebar,
      html[data-gravity-input] .GravityUIModal { overflow-y: auto; }
      html[data-gravity-input] .GravitySplashView {
        top: min(12.5rem, 20%);
        bottom: 0;
        overflow-y: auto;
      }

      /* Leave room for the answer field on shorter screens with a keyboard. */
      @media (max-height: 600px) {
        html[data-gravity-input] .GravityUIModal { padding-top: 1rem; }
        html[data-gravity-input] .GravityTypingPrompt { min-height: 0; }
        html[data-gravity-input] .GravityTypingPrompt-inputWrapper { margin-bottom: 0; }
        html[data-gravity-input] .GravityCopyTermView { height: 100%; overflow-y: auto; }
        html[data-gravity-input] .GravityCopyTermView-inner { margin-top: .75rem; }
        html[data-gravity-input] .GravityCopyTermView-prompt,
        html[data-gravity-input] .GravityCopyTermView-answer { margin-bottom: .75rem; }
      }
    `;
    document.head.appendChild(style);
  }
  document.getElementById('gravity-native-support')?.remove();
})();
