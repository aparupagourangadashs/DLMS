import type { Community } from "@/components/admin/pages/CommunityPage";
import { instructors, people } from "./demo-data";

export function demoCommunities(): Community[] {
  const members = people(14, 401);
  return [
    {
      id: "c1",
      name: "Bhagavad Gita Learners",
      description: "Discussion and doubts for all Gita course batches.",
      members: [
        { id: "m0", name: instructors[0], role: "Moderator", joined: "Jan 2026" },
        ...members.slice(0, 9).map((p, i) => ({ id: `m${i + 1}`, name: p.name, role: "Member" as const, joined: ["Feb 2026", "Mar 2026", "Jun 2026"][i % 3] })),
      ],
      messages: [
        { id: "x1", author: instructors[0], role: "Moderator", time: "Mon 9:12 AM", text: "Welcome! Please read the pinned guidelines before posting.", pinned: true },
        { id: "x2", author: members[0].name, role: "Learner", time: "Mon 10:40 AM", text: "What is the difference between karma yoga and jnana yoga as described in Chapter 3?", pinned: false },
        { id: "x3", author: instructors[0], role: "Moderator", time: "Mon 11:05 AM", text: "Great question. We will take it up in Thursday's class, and I've added a short reading in the course.", pinned: false },
        { id: "x4", author: members[2].name, role: "Learner", time: "Tue 7:30 PM", text: "Thank you for the recording of today's session!", pinned: false },
      ],
    },
    {
      id: "c2",
      name: "Parents & Kids Club",
      description: "Updates and activities for the Kids Gita Club and Vedic Parenting.",
      members: [
        { id: "k0", name: instructors[3], role: "Moderator", joined: "Mar 2026" },
        ...members.slice(9).map((p, i) => ({ id: `k${i + 1}`, name: p.name, role: "Member" as const, joined: "Apr 2026" })),
      ],
      messages: [
        { id: "y1", author: instructors[3], role: "Moderator", time: "Sun 6:00 PM", text: "This week's colouring sheet is in Module 4. Share your child's drawing here!", pinned: false },
      ],
    },
  ];
}
