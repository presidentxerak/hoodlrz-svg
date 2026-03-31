import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

<<<<<<< HEAD
    // Fetch all rewards for the user
    const { data: rewards, error: rewardsError } = await supabase
      .from("rewards")
      .select("*")
      .eq("account_id", user.id)
=======
    // Look up account
    const { data: account } = await supabase
      .from("accounts")
      .select("id, rewards_balance")
      .eq("auth_id", user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // Fetch rewards history
    const { data: rewards, error: rewardsError } = await supabase
      .from("rewards")
      .select("*")
      .eq("account_id", account.id)
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      .order("created_at", { ascending: false });

    if (rewardsError) {
      console.error("[rewards] Fetch error:", rewardsError.message);
      return NextResponse.json(
        { error: "Failed to fetch rewards." },
        { status: 500 }
      );
    }

<<<<<<< HEAD
    const totalPoints = (rewards ?? []).reduce((sum, r) => sum + r.points, 0);
=======
    const totalPoints = (rewards ?? []).reduce((sum, r) => sum + r.amount, 0);
>>>>>>> claude/build-hoodlrz-platform-7Ex6i

    // Determine milestones and status
    const milestones = [
      { threshold: 10, label: "Free Collectible", perk: "free_collectible" },
      { threshold: 25, label: "Early Access", perk: "early_access" },
      { threshold: 50, label: "Genesis Whitelist", perk: "genesis_whitelist" },
    ];

    const unlockedMilestones = milestones.filter(
      (m) => totalPoints >= m.threshold
    );
    const nextMilestone = milestones.find((m) => totalPoints < m.threshold);

    return NextResponse.json({
      balance: totalPoints,
      rewards: rewards ?? [],
      milestones: {
        unlocked: unlockedMilestones,
        next: nextMilestone
          ? {
              ...nextMilestone,
              pointsNeeded: nextMilestone.threshold - totalPoints,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[rewards] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
