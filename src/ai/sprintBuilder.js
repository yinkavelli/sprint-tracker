// ─── duration parsing ─────────────────────────────────────────────────────

export function parseDuration(text) {
  if (!text) return { count: 6, unit: "month", prefix: "M", label: "Month", daysPerBlock: 30 };
  const lower = text.toLowerCase();
  const numMatch = lower.match(/(\d+)/);
  const count = numMatch ? Math.min(parseInt(numMatch[1]), 52) : 6;

  if (lower.includes("day")) return { count, unit: "day", prefix: "D", label: "Day", daysPerBlock: 1 };
  if (lower.includes("week")) return { count, unit: "week", prefix: "W", label: "Week", daysPerBlock: 7 };
  if (lower.includes("quarter")) return { count, unit: "quarter", prefix: "Q", label: "Quarter", daysPerBlock: 90 };
  // "year" → convert to months (12 months per year)
  if (lower.includes("year")) {
    const years = numMatch ? parseInt(numMatch[1]) : 1;
    return { count: Math.min(years * 12, 52), unit: "month", prefix: "M", label: "Month", daysPerBlock: 30 };
  }
  return { count, unit: "month", prefix: "M", label: "Month", daysPerBlock: 30 };
}

export function formatSprintDuration(dur) {
  return `${dur.count} ${dur.label}${dur.count !== 1 ? "s" : ""}`;
}

// ─── document parsing (client-side) ──────────────────────────────────────

export async function parseDocumentText(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "txt" || ext === "md" || ext === "csv") {
    return await file.text();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (ext === "pdf") {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      // Use Vite-bundled worker URL (no CDN dependency — works on mobile and offline)
      const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }
      if (!text.trim()) throw new Error("EMPTY_PDF");
      return text;
    } catch (e) {
      if (e.message === "EMPTY_PDF") throw new Error("The PDF appears to be empty or image-only. Try copying the text and pasting it in the chat.");
      // Re-throw with a user-friendly message
      throw new Error("PDF_PARSE_FAILED");
    }
  }

  throw new Error("UNSUPPORTED_FORMAT");
}


/** Attempts to extract goal / duration / title hints from raw document text */
export function extractContextFromDoc(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  // Try to find an explicit goal line
  const goalPatterns = [/goal[:\-]\s*(.+)/i, /objective[:\-]\s*(.+)/i, /purpose[:\-]\s*(.+)/i, /aim[:\-]\s*(.+)/i];
  let goal = "";
  for (const pat of goalPatterns) {
    const m = text.match(pat);
    if (m) { goal = m[1].trim(); break; }
  }
  if (!goal && lines.length > 0) goal = lines[0]; // fallback: first line

  // Duration hints
  const durMatch = lower.match(/(\d+)\s*(day|week|month|quarter)/);
  const duration = durMatch ? `${durMatch[1]} ${durMatch[2]}s` : "";

  // Title hints
  const titlePatterns = [/sprint[:\-]\s*(.+)/i, /plan[:\-]\s*(.+)/i, /project[:\-]\s*(.+)/i, /title[:\-]\s*(.+)/i];
  let sprintTitle = "";
  for (const pat of titlePatterns) {
    const m = text.match(pat);
    if (m) { sprintTitle = m[1].trim(); break; }
  }

  // Milestones — look for bullet lists near "milestone" keyword
  const milestoneIdx = lower.indexOf("milestone");
  let milestones = "";
  if (milestoneIdx >= 0) {
    milestones = text.slice(milestoneIdx, milestoneIdx + 300).replace(/\n/g, " ").trim();
  }

  return {
    goal: goal.slice(0, 300),
    duration,
    sprintTitle,
    milestones,
    rawDoc: text.slice(0, 2000), // preserve for context display
  };
}

// ─── goal classification ──────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  career: ["job", "career", "certif", "professional", "promotion", "role", "skill", "cpsi", "pmp", "aws", "degree", "ux", "design", "engineer", "developer", "manager", "consultant"],
  health: ["fitness", "weight", "run", "marathon", "gym", "health", "diet", "nutrition", "coach", "body", "muscle", "yoga", "sport", "strength"],
  creative: ["art", "music", "write", "novel", "podcast", "youtube", "paint", "design", "film", "creative", "photography", "illustration", "brand", "content"],
  business: ["startup", "business", "revenue", "product", "launch", "shopify", "ecommerce", "sell", "client", "agency", "freelance", "saas", "app", "company"],
  education: ["study", "learn", "course", "exam", "school", "university", "masters", "phd", "research", "degree", "diploma", "thesis"],
};

