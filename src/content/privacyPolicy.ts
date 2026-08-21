// Konnect Privacy Policy — copied from the web app (konnect_react
// src/pages/Privacy.js, privacySections) per the Figma annotation on
// Profile_Setting_PrivacyPolicy ("please copy&paste the policy in here").
// Legal copy is kept in English (single source of truth with the website).

export type PolicyBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string };

export interface PolicySection {
  title: string;
  blocks: PolicyBlock[];
}

const p = (text: string): PolicyBlock => ({ kind: 'paragraph', text });
const h = (text: string): PolicyBlock => ({ kind: 'heading', text });
const b = (text: string): PolicyBlock => ({ kind: 'bullet', text });

export const PRIVACY_POLICY: { intro: string; lastUpdated: string; sections: PolicySection[] } = {
  intro:
    'At Konnect.kr, your privacy is our priority. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. It applies to our website, mobile application, and all related services. By using our service, you consent to the data practices described in this policy.',
  lastUpdated: 'Last updated: August 2026',
  sections: [
    {
      title: 'Information We Collect',
      blocks: [
        p('We collect information you provide directly to us, information we get from your use of our services, and information from third-party sources.'),
        h('Information You Provide:'),
        b('Account information (name, email, password)'),
        b('Profile information (location, interests, preferences)'),
        b('Content you create or share (posts, comments, messages)'),
        b('Communication with us (support requests, feedback)'),
        b('Payment information (processed securely by third parties)'),
        h('Information We Collect Automatically:'),
        b('Device information (IP address, browser type, operating system)'),
        b('Usage data (pages visited, features used, time spent)'),
        b('Location information (with your permission)'),
        b('Log data (access times, error logs, performance data)'),
      ],
    },
    {
      title: 'How We Use Your Information',
      blocks: [
        p('We use the information we collect to provide, maintain, and improve our services:'),
        b('Provide and personalize our services'),
        b('Process transactions and send related information'),
        b('Send technical notices, updates, and administrative messages'),
        b('Respond to your comments, questions, and customer service requests'),
        b('Monitor and analyze trends and usage patterns'),
        b('Detect, prevent, and address security issues'),
        b('Improve our AI and machine learning capabilities'),
        b('Comply with legal obligations'),
      ],
    },
    {
      title: 'Information Sharing and Disclosure',
      blocks: [
        p('We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:'),
        b('With your consent: When you explicitly agree to share information'),
        b('Service providers: Third parties who perform services on our behalf'),
        b('Business transfers: In connection with mergers, acquisitions, or asset sales'),
        b('Legal requirements: To comply with laws, regulations, or legal processes'),
        b('Safety and security: To protect our users and prevent harm'),
        b('Aggregated data: Non-personally identifiable information for analytics'),
      ],
    },
    {
      title: 'Data Security',
      blocks: [
        p('We implement appropriate security measures to protect your personal information:'),
        b('Encryption of data in transit and at rest'),
        b('Regular security audits and penetration testing'),
        b('Access controls and authentication measures'),
        b('Employee training on data protection'),
        b('Incident response procedures'),
        b('Compliance with industry standards and regulations'),
        p('While we strive to protect your personal information, no method of transmission over the internet or electronic storage is 100% secure.'),
      ],
    },
    {
      title: 'Cookies and Tracking Technologies',
      blocks: [
        p('We use cookies and similar tracking technologies to collect and use personal information about you:'),
        h('Types of Cookies We Use:'),
        b('Essential: Required for basic site functionality'),
        b('Analytics: Help us understand how you use our service'),
        b('Functional: Remember your preferences and settings'),
        b('Advertising: Deliver relevant ads and measure effectiveness'),
        p('You can control cookies through your browser settings, but disabling certain cookies may affect functionality.'),
      ],
    },
    {
      title: 'Your Privacy Rights',
      blocks: [
        p('Depending on your location, you may have certain rights regarding your personal information:'),
        b('Access: Request a copy of your personal information'),
        b('Correction: Request correction of inaccurate information'),
        b('Deletion: Request deletion of your personal information'),
        b('Portability: Request transfer of your data to another service'),
        b('Restriction: Request limitation of processing'),
        b('Objection: Object to certain types of processing'),
        b('Withdrawal: Withdraw consent for processing based on consent'),
        p('To exercise these rights, please contact us using the information provided below.'),
      ],
    },
    {
      title: "Children's Privacy",
      blocks: [
        p('Our service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.'),
        p('If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete such information.'),
      ],
    },
    {
      title: 'International Data Transfers',
      blocks: [
        p('Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.'),
        p('We participate in data protection frameworks and use standard contractual clauses to protect your information during international transfers.'),
      ],
    },
    {
      title: 'Data Retention',
      blocks: [
        p('We retain your personal information only as long as necessary to fulfill the purposes for which it was collected:'),
        b('Account information: Until you delete your account'),
        b('Usage data: Typically 2-3 years for analytics purposes'),
        b('Communication records: 3-7 years as required by law'),
        b('Marketing data: Until you unsubscribe or object'),
      ],
    },
    {
      title: 'Changes to This Privacy Policy',
      blocks: [
        p('We may update this Privacy Policy from time to time. We will notify you of any material changes by:'),
        b('Posting the new policy on this page'),
        b('Sending you an email notification'),
        b('Displaying a prominent notice in our service'),
        p('Your continued use of our service after any changes constitutes acceptance of the updated policy.'),
      ],
    },
    {
      title: 'Questions About Privacy?',
      blocks: [
        p('If you have any questions about this Privacy Policy or our data practices, please contact us at care@konnect.kr or through Contact us in the app.'),
      ],
    },
  ],
};
