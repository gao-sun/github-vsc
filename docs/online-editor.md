# GitHub VSC Online Editor

## Screenshots

![Preview](https://user-images.githubusercontent.com/14722250/108383244-90f12f00-7244-11eb-9332-c34fe464f129.png)

## Limitations

### Quick Navigation

Since there're some huge repos containing thousands of folders/files (imagine someone uploaded `node_modules/`), it'll significantly increase the responding time if we fetch all the files from GitHub API. Thus GitHub VSC will only search current folder when you are typing in the `Cmd + P` panel.

Say the repo has the structure of `foo/a/file1` and `foo/b/file2`:

1. When you typed `foo/` it will show the result as the combination of `foo/a` and `foo/b`.
2. When you typed `foo/a/` it will show a single result `foo/a/file1`.

### Global Text Search

Quote from [GitHub docs](https://docs.github.com/en/rest/reference/search#considerations-for-code-search):

> Due to the complexity of searching code, there are a few restrictions on how searches are performed:
>
> - Only the _default branch_ is considered. In most cases, this will be the `master` branch.
> - Only files smaller than 384 KB are searchable.

Also, the global text search result has NO pagination yet. (It always shows page 1)