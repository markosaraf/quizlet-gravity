#!/usr/bin/env python3
"""Check Android's installed manifest and verified-domain routing, not just Java URL parsing.
Run against a release installed on an emulator: python3 test-app-links.py emulator-5554
"""
import os
import subprocess
import sys

if len(sys.argv) != 2 or not sys.argv[1].startswith('emulator-'):
    sys.exit('Pass an emulator serial explicitly; this test does not target physical phones.')
adb = os.environ.get('ADB', 'adb')
serial = sys.argv[1]
package = 'com.quizletgravity.android'

def shell(*args):
    return subprocess.run([adb, '-s', serial, 'shell', *args], check=True,
                          capture_output=True, text=True).stdout

paths = [
    '/1000000000000029/voices-2-unit-1-words-no-sentences-flash-cards',
    '/123/french-flash-cards',
    '/234/words-with-many-hyphens-flash-cards/',
    '/345/flash-cards-with-flash-in-title-flash-cards',
    '/456/caf%C3%A9-and-numbers-123-flash-cards?source=share#play',
    '/ch/567/voices-2-unit-1-flash-cards',
    '/de-CH/678/voices-2-unit-1-flash-cards/',
    '/789/words-flash-cards', '/890/words-flash-cards',
    '/901/words-flash-cards', '/012/words-flash-cards',
    '/example', '/sets', '/sets/12345678-1234-1234-1234-123456789abc',
]
for host in ['www.quizletgravity.com', 'quizletgravity.com']:
    for path in paths:
        url = 'https://' + host + path
        # adb shell joins its arguments; quote URL to preserve &, ? and # literally.
        import shlex
        resolved = shell('cmd', 'package', 'resolve-activity', '--brief', '--query-flags', '0x00010000',
                         '-a', 'android.intent.action.VIEW',
                         '-c', 'android.intent.category.BROWSABLE', '-d', shlex.quote(url))
        if package + '/' not in resolved:
            sys.exit('FAIL: ' + url + '\n' + resolved)
        print('PASS: ' + url)
    for path in ['/api/auth/callback/apple', '/native-auth', '/admin', '/account', '/login']:
        url = 'https://' + host + path
        candidates = shell('cmd', 'package', 'query-activities', '--brief',
                           '-a', 'android.intent.action.VIEW',
                           '-c', 'android.intent.category.BROWSABLE', '-d', shlex.quote(url))
        if package + '/' in candidates:
            sys.exit('FAIL: app captured browser-only URL ' + url)
        print('PASS browser-only: ' + url)
print('All 38 Android link-routing checks passed.')
