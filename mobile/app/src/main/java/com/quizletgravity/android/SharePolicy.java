package com.quizletgravity.android;

import java.net.URI;

/** The share action never exports authentication URLs, tokens or arbitrary schemes. */
final class SharePolicy {
    static boolean isPublicUrl(String value) {
        if (value == null || value.length() > 2048 || !NavigationPolicy.isInternal(value)) return false;
        try {
            URI uri = new URI(value);
            if (uri.getRawQuery() != null || uri.getRawFragment() != null) return false;
            String path = uri.getPath();
            return "/".equals(path) || "/example".equals(path)
                || path.matches("^/sets/[0-9a-fA-F-]{36}/?$")
                || path.matches("^/(?:[a-zA-Z]{2}(?:-[a-zA-Z]{2})?/)?[0-9]{1,20}/[^/]+-flash-cards/?$");
        } catch (Exception e) { return false; }
    }

    static boolean valid(String title, String text, String url) {
        return title != null && !title.isEmpty() && title.length() <= 200
            && text != null && !text.isEmpty() && text.length() <= 1000 && isPublicUrl(url);
    }
}
