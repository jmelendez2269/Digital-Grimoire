import { NextRequest } from "next/server";
import { z } from "zod";
import {
  findingInput,
  reviewProblems,
  type Finding,
} from "@/lib/inquiries/model";
import {
  researcher,
  handleInquiry,
  json,
  checkDB,
  ownedInquiry,
  resolveEvidence,
  InquiryError,
  checkFindingEntities,
} from "@/lib/inquiries/server";
type Context = { params: Promise<{ id: string; findingId: string }> };
export function PATCH(request: NextRequest, context: Context) {
  return handleInquiry(async () => {
    const { user, db, isAdmin } = await researcher(request);
    const { id, findingId } = await context.params;
    await ownedInquiry(db, z.uuid().parse(id), user.id);
    z.uuid().parse(findingId);
    const { data: row, error: readError } = await db
      .from("research_findings")
      .select("*")
      .eq("id", findingId)
      .eq("inquiry_id", id)
      .maybeSingle();
    checkDB(readError);
    if (!row) throw new InquiryError("Finding not found.", 404);
    const finding = row as Finding;
    const body = await request.json();
    if (body.action === "up" || body.action === "down") {
      const result = await db.rpc("move_research_finding", {
        p_id: findingId,
        p_owner: user.id,
        p_direction: body.action,
      });
      checkDB(result.error);
      return json({ ok: true });
    }
    const revision = z.number().int().positive().parse(body.revision);
    if (revision !== finding.revision)
      throw new InquiryError(
        "This finding changed. Reload before continuing.",
        409
      );
    if (body.action) {
      if (!isAdmin)
        throw new InquiryError(
          "Only the curator can review or publish shared connections.",
          403
        );
      const action = z.enum(["review", "publish", "draft"]).parse(body.action);
      if (action === "review") {
        if (body.checked !== true)
          throw new InquiryError(
            "Confirm that you checked the source and the connection."
          );
        const problems = reviewProblems(finding);
        if (problems.length) throw new InquiryError(problems.join(" "));
        await resolveEvidence(db, finding, true);
      }
      const result = await db.rpc("transition_research_finding", {
        p_id: findingId,
        p_owner: user.id,
        p_revision: revision,
        p_action: action,
      });
      checkDB(result.error);
      return json({ finding: result.data });
    }
    if (finding.status !== "draft")
      throw new InquiryError(
        "Return this finding to draft before editing. It will leave the shared map until published again.",
        409
      );
    const input = await resolveEvidence(db, findingInput.parse(body));
    await checkFindingEntities(db, input, user.id);
    const { data, error } = await db
      .from("research_findings")
      .update({
        ...input,
        revision: revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", findingId)
      .eq("inquiry_id", id)
      .eq("status", "draft")
      .eq("revision", revision)
      .select("*")
      .maybeSingle();
    checkDB(error);
    if (!data)
      throw new InquiryError(
        "This finding changed. Reload before saving.",
        409
      );
    return json({ finding: data });
  });
}
