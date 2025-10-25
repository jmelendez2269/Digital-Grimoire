# Testing Guide - Sprint 3 Features

## 🚀 Quick Start

To test the document upload and library features we just built, follow these steps:

### 1. Start the Development Server

```bash
cd "Digital-Grimoire/app"
pnpm dev
```

Open http://localhost:3000 in your browser.

### 2. Create an Admin User

You need an admin account to upload documents. There are two ways:

#### Option A: Manually in Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Table Editor** → **users**
3. Find your user account
4. Click **Edit** on your row
5. Change `role` from `user` to `admin`
6. Save

#### Option B: Using Supabase SQL Editor

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### 3. Access Admin Upload

1. **Log in** to your account
2. Click your **profile dropdown** in the header
3. You should now see **"🔐 Admin Upload"** (amber colored)
4. Click it to go to `/admin/upload`

---

## 🧪 Testing the Upload Flow

### Test 1: Valid File Upload

1. **Prepare a test PDF** (any PDF under 100MB)
2. **Drag it onto the upload zone** or click to browse
3. **Verify:**
   - ✅ File appears in queue with "pending" status
   - ✅ File size is displayed
   - ✅ "Upload 1 file" button appears

4. **Click "Upload 1 file"**
5. **Watch the progress:**
   - ✅ Status changes to "uploading"
   - ✅ Progress bar animates
   - ✅ Progress goes from 10% → 30% → 70% → 85% → 100%
   - ✅ Status changes to "success" with green checkmark

### Test 2: Invalid File Type

1. **Try to upload a .txt or .jpg file**
2. **Verify:**
   - ✅ File appears with "error" status immediately
   - ✅ Red error message: "Only PDF and DOCX files are allowed"
   - ✅ Cannot be uploaded

### Test 3: File Too Large

1. **Try to upload a file > 100MB** (you may need to create one)
2. **Verify:**
   - ✅ File appears with "error" status
   - ✅ Red error message: "File size must be less than 100MB"

### Test 4: Multiple Files

1. **Drag 3-5 PDFs at once**
2. **Verify:**
   - ✅ All files appear in queue
   - ✅ Counter shows correct number: "Upload Queue (5)"
   - ✅ Button shows: "Upload 5 files"

3. **Click upload**
4. **Verify:**
   - ✅ Files upload sequentially
   - ✅ Each shows individual progress
   - ✅ All end with success checkmarks

### Test 5: Remove from Queue

1. **Add a file to queue**
2. **Click the X icon** before uploading
3. **Verify:**
   - ✅ File is removed from queue
   - ✅ Counter updates

---

## 📚 Testing the Library

### Test 1: View Library

1. **Navigate to** http://localhost:3000/library
2. **Verify:**
   - ✅ Beautiful library page loads
   - ✅ Uploaded documents appear in grid
   - ✅ Each shows: title, file size, upload date, status badge

### Test 2: Search

1. **Type in the search bar** (part of a document title)
2. **Verify:**
   - ✅ Results filter in real-time
   - ✅ "Showing X of Y texts" updates
   - ✅ Only matching documents show

### Test 3: Filter by Type

1. **Click the type dropdown**
2. **Select a specific type**
3. **Verify:**
   - ✅ Only documents of that type show
   - ✅ Counter updates
   - ✅ Can reset by selecting "All Types"

### Test 4: Status Badges

**Check that status badges have correct colors:**
- 🔵 **processing** - Blue badge (just uploaded, OCR not done)
- 🟢 **ready** - Green badge (OCR complete, ready to view)
- 🔴 **error** - Red badge (something went wrong)

---

## 🔐 Testing Admin Access Control

### Test 1: Non-Admin User

1. **Create a second test account** (regular user)
2. **Log in with it**
3. **Open profile dropdown**
4. **Verify:**
   - ✅ NO "Admin Upload" link appears
   - ✅ Only: Profile, Dashboard, Settings, Sign Out

### Test 2: Direct URL Access

