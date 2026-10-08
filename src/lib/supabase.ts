import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imypeukyfdqngqfsmrzm.supabase.co';
const supabaseKey = 'sb_publishable_gAjjmPTAnr8OYvwH8urthg_Vkk5b-Js';

export const supabase = createClient(supabaseUrl, supabaseKey);