export function classifyGoal(goal) {
  const lower = (goal || "").toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "custom";
}

// ─── tracks per category ──────────────────────────────────────────────────

const TRACK_MAP = {
  career: {
    track1: { label: "Learning & Study", color: "#6c5ce7", icon: "📚" },
    track2: { label: "Credentials & Certs", color: "#00b894", icon: "🏆" },
    track3: { label: "Network & Visibility", color: "#0984e3", icon: "🌐" },
  },
  health: {
    track1: { label: "Training", color: "#e17055", icon: "🏃" },
    track2: { label: "Nutrition & Recovery", color: "#00b894", icon: "🥗" },
    track3: { label: "Metrics & Mindset", color: "#6c5ce7", icon: "📊" },
  },
  creative: {
    track1: { label: "Craft & Creation", color: "#fd79a8", icon: "🎨" },
    track2: { label: "Audience & Reach", color: "#0984e3", icon: "📣" },
    track3: { label: "Revenue & Collabs", color: "#00b894", icon: "💰" },
  },
  business: {
    track1: { label: "Build & Product", color: "#00b894", icon: "🏗️" },
    track2: { label: "Sales & Marketing", color: "#e17055", icon: "🎯" },
    track3: { label: "Growth & Systems", color: "#6c5ce7", icon: "📈" },
  },
  education: {
    track1: { label: "Study & Research", color: "#6c5ce7", icon: "📖" },
    track2: { label: "Practice & Projects", color: "#00b894", icon: "✍️" },
    track3: { label: "Certification & Output", color: "#0984e3", icon: "🎓" },
  },
  custom: {
    track1: { label: "Core Work", color: "#6c5ce7", icon: "⚡" },
    track2: { label: "Research & Learning", color: "#00b894", icon: "🔬" },
    track3: { label: "Visibility & Sharing", color: "#0984e3", icon: "🗣️" },
  },
};

// ─── phase templates (6 phases, map to any block count) ──────────────────

const PHASE_NAMES = [
  { title: "Foundation & Research", subtitle: "Lay the groundwork — understand your landscape" },
  { title: "Deep Learning & Planning", subtitle: "Build skills and create your detailed roadmap" },
  { title: "First Experiments", subtitle: "Take real action, test your assumptions" },
  { title: "Build Momentum", subtitle: "Accelerate — more action, more feedback" },
  { title: "Execute & Deliver", subtitle: "Your most important phase — produce the output" },
  { title: "Review, Publish & Scale", subtitle: "Consolidate wins and set up what comes next" },
];

