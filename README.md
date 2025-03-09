# TfNSW Realtime Alerts MCP Server

A Model Context Protocol server for Transport for NSW's (TfNSW) Realtime Alerts API. This server provides tools to access and interact with real-time transport alerts and information via Large Language Models.

## Overview

This TypeScript-based MCP server implements integration with Transport for NSW's Realtime Alerts system. It enables AI assistants to access up-to-date information about transport disruptions, planned works, and other important alerts across the NSW transport network.

## Features

### Resources
- List and access transport alerts via `nsw-transport://` URIs
- Filter alerts by transport mode (buses, trains, ferries, etc.)
- Plain text format for easy consumption by AI assistants

### Tools
- `get-transport-alerts` - Retrieve current transport alerts
  - Filter by transport mode
  - Returns formatted alert information including affected routes, time periods, and impact details

### Prompts
- `transport-disruption-summary` - Generate a summary of current transport alerts
  - Includes relevant alert details as embedded resources
  - Returns structured prompt for LLM summarisation of major disruptions

## Transport Modes

The following transport modes are supported:

- `all` - All transport modes
- `buses` - Sydney Metro and Outer Metro Bus services
- `ferries` - Sydney Ferries and Newcastle Transport ferries
- `lightrail` - Light Rail services
- `metro` - Sydney Metro
- `nswtrains` - NSW Trains regional trains and coaches
- `regionbuses` - Regional Bus services
- `sydneytrains` - Sydney Trains suburban and intercity network

## Authentication

This server requires authentication with the TfNSW Open Data API. You will need to register for an API key at the [TfNSW Open Data Hub](https://opendata.transport.nsw.gov.au/).

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tfnsw-realtime-alerts": {
      "command": "npx",
      "args": [
        "-y",
        "tfnsw-realtime-alerts-mcp-server"
      ],
      "env": {
        "NSW_TRANSPORT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Replace `"your_api_key_here"` with your TfNSW API key from the [TfNSW Open Data Hub](https://opendata.transport.nsw.gov.au/).

## Development

Configure your API key as an environment variable in your `.env` file:

```
NSW_TRANSPORT_API_KEY="your_api_key_here"
```

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

### Debugging

You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for debugging, which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
