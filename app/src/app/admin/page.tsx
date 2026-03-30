"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  BarChart3,
  Upload,
  Globe,
  BookOpen,
  Network,
  Sparkles,
  MessageSquare,
  LogOut,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboardHub() {
  const { user, signOut, isAdmin, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    // Optional: redirect safely or show unauthorized
    return (
      <div className="min-h-screen flex flex-col bg-black text-amber-100">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
            <p className="text-zinc-400">You do not have administrative privileges.</p>
            <Link href="/dashboard" className="mt-6 inline-block px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const adminTools = [
    {
      title: "System Tracking & Diagnostics",
      description: "View API usage metrics, costs, and system health status.",
      icon: <BarChart3 className="w-8 h-8 text-amber-400" />,
      href: "/admin/diagnostics",
      color: "amber"
    },
    {
      title: "Admin Upload",
      description: "Upload and process new documents into the library.",
      icon: <Upload className="w-8 h-8 text-blue-400" />,
      href: "/admin/upload",
      color: "blue"
    },
    {
      title: "Import Sacred Text",
      description: "Import texts from external sources or URLs.",
      icon: <Globe className="w-8 h-8 text-green-400" />,
      href: "/admin/import-sacred-text",
      color: "green"
    },
    {
      title: "Courses Management",
      description: "Manage course content, modules, and lessons.",
      icon: <BookOpen className="w-8 h-8 text-purple-400" />,
      href: "/admin/courses",
      color: "purple"
    },
    {
      title: "Knowledge Graph",
      description: "Visualize and manage the connections between concepts.",
      icon: <Network className="w-8 h-8 text-cyan-400" />,
      href: "/admin/knowledge-graph",
      color: "cyan"
    },
    {
      title: "Embeddings",
      description: "Manage vector embeddings and search indexing.",
      icon: <Sparkles className="w-8 h-8 text-pink-400" />,
      href: "/admin/embeddings",
      color: "pink"
    },
    {
      title: "Feedback",
      description: "Review user feedback and reported issues.",
      icon: <MessageSquare className="w-8 h-8 text-yellow-400" />,
      href: "/admin/feedback",
      color: "yellow"
    },
    {
      title: "Technical Wiki",
      description: "Access system documentation and technical guides.",
      icon: <BookOpen className="w-8 h-8 text-teal-400" />,
      href: "/admin/wiki",
      color: "teal"
    },
    {
      title: "Blog Management",
      description: "Create and manage blog posts for the public site.",
      icon: <FileText className="w-8 h-8 text-orange-400" />,
      href: "/admin/blog",
      color: "orange"
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50 px-6 py-12">
          <div className="max-w-7xl mx-auto">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
              <div>
                <h1 className="text-4xl font-bold text-amber-100 mb-2">Admin Command Center</h1>
                <p className="text-zinc-400 text-lg">Central control hub for Digital Grimoire operations.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-amber-900/20 border border-amber-500/20 rounded-full">
                  <span className="text-amber-500 font-mono text-sm">● ADMIN_ACCESS_ACTIVE</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-all hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-xl hover:shadow-amber-900/5"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-${tool.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                  <div className="relative z-10 flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                      {tool.icon}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
                      <span className="text-zinc-500 text-xs font-mono">↗</span>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-zinc-100 mb-2 group-hover:text-white">{tool.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300">{tool.description}</p>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
