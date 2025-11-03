# Admin Access Checking Rules

**Status:** ✅ Active  
**Last Updated:** 2025  
**Critical:** ⚠️ **DO NOT VIOLATE THESE RULES**

---

## 🎯 **Purpose**

This document establishes **mandatory rules** for checking admin status in the Digital Grimoire application. These rules prevent the recurring issue where admin buttons disappear or become unreliable.

---

## ⚠️ **CRITICAL RULES - NEVER VIOLATE**

### **Rule 1: Single Source of Truth**

✅ **ALWAYS:** Use the `isAdmin` value from `AuthContext` as the **ONLY** source of truth for admin status in UI components.

❌ **NEVER:** 
- Create duplicate admin checks in components
- Query the database directly from client components for admin status
- Use local state or props to track admin status independently

**Implementation:**
```typescript
// ✅ CORRECT
import { useAuth } from "@/contexts/AuthContext";
const { isAdmin } = useAuth();

// ❌ WRONG
const [localIsAdmin, setIsAdmin] = useState(false);
useEffect(() => {
  // Don't duplicate admin checking logic!
}, []);
```

---

### **Rule 2: Server-Side Admin Status Checking**

✅ **ALWAYS:** Check admin status via the **server-side API route** `/api/auth/admin-status`.

❌ **NEVER:**
- Query the `users` table directly from client-side code
- Use client-side Supabase queries for admin status
- Implement timeout-based race conditions

**Why:** Server-side routes bypass RLS (Row Level Security) policies that can cause unreliable checks on the client side.

**Implementation:**
```typescript
// ✅ CORRECT - Use API route (in AuthContext)
const checkAdminViaAPI = async (userId: string): Promise<boolean> => {
  const response = await fetch('/api/auth/admin-status', {
    credentials: 'include',
  });
  const data = await response.json();
  return data.isAdmin === true;
};

// ❌ WRONG - Direct client query
const { data: profile } = await supabase
  .from('users')
  .select('role')
  .eq('id', userId)
  .single();
```

---

### **Rule 3: No Duplicate Admin Checks**

✅ **ALWAYS:** Let `AuthContext` handle all admin status checking.

❌ **NEVER:**
- Add admin checking logic to `Header.tsx` or other UI components
- Create multiple places that check admin status
- Override or second-guess the `AuthContext` admin status

**Current Implementation:**
- ✅ `AuthContext.tsx` - Checks admin status via API
- ✅ `Header.tsx` - Uses `isAdmin` from `AuthContext` (no local checking)
- ✅ `/api/auth/admin-status/route.ts` - Server-side admin check endpoint

---

### **Rule 4: API Route Must Remain Simple**

✅ **ALWAYS:** Keep `/api/auth/admin-status/route.ts` focused solely on checking admin status.

❌ **NEVER:**
- Add complex business logic to this endpoint
- Add caching or other optimizations that could hide issues
- Make it dependent on other services

**The route should:**
1. Get authenticated user
2. Query `users` table for `role`
3. Return `{ isAdmin: boolean, role: string }`

---

## 📋 **When Adding New Admin Features**

### Checklist:

- [ ] Does it use `isAdmin` from `useAuth()` hook?
- [ ] Is it NOT creating a new admin check?
- [ ] Does it follow the single source of truth principle?
- [ ] Is the admin check happening server-side if needed?

---

## 🐛 **If Admin Buttons Disappear**

### Diagnostic Steps:

1. **Check Browser Console:**
   - Look for `[AuthContext]` logs
   - Verify API call to `/api/auth/admin-status` is successful
   - Check for any errors in the network tab

2. **Verify Database:**
   ```sql
   SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
   ```
   - Ensure `role = 'admin'`

3. **Verify API Route:**
   - Test `/api/auth/admin-status` directly
   - Should return `{ "isAdmin": true }` for admin users

4. **Check AuthContext:**
   - Ensure `checkAdminViaAPI` function exists and is called
   - Ensure `isAdmin` state is being set correctly

---

## 🔍 **Code Review Checklist**

When reviewing code that checks admin status:

- [ ] ✅ Uses `useAuth()` hook
- [ ] ✅ No direct database queries in components
- [ ] ✅ No duplicate admin checking logic
- [ ] ✅ Server-side checks use `/api/auth/admin-status`
- [ ] ✅ No timeout-based race conditions
- [ ] ✅ No local state tracking admin status

---

## 📝 **Historical Context**

### Problem That Occurred:
Admin buttons in the Header dropdown menu were disappearing intermittently. The root causes were:

1. **Duplicate Admin Checks:** Both `AuthContext` and `Header` component were checking admin status independently
2. **RLS Policy Issues:** Client-side queries were affected by Row Level Security policies
3. **Race Conditions:** Timeout-based checks were causing unreliable results
4. **Complex Fallback Logic:** Too many fallback paths led to inconsistent state

### Solution Implemented:
- Created `/api/auth/admin-status` server-side route
- Updated `AuthContext` to use API route instead of direct queries
- Removed all duplicate admin checking from `Header` component
- Simplified to single source of truth (`AuthContext.isAdmin`)

### Files Changed:
- ✅ `app/src/app/api/auth/admin-status/route.ts` - New server-side endpoint
- ✅ `app/src/contexts/AuthContext.tsx` - Uses API route for admin check
- ✅ `app/src/components/Header.tsx` - Simplified to use `isAdmin` from context only

---

## ⚠️ **Remember**

**If you find yourself:**
- Creating a new admin check function → **STOP!** Use `AuthContext.isAdmin`
- Querying the users table from a component → **STOP!** Use the API route
- Adding timeout or retry logic for admin checks → **STOP!** The API route handles this

**The admin status check should ALWAYS be:**
```typescript
const { isAdmin } = useAuth();
```

That's it. Nothing more, nothing less.

---

## 🔗 **Related Documentation**

- `docs/guides/SUPABASE_FIX_GUIDE.md` - User profile synchronization
- `docs/debugging summaries/DEBUG_SESSION_SUMMARY.md` - Historical debugging notes
- `FIX_ADMIN_ACCESS.sql` - SQL helper for diagnosing admin access issues

---

**Last Verified:** When admin buttons are working correctly, the debug line in Header dropdown should show `isAdmin=true` for admin users.