const TASK_TEMPLATES = {
  career: [
    { milestone: "Course enrolled, study schedule set, LinkedIn refreshed", track1: ["Research the top 3 certifications for your goal and compare", "Enroll in your chosen course or program", "Block dedicated study hours in your calendar each period"], track2: ["Identify the exact credential you are targeting", "Purchase required study materials and guides", "Join the official community or exam-prep group for this credential"], track3: ["Update your LinkedIn headline to reflect your new direction", "Follow 20 practitioners and thought leaders in the field", "Send 5 genuine connection requests to people doing what you want to do"] },
    { milestone: "Module 1 complete, concept sketched, first article published", track1: ["Complete the first module of your course or program", "Take notes and create a one-page summary of key concepts", "Do practice questions or exercises to test your retention"], track2: ["Research CPD requirements and how to maintain the credential", "Find two study partners or accountability groups online", "Book a mock-exam date to test yourself under real conditions"], track3: ["Write and publish your first LinkedIn article about your journey", "Comment thoughtfully on 10 posts from people in your target field", "Attend one industry webinar or virtual event this period"] },
    { milestone: "50% of course complete, exam booked, case study started", track1: ["Complete the second major section and review all weak areas", "Create a revision schedule targeting your exam date", "Score above 75% consistently on practice tests"], track2: ["Book your official exam date", "Request a reference letter from a mentor or senior colleague", "Begin building your first case study or portfolio piece"], track3: ["Announce your exam date publicly as an accountability post", "Pitch a guest article or podcast to one industry outlet", "Start building a simple portfolio or personal website"] },
    { milestone: "Exam passed or application submitted, network growing", track1: ["Sit and pass your certification exam or submit your application", "Document all lessons learned and surprises from the process", "Plan your next credential or learning milestone"], track2: ["Add your new credential to LinkedIn, email signature, and bio", "Identify your next certification or professional development step", "Start a project that formally uses your new skills"], track3: ["Announce your credential attainment with a celebratory post", "Reach out to 3 people in your target role for a 20-minute chat", "Apply to speak at one industry meetup or online event"] },
    { milestone: "Portfolio published, outreach begun, referrals in pipeline", track1: ["Complete a major project using your newly certified skills", "Document the project as a full case study with measurable outcomes", "Refine your portfolio to show three core competencies"], track2: ["Begin mentoring someone junior in your area", "Apply to one advanced-level certification or program", "Request a formal testimonial from a client, colleague, or manager"], track3: ["Send your full portfolio to 10 target companies or contacts", "Publish your case study publicly on LinkedIn and your website", "Schedule 2 coffee chats per week with people in roles you aspire to"] },
    { milestone: "Offer received or next sprint scoped, income or role changed", track1: ["Conduct a full audit of your knowledge gaps versus your goal", "Create a learning plan for the next period", "Identify one mentorship program or mastermind to join"], track2: ["Evaluate and document your credential portfolio", "Determine the next qualification that will unlock the next level", "Apply to the most relevant opportunity you have identified"], track3: ["Write a retrospective: what worked, what you would change", "Publicly share your results and thank your supporters", "Commit to your next sprint and announce it to your network"] },
  ],
  health: [
    { milestone: "Baseline measured, program chosen, coach or buddy found", track1: ["Measure your starting baseline: weight, resting heart rate, or benchmark workout", "Research and choose a structured training program suited to your goal", "Block training sessions in your calendar as non-negotiable appointments"], track2: ["Calculate your daily calorie and protein targets", "Prepare your first period of meals with a simple plan", "Eliminate or reduce your single biggest dietary obstacle"], track3: ["Weigh or measure yourself and record the baseline data", "Choose your primary tracking metric (scale, photos, performance)", "Tell one accountability partner about your goal and check-in schedule"] },
    { milestone: "30 consecutive periods of adherence, first visible change noted", track1: ["Complete every scheduled training session this period without skipping", "Progress one key lift or performance marker by at least 5%", "Add one new movement or skill to your repertoire"], track2: ["Meal prep at the start of each week to remove decision fatigue", "Try one new high-protein meal that you enjoy enough to repeat", "Track your food intake for at least 5 days per period"], track3: ["Take progress photos at the same time and lighting as baseline", "Share a small win publicly for accountability", "Adjust your calorie target based on your first period's results"] },
    { milestone: "Performance benchmark improved, halfway to body composition goal", track1: ["Run a structured mid-point performance test against your baseline", "Introduce one deload or recovery period to prevent burnout", "Add a flexibility or mobility session to your weekly routine"], track2: ["Review your nutrition data and identify your biggest compliance gap", "Experiment with one meal timing or macro cycling strategy", "Consult a nutritionist or use an evidence-based resource to fine-tune"], track3: ["Review your progress photos side by side with your starting point", "Recalibrate your target if you are ahead or behind schedule", "Connect with one online community or training group for support"] },
    { milestone: "75% of training completed, positive habit loop established", track1: ["Complete a challenging training block that felt impossible at the start", "Set a performance target for your final period", "Film yourself performing a key exercise and assess your form"], track2: ["Develop a travel or disruption meal plan for unpredictable moments", "Audit your sleep quality and make one concrete improvement", "Prepare a healthy emergency snack kit to keep on hand"], track3: ["Update your progress photo set and compare all checkpoints", "Share your milestone and what made the difference", "Set your final-period goal in writing and put it somewhere visible"] },
    { milestone: "Personal record achieved, body composition near target", track1: ["Peak: reach your target performance benchmark or execute your planned event", "Document the training session or event with photos or video", "Write a detailed training log of what worked and what to improve"], track2: ["Refine your maintenance eating protocol now that the intense phase is ending", "Celebrate your results with a planned, guilt-free reward meal", "Research a sustainable long-term nutrition plan"], track3: ["Share your full transformation results and story", "Submit a testimonial or before-and-after to your coach or community", "Celebrate publicly and inspire others who are starting their journey"] },
    { milestone: "Maintenance mode established, next goal set, habit locked in", track1: ["Design your maintenance or next training cycle", "Identify the next physical challenge or event to aim for", "Join a club, class, or team to keep training social and accountable"], track2: ["Switch from a deficit or surplus to a maintenance calorie target", "Build a sustainable long-term meal structure you can follow for years", "Book a check-up or body composition scan to confirm your results"], track3: ["Write your retrospective: the honest story of your sprint", "Set your next goal in writing with a start date", "Help one person start their own journey using what you learned"] },
  ],
  creative: [
    { milestone: "Niche defined, first piece created, distribution channel live", track1: ["Consume 10 pieces of work by creators you admire and write down what makes them great", "Define your specific creative niche with one sentence", "Create and publish your first raw piece — done beats perfect"], track2: ["Choose your primary distribution platform and publish your profile", "Study the algorithm and content format that performs best on your platform", "Post consistently three times this period regardless of quality"], track3: ["Engage with 50 accounts in your niche — comment meaningfully", "Share your creative goal publicly for accountability", "Identify three potential collaborators or peers at a similar level"] },
    { milestone: "10 pieces published, first audience feedback gathered, craft improving", track1: ["Complete a focused skill-building exercise every day for this period", "Study one master creator in your field deeply and deconstruct their technique", "Collect and categorise every piece of feedback you receive this period"], track2: ["Build a simple email list or community even if just 10 people join", "Publish your tenth piece and compare it honestly to your first", "Pitch yourself as a guest on one podcast, blog, or account in your niche"], track3: ["Engage with your audience by responding to every comment and DM", "Collaborate with one peer creator on a joint piece of content", "Research one monetisation route that fits your creative work"] },
    { milestone: "Consistent output rhythm established, first paid or featured work", track1: ["Develop your signature creative process and document it", "Create your most ambitious piece to date this sprint", "Identify the one skill gap that is limiting your creative quality"], track2: ["Apply to one grant, residency, exhibition, or creative opportunity", "Create a simple media kit or press pack for your creative brand", "Begin a larger-scale project that will run beyond this sprint"], track3: ["Reach out to 5 brands or clients with a personalised pitch", "License, sell, or publish your first commercially available creative work", "Build a waiting list or presale for your next creative offering"] },
    { milestone: "Revenue generated, audience milestone reached, signature style emerging", track1: ["Build a portfolio of your best pieces, edited and curated", "Study and implement one advanced creative technique you have been avoiding", "Produce a special or limited-edition creative piece"], track2: ["Price your services or products clearly and increase rates if undercharging", "Follow up with all past clients or buyers for testimonials", "Apply to exhibit at, speak at, or attend one industry event"], track3: ["Create your most shareable piece of content to date — aim for viral potential", "Launch a challenge or campaign that involves your audience", "Feature or interview another creator — grow together"] },
    { milestone: "Signature work completed, income stream active, press secured", track1: ["Complete your flagship piece — the work you will be most proud of from this sprint", "Document your entire creative process with behind-the-scenes content", "Submit your best work to awards, exhibitions, or publication calls"], track2: ["Formalise your income: raise prices, launch a product, or sign a retainer", "Reach your primary audience growth milestone", "Secure at least one media mention, feature, or platform spotlight"], track3: ["Create a campaign around the launch of your flagship work", "Thank your audience genuinely and publicly for their support", "Identify what creative project you will tackle in your next sprint"] },
    { milestone: "Creative business sustainable, next project scoped, community built", track1: ["Write a complete creative retrospective: what you made, what you learned", "Design the next creative project you want to take on", "Invest in your craft with a new tool, course, or learning experience"], track2: ["Build a plan to sustain your creative income without burning out", "Create a passive or evergreen version of your most popular work", "Set financial and creative goals for the next sprint"], track3: ["Celebrate your journey publicly and show your most loyal supporters some love", "Identify three people in your community who are ready for your mentorship", "Commit to your next sprint and announce your next creative chapter"] },
  ],
  business: [
    { milestone: "Idea validated, target customer defined, MVP scoped", track1: ["Write a one-page business model canvas for your idea", "Interview 10 potential customers to validate the problem", "Define your MVP: the smallest version that delivers real value"], track2: ["Identify your three ideal target customers with full profiles", "Research your top 5 competitors and document their strengths and weaknesses", "Price test your offer: ask 5 people if they would buy at your target price"], track3: ["Buy your domain and claim your social handles", "Create a landing page explaining your product and collect email signups", "Share your business idea publicly for the first time"] },
    { milestone: "MVP built, first 10 beta users acquired, feedback loop started", track1: ["Build or assemble your MVP using the simplest tools available", "Set up your basic tech stack: payments, email, analytics", "Test your MVP yourself thoroughly before showing anyone"], track2: ["Onboard your first 10 beta users personally", "Run a live demo or walkthrough session with at least 5 users", "Record all feedback in a structured format and identify the top 3 themes"], track3: ["Announce your public beta on all your channels", "Write a launch blog post or LinkedIn article about your product", "Pitch your product to one journalist, newsletter, or community"] },
    { milestone: "Revenue started, product improved, go-to-market strategy live", track1: ["Implement the top 3 features or fixes from beta feedback", "Set up your onboarding flow so it works without your personal involvement", "Define and measure your core product metric for this stage"], track2: ["Convert at least 3 beta users into paying customers", "Set your pricing page and test one alternative pricing tier", "Launch a referral incentive for your existing users"], track3: ["Test one paid acquisition channel with a small budget", "Partner with a complementary product or community for cross-promotion", "Apply to be featured in a relevant startup newsletter or directory"] },
    { milestone: "First 10 paying customers, product-market fit signals appearing", track1: ["Build the one feature that your customers request most often", "Improve your onboarding completion rate by 20%", "Reduce your most common support request with a product change"], track2: ["Document and systematise your most reliable sales conversation", "Close deals with 10 paying customers at your target price", "Create a simple case study or testimonial from your happiest customer"], track3: ["Double your content output using your first 3 case studies as material", "Run a limited-time promotion to acquire your next cohort quickly", "Pitch to one investor, accelerator, or grant programme"] },
    { milestone: "Repeatable sales process, team or contractor in place, scaling", track1: ["Document your product roadmap for the next sprint", "Hire or contract your first helper in the highest-bottleneck area", "Automate your most repetitive manual process"], track2: ["Implement a systematic outbound or inbound sales process", "Hit your revenue target two periods in a row", "Build your first strategic partnership with a complementary brand"], track3: ["Publish a detailed case study showing customer results with numbers", "Apply to speak at one conference, podcast, or industry event", "Begin building your owned community or audience"] },
    { milestone: "Business profitable or funded, hiring plan set, next sprint clear", track1: ["Complete a full business audit: revenue, margins, bottlenecks, opportunities", "Write your product and growth roadmap for the next sprint", "Define the one next hire that will unlock your next growth phase"], track2: ["Project your revenue for the next periods and set a formal target", "Raise a round, apply for a grant, or confirm profitability", "Build a financial model you review every period"], track3: ["Write your retrospective: what worked, what you would do differently", "Share your results publicly — revenue, users, or milestones achieved", "Commit publicly to your next growth phase"] },
  ],
  education: [
    { milestone: "Programme selected, study plan built, baseline assessment done", track1: ["Research and select your programme, course, or self-study path", "Map the full curriculum and create a period-by-period study schedule", "Complete a diagnostic test to identify your weakest areas"], track2: ["Set up your study environment: tools, notes system, and reference materials", "Find a study partner or accountability group", "Complete the introductory module and summarise key concepts"], track3: ["Share your learning goal and programme publicly for accountability", "Join one online community or forum related to your study topic", "Find one practitioner who works in the field and ask them one question"] },
    { milestone: "25% of curriculum complete, first graded assessment passed", track1: ["Complete the next four study modules and create detailed notes", "Attempt your first formal assessment or graded assignment", "Create a concept map connecting your key learnings so far"], track2: ["Build a bank of practice questions and test yourself every period", "Form or join a study group that meets at least twice per period", "Record a short video explaining a concept to reinforce your understanding"], track3: ["Write a summary article about the most interesting concept you have learned", "Present your learning to one person outside your field", "Identify a real-world project where you can apply your new skills"] },
    { milestone: "50% complete, major assignment submitted, applied learning started", track1: ["Reach the halfway point of your programme with all assessments up to date", "Complete a major project or assignment that requires synthesis", "Identify the remaining weak areas and create a targeted cramming plan"], track2: ["Build a complete revision guide from your notes to date", "Take a comprehensive mock test under real exam conditions", "Have your work reviewed by a peer, tutor, or expert"], track3: ["Start applying your knowledge to a real project or portfolio piece", "Share your midpoint progress and celebrate with your supporters", "Identify the career or next-step opportunity this qualification unlocks"] },
    { milestone: "75% complete, portfolio piece created, exam date booked", track1: ["Accelerate through the final quarter of your curriculum", "Book your official exam, defence, or submission date", "Run three full timed practice tests and score at least 80%"], track2: ["Complete a capstone project that demonstrates comprehensive mastery", "Ask a mentor or tutor to review your work and identify blind spots", "Prepare all logistics for your final assessment day"], track3: ["Update your LinkedIn and CV with your in-progress qualification", "Find the job posting, program, or opportunity you will target after qualifying", "Connect with recent graduates or qualified practitioners for advice"] },
    { milestone: "Exam sat, submission completed, results pending", track1: ["Sit your exam, submit your dissertation, or defend your thesis", "Document your entire study journey as a reference for others", "Rest and recover — burnout prevention is essential now"], track2: ["Apply for your credential, licence, or official recognition", "Prepare for any supplementary assessments or viva voce examinations", "Collect and organise all evidence of your competence for your portfolio"], track3: ["Announce that you have completed the assessment — build anticipation", "Begin actively applying to roles or opportunities that require your qualification", "Get a reference letter from your tutor, supervisor, or study group leader"] },
    { milestone: "Qualified, first opportunity secured, next learning phase planned", track1: ["Review your results and celebrate your achievement", "Identify one area to deepen your knowledge further", "Plan your continuing professional development for the next sprint"], track2: ["Add your new qualification to all professional profiles", "Apply for your first role, project, or client using your credentials", "Register with the relevant professional body or association"], track3: ["Write your full retrospective and share it publicly", "Mentor or advise someone who is just starting the same programme", "Commit to your next learning sprint and announce it to your network"] },
  ],
  custom: [
    { milestone: "Goal fully defined, success metrics set, system in place", track1: ["Research extensively: read, watch, and talk to 3 people who have achieved what you want", "Define your goal with specific, measurable outcomes — not vague intentions", "Set up a periodic review ritual to check your progress"], track2: ["Identify the single most important thing to learn this period", "Find the best resource (book, course, mentor) and start immediately", "Document everything you are learning in a journal or notes system"], track3: ["Tell someone meaningful about your goal for accountability", "Join one community of people working on similar goals", "Share your goal publicly with a self-imposed deadline"] },
    { milestone: "First real action taken, early lessons documented, momentum building", track1: ["Complete the first major task toward your goal — the one you have been avoiding", "Identify your single biggest obstacle and plan how to remove it", "Review your progress from the last period and adjust your approach"], track2: ["Go deeper on the skill that will make the biggest difference", "Teach what you have learned to someone else to reinforce it", "Find a mentor or advisor with direct experience in your area"], track3: ["Document your early progress and share it openly — good and bad", "Engage your audience or community with what you are discovering", "Invite feedback and use it to refine your approach"] },
    { milestone: "Halfway point reached, first major output delivered", track1: ["Produce your first substantial output — a prototype, draft, or proof of concept", "Get real feedback from at least 5 people outside your immediate circle", "Identify what is working and double down on it; drop what is not"], track2: ["Invest heavily in your biggest skill gap this period", "Study your closest role model's process in detail", "Create a reference document capturing your best frameworks and insights"], track3: ["Publish or share your work — overcome the fear of being judged", "Celebrate reaching the halfway mark and acknowledge your growth", "Connect with one person who could change your trajectory with a single introduction"] },
    { milestone: "Work refined, feedback incorporated, visible progress achieved", track1: ["Build on your previous output with significant improvements", "Run a structured experiment to test your most important assumption", "Review your goal again — has it evolved? Adjust if needed"], track2: ["Go beyond basics: tackle an advanced concept or challenge", "Create a piece of work that makes you uncomfortable — stretch yourself", "Document your evolving methodology for others to learn from"], track3: ["Share your progress update with honest reflections", "Help someone else with what you have learned so far — generosity compounds", "Identify the most aligned opportunity and pursue it actively this period"] },
    { milestone: "Main deliverable complete, results measured, next step clear", track1: ["Complete your primary goal deliverable — the thing you set out to create or achieve", "Measure your results against the metrics you set at the start", "Capture every detail in a retrospective document"], track2: ["Formally document your process as a guide others could follow", "Consolidate your evidence, portfolio, or proof of achievement", "Identify the next skill or knowledge area needed to take this further"], track3: ["Share your results publicly and tell the full story — beginning to end", "Thank the people who supported, advised, or inspired you", "Describe clearly what this achievement means for your future"] },
    { milestone: "Goal achieved, next sprint designed, system proven sustainable", track1: ["Write your honest retrospective: what worked, what you would change, what surprised you", "Design your next sprint goal based on what you learned", "Build a repeatable system so you can do this again faster"], track2: ["Evaluate what skills or knowledge you still lack and plan to address them", "Decide whether to go deeper in this area or branch out", "Invest in your next phase of development with intention"], track3: ["Celebrate publicly — your progress deserves to be seen", "Reflect on who you became through this sprint, not just what you made", "Commit to your next sprint and share it with your community"] },
  ],
};

