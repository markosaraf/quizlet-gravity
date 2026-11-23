package com.quizletgravity.android;

import android.app.NotificationManager;
import android.content.Context;
import android.webkit.CookieManager;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

/** Uses authenticated server state; page JavaScript cannot supply badge counts or tokens. */
final class NotificationInboxSync {
    private static final String ORIGIN = "https://www.quizletgravity.com";
    private static final java.util.concurrent.ExecutorService worker = Executors.newSingleThreadExecutor();
    private static boolean running;
    private static boolean pending;
    static synchronized void sync(Context context) {
        if (running) { pending = true; return; }
        running = true;
        Context app = context.getApplicationContext();
        String cookie = CookieManager.getInstance().getCookie(ORIGIN);
        worker.execute(() -> {
            HttpURLConnection connection = null;
            try {
                NotificationManager manager = app.getSystemService(NotificationManager.class);
                JSONArray ids = new JSONArray();
                for (android.service.notification.StatusBarNotification n : manager.getActiveNotifications()) {
                    if (n.getTag() != null && n.getTag().startsWith("leaderboard-")) {
                        String id = n.getTag().substring("leaderboard-".length());
                        if (id.matches("[0-9a-fA-F-]{36}") && ids.length() < 100) ids.put(id);
                    }
                }
                connection = (HttpURLConnection) new URL(ORIGIN + "/api/notifications/inbox/status").openConnection();
                connection.setRequestMethod("POST"); connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Origin", ORIGIN);
                if (cookie != null) connection.setRequestProperty("Cookie", cookie);
                connection.setDoOutput(true);
                byte[] body = new JSONObject().put("ids", ids).toString().getBytes(StandardCharsets.UTF_8);
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body); }
                int status = connection.getResponseCode();
                JSONArray clear;
                if (status == 401) clear = ids;
                else if (status == 200) {
                    try (java.io.InputStream input = connection.getInputStream()) {
                        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                        byte[] buffer = new byte[4096]; int count;
                        while ((count = input.read(buffer)) != -1) { output.write(buffer, 0, count); if (output.size() > 65536) return; }
                        clear = new JSONObject(output.toString("UTF-8")).getJSONArray("clearIds");
                    }
                } else return;
                // The server decides which delivered notifications have been clicked.
                for (int i = 0; i < clear.length(); i++) manager.cancel("leaderboard-" + clear.getString(i), 0);
            } catch (Exception ignored) { /* Keep notifications on failure; retry on foreground. */ }
            finally {
                if (connection != null) connection.disconnect();
                synchronized (NotificationInboxSync.class) {
                    running = false;
                    if (pending) { pending = false; new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> sync(app)); }
                }
            }
        });
    }
}
