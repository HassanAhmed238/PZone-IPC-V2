const { createClient } = require('@supabase/supabase-js');

// Use service key to have max privileges
const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const ultimateFix = `
-- 1. فتح صلاحية إنشاء عقود جديدة لجميع المستخدمين المسجلين في النظام
DROP POLICY IF EXISTS "Cost control and above can insert contracts" ON public.contracts;
CREATE POLICY "Authenticated users can insert contracts"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. فتح صلاحية التعديل للحفظ التلقائي
DROP POLICY IF EXISTS "Cost control and above can update contracts" ON public.contracts;
CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING (true);

-- 3. تأكيد وجود مجلد العقود وتجهيزه برمجياً
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', false) 
ON CONFLICT DO NOTHING;

-- 4. إعطاء تصريح كامل لملفات הPDF لكي تُرفع بدون مشاكل
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Authenticated users can view contracts" ON storage.objects;
CREATE POLICY "Authenticated users can view contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Authenticated users can update contracts" ON storage.objects;
CREATE POLICY "Authenticated users can update contracts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts');
  `;

  console.log("Applying ultimate RLS fix via RPC...");
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: ultimateFix });
  console.log("Result:", data, error);
}

run();
