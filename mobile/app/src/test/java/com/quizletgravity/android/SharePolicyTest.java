package com.quizletgravity.android;

import org.junit.Test;
import static org.junit.Assert.*;

public class SharePolicyTest {
    @Test public void acceptsPublicGames() {
        assertTrue(SharePolicy.valid("Challenge", "Can you beat 1,000 points?", "https://www.quizletgravity.com/ru/368774680/my-favourite-things-a2-flash-cards"));
        assertTrue(SharePolicy.isPublicUrl("https://www.quizletgravity.com/"));
        assertTrue(SharePolicy.isPublicUrl("https://www.quizletgravity.com/example"));
    }
    @Test public void rejectsSecretsAndForeignUrls() {
        for (String value : new String[]{"https://evil.example/123/game-flash-cards", "https://www.quizletgravity.com.evil.example/", "https://www.quizletgravity.com/native-return", "https://www.quizletgravity.com/123/game-flash-cards?token=secret", "https://www.quizletgravity.com/#code=secret", "javascript:alert(1)", "https://user:pass@www.quizletgravity.com/", "http://www.quizletgravity.com/", "https://www.quizletgravity.com:444/", null}) {
            assertFalse(String.valueOf(value), SharePolicy.isPublicUrl(value));
        }
        assertFalse(SharePolicy.valid("Challenge", new String(new char[1001]), "https://www.quizletgravity.com/"));
    }
}
