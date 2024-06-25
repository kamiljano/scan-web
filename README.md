# Scan-ips

Scan IPs is a tool allowing to scan all websites hosted on all of the IPv4 addresses
in order to search for specific pre-defined patterns defined in the [checkers](./src/checkers).

Add your own checker to search for a specific issue across the entire internet.

## Usage

Bun might work great once you run it on the server, but due to the limited IDE support (notably Intellij Idea does not
yet support it as of today), using the NodeJS environment may be more convenient for at least the development purposes.

### Bun

1. Install the dependencies

```bash
bun install
```

2. Run the project

```bash
bun run src/index.ts scan -c websiteExists -f 1.0.0.0 -t 1.255.255.255
```

Run `node dist/src/index.js scan --help` for more parameters.

The tool creates an SQLite database listing the IPs where a certain checker succeeded

### NodeJS

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
node dist/src/index.js scan -c websiteExists -f 1.0.0.0 -t 1.255.255.255
```

Run `node dist/src/index.js scan --help` for more parameters.

The tool creates an SQLite database listing the IPs where a certain checker succeeded

## Checkers

### Find all websites that exist

```shell
node dist/src/index.js scan -c websiteExists
```

Will produce a DB file of all websites in existence.

### Find all websites that contain an accidentally uploaded git repository

```shell
node dist/src/index.js scan -c git
```
