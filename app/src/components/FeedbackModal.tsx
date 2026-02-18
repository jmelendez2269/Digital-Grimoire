"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = "bug" | "feature_request" | "general" | "book_request" | "other";

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [userEmail, setUserEmail] = useState(user?.email || "");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Screenshot must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      setScreenshot(file);
      const url = URL.createObjectURL(file);
      setScreenshotUrl(url);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First, upload screenshot if provided
      let screenshotUrlFinal: string | null = null;
      if (screenshot) {
        const formData = new FormData();
        formData.append("file", screenshot);
        formData.append("folder", "feedback-screenshots");

        const uploadResponse = await fetch("/api/upload/presigned", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload screenshot");
        }

        const uploadData = await uploadResponse.json();
        screenshotUrlFinal = uploadData.url;
      }

      // Submit feedback
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback_type: feedbackType,
          subject: subject.trim(),
          description: description.trim(),
          screenshot_url: screenshotUrlFinal,
          user_email: userEmail.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback");
      }

      setSubmitSuccess(true);

      // Reset form
      setTimeout(() => {
        setSubject("");
        setDescription("");
        setUserEmail(user?.email || "");
        setScreenshot(null);
        setScreenshotUrl(null);
        setFeedbackType("general");
        setSubmitSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject("");
      setDescription("");
      setUserEmail(user?.email || "");
      setScreenshot(null);
      setScreenshotUrl(null);
      setFeedbackType("general");
      setError(null);
      setSubmitSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Use portal to render modal at document body level to ensure it's always on top
  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={handleClose}
    >
      <div className="min-h-full flex items-end justify-center p-4 pb-8 sm:pb-12">
        <div
          className="bg-zinc-900 border-2 border-amber-500/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <h2 className="text-2xl font-bold text-amber-100">Send Feedback</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-amber-100/60" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-amber-100">Thank You!</h3>
                <p className="text-amber-100/70 text-center max-w-md">
                  Your feedback has been submitted successfully. We appreciate you helping us improve!
                </p>
              </div>
            ) : (
              <>
                {/* Feedback Type */}
                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">
                    Feedback Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="bug">🐛 Report a Bug</option>
                    <option value="feature_request">✨ Feature Request</option>
                    <option value="book_request">📚 Request a Book</option>
                    <option value="general">💭 General Feedback</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Brief summary of your feedback"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={
                      feedbackType === "book_request"
                        ? "Please include the book title, author, and why you'd like to see it in the Project Parallax Library..."
                        : "Please provide as much detail as possible..."
                    }
                    rows={6}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 resize-none"
                    required
                  />
                </div>

                {/* Screenshot */}
                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">
                    Screenshot (Optional)
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center justify-center w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors disabled:opacity-50">
                      <Upload className="w-5 h-5 text-amber-100/60 mr-2" />
                      <span className="text-sm text-amber-100/80">
                        {screenshot ? screenshot.name : "Upload Screenshot"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                    </label>
                    {screenshotUrl && (
                      <div className="relative">
                        <img
                          src={screenshotUrl}
                          alt="Screenshot preview"
                          className="w-full h-48 object-contain rounded-lg border border-zinc-700 bg-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshot(null);
                            setScreenshotUrl(null);
                          }}
                          disabled={isSubmitting}
                          className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-amber-100/50">
                      Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>
                </div>

                {/* Contact Email (for anonymous users or follow-up) */}
                {!user && (
                  <div>
                    <label className="block text-sm font-medium text-amber-100 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="your@email.com (for follow-up if needed)"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 hover:bg-zinc-750 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !subject.trim() || !description.trim()}
                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg text-zinc-950 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Feedback"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );

  // Render modal in portal at document body level
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
}

