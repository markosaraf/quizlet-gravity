// Server-rendered FAQ and matching structured data share one source of truth.
import "./seo-content.css";

/* ----------------------------- shared data -------------------------------- */

/** Feature list — also fed into the VideoGame JSON-LD in layout.tsx. */
export const GAME_FEATURES: string[] = [
  "Search shared games by title or original Quizlet set creator",
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
    "answer": "A free flashcard game: type answers to stop asteroids from hitting your planet. Find games, share your own and compete with friends. This independent project is not affiliated with Quizlet."
  },
  {
    "question": "How do I find a game?",
    "answer": "Search games by title or creator, then choose a game to play or view its leaderboard."
  },
  {
    "question": "Do I need an account?",
    "answer": "No. Choose a guest username to play, import and share games. Create an account to keep your scores across devices."
  },
  {
    "question": "How do I import a Quizlet set?",
    "answer": "Choose Import game from Quizlet, paste a public Quizlet set link and select Add & play."
  },
  {
    "question": "How do I create my own game and how do I edit an existing Quizlet set?",
    "answer": "Open Create game, add a title and at least two pairs of text or images. You can also paste pairs or upload a CSV. To adapt a Quizlet set, choose Import & edit from Quizlet."
  },
  {
    "question": "How do I earn points, and what happens when I miss an asteroid?",
    "answer": "Answer correctly to earn points. Keep a streak going to earn more. Wrong answers cost 10 points. If you miss an asteroid, type the displayed answer to continue. Miss the same term again and the game ends."
  },
  {
    "question": "How do I share a game with friends?",
    "answer": "Open a game and select Copy game link. For your own game, select Create & play first."
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
    "answer": "Choose Play this game on a shared game. When a red asteroid hits your planet and the game ends, your score is saved. Only your highest score for that set appears on the leaderboard."
  },
  {
    "question": "What information is public?",
    "answer": "Shared games, creator usernames and leaderboard scores are public. Your email and password are never shown publicly. Games become public when you create or import them."
  },
  {
    "question": "Can I play on my phone or tablet?",
    "answer": "Yes, in your browser or the Android and iOS apps. Sign in with the same account to keep your scores across devices."
  },
  {
    "question": "When are accounts or shared games removed?",
    "answer": "To delete your account, open your username menu and choose Delete account. Your sets and scores remain under Deleted user. Accounts or sets may also be removed for spam or abusive content. Removing a set also removes its leaderboard."
  }
];

/* --------------------------- visible sections ----------------------------- */

export function FaqSection() {
  return (
    <section id="faq" className="GravitySEO" aria-labelledby="faq-heading">
      <div className="GravitySEO-inner">
        <h2 className="GravitySEO-title">How to play</h2>
        <p className="GravitySEO-subtitle">
          Defend your planet from incoming asteroids by typing the correct
          answers before they land. Find a shared set, import from Quizlet,
          or create your own and invite friends to its leaderboard.
        </p>
        <h2 id="faq-heading" className="GravitySEO-title">
          Frequently asked questions
        </h2>
        <p className="GravitySEO-subtitle">
          Find out about games, importing, sharing, accounts, leaderboards and
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
