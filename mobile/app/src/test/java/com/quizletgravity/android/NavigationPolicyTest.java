package com.quizletgravity.android;

import org.junit.Test;
import static org.junit.Assert.*;

public class NavigationPolicyTest {
    @Test public void acceptsOnlyExactFirstPartyHttpsHosts() {
        assertTrue(NavigationPolicy.isInternal("https://www.quizletgravity.com/"));
        assertTrue(NavigationPolicy.isInternal("https://www.quizletgravity.com/game?set=123"));
        assertTrue(NavigationPolicy.isInternal("https://QUIZLETGRAVITY.COM:443/"));
        for (String url : new String[]{null, "https://www.quizletgravity.com.evil.example/",
                "https://evil.example/www.quizletgravity.com", "http://www.quizletgravity.com/",
                "https://www.quizletgravity.com@evil.example/", "https://evil@www.quizletgravity.com/",
                "https://www.quizletgravity.com:8443/", "javascript:alert(1)", "file:///etc/passwd",
                "content://private/", "https://www.quizletgravity.com\\@evil.example"}) {
            assertFalse("Unexpectedly allowed: " + url, NavigationPolicy.isInternal(url));
        }
    }
    @Test public void externalLinksCannotInvokeArbitraryNativeIntents() {
        assertTrue(NavigationPolicy.isExternal("https://quizlet.com/ch/123/test"));
        assertTrue(NavigationPolicy.isExternal("mailto:hello@example.com"));
        for (String url : new String[]{null, "intent://evil", "javascript:alert(1)",
                "file:///sdcard/private", "data:text/html,hi", "https://user:password@example.com",
                "https:///broken", "mailto:"}) {
            assertFalse(NavigationPolicy.isExternal(url));
        }
    }
}
