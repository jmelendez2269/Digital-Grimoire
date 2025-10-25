"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AvatarCropModal from "@/components/AvatarCropModal";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setUsername(session.user.user_metadata?.username || "");
        setDisplayName(session.user.user_metadata?.display_name || "");
        setBio(session.user.user_metadata?.bio || "");
        setAvatarUrl(session.user.user_metadata?.avatar_url || "");
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper: Compress image before upload
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Resize if too large (max 1024px)
          const maxSize = 1024;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error("Compression failed"));
              }
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  };

  // Helper: Extract old avatar filename from URL
  const getAvatarFileName = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      return pathParts[pathParts.length - 1];
    } catch {
      return null;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) {
      return;
    }

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Convert to data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    e.target.value = "";
  };

  const uploadCroppedAvatar = async (croppedBlob: Blob) => {
    if (!user) return;

    setCropModalOpen(false);
    setUploading(true);

    try {
      const supabase = createClient();

      // Convert blob to File
      let file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });

      // Compress image
      file = await compressImage(file);
      
      // Delete old avatar if exists
      if (avatarUrl) {
        const oldFileName = getAvatarFileName(avatarUrl);
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
          console.log("Deleted old avatar:", oldFileName);
        }
      }

      // Create unique filename
      const fileExt = "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
        },
      });

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated successfully!");
    } catch (err: any) {
      toast.error("Error uploading avatar: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      setImageToCrop(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    setUploading(true);

    try {
      const supabase = createClient();

      // Delete from storage
      const fileName = getAvatarFileName(avatarUrl);
      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([fileName]);

        if (deleteError) {
          console.error("Delete error:", deleteError);
          // Continue anyway - maybe file doesn't exist
        }
      }

      // Remove from user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: null,
        },
      });

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl("");
      toast.success("Avatar removed successfully!");
    } catch (err: any) {
      toast.error("Error removing avatar: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          username,
          display_name: displayName,
          bio,
          avatar_url: avatarUrl,
        },
      });

      if (error) {
        toast.error("Error updating profile: " + error.message);
      } else {
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-amber-100">Your Profile</h1>
            <p className="mt-2 text-zinc-400">
              Manage your personal information and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
                {/* Avatar */}
                <div className="mb-6 flex flex-col items-center">
                  <div className="relative mb-4">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-32 w-32 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-4xl font-bold text-zinc-950">
                        {username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    
                    {/* Upload Button Overlay */}
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-amber-500 text-zinc-950 transition-colors hover:bg-amber-400"
                    >
                      {uploading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Click camera icon to upload
                  </p>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={uploading}
                      className="mt-3 text-xs text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                    >
                      Remove Avatar
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-100">Neophyte</div>
                    <div className="text-sm text-zinc-500">Current Rank</div>
                  </div>

                  <div className="flex justify-around border-t border-zinc-800 pt-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-100">0</div>
                      <div className="text-xs text-zinc-500">Texts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-100">0</div>
                      <div className="text-xs text-zinc-500">Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-100">0</div>
                      <div className="text-xs text-zinc-500">Coins</div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-6 border-t border-zinc-800 pt-6">
                  <h3 className="mb-3 text-sm font-semibold text-amber-100">Badges</h3>
                  <div className="text-center text-sm text-zinc-500">
                    No badges earned yet
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
                <h2 className="mb-6 text-2xl font-bold text-amber-100">
                  Personal Information
                </h2>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-amber-100">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-500 opacity-60"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-amber-100">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="mystic_scholar"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-amber-100">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="The Mystic Scholar"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-amber-100">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="Share a bit about your esoteric journey..."
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Crop Modal */}
      {cropModalOpen && imageToCrop && (
        <AvatarCropModal
          imageSrc={imageToCrop}
          onComplete={uploadCroppedAvatar}
          onCancel={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
        />
      )}
    </div>
  );
}