// ─── get phase template for a given block index ───────────────────────────

function getPhaseTemplate(blockIndex, totalBlocks, category) {
  const templates = TASK_TEMPLATES[category] || TASK_TEMPLATES.custom;
  const phaseIndex = Math.min(
    Math.floor((blockIndex / Math.max(totalBlocks, 1)) * templates.length),
    templates.length - 1
  );
  return { template: templates[phaseIndex], phaseIndex };
}

function getPhaseName(blockIndex, totalBlocks) {
  const i = Math.min(
    Math.floor((blockIndex / Math.max(totalBlocks, 1)) * PHASE_NAMES.length),
    PHASE_NAMES.length - 1
  );
  return PHASE_NAMES[i];
}

// ─── plan outline (for chat preview) ─────────────────────────────────────

export function generatePlanOutline(context) {
  const category = classifyGoal(context.goal);
  const trackDefs = TRACK_MAP[category];
  const dur = parseDuration(context.duration);
  const templates = TASK_TEMPLATES[category];

  const PREVIEW_COUNT = Math.min(dur.count, 4); // show up to 4 blocks
  const blocks = [];

  for (let i = 0; i < dur.count; i++) {
    const { template, phaseIndex } = getPhaseTemplate(i, dur.count, category);
    blocks.push({
      num: i + 1,
      label: `${trackDefs.track1.icon ? "" : ""}${dur.label} ${i + 1}`,
      title: getPhaseName(i, dur.count).title,
      milestone: template.milestone,
      sampleTask: template.track1[0],
    });
  }

  return {
    category,
    trackDefs,
    dur,
    sprintTitle: context.sprintTitle || "Your Sprint",
    goal: context.goal,
    blocks,
    previewBlocks: blocks.slice(0, PREVIEW_COUNT),
    remainingCount: Math.max(0, dur.count - PREVIEW_COUNT),
  };
}

