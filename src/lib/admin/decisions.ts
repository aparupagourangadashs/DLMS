import type { DecisionInfo } from "@/components/admin/pages/DecisionPage";

export const decisions: Record<string, DecisionInfo> = {
  "products/mentorships": {
    proposal: ["Mentor profiles with availability slots", "One-to-one or small-group bookings, free or paid", "Session notes and follow-up tasks visible to the learner"],
    questions: ["Is mentorship offered today, and by whom?", "Paid, free, or included with a membership?", "Where do sessions happen (Zoom, Meet, in person)?"],
  },
  "products/ebooks": {
    proposal: ["Upload EPUB/PDF with cover, language and price", "Protected in-browser reading, with no direct download unless allowed", "Bundle eBooks with courses or memberships"],
    questions: ["Should eBooks be sold here, or only linked to retailers as on the website?", "Is download allowed, and is watermarking needed?", "Which languages are needed at launch?"],
  },
  "products/test-series": {
    proposal: ["A bundle of timed tests sold as one product", "Uses the Question Bank and exam engine from the Assessments phase", "Leaderboard and per-test analysis for learners"],
    questions: ["Is a test series needed separately from course exams?", "Pricing and attempt limits?", "Should results be visible immediately?"],
  },
  "products/playlists": {
    proposal: ["Curated lists of recordings and videos from the Asset Library", "Free, paid, or members-only access", "Resume where the learner left off"],
    questions: ["What is a playlist for IBMV: lecture series, kirtans, or both?", "Public on the website, or only in the student portal?"],
  },
  "engage/discussions": {
    proposal: ["Course-level discussion threads with replies", "Moderation queue, reporting and pinning", "Email digest of new replies (opt-in)"],
    questions: ["Is this separate from Community, or should it merge into Community?", "Who moderates, and what are the retention rules?"],
  },
  "marketing/workflows": {
    proposal: ["Trigger → condition → action automations (e.g. enrolled → wait 1 day → send WhatsApp)", "Templates for common journeys: welcome, abandoned cart, re-engagement", "Run log and pause/resume"],
    questions: ["Which triggers matter most at launch?", "Who may create or approve workflows?", "Quiet hours and frequency limits?"],
  },
  "marketing/promotional-templates": {
    proposal: ["Reusable Email, WhatsApp and SMS templates with variables", "WhatsApp template approval status from the provider", "Preview with sample learner data"],
    questions: ["Which channels and providers will IBMV use?", "Who writes and approves message copy?", "Which languages are needed?"],
  },
  "sales/cheque-management": {
    proposal: ["Record cheque details against an order: number, bank, date and amount", "Status tracking: received → deposited → cleared/bounced", "Enrolment unlocks only after the cheque clears (configurable)"],
    questions: ["Which fields and approvals are required?", "Who may mark a cheque as cleared?", "How should bounced cheques be handled?"],
  },
  "settings/international-selling": {
    proposal: ["Show prices in USD/GBP/EUR alongside INR", "Per-product international price or automatic conversion", "Gateway support via Razorpay international payments"],
    questions: ["Which countries and currencies?", "Fixed prices or converted?", "Tax and invoice treatment for overseas learners?"],
  },
  "settings/learner-experience": {
    proposal: ["Student-portal branding: logo, colours and home banners", "Toggle portal features (Communities, Refer & Earn, Memberships)", "Default language and timezone for new learners"],
    questions: ["Which student features should be switchable?", "Is Hindi (or other) UI needed at launch?", "Is PWA install wanted?"],
  },
};
