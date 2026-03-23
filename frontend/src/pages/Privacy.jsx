import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export default function Privacy() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Privacy Policy</h1>
        <Link to="/login" className={styles.backLink}>← Back to sign in</Link>
      </header>
      <main className={styles.content}>
        <p>Last updated: March 2025</p>

        <h2>1. Information We Collect</h2>
        <p>We collect:</p>
        <ul>
          <li>Account data: username and password (hashed)</li>
          <li>Discord data: user ID, username, display name, and avatar (when you verify your Discord account)</li>
          <li>Usage data: messages you send through the Service, for logging and audit purposes</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and operate the Service</li>
          <li>Verify your Discord identity and link it to your account</li>
          <li>Support Discord Linked Roles (e.g., indicating you have a verified site account)</li>
          <li>Maintain security and prevent abuse</li>
        </ul>

        <h2>3. Discord Integration</h2>
        <p>Bridge integrates with Discord. When you verify, we store your Discord ID and associated profile data. If you use Discord Linked Roles, we may pass metadata (e.g., verified status) to Discord’s role connection API. Discord’s use of data is governed by <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">Discord’s Privacy Policy</a>.</p>

        <h2>4. Data Storage</h2>
        <p>Your data is stored on our servers. Passwords are hashed and not stored in plain text. We retain data for as long as your account exists and as needed for legal or operational purposes.</p>

        <h2>5. Sharing</h2>
        <p>We do not sell your data. We may share data with Discord as part of the verification and Linked Roles flow. We may disclose data if required by law or to protect our rights and safety.</p>

        <h2>6. Security</h2>
        <p>We use reasonable measures to protect your data, including encrypted connections (HTTPS) and secure storage. No system is completely secure; you use the Service at your own risk.</p>

        <h2>7. Your Rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data by contacting us. You can stop using the Service and request account deletion at any time.</p>

        <h2>8. Changes</h2>
        <p>We may update this privacy policy from time to time. We will indicate the last updated date at the top. Continued use after changes constitutes acceptance.</p>

        <h2>9. Contact</h2>
        <p>For privacy-related questions, contact <a href="mailto:james@potatogamer.uk">james@potatogamer.uk</a>.</p>
      </main>
    </div>
  );
}