/** Formats the outline as readable chat text */
export function formatOutlineAsText(outline) {
  const { trackDefs, dur, sprintTitle, goal, previewBlocks, remainingCount, category } = outline;
  const t = trackDefs;

  const lines = [
    `📋 Here's your sprint outline:\n`,
    `Sprint: "${sprintTitle}"`,
    `Duration: ${formatSprintDuration(dur)} · 3 tracks`,
    `Tracks: ${t.track1.icon} ${t.track1.label}  ·  ${t.track2.icon} ${t.track2.label}  ·  ${t.track3.icon} ${t.track3.label}`,
    `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}\n`,
    `─────────────────────────`,
  ];

  previewBlocks.forEach((b) => {
    lines.push(`\n${dur.label} ${b.num} — ${b.title}`);
    lines.push(`  🏁 Milestone: ${b.milestone}`);
    lines.push(`  ✏ Sample task: ${b.sampleTask}`);
  });

  if (remainingCount > 0) {
    lines.push(`\n  … and ${remainingCount} more ${dur.label.toLowerCase()}${remainingCount !== 1 ? "s" : ""}`);
  }

  lines.push(`\n─────────────────────────`);
  lines.push(`\nDoes this look right? If yes, tap ✅ Build Plan. If you'd like changes, describe them below and I'll revise.`);

  return lines.join("\n");
}

