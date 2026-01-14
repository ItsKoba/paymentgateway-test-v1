import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-id, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const KOBARU_API_BASE = "https://kobaru-api.vercel.app/api/v1";

interface CreateDepositRequest {
  amount: number;
}

interface DepositResponse {
  ref_id: string;
  amount: number;
  qr_string: string;
  qr_image: string;
  date: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiId = req.headers.get("x-api-id");
    const apiKey = req.headers.get("x-api-key");

    if (!apiId || !apiKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "API credentials required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API credentials
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, balance")
      .eq("api_id", apiId)
      .eq("api_key", apiKey)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ status: "error", message: "Invalid API credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    
    if (req.method === "POST") {
      // Create deposit
      const body: CreateDepositRequest = await req.json();
      
      if (!body.amount || body.amount <= 0) {
        return new Response(
          JSON.stringify({ status: "error", message: "Amount must be positive" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate unique ref_id for this user
      const refId = `USR_${profile.user_id.substring(0, 8)}_${Date.now()}`;

      // Call Kobaru API to create deposit
      const kobaruResponse = await fetch(`${KOBARU_API_BASE}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref_id: refId, amount: body.amount }),
      });

      if (!kobaruResponse.ok) {
        const errorData = await kobaruResponse.json();
        return new Response(
          JSON.stringify({ status: "error", message: errorData.message || "Failed to create deposit" }),
          { status: kobaruResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const depositData: DepositResponse = await kobaruResponse.json();

      // Save deposit to user_deposits table
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
      const { error: insertError } = await supabase
        .from("user_deposits")
        .insert({
          user_id: profile.user_id,
          ref_id: depositData.ref_id,
          amount: body.amount,
          final_amount: depositData.amount,
          qr_string: depositData.qr_string,
          qr_image: depositData.qr_image,
          status: "unpaid",
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ status: "error", message: "Failed to save deposit" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            ref_id: depositData.ref_id,
            amount: body.amount,
            final_amount: depositData.amount,
            qr_string: depositData.qr_string,
            qr_image: depositData.qr_image,
            expires_at: expiresAt.toISOString(),
          },
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const refId = url.searchParams.get("ref_id");

      if (refId) {
        // Check specific deposit
        const { data: deposit, error: depositError } = await supabase
          .from("user_deposits")
          .select("*")
          .eq("user_id", profile.user_id)
          .eq("ref_id", refId)
          .maybeSingle();

        if (depositError || !deposit) {
          return new Response(
            JSON.stringify({ status: "error", message: "Deposit not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If still unpaid, check with Kobaru API
        if (deposit.status === "unpaid") {
          const kobaruResponse = await fetch(
            `${KOBARU_API_BASE}/deposits?ref_id=${encodeURIComponent(refId)}`
          );

          if (kobaruResponse.ok) {
            const kobaruData = await kobaruResponse.json();

            if (kobaruData.status === "paid") {
              // Update deposit status and add balance
              await supabase
                .from("user_deposits")
                .update({ status: "paid", paid_at: new Date().toISOString() })
                .eq("id", deposit.id);

              await supabase.rpc("add_user_balance", {
                p_user_id: profile.user_id,
                p_amount: deposit.final_amount,
              });

              deposit.status = "paid";
              deposit.paid_at = new Date().toISOString();
            }
          } else if (kobaruResponse.status === 410) {
            // Deposit expired
            await supabase
              .from("user_deposits")
              .update({ status: "expired" })
              .eq("id", deposit.id);

            deposit.status = "expired";
          }
        }

        return new Response(
          JSON.stringify({ status: "success", data: deposit }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all deposits for user
      const status = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase
        .from("user_deposits")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq("status", status);
      }

      const { data: deposits, error: depositsError } = await query;

      if (depositsError) {
        return new Response(
          JSON.stringify({ status: "error", message: "Failed to fetch deposits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: "success", data: deposits }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", message: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
