/**
 * Temporary API route to add details column to course_texts table
 * 
 * NOTE: Supabase JS client doesn't support ALTER TABLE directly.
 * This route provides instructions for alternative methods.
 * 
 * RECOMMENDED: Use Supabase Dashboard Table Editor UI instead
 * (See migrations/029_ALTERNATIVE_METHODS.md for full instructions)
 * 
 * DELETE THIS FILE after the column is successfully added
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'This endpoint provides instructions for adding the details column',
    instructions: [
      'Method 1 (RECOMMENDED): Use Supabase Dashboard Table Editor',
      '1. Go to Supabase Dashboard → Table Editor',
      '2. Find course_texts table',
      '3. Click "Add Column"',
      '4. Name: details, Type: text, Nullable: Yes',
      '5. Click Save',
      '',
      'Method 2: Use Supabase CLI or psql with direct connection',
      'See migrations/029_ALTERNATIVE_METHODS.md for full details'
    ],
    note: 'Supabase JS client cannot execute ALTER TABLE statements. Use the Dashboard UI or direct database connection instead.'
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Direct ALTER TABLE not supported via API',
      recommendation: 'Use Supabase Dashboard Table Editor UI instead',
      steps: [
        '1. Go to Supabase Dashboard',
        '2. Navigate to Table Editor',
        '3. Find course_texts table',
        '4. Click "Add Column" button',
        '5. Set name: details, type: text, nullable: yes',
        '6. Save'
      ],
      alternative: 'See migrations/029_ALTERNATIVE_METHODS.md for other methods'
    },
    { status: 400 }
  );
}
