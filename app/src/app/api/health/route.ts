import { NextResponse } from "next/server";

/**
 * Health check endpoint for uptime monitoring services
 * 
 * This endpoint returns a simple 200 OK response to indicate the application is running.
 * Uptime monitoring services (UptimeRobot, Pingdom, etc.) can ping this endpoint
 * to verify the application is accessible.
 * 
 * @route GET /api/health
 */
export async function GET() {
  try {
    // Basic health check - just verify the API is responding
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "convergence-library",
      },
      { status: 200 }
    );
  } catch (error) {
    // Even if there's an error, we want to return something
    // so monitoring services know the endpoint exists
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        service: "convergence-library",
      },
      { status: 500 }
    );
  }
}

