import { redirect } from "next/navigation";

// /parallax-graph is retired. Keep the candidate selection explicit so the
// API never substitutes whichever import happened most recently.
export default function ParallaxGraphRedirect() {
  redirect(
    "/graph?type=parallax&course=pre-how-to-hold-two-things-at-once",
  );
}
