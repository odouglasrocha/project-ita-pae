-- SQL Script to fix RLS for inspection_results table
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'inspection_results';

-- If rowsecurity = true, run the commands below:

-- 2. Create policy for SELECT (read) access for anon role
CREATE POLICY "Allow anonymous read" ON inspection_results
FOR SELECT USING (true);

-- 3. Create policy for INSERT (write) access for anon role  
CREATE POLICY "Allow anonymous insert" ON inspection_results
FOR INSERT WITH CHECK (true);

-- 4. Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'inspection_results'
ORDER BY policyname;

-- 5. Do the same for inspection_result_fields
CREATE POLICY "Allow anonymous read" ON inspection_result_fields
FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON inspection_result_fields
FOR INSERT WITH CHECK (true);