/** Apply user revision instructions to context */
export function applyRevision(context, revisionText) {
  const lower = revisionText.toLowerCase();
  const updated = { ...context };

  // Title change
  const titleMatch = revisionText.match(/(?:call it|name it|rename to|title[:\s]+)["""']?([^"""'\n]+)["""']?/i);
  if (titleMatch) updated.sprintTitle = titleMatch[1].trim();

  // Duration change
  const durMatch = revisionText.match(/(\d+)\s*(day|week|month|quarter)/i);
  if (durMatch) updated.duration = `${durMatch[1]} ${durMatch[2]}s`;

  // Store revision notes for context (will show in ack message)
  updated.revisionNotes = (updated.revisionNotes ? updated.revisionNotes + " | " : "") + revisionText.trim();

  return updated;
}

// ─── plan generator — rule-based fallback (called by aiService on failure) ──

export function generatePlanFallback(context, parsedDuration) {
  const dur = parsedDuration || parseDuration(context.duration);
  const category = classifyGoal(context.goal);
  const trackDefs = TRACK_MAP[category];

  const tracks = {
    track1: trackDefs.track1,
    track2: trackDefs.track2,
    track3: trackDefs.track3,
  };

  const periods = [];
  for (let i = 0; i < dur.count; i++) {
    const { template } = getPhaseTemplate(i, dur.count, category);
    const phase = getPhaseName(i, dur.count);
    periods.push({
      period: i + 1,
      title: phase.title,
      subtitle: phase.subtitle,
      milestone: template.milestone,
      tracks: {
        track1: template.track1,
        track2: template.track2,
        track3: template.track3,
      },
    });
  }

  const checked = {};
  periods.forEach((p) => {
    ["track1", "track2", "track3"].forEach((tr) => {
      p.tracks[tr].forEach((_, idx) => {
        checked[`${p.period}-${tr}-${idx}`] = false;
      });
    });
  });

  return { category, tracks, periods, checked };
}

