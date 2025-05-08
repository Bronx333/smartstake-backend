const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co'; // from Supabase dashboard
const supabaseKey = 'your-anon-or-service-key'; // from API settings

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;