# Hono Features App

Requires:
- node
- wash
- wasmtime (optional)

Usage:
- `npm install`
- `npm run build`

Run with:
- `npm run start-wash`
- `npm run start-wasmtime`
- `npm run start-jco`

Usage:
- `npm install`
- Setup GitHub App and secrets:
    - See [oauth-providers middleware GitHub setup](https://github.com/honojs/middleware/tree/57b9f5dbdca99a05070687a8dcac4b634d058d5b/packages/oauth-providers#github) docs
    - Make a [new GitHub App](https://github.com/settings/apps/new):
        - Choose a GitHub App name and homepage url (arbitrary)
        - `Callback URL`: `http://127.0.0.1:8000/github`
        - Can disable webhook to avoid required `Webhook URL`
        - The example [requires](https://github.com/honojs/middleware/blob/57b9f5dbdca99a05070687a8dcac4b634d058d5b/packages/oauth-providers/src/providers/github/githubAuth.ts#L57) `Permissions >> Account permissions >> Email addresses` to have at least `Read-only` access
        - Finished github app page has button to `Generate a new client secret`
    - Follow the instructions in the `.env` file to provide the `GITHUB_ID` and `GITHUB_SECRET`
- `npm run build`
