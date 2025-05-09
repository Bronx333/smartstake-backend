const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function logEvent(type, payload = {}) {
  const timestamp = new Date().toISOString();

  if (type === "bet_click") {
    const { match, suggestion, odds, kickoff } = payload;

    const { data: existing, error: fetchError } = await supabase
      .from("bet_clicks")
      .select("click_count")
      .eq("match", match)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Supabase fetch error:", fetchError.message);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("bet_clicks")
        .update({
          click_count: existing.click_count + 1,
          last_clicked_at: timestamp,
        })
        .eq("match", match);

      if (updateError) {
        console.error("Supabase update error:", updateError.message);
      }
    } else {
      const { error: insertError } = await supabase.from("bet_clicks").insert([
        {
          match,
          suggestion,
          odds,
          kickoff,
          click_count: 1,
          last_clicked_at: timestamp,
        },
      ]);

      if (insertError) {
        console.error("Supabase insert error:", insertError.message);
      }
    }
  } else {
    const { error } = await supabase.from('logs').insert([{ type, payload, timestamp }]);

    if (error) {
      console.error('Supabase logging failed:', error.message);
    }
  }
}

module.exports = { logEvent };
