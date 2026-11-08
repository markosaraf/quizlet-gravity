import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your account | Quizlet Gravity',
  description: 'How to delete your Quizlet Gravity account, what is removed, and what remains.',
};

export default function DeleteAccountPage() {
  return <main className="community-page">
    <h1>Delete your Quizlet Gravity account</h1>
    <p>Quizlet Gravity: Play &amp; Learn is operated by Marko Sarafijanovic.</p>
    <h2>Delete your account online or in the app</h2>
    <ol>
      <li>Open <a href="https://www.quizletgravity.com/">Quizlet Gravity</a> and sign in to the account you want to delete.</li>
      <li>Select your name in the top bar to open Your account.</li>
      <li>Select <strong>Delete account</strong>. Enter your current password if requested. If you use Google or Apple, you may need to sign in again.</li>
      <li>Tick the confirmation box and select <strong>Permanently delete</strong>.</li>
    </ol>
    <p>You can do this in a web browser without installing the app. Guest players can use Delete guest profile in the same menu.</p>
    <h2>Request deletion by email</h2>
    <p>If you cannot access your account, email <a href="mailto:quizletgravity@gmail.com?subject=Quizlet%20Gravity%20account%20deletion">quizletgravity@gmail.com</a> with the subject “Quizlet Gravity account deletion”. Send the request from your registered email address and include your player name. Do not send your password. We may ask you to verify that you own the account before processing your request.</p>
    <h2>What is deleted</h2>
    <p>After you confirm deletion online, your login credentials, account email, username, display name, profile picture and linked sign-in details are removed from the active account records immediately. Your sessions are revoked, signing you out on all devices. There is no additional waiting period for this self-service deletion.</p>
    <h2>What is kept</h2>
    <p>Public shared games, their text and images, game results and leaderboard scores remain under “Deleted user”, without your former account name or email. These records have no scheduled expiry. Internal references, reports, block records and moderation records may remain to preserve the community’s history and prevent abuse. They are not a working login.</p>
    <p>Account deletion does not automatically remove personal information you typed into a shared game or included in an uploaded image. To request removal of that content, email quizletgravity@gmail.com with the game link and identify the information to remove. You can request this without deleting your account.</p>
    <p>See the <a href="/privacy">privacy policy</a> for more information.</p>
  </main>;
}
