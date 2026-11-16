package com.quizletgravity.android;

import java.net.URI;
import java.net.URISyntaxException;

/** Only the two exact first-party HTTPS hosts may be rendered inside the app. */
final class NavigationPolicy {
    static final String HOME = "https://www.quizletgravity.com/";

    static boolean isInternal(String value) {
        if (value == null) return false;
        try {
            URI uri = new URI(value);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getRawUserInfo() == null
                    && (uri.getPort() == -1 || uri.getPort() == 443)
                    && ("www.quizletgravity.com".equalsIgnoreCase(host)
                        || "quizletgravity.com".equalsIgnoreCase(host));
        } catch (URISyntaxException e) { return false; }
    }

    /** Public game links only; authentication callbacks stay in their browser session. */
    static String appLink(String value) {
        if (!isInternal(value)) return null;
        try {
            URI uri = new URI(value);
            String path = uri.getPath();
            if (path == null || path.isEmpty()) path = "/";
            boolean allowed = path.matches("^/(?:[a-zA-Z]{2}(?:-[a-zA-Z]{2})?/)?[0-9]{1,20}/[^/]+-flash-cards/?$")
                    || path.matches("^/sets(?:/[a-fA-F0-9-]{36})?/?$")
                    || path.matches("^/(?:example|my-games|create-set|import-game|import-edit)?/?$");
            if (!allowed) return null;
            // Retain the original encoded path, query and fragment; canonicalise only the host.
            String suffix = uri.getRawPath();
            if (suffix == null || suffix.isEmpty()) suffix = "/";
            return "https://www.quizletgravity.com" + suffix
                    + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery())
                    + (uri.getRawFragment() == null ? "" : "#" + uri.getRawFragment());
        } catch (URISyntaxException e) { return null; }
    }

    static boolean isExternal(String value) {
        if (value == null) return false;
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            return (("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
                    && uri.getHost() != null && uri.getRawUserInfo() == null)
                    || ("mailto".equalsIgnoreCase(scheme) && !uri.getSchemeSpecificPart().isEmpty());
        } catch (URISyntaxException e) { return false; }
    }
}
