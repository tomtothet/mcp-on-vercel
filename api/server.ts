import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler((server) => {
  server.tool(
    "roll_dice",
    "Rolls an N-sided die",
    { sides: z.number().int().min(2) },
    async ({ sides }) => {
      const value = 1 + Math.floor(Math.random() * sides);
      return {
        content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
      };
    },
  );
  server.tool(
    "get_weather",
    "Get the current weather at a location",
    {
      latitude: z.number(),
      longitude: z.number(),
      city: z.string(),
    },
    async ({ latitude, longitude, city }) => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relativehumidity_2m&timezone=auto`,
      );
      const weatherData = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `🌤️ Weather in ${city}: ${weatherData.current.temperature_2m}°C, Humidity: ${weatherData.current.relativehumidity_2m}%`,
          },
        ],
      };
    },
  );
});

// API Key Authentication Middleware
const API_KEY = process.env.API_KEY;

function withAuth(handlerFn: typeof handler) {
  return async (request: Request) => {
    // If no API_KEY is set, allow all requests (backward compatibility)
    if (!API_KEY) {
      return handlerFn(request);
    }

    const authHeader = request.headers.get("authorization");

    // Support both "Bearer TOKEN" and "TOKEN" formats
    const providedKey = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (providedKey !== API_KEY) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid or missing API key" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return handlerFn(request);
  };
}

export const GET = withAuth(handler);
export const POST = withAuth(handler);
export const DELETE = withAuth(handler);
