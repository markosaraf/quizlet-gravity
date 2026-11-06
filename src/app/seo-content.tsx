// Server-rendered FAQ and matching structured data share one source of truth.
import "./seo-content.css";

/* ----------------------------- shared data -------------------------------- */

/** Feature list — also fed into the VideoGame JSON-LD in layout.tsx. */
export const GAME_FEATURES: string[] = [
  "Search shared study sets by title or original Quizlet set creator",
  "Import public Quizlet links, including text copied from the Quizlet app",
  "Create sets from pasted terms or CSV files",
  "Share a set link and compete on its persistent leaderboard",
  "Repeated imports of the same Quizlet set reuse one shared set and leaderboard",
  "Play as a named guest or sign in with an account",
  "Email verification, password recovery and Google sign-in",
  "One personal best per player on each shared-set leaderboard",
  "5 difficulty levels: Sloth, Easy, Medium, Hard, Mad Max",
  "Editable terms and Starred-only study mode for custom games",
  "Copy the correct answer after a miss; miss the same term twice and the game ends",
  "Light and dark themes in the website and Android and iOS apps",
];

export interface FaqItem {
  question: string;
  answer: string;
}

/** FAQ answers also supply the FAQPage structured data. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    "question": "What is Quizlet Gravity?",
    "answer": "A free flashcard game: type answers to stop asteroids from hitting your planet. Find study sets, share your own and compete with friends. This independent project is not affiliated with Quizlet."
  },
  {
    "question": "How do I find a study set?",
    "answer": "Open Sets and search by title or original Quizlet set creator. Select a set to play or view its leaderboard."
  },
  {
    "question": "How do I import a Quizlet set?",
    "answer": "Paste a public Quizlet set link into Import a Quizlet set, then select Import set. The full sharing text copied from the Quizlet app works too."
  },
  {
    "question": "How do I create my own set?",
    "answer": "Open Create set. Enter terms and definitions, one pair per line, or upload a CSV. Check your entries before playing. You need at least two pairs."
  },
  {
    "question": "How do I edit an existing Quizlet set?",
    "answer": "Open Create set → Edit a Quizlet set. Import its link, then change the terms or definitions. Your shared version credits both you and the original creator."
  },
  {
    "question": "How do I share a set with friends?",
    "answer": "Open a shared set and select Copy set link. For your own set, add a title and select Create shared link first."
  },
  {
    "question": "Do I need an account?",
    "answer": "No. Choose a guest username to play, import and share sets. Create an account to keep your scores across devices."
  },
  {
    "question": "What is the difference between a guest and an account?",
    "answer": "A guest can lose access to their scores if app or browser data is cleared. An account lets you sign back in on any device."
  },
  {
    "question": "How do I confirm my email or reset my password?",
    "answer": "Open the confirmation email after signing up. Check spam or select Resend confirmation if needed. To reset your password, select Forgot password? on the sign-in screen."
  },
  {
    "question": "When does my score appear on the leaderboard?",
    "answer": "Choose Play this set on a shared set. When a red asteroid hits your planet and the game ends, your score is saved. Only your highest score for that set appears."
  },
  {
    "question": "How do I earn points?",
    "answer": "Answer correctly to earn points. Keep a streak going to earn more. Wrong answers cost 10 points."
  },
  {
    "question": "What happens when I miss an asteroid?",
    "answer": "Type the displayed answer to continue. Miss the same term again and the game ends. Choose an easier difficulty if you need more time."
  },
  {
    "question": "Can I play on my phone or tablet?",
    "answer": "Yes, in your browser or the Android and iOS apps. Sign in with the same account to keep your scores across devices."
  },
  {
    "question": "Can accounts or shared sets be removed?",
    "answer": "Accounts or sets may be removed for spam or abusive content. Removed accounts appear as Deleted user on leaderboards. Removing a set also removes its leaderboard."
  },
  {
    "question": "What information is public?",
    "answer": "Shared sets, creator usernames and leaderboard scores are public. Your email and password are never shown publicly. Your own unshared sets stay on your device."
  }
];

/* --------------------------- visible sections ----------------------------- */

export function FaqSection() {
  return (
    <section id="faq" className="GravitySEO" aria-labelledby="faq-heading">
      <div className="GravitySEO-inner">
        <h2 id="faq-heading" className="GravitySEO-title">
          Frequently asked questions
        </h2>
        <p className="GravitySEO-subtitle">
          Find out about sets, importing, sharing, accounts, leaderboards and
          privacy.
        </p>
        <div className="GravitySEO-faqList">
          {FAQ_ITEMS.map(({ question, answer }) => (
            <details key={question} className="GravitySEO-faqItem">
              <summary className="GravitySEO-faqQuestion">{question}</summary>
              <p className="GravitySEO-faqAnswer">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Always present on the Sets landing pages, including before hydration. */
export function SetsLandingHelp({path = "/"}: {path?: string}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.quizletgravity.com";
  const url = new URL(path, siteUrl).href;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      name: "Quizlet Gravity — Frequently asked questions",
      mainEntity: FAQ_ITEMS.map(({question, answer}) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {"@type": "Answer", text: answer},
      })),
    },
  ];
  return <><FaqSection/><script type="application/ld+json"
    dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData).replace(/</g, "\\u003c")}}/></>;
}
