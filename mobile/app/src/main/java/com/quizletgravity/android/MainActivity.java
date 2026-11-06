package com.quizletgravity.android;

import android.annotation.SuppressLint;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.browser.auth.AuthTabIntent;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public final class MainActivity extends ComponentActivity {
    private WebView webView;
    private String authVerifier, authState;
    private long authStarted;
    private FrameLayout root;
    private LinearLayout overlay;
    private LogoCarouselView logo;
    private ValueAnimator revealAnimation;
    private int loadGeneration;
    private TextView message;
    private Button retry;
    private boolean pageReady;
    private boolean failed;
    private boolean foreground;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private ValueCallback<Uri[]> fileCallback;
    private final Runnable loadTimeout = () -> {
        if (!pageReady && !failed) {
            webView.stopLoading();
            showError();
        }
    };

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                ValueCallback<Uri[]> callback = fileCallback;
                fileCallback = null;
                if (callback == null) return;
                Uri uri = result.getResultCode() == RESULT_OK && result.getData() != null
                        ? result.getData().getData() : null;
                // Only return a document explicitly selected through Android's document picker.
                callback.onReceiveValue(uri != null && "content".equals(uri.getScheme())
                        ? new Uri[]{uri} : null);
            });

    private final ActivityResultLauncher<Intent> authLauncher =
            AuthTabIntent.registerActivityResultLauncher(this, result -> {
                if (result.resultCode == AuthTabIntent.RESULT_OK) {
                    completeSignIn(result.resultUri);
                } else if (result.resultCode != AuthTabIntent.RESULT_CANCELED) {
                    authState = null; authVerifier = null;
                    Toast.makeText(this, "Sign-in could not be completed. Please try again.", Toast.LENGTH_LONG).show();
                }
                // Older browsers return CANCELED for a Custom Tab fallback.
                // Its authenticated deep link is handled by onNewIntent instead.
            });

    private static String encoded(byte[] bytes) {
        return android.util.Base64.encodeToString(bytes, android.util.Base64.URL_SAFE | android.util.Base64.NO_PADDING | android.util.Base64.NO_WRAP);
    }
    private void beginSignIn() {
        try {
            java.security.SecureRandom random = new java.security.SecureRandom();
            byte[] v = new byte[32], state = new byte[32]; random.nextBytes(v); random.nextBytes(state);
            authVerifier = encoded(v); authState = encoded(state); authStarted = System.currentTimeMillis();
            String challenge = encoded(java.security.MessageDigest.getInstance("SHA-256").digest(authVerifier.getBytes(java.nio.charset.StandardCharsets.US_ASCII)));
            new AuthTabIntent.Builder().build().launch(authLauncher,
                    Uri.parse("https://www.quizletgravity.com/native-auth?challenge=" + challenge + "&state=" + authState),
                    "quizletgravity");
        } catch (Exception e) { Toast.makeText(this, "Could not open sign-in. Please try again.", Toast.LENGTH_LONG).show(); }
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        completeSignIn(intent.getData());
    }
    private void completeSignIn(Uri uri) {
        if (uri == null || !"quizletgravity".equals(uri.getScheme()) || !"auth".equals(uri.getHost()) || authState == null || !authState.equals(uri.getQueryParameter("state")) || System.currentTimeMillis()-authStarted > 600000) return;
        String code = uri.getQueryParameter("code");
        if (code == null || !code.matches("[A-Za-z0-9_-]{43}")) return;
        String verifier = authVerifier; authState = null; authVerifier = null;
        webView.loadUrl("https://www.quizletgravity.com/native-return#code=" + code + "&verifier=" + verifier);
    }

    @Override public void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(state);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(false);
        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.navy));
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        createOverlay();
        createWebView();
        loadHome();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack();
                else new AlertDialog.Builder(MainActivity.this)
                        .setTitle(R.string.close_title).setMessage(R.string.close_message)
                        .setNegativeButton(R.string.keep_playing, null)
                        .setPositiveButton(R.string.close, (dialog, which) -> finish()).show();
            }
        });
    }

    private void createOverlay() {
        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setPadding(dp(28), dp(28), dp(28), dp(28));
        overlay.setBackgroundColor(getColor(R.color.indigo));
        overlay.setClickable(true);
        logo = new LogoCarouselView(this);
        overlay.addView(logo, new LinearLayout.LayoutParams(-1, dp(200)));
        TextView title = new TextView(this);
        title.setText(R.string.app_name);
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        overlay.addView(title);
        message = new TextView(this);
        message.setTextColor(Color.WHITE);
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(16), 0, dp(24));
        message.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        message.setVisibility(View.GONE);
        overlay.addView(message);
        retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setTextColor(getColor(R.color.navy));
        retry.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.gold)));
        retry.setOnClickListener(view -> loadHome());
        retry.setVisibility(View.GONE);
        LinearLayout.LayoutParams buttonLayout = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonLayout.topMargin = dp(24);
        overlay.addView(retry, buttonLayout);
        root.addView(overlay, new FrameLayout.LayoutParams(-1, -1));
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(getColor(R.color.navy));
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setUserAgentString(settings.getUserAgentString() + " QuizletGravityApp");
        // The first-party site needs JS and DOM storage for its game and remembered sets.
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                        FileChooserParams params) {
                if (!NavigationPolicy.isInternal(view.getUrl())) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "text/csv", "text/comma-separated-values", "text/tab-separated-values",
                        "text/plain", "application/csv", "application/vnd.ms-excel"});
                try { filePicker.launch(intent); }
                catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, R.string.file_unavailable, Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (NavigationPolicy.isInternal(url)) {
                    if (request.isForMainFrame() && "/native/start".equals(request.getUrl().getPath())) { beginSignIn(); return true; }
                    return false;
                }
                if (request.isForMainFrame() && request.hasGesture()) openExternal(url);
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (!NavigationPolicy.isInternal(url)) {
                    view.stopLoading();
                    showError();
                }
            }

            @Override public void onPageCommitVisible(WebView view, String url) { revealPage(view, url); }
            @Override public void onPageFinished(WebView view, String url) {
                revealPage(view, url);
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                                   WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                                       WebResourceResponse error) {
                if (request.isForMainFrame() && error.getStatusCode() >= 400) showError();
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
                ssl.cancel(); // Never bypass invalid certificates.
                showError();
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (view != webView) return true;
                root.removeView(view);
                view.destroy();
                createWebView();
                showError();
                return true;
            }
        });
        // External links and downloads are handled by the browser, never a privileged JS bridge.
        webView.setDownloadListener((url, agent, disposition, type, length) -> openExternal(url));
        root.addView(webView, 0, new FrameLayout.LayoutParams(-1, -1));
    }

    private void revealPage(WebView view, String url) {
        if (failed || !NavigationPolicy.isInternal(url)) return;
        int generation = loadGeneration;
        view.postVisualStateCallback(0, new WebView.VisualStateCallback() {
            @Override public void onComplete(long requestId) {
                if (view != webView || failed || isFinishing() || generation != loadGeneration) return;
                pageReady = true;
                handler.removeCallbacks(loadTimeout);
                logo.setPageReady();
            }
        });
    }

    private void finishIntro() {
        if (failed || !pageReady || isFinishing() || revealAnimation != null) return;
        int generation = loadGeneration;
        revealAnimation = ValueAnimator.ofFloat(1f, 0f);
        revealAnimation.setStartDelay(1000);
        revealAnimation.setDuration(650);
        revealAnimation.addUpdateListener(animation -> overlay.setAlpha((float) animation.getAnimatedValue()));
        revealAnimation.addListener(new AnimatorListenerAdapter() {
            @Override public void onAnimationEnd(Animator animation) {
                revealAnimation = null;
                if (failed || generation != loadGeneration) return;
                overlay.setVisibility(View.GONE);
                overlay.setAlpha(1f);
                webView.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
            }
        });
        revealAnimation.start();
        if (!foreground && revealAnimation != null) revealAnimation.pause();
    }

    private void cancelReveal() {
        if (revealAnimation != null) {
            revealAnimation.removeAllListeners();
            revealAnimation.removeAllUpdateListeners();
            revealAnimation.cancel();
            revealAnimation = null;
        }
        overlay.setAlpha(1f);
    }

    private void loadHome() {
        loadGeneration++;
        cancelReveal();
        failed = false;
        pageReady = false;
        webView.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        overlay.setVisibility(View.VISIBLE);
        message.setVisibility(View.GONE);
        retry.setVisibility(View.GONE);
        handler.removeCallbacks(loadTimeout);
        handler.postDelayed(loadTimeout, 30000);
        logo.start(this::finishIntro);
        webView.loadUrl(NavigationPolicy.HOME);
    }

    private void showError() {
        loadGeneration++;
        cancelReveal();
        logo.stop();
        failed = true;
        pageReady = false;
        handler.removeCallbacks(loadTimeout);
        overlay.setVisibility(View.VISIBLE);
        message.setText(R.string.connection_error);
        message.setVisibility(View.VISIBLE);
        retry.setVisibility(View.VISIBLE);
    }

    private void openExternal(String url) {
        if (!NavigationPolicy.isExternal(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.browser_unavailable, Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onPause() {
        foreground = false;
        handler.removeCallbacks(loadTimeout);
        if (logo != null) logo.pauseMotion();
        if (revealAnimation != null) revealAnimation.pause();
        if (webView != null) {
            // Use the existing game's Pause control before freezing WebView timers. It stays
            // paused on return, so players choose when to continue instead of losing time.
            if (pageReady && NavigationPolicy.isInternal(webView.getUrl())) {
                webView.evaluateJavascript("(function(){var b=Array.from(document.querySelectorAll('button'))"
                        + ".find(function(b){return !b.disabled && (b.getAttribute('aria-label')==='Pause'"
                        + " || b.textContent.trim()==='Pause');});if(b)b.click();})()", ignored -> {
                            if (!foreground && webView != null) webView.pauseTimers();
                        });
            } else webView.pauseTimers();
            webView.onPause();
            CookieManager.getInstance().flush();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        foreground = true;
        if (!pageReady && !failed) {
            handler.removeCallbacks(loadTimeout);
            handler.postDelayed(loadTimeout, 30000);
        }
        if (logo != null) logo.resumeMotion();
        if (revealAnimation != null) revealAnimation.resume();
        if (webView != null) { webView.resumeTimers(); webView.onResume(); }
    }
    @Override protected void onDestroy() {
        cancelReveal();
        if (logo != null) logo.stop();
        handler.removeCallbacksAndMessages(null);
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