// ─── plan generator — async, AI-powered (with rule-based fallback) ────────

export async function generatePlan(context) {
  const { generateSprintWithAI, mergePlanResponse } = await import("../services/aiService.js");
  const dur = parseDuration(context.duration);
  const category = classifyGoal(context.goal);

  // Base sprint skeleton — always built from local data
  const base = {
    id: `spr_${Date.now()}`,
    userId: context.userId,
    title: context.sprintTitle || "My Sprint",
    subtitle: context.goal,
    goal: context.goal,
    category,
    unit: dur.unit,
    blockCount: dur.count,
    blockDaysEach: dur.daysPerBlock,
    blockPrefix: dur.prefix,
    blockLabel: dur.label,
    startDate: "",
    createdAt: new Date().toISOString(),
    aiGenerated: false,
  };

  // Call AI — falls back to rule-based inside aiService on failure
  const { data: aiData, source } = await generateSprintWithAI(context, dur);

  return {
    ...base,
    ...mergePlanResponse(base, aiData),
    aiGenerated: source === "openai",
  };
}

// ─── question sequence ────────────────────────────────────────────────────

export const QUESTIONS = [
  {
    id: "goal",
    ask: "What's the goal you want to achieve in this sprint? Be as specific as you can — the more detail you give me, the more tailored your plan will be. 🎯\n\n(You can also upload a document with your goals using the 📎 button below.)",
    placeholder: "e.g. Become a certified UX designer and land my first freelance client...",
  },
  {
    id: "startingPoint",
    ask: "Got it! What's your current starting point? Are you a complete beginner, do you have some relevant experience, or are you a professional making a transition?",
    placeholder: "e.g. I have some design experience in Canva but no formal UX training...",
  },
  {
    id: "duration",
    ask: "How long is your sprint, and how do you want to break it into blocks? For example: '6 months', '12 weeks', '90 days', '4 quarters', '30 days'. This sets the rhythm of your tracker.",
    placeholder: "e.g. 12 weeks, 6 months, 90 days, 4 quarters...",
  },
  {
    id: "hoursPerWeek",
    ask: "How many hours per week can you realistically dedicate to this sprint? Be honest — a realistic plan beats an ambitious one you won't keep.",
    placeholder: "e.g. About 8–10 hours per week, mostly on evenings and weekends...",
  },
  {
    id: "milestones",
    ask: "What are the 2–3 milestones that would tell you this sprint was a success? Think about what you want to be able to say when it's over.",
    placeholder: "e.g. 1) Certified, 2) first paid project completed, 3) portfolio with 3 case studies...",
  },
  {
    id: "constraints",
    ask: "Any constraints I should factor in? Things like budget limits, location, upcoming travel, or dependencies on other people.",
    placeholder: "e.g. Budget is $500, I travel for work in week 6, working alone...",
  },
  {
    id: "sprintTitle",
    ask: "Last one — what do you want to call this sprint? Give it a name that fires you up every time you see it. ✨",
    placeholder: "e.g. UX Design Launch Sprint, 12-Week Transformation, The First Build...",
  },
];
