-- Add Row Level Security policies for texts table
-- This allows authenticated users to insert and read texts

-- Enable RLS on texts table (if not already enabled)
ALTER TABLE texts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to insert texts
CREATE POLICY "Users can insert texts"
ON texts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow authenticated users to read all texts
CREATE POLICY "Users can read all texts"
ON texts
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow users to update their own uploaded texts
CREATE POLICY "Users can update own texts"
ON texts
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Policy 4: Allow admins to update any texts
CREATE POLICY "Admins can update any texts"
ON texts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 5: Allow admins to delete texts
CREATE POLICY "Admins can delete texts"
ON texts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Success message
SELECT 'RLS policies for texts table created successfully!' as message;

