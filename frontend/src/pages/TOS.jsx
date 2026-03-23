import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export default function TOS() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Terms of Service</h1>
        <Link to="/login" className={styles.backLink}>← Back to sign in</Link>
      </header>
      <main className={styles.content}>
        <p>Last updated: March 2025</p>

        <h2>1. Acceptance</h2>
        <p>By accessing or using Bridge (“the Service”), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>Bridge is a web application that connects your Discord account with this platform. It allows verified users to send messages and interact with Discord servers through a web interface.</p>
        <p><strong>Bridge is not made by or endorsed by Discord.</strong> Discord and the Discord logo are trademarks of Discord Inc. This Service is an independent third-party application that uses Discord’s API.</p>

        <h2>3. User Accounts</h2>
        <p>You must create an account and verify your Discord identity to use the Service. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose or in violation of any laws</li>
          <li>Violate <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer">Discord’s Terms of Service</a> or <a href="https://discord.com/guidelines" target="_blank" rel="noopener noreferrer">Community Guidelines</a></li>
          <li>Harass, abuse, or harm others</li>
          <li>Attempt to gain unauthorized access to the Service or connected systems</li>
          <li>Interfere with or disrupt the Service</li>
        </ul>

        <h2>5. Termination</h2>
        <p>We may suspend or terminate your access to the Service at any time for violation of these terms or for any other reason. You may stop using the Service at any time by ceasing to access it.</p>

        <h2>6. Disclaimer</h2>
        <p>The Service is provided “as is” without warranties of any kind. We do not guarantee uninterrupted access or that the Service will meet your requirements.</p>

        <h2>7. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>

        <h2>8. Changes</h2>
        <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>

        <h2>9. Contact</h2>
        <p>For questions about these terms, contact <a href="mailto:james@potatogamer.uk">james@potatogamer.uk</a>.</p>
      </main>
    </div>
  );
}
