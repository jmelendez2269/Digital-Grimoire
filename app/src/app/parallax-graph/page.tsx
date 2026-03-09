import { redirect } from "next/navigation";

// /parallax-graph is retired — /graph?type=parallax is now the canonical URL
export default function ParallaxGraphRedirect() {
  redirect("/graph?type=parallax");
}
