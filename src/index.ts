#!/usr/bin/env node

/**
 * TfNSW Realtime Alerts MCP Server.
 * This server provides real-time service alerts for Transport for NSW.
 * - Fetching realtime alerts by mode via resources
 * - Fetching realtime alerts by mode via tools
 * - Summarising realtime alerts via prompts.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import * as dotenv from "dotenv"
import fetch from "node-fetch"

// Load environment variables.
dotenv.config()

const API_KEY = process.env.NSW_TRANSPORT_API_KEY
const BASE_URL = "https://api.transport.nsw.gov.au/v2/gtfs/alerts"

if (!API_KEY) {
  console.error("Error: NSW_TRANSPORT_API_KEY environment variable is not set!")
  console.error("Please obtain an API key from https://opendata.transport.nsw.gov.au/")
  process.exit(1)
}

type TransportMode = {
  id: string
  name: string
  description: string
}

/**
 * Transport modes available in the API
 */
const TRANSPORT_MODES: TransportMode[] = [
  { id: "all", name: "All Transport Modes", description: "Service alerts for all transport modes" },
  { id: "buses", name: "Buses", description: "Service alerts for all Sydney Metro and Outer Metro Bus Contract Regions" },
  { id: "ferries", name: "Ferries", description: "Service alerts for Sydney Ferries, Newcastle Transport ferries, and private operators" },
  { id: "lightrail", name: "Light Rail", description: "Service alerts for Light Rail" },
  { id: "metro", name: "Sydney Metro", description: "Service alerts for Sydney Metro" },
  { id: "nswtrains", name: "NSW Trains", description: "Service alerts for NSW Trains regional trains and coaches" },
  { id: "regionbuses", name: "Regional Buses", description: "Service alerts for Regional Buses" },
  { id: "sydneytrains", name: "Sydney Trains", description: "Service alerts for Sydney Trains suburban and intercity network" }
]

// Define interfaces for the API response
interface AlertTranslation {
  text: string
  language?: string
}

interface AlertTextTranslation {
  translation?: AlertTranslation[]
}

interface AlertEntity {
  id: string
  alert: {
    headerText?: AlertTextTranslation
    descriptionText?: AlertTextTranslation
    informedEntity?: {
      routeId?: string
      stopId?: string
      agencyId?: string
      directionId?: number
    }[]
    activePeriod?: {
      start?: string
      end?: string
    }[]
    cause?: string
    effect?: string
    url?: AlertTextTranslation
  }
}

interface AlertResponse {
  header?: {
    gtfsRealtimeVersion?: string
    incrementality?: string
    timestamp?: string
  }
  entity: AlertEntity[]
}

/**
 * Create an MCP server with capabilities for resources (to list/read alerts),
 * tools (to fetch specific alerts), and prompts (to summarise alerts).
 */
const server = new Server(
  {
    name: "TfNSW Realtime Alerts MCP Server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
)

/**
 * Fetch alerts using the TfNSW API
 * @param mode The transport mode to fetch alerts for
 * @returns The alert data
 */
const fetchAlerts = async (mode: string): Promise<AlertResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/${mode}?format=json`, {
      headers: {
        "Authorization": `apikey ${API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${mode} alerts: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as AlertResponse
    return data
  } catch (error) {
    console.error(`Error fetching ${mode} alerts:`, error)
    throw error
  }
}

/**
 * Format alerts into human-readable text
 * @param data The alert data from the API
 * @returns Formatted alert text
 */
const formatAlerts = (data: AlertResponse): string => {
  if (!data || !data.entity || !Array.isArray(data.entity)) {
    return "No alerts found or invalid data format."
  }

  if (data.entity.length === 0) {
    return "No current service alerts."
  }

  return data.entity
    .filter(entity => entity.alert)
    .map(entity => {
      const alert = entity.alert

      // Get header text
      const header = alert.headerText?.translation?.[0]?.text || "Unknown Alert"

      // Get description
      const description = alert.descriptionText?.translation?.[0]?.text || "No details available"

      // Get affected routes/stops if available
      let affectedServices = ""
      if (alert.informedEntity && alert.informedEntity.length > 0) {
        const routes = alert.informedEntity
          .filter(entity => entity.routeId)
          .map(entity => entity.routeId)
          .filter((value, index, self) => value && self.indexOf(value) === index)

        const stops = alert.informedEntity
          .filter(entity => entity.stopId)
          .map(entity => entity.stopId)
          .filter((value, index, self) => value && self.indexOf(value) === index)

        const agencies = alert.informedEntity
          .filter(entity => entity.agencyId)
          .map(entity => entity.agencyId)
          .filter((value, index, self) => value && self.indexOf(value) === index)

        if (routes && routes.length > 0) {
          affectedServices += `\nAffected Routes: ${routes.join(", ")}`
        }

        if (stops && stops.length > 0) {
          affectedServices += `\nAffected Stops: ${stops.join(", ")}`
        }

        if (agencies && agencies.length > 0) {
          affectedServices += `\nAffected Agencies: ${agencies.join(", ")}`
        }
      }

      // Get time period if available
      let timePeriod = ""
      if (alert.activePeriod && alert.activePeriod.length > 0) {
        alert.activePeriod.forEach((period, index) => {
          if (period.start) {
            const startDate = new Date(parseInt(period.start) * 1000)
            timePeriod += `\nPeriod ${index + 1} Start: ${startDate.toLocaleString()}`
          }
          if (period.end) {
            const endDate = new Date(parseInt(period.end) * 1000)
            timePeriod += `\nPeriod ${index + 1} End: ${endDate.toLocaleString()}`
          }
        })
      }

      // Get cause and effect if available
      const cause = alert.cause ? `\nCause: ${alert.cause}` : ""
      const effect = alert.effect ? `\nEffect: ${alert.effect}` : ""

      // Get URL if available
      const url = alert.url?.translation?.[0]?.text ? `\nMore info: ${alert.url.translation[0].text}` : ""

      return `
=== ${header} ===
${description}${affectedServices}${timePeriod}${cause}${effect}${url}
-------------------------------------------`
    })
    .join("\n")
}