1. **As a non-admin**, try to visit `/admin/upload` directly
2. **Verify:**
   - ✅ You can access the page (UI loads)
   - ✅ BUT clicking "Upload" will fail with 403 Forbidden
   - ✅ (This is correct - server-side authorization)

> **Note:** In production, you'd also add a client-side redirect for better UX.

---

## 🧠 Testing Metadata Extraction

### Prerequisites

You need to add `ANTHROPIC_API_KEY` to your `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get a key from: https://console.anthropic.com/

### Test 1: With API Key

1. **Upload a document** with a descriptive filename
   - Example: `The-Kybalion-Three-Initiates-1908.pdf`

2. **Check in Supabase** (Table Editor → texts)
3. **Verify:**
   - ✅ `title` is extracted (not just filename)
   - ✅ `author` is populated
   - ✅ `year` is extracted
   - ✅ `type` is assigned (e.g., "book_esoteric")
   - ✅ `domain` is set (e.g., "hermeticism")
   - ✅ `tags` array has keywords

### Test 2: Without API Key

1. **Remove or comment out** `ANTHROPIC_API_KEY`
2. **Upload a document**
3. **Verify:**
   - ✅ Upload still works
   - ✅ Title is filename (fallback)
   - ✅ Other fields are null
   - ✅ No errors in console
   - ✅ Document appears in library

> This tests graceful degradation.

---

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized" error when uploading

**Solution:** Make sure you're logged in and have admin role.

```sql
-- Check your role
SELECT email, role FROM users WHERE email = 'your-email@example.com';

-- If not admin, update:
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Issue: "Failed to get upload URL"

**Possible causes:**
1. AWS credentials not in `.env.local`
2. S3 bucket doesn't exist
3. IAM permissions insufficient

**Check:**
```bash
# In .env.local, verify these exist:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket-name
```

### Issue: Files upload but never change from "processing"

**This is expected!** The Lambda functions need to be deployed to AWS to process files.

**For local testing:**
- Files will remain in "processing" status
- You can manually update in Supabase:
  ```sql
  UPDATE texts SET status = 'ready' WHERE id = 'your-text-id';
  ```

### Issue: Admin link not showing

**Check:**
1. Refresh the page after making yourself admin
2. Clear cache and reload
3. Check browser console for errors
4. Verify role in database

---

## 📊 What to Check in Supabase

After uploading files, check these tables:

### `texts` table
**Should have:**
- Row for each uploaded file
- `s3_key` populated
- `mime_type` populated
- `file_size` populated
- `uploaded_by` = your user ID
- `status` = "processing"
- `title` = extracted or filename

### `storage.objects` table
**Should have:**
- File in `uploads/{user-id}/` path
- Correct content type
- Correct size

---

## ✅ Success Checklist

After testing, you should be able to:

- [x] Log in as admin
- [x] See "Admin Upload" in dropdown
- [x] Access `/admin/upload` page
- [x] Drag and drop files
- [x] See validation errors for invalid files
- [x] Upload single file successfully
- [x] Upload multiple files at once
- [x] See progress bars animate
- [x] See success checkmarks
- [x] Navigate to `/library`
- [x] See uploaded documents in grid
- [x] Search documents by title
- [x] Filter by document type
- [x] See correct status badges
- [x] (Optional) See extracted metadata if API key configured

---

## 🔑 Testing Password Reset Flow

### Test 1: Request Password Reset

1. **Navigate to** http://localhost:3000/login
2. **Click** "Forgot your password?" link
3. **Verify:**
   - ✅ Redirected to `/forgot-password`
   - ✅ Page loads with email input form
   - ✅ Consistent dark theme styling

4. **Enter an email** (use a real email you can access)
5. **Click** "Send Reset Link"
6. **Verify:**
   - ✅ Loading state shows "Sending..."
   - ✅ Success message appears with email icon
   - ✅ Shows your entered email
   - ✅ Helpful tips displayed

### Test 2: Receive Reset Email

