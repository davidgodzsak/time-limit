#!/usr/bin/env python3
"""Mint a Chrome Web Store refresh token and store it as CHROME_REFRESH_TOKEN.

Use it when the `publish-chrome` job fails at "Exchange refresh token for
access token": the token in GitHub has expired or been revoked.

    python3 scripts/mint-chrome-token.py

Run it in your own terminal: it asks for the OAuth client ID and secret
(Google Cloud -> Google Auth Platform -> Clients), opens a Google sign-in, and
needs `gh` logged in to the repo. The token is never printed; it is checked
with the same refresh exchange the workflow does, then piped into
`gh secret set`.

Things that went wrong the first time (2026-10-08):
- The consent screen must say "In production" (Google Auth Platform ->
  Audience). A token minted while the app is in Testing expires after 7 days
  no matter what.
- The client is a "Web application" type, so the redirect URI below must be
  listed under its Authorized redirect URIs, or Google answers
  redirect_uri_mismatch. Port 8765 is taken by another project.
- No refresh token in the response: remove the app at
  https://myaccount.google.com/permissions and run again.

Afterwards, upload the stuck version by hand from the GitHub release
(`time-limit-<version>-chrome.zip`); the run's chrome-dist artifact only lives
for a day, so re-running the job won't find it.
"""
import getpass
import http.server
import json
import secrets
import subprocess
import sys
import urllib.parse
import urllib.request
import webbrowser

REPO = "davidgodzsak/mindful-browse"
SCOPE = "https://www.googleapis.com/auth/chromewebstore"
PORT = 47613
REDIRECT_URI = f"http://127.0.0.1:{PORT}"


def post(url, data):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode())
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        sys.exit(f"Google refused the request: {e.read().decode()}")


def wait_for_code(state):
    result = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result.update({k: v[0] for k, v in query.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Done - you can close this tab and go back to the terminal.")

        def log_message(self, *args):
            pass

    with http.server.HTTPServer(("127.0.0.1", PORT), Handler) as server:
        while "code" not in result and "error" not in result:
            server.handle_request()

    if "error" in result:
        sys.exit(f"Authorization failed: {result['error']}")
    if result.get("state") != state:
        sys.exit("State mismatch - aborting.")
    return result["code"]


def set_secret(name, value):
    subprocess.run(["gh", "secret", "set", name, "-R", REPO], input=value.encode(), check=True)
    print(f"Updated {name}")


def main():
    client_id = input("OAuth client ID: ").strip()
    client_secret = getpass.getpass("OAuth client secret (hidden): ").strip()
    state = secrets.token_urlsafe(16)

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",  # forces a fresh refresh token even if consent was given before
        "state": state,
    })
    print(f"\nOpening the browser. If it doesn't open, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)
    code = wait_for_code(state)

    tokens = post("https://oauth2.googleapis.com/token", {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    })
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        sys.exit("Google returned no refresh token. Revoke the app at "
                 "https://myaccount.google.com/permissions and run this again.")

    # Same exchange the publish workflow does, so a bad token fails here, not on release day.
    check = post("https://oauth2.googleapis.com/token", {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    })
    if not check.get("access_token"):
        sys.exit("The new refresh token did not work - secret NOT updated.")
    print("Refresh token works.")

    set_secret("CHROME_REFRESH_TOKEN", refresh_token)
    if input("Also overwrite CHROME_CLIENT_ID / CHROME_CLIENT_SECRET with what you entered? [y/N] ").lower() == "y":
        set_secret("CHROME_CLIENT_ID", client_id)
        set_secret("CHROME_CLIENT_SECRET", client_secret)


if __name__ == "__main__":
    main()