/**
 * Handler for listing available transport modes as resources.
 * Each mode is exposed as a resource with:
 * - A nsw-transport:// URI scheme
 * - Plain text MIME type
 * - Human readable name and description
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: TRANSPORT_MODES.map(mode => ({
    uri: `nsw-transport://${mode.id}`,
    mimeType: "text/plain",
    name: `${mode.name} Alerts`,
    description: mode.description
  }))
}))

/**
 * Handler for reading the contents of a specific transport mode's alerts.
 * Takes a nsw-transport:// URI and returns the alerts as plain text.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    // Extract mode from URI
    const match = request.params.uri.match(/^nsw-transport:\/\/(.+)$/)

    if (!match) {
      throw new Error(`Invalid resource URI: ${request.params.uri}`)
    }

    const modeId = match[1]

    // Validate the mode
    const modeInfo = TRANSPORT_MODES.find(mode => mode.id === modeId)
    if (!modeInfo) {
      throw new Error(`Invalid transport mode: ${modeId}. Valid modes are: ${TRANSPORT_MODES.map(m => m.id).join(", ")}`)
    }

    // Fetch and format alerts
    const data = await fetchAlerts(modeId)
    const formattedAlerts = formatAlerts(data)

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "text/plain",
        text: `# Service Alerts for ${modeInfo.name}\n\n${formattedAlerts}`
      }]
    }
  } catch (error) {
    console.error(`Error reading resource ${request.params.uri}:`, error)
    throw error
  }
})

/**
 * Handler that lists available tools.
 * Exposes a single "get-transport-alerts" tool that fetches alerts for a specific mode.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get-transport-alerts",
      description: "Get Transport for NSW service alerts for a specific mode of transport",
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: TRANSPORT_MODES.map(mode => mode.id),
            description: "Transport mode to get alerts for"
          }
        },
        required: ["mode"]
      }
    },
  ]
}))

/**
 * Handler for the get-transport-alerts tool.
 * Fetches alerts for the specified transport mode and returns them formatted.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (name === "get-transport-alerts") {
    try {
      const { mode } = args as { mode: string }

      // Validate the mode
      const modeInfo = TRANSPORT_MODES.find(m => m.id === mode)
      if (!modeInfo) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Invalid transport mode: ${mode}. Valid modes are: ${TRANSPORT_MODES.map(m => m.id).join(", ")}`
          }]
        }
      }

      // Fetch and format alerts
      const data = await fetchAlerts(mode)
      const formattedAlerts = formatAlerts(data)

      return {
        content: [{
          type: "text",
          text: `# Service Alerts for ${modeInfo.name}\n\n${formattedAlerts}`
        }]
      }
    } catch (error) {
      console.error("Error executing get-transport-alerts:", error)
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Failed to fetch alerts: ${error instanceof Error ? error.message : String(error)}`
        }]
      }
    }
  }

  return {
    isError: true,
    content: [{
      type: "text",
      text: `Unknown tool: ${name}`
    }]
  }
})

/**
 * Handler that lists available prompts.
 * Exposes a single "transport-disruption-summary" prompt that summarises all alerts.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "transport-disruption-summary",
      description: "Get a summary of all current transport disruptions",
    }
  ]
}))

/**
 * Handler for the transport-disruption-summary prompt.
 * Returns a prompt that requests summarisation of all transport alerts.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "transport-disruption-summary") {
    throw new Error("Unknown prompt")
  }

  try {
    // Fetch alerts for all transport modes
    const allAlerts = await fetchAlerts("all")
    const formattedAlerts = formatAlerts(allAlerts)

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please summarise the following NSW Transport alerts and advise on major disruptions:"
          }
        },
        {
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: "nsw-transport://all",
              mimeType: "text/plain",
              text: formattedAlerts
            }
          }
        },
        {
          role: "user",
          content: {
            type: "text",
            text: "Provide a concise summary of major disruptions affecting NSW transport services. Highlight the most significant delays or service changes, affected areas, and suggest alternative transport options where applicable."
          }
        }
      ]
    }
  } catch (error) {
    console.error("Error preparing transport-disruption-summary prompt:", error)
    throw error
  }
})

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
const main = async () => {
  try {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error("NSW Transport Alerts MCP Server is running")
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Server error:", error)
  process.exit(1)
})