"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import { X, CheckCircle, AlertCircle, Clock, MessageSquare, Bug, Sparkles, Lightbulb, MoreHorizontal, Book } from "lucide-react";
import NextImage from "next/image";

interface Feedback {
  id: string;
  user_id: string | null;
  feedback_type: "bug" | "feature_request" | "general" | "book_request" | "other";
  subject: string;
  description: string;
  screenshot_url: string | null;
  user_email: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusUpdate, setStatusUpdate] = useState<string>("");
  const [priorityUpdate, setPriorityUpdate] = useState<string>("");

  useEffect(() => {
    checkAdminAndFetchFeedback();
  }, [filterStatus, filterType]);

  const checkAdminAndFetchFeedback = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setIsAdmin(true);
    await fetchFeedback();
  };

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterType !== "all") params.append("type", filterType);

      const response = await fetch(`/api/feedback?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedback = async (id: string, updates: Partial<Feedback>) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("feedback")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchFeedback();
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, ...updates } as Feedback);
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
      alert("Failed to update feedback");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="w-4 h-4" />;
      case "feature_request":
        return <Sparkles className="w-4 h-4" />;
      case "book_request":
        return <Book className="w-4 h-4" />;
      case "general":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-amber-400" />;
      case "closed":
        return <X className="w-4 h-4 text-zinc-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "normal":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      default:
        return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-amber-50">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Feedback Management</h1>
          <p className="text-amber-100/60">Review and manage user feedback</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Types</option>
            <option value="bug">Bug Reports</option>
            <option value="feature_request">Feature Requests</option>
            <option value="book_request">Book Requests</option>
            <option value="general">General Feedback</option>
            <option value="other">Other</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-amber-100/60">Loading feedback...</div>
          </div>
        ) : feedback.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-amber-100/60">No feedback found</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {feedback.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedFeedback(item)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 cursor-pointer hover:border-amber-900/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-amber-100/60">{getTypeIcon(item.feedback_type)}</span>
                      <h3 className="text-lg font-semibold text-amber-100">{item.subject}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-amber-100/40">{getStatusIcon(item.status)}</span>
                      <span className="text-xs text-amber-100/40">{item.status}</span>
                    </div>
                    <p className="text-amber-100/70 mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-amber-100/50">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      {item.user_email && <span>{item.user_email}</span>}
                      <span className="capitalize">{item.feedback_type.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
              className="bg-zinc-900 border-2 border-amber-900/20 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <span>{getTypeIcon(selectedFeedback.feedback_type)}</span>
                  <h2 className="text-2xl font-bold text-amber-100">{selectedFeedback.subject}</h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedFeedback(null);
                    setAdminNotes("");
                    setStatusUpdate("");
                    setPriorityUpdate("");
                  }}
                  className="p-2 hover:bg-zinc-800 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-amber-100/60" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-amber-100/60">Type</label>
                    <div className="text-amber-100 capitalize">{selectedFeedback.feedback_type.replace("_", " ")}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-amber-100/60">Priority</label>
                    <div>
                      <select
                        value={priorityUpdate || selectedFeedback.priority}
                        onChange={(e) => setPriorityUpdate(e.target.value)}
                        className="mt-1 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-amber-100 text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-amber-100/60">Status</label>
                    <div>
                      <select
                        value={statusUpdate || selectedFeedback.status}
                        onChange={(e) => setStatusUpdate(e.target.value)}
                        className="mt-1 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-amber-100 text-sm"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-amber-100/60">Submitted</label>
                    <div className="text-amber-100">
                      {new Date(selectedFeedback.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-amber-100/60 mb-2">Description</label>
                  <div className="bg-zinc-800 rounded-lg p-4 text-amber-100 whitespace-pre-wrap">
                    {selectedFeedback.description}
                  </div>
                </div>

                {/* Screenshot */}
                {selectedFeedback.screenshot_url && (
                  <div>
                    <label className="block text-sm font-medium text-amber-100/60 mb-2">Screenshot</label>
                    <NextImage
                      src={selectedFeedback.screenshot_url}
                      alt="Screenshot"
                      width={800}
                      height={600}
                      className="max-w-full rounded-lg border border-zinc-700 h-auto"
                    />
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">Admin Notes</label>
                  <textarea
                    value={adminNotes || selectedFeedback.admin_notes || ""}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Internal notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setSelectedFeedback(null);
                      setAdminNotes("");
                      setStatusUpdate("");
                      setPriorityUpdate("");
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-amber-100 hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const updates: Partial<Feedback> = {};
                      if (statusUpdate) updates.status = statusUpdate as any;
                      if (priorityUpdate) updates.priority = priorityUpdate as any;
                      if (adminNotes !== (selectedFeedback.admin_notes || "")) updates.admin_notes = adminNotes;
                      await updateFeedback(selectedFeedback.id, updates);
                      setStatusUpdate("");
                      setPriorityUpdate("");
                    }}
                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg text-zinc-950 font-semibold transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

