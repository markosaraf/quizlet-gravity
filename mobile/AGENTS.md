# Android development rules

- This app loads the live quizletgravity.com site. Do not edit or deploy the website as a side effect of app work.
- Do not install, launch or interactively test the app on the owner's phone unless they explicitly ask. Build/lint/unit checks are allowed. Give the owner a short phone test list.
- Keep signing material, passwords, environment files and SDK-local settings outside git. Never publish signing material with release assets.
- Keep release signing consistent so future APKs can update existing installations.
- Do not add a privileged JavaScript bridge or allow untrusted websites inside the main WebView.
