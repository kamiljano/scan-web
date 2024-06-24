# Scan-ips

Scan IPs is a tool allowing to scan all websites hosted on all of the IPv4 addresses
in order to search for specific pre-defined patterns defined in the [checkers](./src/checkers).

Add your own checker to search for a specific issue across the entire internet.

## Usage

1Install the dependencies

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
