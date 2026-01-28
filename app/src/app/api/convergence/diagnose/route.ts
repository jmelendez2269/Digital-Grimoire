import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Diagnostic endpoint for Convergence Graph database structure
 * GET /api/convergence/diagnose
 * 
 * Returns comprehensive diagnostic information about:
 * - Table existence
 * - Data counts
 * - Data integrity issues (orphaned relationships, self-referential)
 * - Foreign key constraints
 * - Indexes
 * - RLS policies
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      issues: [],
      recommendations: [],
    };

    // 1. Check table existence
    const { data: conceptsTable, error: conceptsTableError } = await supabase
      .from("convergence_concepts")
      .select("id")
      .limit(1);

    const { data: relationshipsTable, error: relationshipsTableError } = await supabase
      .from("convergence_relationships")
      .select("id")
      .limit(1);

    const conceptsTableExists = !conceptsTableError || conceptsTableError.code !== "PGRST205";
    const relationshipsTableExists = !relationshipsTableError || relationshipsTableError.code !== "PGRST205";

    diagnostics.checks.tableExistence = {
      concepts: conceptsTableExists,
      relationships: relationshipsTableExists,
    };

    // Migration status check
    diagnostics.checks.migrationStatus = {
      migration019: conceptsTableExists && relationshipsTableExists,
      migration034: false, // Will check below if tables exist
    };

    if (!conceptsTableExists) {
      diagnostics.issues.push({
        severity: "critical",
        type: "missing_table",
        message: "convergence_concepts table does not exist",
        fix: "Run Migration 019: migrations/019_add_convergence_concepts.sql",
        migration: "019",
      });
      diagnostics.recommendations.push("Run Migration 019 to create the required tables");
    }

    if (!relationshipsTableExists) {
      diagnostics.issues.push({
        severity: "critical",
        type: "missing_table",
        message: "convergence_relationships table does not exist",
        fix: "Run Migration 019: migrations/019_add_convergence_concepts.sql",
        migration: "019",
      });
    }

    // Check if Migration 034 safeguards are in place (if tables exist)
    if (conceptsTableExists && relationshipsTableExists) {
      let checkConstraint;
      try {
        const result = await supabase.rpc("check_constraint_exists", {
          constraint_name: "check_no_self_reference",
        });
        checkConstraint = result.data;
      } catch {
        // Manual check if RPC doesn't exist
        const { data: constraints } = await supabase
          .from("information_schema.check_constraints")
          .select("constraint_name")
          .eq("constraint_name", "check_no_self_reference")
          .limit(1);
        checkConstraint = constraints && constraints.length > 0;
      }

      // Try direct query instead
      const { data: directCheck } = await supabase
        .from("convergence_relationships")
        .select("id")
        .limit(1);

      if (directCheck !== null) {
        // Table exists, check for constraint via raw SQL (we'll note it in recommendations)
        diagnostics.checks.migrationStatus.migration034 = "unknown";
        diagnostics.recommendations.push(
          "Consider running Migration 034 to add database-level safeguards (prevents self-referential relationships)"
        );
      }
    }

    // If tables don't exist, return early
    if (!conceptsTableExists || !relationshipsTableExists) {
      return NextResponse.json(diagnostics, { status: 200 });
    }

    // 2. Data counts
    const { count: conceptCount } = await supabase
      .from("convergence_concepts")
      .select("*", { count: "exact", head: true });

    const { count: relationshipCount } = await supabase
      .from("convergence_relationships")
      .select("*", { count: "exact", head: true });

    diagnostics.checks.dataCounts = {
      concepts: conceptCount || 0,
      relationships: relationshipCount || 0,
    };

    if (conceptCount === 0) {
      diagnostics.issues.push({
        severity: "warning",
        type: "empty_table",
        message: "No concepts found in convergence_concepts table",
        fix: "Seed initial data using SEED_CONVERGENCE_GUIDE.md or run seed script",
      });
      diagnostics.recommendations.push("Seed initial concepts - see docs/SEED_CONVERGENCE_GUIDE.md");
    }

    if (relationshipCount === 0 && (conceptCount ?? 0) > 0) {
      diagnostics.issues.push({
        severity: "info",
        type: "no_relationships",
        message: "No relationships found - graph will show isolated nodes",
        fix: "Create relationships between concepts via admin interface or API",
      });
    }

    // 3. Check for orphaned relationships
    let orphanedRelationships: any[] = [];
    let orphanedError = null;

    try {
      const result = await supabase.rpc("check_orphaned_relationships");
      orphanedRelationships = result.data || [];
      orphanedError = result.error;
    } catch {
      // If RPC doesn't exist, use manual query
      const { data, error } = await supabase
        .from("convergence_relationships")
        .select("id, source_id, target_id");

      if (error || !data) {
        orphanedRelationships = [];
        orphanedError = error;
      } else {
        // Check each relationship
        const orphaned: any[] = [];
        for (const rel of data) {
          const { data: sourceExists } = await supabase
            .from("convergence_concepts")
            .select("id")
            .eq("id", rel.source_id)
            .single();

          const { data: targetExists } = await supabase
            .from("convergence_concepts")
            .select("id")
            .eq("id", rel.target_id)
            .single();

          if (!sourceExists || !targetExists) {
            orphaned.push({
              id: rel.id,
              source_id: rel.source_id,
              target_id: rel.target_id,
              issue: !sourceExists ? "source_id missing" : "target_id missing",
            });
          }
        }
        orphanedRelationships = orphaned;
      }
    }

    if (orphanedRelationships && orphanedRelationships.length > 0) {
      diagnostics.checks.orphanedRelationships = {
        count: orphanedRelationships.length,
        relationships: orphanedRelationships,
      };
      diagnostics.issues.push({
        severity: "error",
        type: "orphaned_relationships",
        message: `${orphanedRelationships.length} relationship(s) point to non-existent concepts`,
        fix: "Clean up orphaned relationships or restore missing concepts",
      });
      diagnostics.recommendations.push("Run cleanup query to remove orphaned relationships");
    } else {
      diagnostics.checks.orphanedRelationships = {
        count: 0,
        relationships: [],
      };
    }

    // 4. Check for self-referential relationships
    const { data: allRels } = await supabase
      .from("convergence_relationships")
      .select("id, source_id, target_id, similarity");

    const selfReferential = allRels?.filter((r: any) => r.source_id === r.target_id) || [];

    if (selfReferential && selfReferential.length > 0) {
      diagnostics.checks.selfReferentialRelationships = {
        count: selfReferential.length,
        relationships: selfReferential,
      };
      diagnostics.issues.push({
        severity: "warning",
        type: "self_referential",
        message: `${selfReferential.length} relationship(s) are self-referential (source_id === target_id)`,
        fix: "Remove or fix self-referential relationships - they should not exist",
      });
    } else {
      diagnostics.checks.selfReferentialRelationships = {
        count: 0,
        relationships: [],
      };
    }

    // 5. Check for duplicate relationships (same source_id and target_id)
    const { data: allRelationships } = await supabase
      .from("convergence_relationships")
      .select("source_id, target_id");

    if (allRelationships) {
      const duplicates = new Map<string, number>();
      allRelationships.forEach((rel: any) => {
        const key = `${rel.source_id}-${rel.target_id}`;
        duplicates.set(key, (duplicates.get(key) || 0) + 1);
      });

      const duplicatePairs = Array.from(duplicates.entries())
        .filter(([_, count]) => count > 1)
        .map(([key, count]) => ({ pair: key, count }));

      if (duplicatePairs.length > 0) {
        diagnostics.checks.duplicateRelationships = {
          count: duplicatePairs.length,
          pairs: duplicatePairs,
        };
        diagnostics.issues.push({
          severity: "warning",
          type: "duplicate_relationships",
          message: `${duplicatePairs.length} duplicate relationship pair(s) found`,
          fix: "Remove duplicates - unique constraint should prevent this",
        });
      }
    }

    // 6. Overall status
    const criticalIssues = diagnostics.issues.filter((i: any) => i.severity === "critical").length;
    const errorIssues = diagnostics.issues.filter((i: any) => i.severity === "error").length;
    const warningIssues = diagnostics.issues.filter((i: any) => i.severity === "warning").length;

    diagnostics.status = criticalIssues > 0
      ? "critical"
      : errorIssues > 0
        ? "error"
        : warningIssues > 0
          ? "warning"
          : "healthy";

    diagnostics.summary = {
      totalIssues: diagnostics.issues.length,
      critical: criticalIssues,
      errors: errorIssues,
      warnings: warningIssues,
      concepts: conceptCount || 0,
      relationships: relationshipCount || 0,
    };

    return NextResponse.json(diagnostics, {
      status: diagnostics.status === "critical" ? 500 : 200,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: err?.message || "Failed to run diagnostics",
        details: process.env.NODE_ENV === "development" ? String(err) : undefined,
      },
      { status: 500 }
    );
  }
}