1. **Check your email inbox** (may take 1-2 minutes)
2. **Verify:**
   - ✅ Email received from Supabase
   - ✅ Email has correct subject line
   - ✅ Reset link is present and clickable
   - ✅ Email template is formatted properly

> **Note:** If using Supabase's default email service, you're limited to 3 emails per hour during development.

### Test 3: Click Reset Link

1. **Click the reset link** in the email
2. **Verify:**
   - ✅ Redirected to `/reset-password`
   - ✅ Page shows "Create New Password" heading
   - ✅ Token is validated (no error message)
   - ✅ Password input fields visible

### Test 4: Reset Password

1. **Enter a new password** (at least 8 characters)
2. **Confirm the password** (enter same password)
3. **Verify real-time feedback:**
   - ✅ "At least 8 characters" shows green checkmark when met
   - ✅ "Passwords match" shows green checkmark when they match
   - ✅ Submit button is enabled

4. **Click** "Update Password"
5. **Verify:**
   - ✅ Loading state shows "Updating password..."
   - ✅ Success screen appears with green checkmark
   - ✅ Message: "Password Updated!"
   - ✅ Auto-redirects to login after 3 seconds

### Test 5: Login with New Password

1. **Enter your email** and **new password**
2. **Click** "Sign In"
3. **Verify:**
   - ✅ Login successful
   - ✅ Redirected to `/dashboard`
   - ✅ Old password no longer works (test this too!)

### Test 6: Invalid Scenarios

#### Expired/Invalid Token
1. **Request a password reset** but wait for the link to expire (default: 1 hour)
2. **Or use the same link twice**
3. **Verify:**
   - ✅ Shows error: "Invalid or expired reset link"
   - ✅ Red warning icon displayed
   - ✅ Button to "Request New Reset Link" appears

#### Password Mismatch
1. **Enter different passwords** in the two fields
2. **Try to submit**
3. **Verify:**
   - ✅ Error message: "Passwords do not match"
   - ✅ Form doesn't submit

#### Password Too Short
1. **Enter a password** with less than 8 characters
2. **Try to submit**
3. **Verify:**
   - ✅ Error message: "Password must be at least 8 characters"
   - ✅ Requirements indicator shows it's not met

#### Non-existent Email
1. **Enter an email** that doesn't exist in the system
2. **Request reset**
3. **Verify:**
   - ✅ Same success message shown (security by design)
   - ✅ No email actually sent
   - ✅ Doesn't reveal if email exists

### Test 7: UI/UX Elements

**Check all pages have:**
- ✅ Consistent amber/zinc color scheme
- ✅ Mystical circular logo
- ✅ Responsive design (test on mobile)
- ✅ Proper focus states on inputs
- ✅ Clear error/success messaging
- ✅ "Back to home" links
- ✅ Loading states during async operations

---

## 🔮 Next Steps

Once testing is complete:

1. **Deploy Lambda functions** to AWS (see `lambda/README.md`)
2. **Configure S3 notifications** to trigger Lambda
3. **Set up SNS topic** for Textract completion
4. **Test full OCR pipeline** end-to-end
5. **Configure Supabase email settings** for production (see `docs/SUPABASE_PASSWORD_RESET_SETUP.md`)
6. **Start Sprint 4** - Document viewer & advanced search!

---

## 🆘 Need Help?

**Check these resources:**
- Sprint 3 Summary: `sprint_summaries/SPRINT_3_COMPLETE.md`
- Lambda Deployment: `lambda/README.md`
- Master Plan: `docs/planning/MASTER_DEVELOPMENT_PLAN.md`
- Technical Docs: `docs/source/Complete_Technical_Implementation_Plan.md`

**Common Questions:**

**Q: Why isn't OCR working?**  
A: Lambda functions need to be deployed to AWS. Local testing only covers upload.

**Q: Can I test without AWS?**  
A: You need S3 for uploads, but Lambda/Textract can wait until you're ready to deploy.

**Q: How do I get admin access?**  
A: Update your role in the `users` table via Supabase dashboard or SQL.

---

**Happy Testing! 🚀**

