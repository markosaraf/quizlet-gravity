package com.quizletgravity.android;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessaging;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.function.Consumer;
import org.json.JSONObject;

final class NotificationRegistration {
    static final String CHANNEL = "leaderboard_overtaken";
    private static final String ORIGIN = "https://www.quizletgravity.com";
    private static final ExecutorService worker = Executors.newSingleThreadExecutor();
    private static final Handler main = new Handler(Looper.getMainLooper());
    private static String lastRegistration = "";
    private static long lastRegisteredAt;

    static void createChannel(Context context) {
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Leaderboard updates", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("When another player overtakes your best score");
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    static boolean optedIn(Context context) { return context.getSharedPreferences("notifications", Context.MODE_PRIVATE).getBoolean("opted_in", false); }
    static void optIn(Context context) {
        context.getSharedPreferences("notifications", Context.MODE_PRIVATE).edit().putBoolean("opted_in", true).apply();
        FirebaseMessaging.getInstance().setAutoInitEnabled(true);
    }

    static void sync(Context context, boolean force, Consumer<Boolean> completion) {
        if (!optedIn(context) || !NotificationManagerCompat.from(context).areNotificationsEnabled()) { if (completion != null) completion.accept(false); return; }
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token -> main.post(() -> {
            String cookie = CookieManager.getInstance().getCookie(ORIGIN);
            if (cookie == null || cookie.isEmpty()) { if (completion != null) completion.accept(false); return; }
            String registration = token + "\n" + cookie;
            if (!force && registration.equals(lastRegistration) && System.currentTimeMillis() - lastRegisteredAt < 60000) return;
            worker.execute(() -> {
                boolean success = false;
                HttpURLConnection connection = null;
                try {
                    connection = (HttpURLConnection) new URL(ORIGIN + "/api/notifications/devices").openConnection();
                    connection.setRequestMethod("POST"); connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setRequestProperty("Origin", ORIGIN); connection.setRequestProperty("Cookie", cookie);
                    connection.setDoOutput(true);
                    byte[] payload = new JSONObject().put("platform", "android").put("environment", "production").put("token", token).toString().getBytes(StandardCharsets.UTF_8);
                    try (java.io.OutputStream output = connection.getOutputStream()) { output.write(payload); }
                    success = connection.getResponseCode() == 200;
                } catch (Exception ignored) { /* Retry on the next foreground/page load. */ }
                finally { if (connection != null) connection.disconnect(); }
                final boolean registered = success;
                main.post(() -> {
                    if (registered) { lastRegistration = registration; lastRegisteredAt = System.currentTimeMillis(); }
                    if (completion != null) completion.accept(registered);
                });
            });
        })).addOnFailureListener(error -> { if (completion != null) main.post(() -> completion.accept(false)); });
    }
}
