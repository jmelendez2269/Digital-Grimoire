const fs = require("fs");
const path = require("path");

function usage() {
  console.log("Usage: node app/scripts/audit-graph-bundle.js <bundle.json>");
}

function normalizePair(left, right) {
  return left <= right ? `${left}|${right}` : `${right}|${left}`;
}

function getTopEntries(map, limit = 15) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function isSuspiciousEntityName(name) {
  const normalized = String(name || "").replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  if (normalized.includes(":")) return true;
  if (/^[a-z]/.test(normalized) && /^(and|or|of|the|to|for|from|with|without|into)\b/.test(normalized)) return true;
  if (normalized === normalized.toLowerCase()) return true;
  if (/\b(all plants?|all animals?|all birds?)\b/i.test(normalized)) return true;
  return false;
}

function auditSection(name, entities, relationships) {
  const entityIds = new Set();
  const degree = new Map();
  const missingEndpoints = [];
  const duplicateDirected = new Map();
  const duplicateUndirected = new Map();
  const relationshipTypes = new Map();
  const suspiciousEntities = [];

  for (const entity of entities) {
    const slug = String(entity.slug || "");
    if (!slug) continue;
    entityIds.add(slug);
    degree.set(slug, 0);
    if (isSuspiciousEntityName(entity.name)) {
      suspiciousEntities.push({ slug, name: entity.name, category: entity.category || null });
    }
  }

  for (const rel of relationships) {
    const source = String(rel.source_slug || "");
    const target = String(rel.target_slug || "");
    const type = String(rel.type || rel.relationship_type_slug || "untyped");
    const directedKey = `${source}->${target}->${type}`;
    const undirectedKey = `${normalizePair(source, target)}->${type}`;

    duplicateDirected.set(directedKey, (duplicateDirected.get(directedKey) || 0) + 1);
    duplicateUndirected.set(undirectedKey, (duplicateUndirected.get(undirectedKey) || 0) + 1);
    relationshipTypes.set(type, (relationshipTypes.get(type) || 0) + 1);

    if (!entityIds.has(source) || !entityIds.has(target)) {
      missingEndpoints.push({ source, target, type });
      continue;
    }

    degree.set(source, (degree.get(source) || 0) + 1);
    degree.set(target, (degree.get(target) || 0) + 1);
  }

  const orphaned = [...degree.entries()].filter(([, count]) => count === 0).map(([slug]) => slug);
  const directedDupes = [...duplicateDirected.entries()].filter(([, count]) => count > 1);
  const undirectedDupes = [...duplicateUndirected.entries()].filter(([, count]) => count > 1);

  console.log(`\n[${name}]`);
  console.log(`entities=${entities.length}`);
  console.log(`relationships=${relationships.length}`);
  console.log(`orphaned_entities=${orphaned.length}`);
  console.log(`relationships_with_missing_endpoints=${missingEndpoints.length}`);
  console.log(`duplicate_directed_relationships=${directedDupes.length}`);
  console.log(`duplicate_undirected_relationships_same_type=${undirectedDupes.length}`);
  console.log(`suspicious_entity_names=${suspiciousEntities.length}`);

  console.log("\nTop relationship types:");
  for (const [type, count] of getTopEntries(relationshipTypes, 10)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nTop connected entities:");
  for (const [slug, count] of getTopEntries(degree, 15)) {
    console.log(`  ${slug}: ${count}`);
  }

  if (orphaned.length) {
    console.log("\nSample orphaned entities:");
    for (const slug of orphaned.slice(0, 15)) {
      console.log(`  ${slug}`);
    }
  }

  if (missingEndpoints.length) {
    console.log("\nSample relationships with missing endpoints:");
    for (const rel of missingEndpoints.slice(0, 10)) {
      console.log(`  ${rel.source} -> ${rel.target} (${rel.type})`);
    }
  }

  if (suspiciousEntities.length) {
    console.log("\nSample suspicious entities:");
    for (const entity of suspiciousEntities.slice(0, 15)) {
      console.log(`  ${entity.slug} :: ${entity.name} [${entity.category || "uncategorized"}]`);
    }
  }
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    usage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const bundle = JSON.parse(raw);

  if (bundle.correspondences) {
    auditSection(
      "correspondences",
      bundle.correspondences.entities || [],
      bundle.correspondences.relationships || [],
    );
  }

  if (bundle.convergence) {
    auditSection(
      "convergence",
      bundle.convergence.concepts || [],
      bundle.convergence.relationships || [],
    );
  }

  if (bundle.correspondences) {
    const entityCount = (bundle.correspondences.entities || []).length;
    const relationshipCount = (bundle.correspondences.relationships || []).length;
    console.log("\n[ui-fit-check]");
    console.log(`graph_page_entity_page_size=5000`);
    console.log(`graph_page_edge_page_size=5000`);
    console.log(`bundle_entity_pages_required=${Math.max(Math.ceil(entityCount / 5000), 1)}`);
    console.log(`bundle_relationship_pages_required=${Math.max(Math.ceil(relationshipCount / 5000), 1)}`);
  }
}

main();
