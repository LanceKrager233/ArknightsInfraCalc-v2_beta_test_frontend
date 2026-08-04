# Third-party game asset sources

## arkntools

Operator portraits, building-skill icons, and the generated presentation catalogs under the following paths come from the public [`arkntools/arknights-toolbox-data`](https://github.com/arkntools/arknights-toolbox-data) repository:

- `public/images/operator-portraits`
- `public/images/building-skills`
- `src/generated/arkntools`

`src/generated/arkntools/source.json` records the exact upstream commit and resource counts used by the current checkout. The repository's updater code is published under the MIT License; Arknights game data, names, descriptions, and images remain the property of their respective rights holders. This project does not claim ownership of those game assets.

The frontend consumes only public JSON and PNG artifacts. It does not execute arkntools' private downloader or unpacking workflows, does not require access to private arkntools repositories, and never opens pull requests or writes to arkntools repositories.

## Updating

The `Sync arkntools assets` GitHub Actions workflow performs a shallow sparse checkout of the public source once per day at 10:17 Asia/Shanghai and opens or refreshes a pull request in this frontend repository when generated content changes. It uses the repository-scoped `GITHUB_TOKEN`; maintainers must enable **Allow GitHub Actions to create and approve pull requests** in the repository Actions settings. The workflow creates pull requests but never approves or merges them.

For a local, explicitly reviewed update:

```powershell
git clone --depth 1 --filter=blob:none --sparse https://github.com/arkntools/arknights-toolbox-data.git .tmp/arkntools-data
git -C .tmp/arkntools-data sparse-checkout set --no-cone /assets/data/character.json /assets/data/building.json /assets/locales/cn/character.json /assets/locales/cn/building.json /assets/img/avatar /assets/img/building_skill /LICENSE /package.json
$sourceSha = git -C .tmp/arkntools-data rev-parse HEAD
npm run assets:sync:arkntools -- --source .tmp/arkntools-data --source-sha $sourceSha
```

Scheduled updates fail closed when upstream removes a managed file or reduces the operator count. After reviewing a legitimate removal, rerun the manual workflow with `allow_removals` enabled. The generator stages and validates the complete result before replacing managed directories.

No runtime page or API route fetches data from arkntools. Production builds always use the reviewed, Git-tracked snapshot in this repository.
