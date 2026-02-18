"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/export-data");

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parallax-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Data export started! Check your downloads folder.");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data. Please contact support.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/delete-account", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete account");
      }

      toast.success("Account deleted successfully. Redirecting...");

      // Redirect to home after a short delay
      setTimeout(() => {
        router.push("/");
        // Clear any local storage
        localStorage.clear();
        // Reload to clear auth state
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-zinc-400">Please log in to access privacy settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold text-amber-100">Privacy Settings</h1>

        <div className="space-y-6">
          {/* Data Export */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-2xl font-semibold text-amber-200">Export Your Data</h2>
            <p className="mb-4 text-zinc-300">
              Download a copy of your personal data, including annotations, collections, and account information.
              This is a JSON file containing all your data in a machine-readable format (GDPR compliant).
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export My Data"}
            </button>
          </section>

          {/* Cookie Preferences */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-2xl font-semibold text-amber-200">Cookie Preferences</h2>
            <p className="mb-4 text-zinc-300">
              Manage your cookie preferences. Essential cookies are required for the service to function.
            </p>
            <Link
              href="/cookies"
              className="inline-block rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Manage Cookies
            </Link>
          </section>

          {/* Account Deletion */}
          <section className="rounded-lg border border-red-800/50 bg-red-900/10 p-6">
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-400" />
              <div>
                <h2 className="mb-2 text-2xl font-semibold text-red-200">Delete Account</h2>
                <p className="mb-4 text-zinc-300">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <ul className="mb-4 list-disc space-y-1 pl-6 text-sm text-zinc-400">
                  <li>All your uploaded documents will be deleted</li>
                  <li>All annotations and highlights will be removed</li>
                  <li>All collections and bookmarks will be deleted</li>
                  <li>All journal entries will be removed</li>
                  <li>Your account information will be permanently removed</li>
                </ul>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-md border border-red-600 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4" />
                Delete My Account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-red-300">
                  Are you absolutely sure? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Privacy Policy Link */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-2xl font-semibold text-amber-200">Privacy Policy</h2>
            <p className="mb-4 text-zinc-300">
              Read our complete privacy policy to understand how we collect, use, and protect your data.
            </p>
            <Link
              href="/privacy"
              className="inline-block rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              View Privacy Policy
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

