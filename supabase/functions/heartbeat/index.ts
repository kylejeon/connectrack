import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple heartbeat query to keep DB active
    const { error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Heartbeat query failed:", error.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const timestamp = new Date().toISOString();
    console.log(`Heartbeat OK at ${timestamp}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Heartbeat OK - DB is active",
        timestamp,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: String(err),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
