# notion-backups

[![npm version](https://badge.fury.io/js/notion-backups.svg)](https://badge.fury.io/js/notion-backups) [![GitHub version](https://badge.fury.io/gh/methyldragon%2Fnotion-backups.svg)](https://badge.fury.io/gh/methyldragon%2Fnotion-backups)



## Description

This is a very simple tool to export a workspace from [Notion](https://www.notion.so/), designed to work as part of a GitHub workflow.

It's forked from [the original](https://github.com/darobin/notion-backup) (`notion-backup`), and offers additional functionality, such as:

- Choosing export type
- Backing up **multiple spaces** from **multiple users** into nice and neat directories
- Blazingly fast backups, achieved by using asynchronous calls :fire:

But this comes at the tradeoff of requiring an extra parameter.

If you don't need any of the additional functionalities from this package, you can continue using the original!

> **Why this independent fork?**
>
> Unfortunately this would lead to API breaking bugs in the original, and so, this package has been independently released to be used in parallel to the original. I wrote this for myself, and wanted a nice and easy way to access the package, and I think things have been sufficiently changed to warrant a new package being created.
>
> Still though, credits for the original and the base of this package goes to [Robin Berjon](https://github.com/darobin).



## Quick Start

You can actually run this in your command line easily with environment variables instead of GitHub action secrets!

### If you have one space...

```shell
$ export BACKUP_DIRS=some/directory
$ export NOTION_TOKENS=<token_1>
$ export NOTION_SPACE_IDS=<space_1>
$ export NOTION_USER_IDS=<user_1>

# OPTIONAL, choose one, or none, in which case you're choosing both!
$ export EXPORT_TYPE=html
$ export EXPORT_TYPE=markdown

$ npm install notion-backups
$ notion-backups
```

> Follow [this blog post](https://artur-en.medium.com/automated-notion-backups-f6af4edc298d) to see how to obtain your Notion tokens and IDs.



### If you have more than one space, and more than one user!?!

```shell
$ export BACKUP_DIRS=some/directory; another/directory
$ export NOTION_TOKENS=<token_1>; <token_2>
$ export NOTION_SPACE_IDS=<space_1>; <space_2>
$ export NOTION_USER_IDS=<user_1>; <user_2>

# OPTIONAL, choose one, or none, in which case you're choosing both!
$ export EXPORT_TYPE=html
$ export EXPORT_TYPE=markdown

$ npm install notion-backups
$ notion-backups
```



## Detailed Usage Guide

In order to achieve multi-user, multi-space backing up functionality, you need to set your GitHub action secrets up a little bit more properly. Different from the original, now, you can enter a **semicolon-delineated** list of IDs!

No worries on spaces appearing next to each semicolon, the script trims them out for you. So actually if you wanted, you could even use newlines, as long as you put a semicolon between each list element!

>  **NOTE**: If you log out of your account, the `NOTION_TOKEN` will get invalidated and this process will fail. There isn't anything that I know of that I can do about that until Notion decides to add a backup endpoint to their official API, at which point this will be able to use a proper authentication token.

The secrets you need are:

- `BACKUP_DIRS`
  - Determines where the backups are saved, relative to the root of the repository
- `NOTION_TOKENS`
  - Your Notion user token (**one token per session**, can be used for multiple users if you're logged in to the same session), but with a caveat stated later on
- `NOTION_SPACE_IDS`
  - Your Notion space IDs (**one ID per workspace**) for spaces targeted for backup
- `NOTION_USER_IDS`
  - Your Notion user IDs (**one ID per user**, used for all workspaces that user has access to), same caveat for `NOTION_TOKENS` applies


> If you need to know how to get your `NOTION_TOKENS` or `NOTION_SPACE_IDS`, follow [this blog post](https://artur-en.medium.com/automated-notion-backups-f6af4edc298d).
>
> You can follow a similar process for the `NOTION_USER_IDS`, just look for the `notion_user_id` in the request headers.

There is also an optional secret you can use:

- `EXPORT_TYPE` = {`"markdown"`, `"html"`, `""`}
  - Not entering anything causes both types to be backed up, otherwise it'll backup the requested type



### Single Space Case

For the single space case, it's relatively trivial, just specify stuff as needed

```
BACKUP_DIRS: whatever/dir/you/want
NOTION_TOKENS: <your_notion_token_v2>
NOTION_SPACE_IDS: <your_notion_space_id>
NOTION_USER_IDS: <your_notion_user_id>
```

I'd personally recommend setting up your BACKUP_DIR to be `<user>/<space_name>`, but you can do whatever you want, really. Just know that it'll be **relative to your project root.**



### Multi-Space, Single User Case

> Ensure all lists are the same element lengths!

With multiple spaces, things get a little bit more complicated. You'll need to either repeat your token declaration, or use the shorthand.

In this example, we're trying to back up three spaces that belong to the same user.

**Explicit**

```
BACKUP_DIRS: <dir_1>; <dir_2>; <dir_3>
NOTION_TOKENS: <token_v2>; <token_v2>; <token_v2>
NOTION_SPACE_IDS: <id_1>; <id_2>; <id_3>
NOTION_USER_IDS: <uid_1>; <uid_1>; <uid_1>
```

Notice that the tokens and user IDs are identical! This is because in this case, we're just accessing them using the **same session**, for a **single user**.

**Shorthand**

>  The `node.js` script I modified makes an affordance to mitigate repetitions by allowing you to use `*` to tell the script to use the closest preceding valid entry. If you use this, you **must** specify your tokens in order (or at least, ensure that every `*` instance is preceded by the notion token that you want to be substituting in, or another `*`, all the way till it hits a non-`*` entry.)

You can use the same shorthand for user IDs!

```
BACKUP_DIRS: <dir_1>; <dir_2>; <dir_3>
NOTION_TOKENS: <token_v2>; *; *
NOTION_SPACE_IDS: <id_1>; <id_2>; <id_3>
NOTION_USER_IDS: <uid_1>; *; *
```



### Multi-Space, Multi-User Case

> Ensure all lists are the same element lengths!

It should be pretty obvious what needs to be done here. Do the same repetitions, or use the shorthand, but ensure that there are more notion tokens in the mix.

In this case, we have two users, with two spaces each.

**Explicit**

```
BACKUP_DIRS: <dir_1>; <dir_2>; <dir_3>; <dir_4>
NOTION_TOKENS: <token_v2_1>; <token_v2_1>; <token_v2_2>; <token_v2_2>
NOTION_SPACE_IDS: <id_1>; <id_2>; <id_3>; <id_4>
NOTION_USER_IDS: <uid_1>; <uid_2>; <uid_3>; <uid_4>
```

With the explicit method, you can swap the ordering, as long as each dir-token-id triplet appear in the same index.

```
BACKUP_DIRS: <dir_1>; <dir_3>; <dir_2>; <dir_4>
NOTION_TOKENS: <token_v2_1>; <token_v2_2>; <token_v2_1>; <token_v2_2>
NOTION_SPACE_IDS: <id_1>; <id_3>; <id_2>; <id_4>
NOTION_USER_IDS: <uid_1>; <uid_3>; <uid_2>; <uid_4>
```

**Shorthand**

You can't swap the ordering around with the shorthand method though! But it'll cut down on the amount of copy-pasting you need to do.

```
BACKUP_DIRS: <dir_1>; <dir_2>; <dir_3>; <dir_4>
NOTION_TOKENS: <token_v2_1>; *; <token_v2_2>; *
NOTION_SPACE_IDS: <id_1>; <id_2>; <id_3>; <id_4>
NOTION_USER_IDS: <uid_1>; <uid_2>; <uid_3>; <uid_4>
```

Here, the first `*` is substituted with `<token_v2_1>`, and the second `*` is substituted with `<token_v2_2>`.



### Bonus: Choosing Export Type

You can specify the optional secret, `EXPORT_TYPE` to determine what export type you want for **all backup jobs**.

You don't repeat the type.

```
BACKUP_DIRS: <dir_1>; <dir_2>; <dir_3>; <dir_4>
NOTION_TOKENS: <token_v2_1>; *; <token_v2_2>; *
NOTION_SPACE_IDS: <id_1>; <id_2>; <id_3>; <id_4>
EXPORT_TYPE: markdown
```



## Setup: Notion Backups Using GitHub Actions

This assumes you are looking to set this up to back up Notion to GitHub.

1. Create a repo for your backup. You probably want it private.
2. Get as many `NOTION_TOKENS`, `NOTION_SPACE_IDS`, and `NOTION_USER_IDS` elements as explained in [this blog post](https://medium.com/@arturburtsev/automated-notion-backups-f6af4edc298d).
3. Set them as GitHub action secrets in your GitHub repo, following the usage guide above. Also remember to set `BACKUP_DIRS` and optionally `EXPORT_TYPE`!
4. Install the following under `.github/workflows/<whatever>.yml` in your repo.

The `cron` schedule triggers every 4th hour, but you can set your own schedule, using this [handy cron interpreter](https://crontab.guru/) to craft your schedule.

```yaml
name: "Notion Backups"

on:
  workflow_dispatch:
  push:
    branches:
      - master
  schedule:
    -   cron: "0 */4 * * *"

jobs:
  backup:
    runs-on: ubuntu-latest
    name: Backup
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '12'
      - name: Setup dependencies
        run: npm install -g notion-backups

      - name: Run backup
        run: notion-backups
        env:
          BACKUP_DIRS: ${{ secrets.BACKUP_DIRS }}
          NOTION_TOKENS: ${{ secrets.NOTION_TOKENS }}
          NOTION_SPACE_IDS: ${{ secrets.NOTION_SPACE_IDS }}
          NOTION_USER_IDS: ${{ secrets.NOTION_USER_IDS }}
          EXPORT_TYPE: ${{ secrets.EXPORT_TYPE }}

      - name: Delete zips
        run: "find . -type f -name '*.zip' -exec echo 'Cleaning up: {}' \\; -exec rm {} +"

      - name: Commit changes
        uses: elstudio/actions-js-build/commit@v3
        with:
          commitMessage: Automated snapshot
```
