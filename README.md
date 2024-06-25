# Scan-web

Scan-Web is a tool allowing to scan all websites hosted all over the internet.
You can either scan a range of IPs v4 or search with domains. The list of available domains is extracted from
[Common Crawl](https://commoncrawl.org/) - a service that crawls the internet and publishes its data for free.

In order to search for specific pre-defined patterns defined in the [checkers](./src/checkers).
Add your own checker to search for a specific issue across the entire internet.

## Usage

1. Install the dependencies

```bash
npm install
```

2. Build the project

```bash
npm run build
```

3. Run the application

```bash
node dist/src/index.js scan ipv4 -c websiteExists -f 1.0.0.0 -t 1.255.255.255 # find all websites hosted on all IPs
node dist/src/index.js scan commoncrawl -c git -d latest # find all websites known to Common Crawl that expose git repositories
```

Run `node dist/src/index.js scan --help` for more parameters.

The tool creates an SQLite database listing the IPs where a certain checker succeeded

## Checkers

### Find all websites that exist

```shell
node dist/src/index.js scan ipv4 -c websiteExists
```

Will produce a DB file of all websites in existence.

### Find all websites that contain an accidentally uploaded git repository

```shell
node dist/src/index.js scan ipv4 -c git
```
