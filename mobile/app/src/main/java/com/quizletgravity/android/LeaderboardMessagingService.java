package com.quizletgravity.android;

import android.Manifest;
import android.content.Intent;
import android.app.PendingIntent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public final class LeaderboardMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(@NonNull String token) { NotificationRegistration.sync(this, true, null); }

    @Override public void onMessageReceived(@NonNull RemoteMessage message) {
        if (!NotificationRegistration.optedIn(this) || !NotificationManagerCompat.from(this).areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        Map<String,String> data = message.getData();
        String url = NavigationPolicy.appLink(data.get("url"));
        String eventId = data.get("eventId");
        if (url == null || eventId == null || !eventId.matches("[0-9a-fA-F-]{36}")) return;
        NotificationRegistration.createChannel(this);
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url), this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent click = PendingIntent.getActivity(this, eventId.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String body = data.getOrDefault("body", "Another player has overtaken you. Earn your place back!");
        android.os.Bundle appearance = new android.os.Bundle();
        // Supporting Android versions may show our actual gold launcher icon in the card.
        // The status-bar glyph remains monochrome, as required by Android.
        appearance.putBoolean("android.app.preferSmallIcon", false);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, NotificationRegistration.CHANNEL)
                .addExtras(appearance).setNumber(1).setSmallIcon(R.drawable.ic_notification_q).setColor(0xff4255b4)
                .setContentTitle(data.getOrDefault("title", "You’ve been overtaken!"))
                .setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(click).setAutoCancel(true).setOnlyAlertOnce(true);
        NotificationManagerCompat.from(this).notify("leaderboard-" + eventId, 0, notification.build());
    }
}
