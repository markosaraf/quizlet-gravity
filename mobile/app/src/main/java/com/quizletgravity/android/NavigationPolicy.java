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
