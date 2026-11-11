/*
  SNAPTRAP legal text — Terms & Conditions + Privacy Notice.

  !! This is a plain-language DRAFT written for a student research project. It is not legal advice.
  !! Have your university / a lawyer review it before you accept data from organisations other than
  !! your own test accounts, and before publishing anything derived from that data.

  When you change the text in a way users must re-accept, bump TERMS_VERSION here AND set the same
  value in the backend (env TERMS_VERSION, or the default in backend/account_flow.py).
  Signup and the re-acceptance gate send this string to the server; the server refuses a mismatch,
  so a stale browser tab can never "accept" text it didn't see.
*/
export const TERMS_VERSION = "2026-11-10";

const CONTACT =
  process.env.REACT_APP_LEGAL_CONTACT ||
  "the maintainer, via the issue tracker of the SNAPTRAP GitHub repository";

export const TERMS = [
  {
    id: "about",
    title: "1. What SNAPTRAP is",
    body: [
      "SNAPTRAP is a honeypot intelligence platform built and maintained by Zobiya as a student research and portfolio project. Decoy services you deploy record who connects to them and what they send; the platform stores that record, classifies it with a machine-learning model, and shows it on a dashboard.",
      "It is provided free, as-is, and may change, break, or go offline without notice (including cold starts on free hosting).",
    ],
  },
  {
    id: "account",
    title: "2. Your account",
    body: [
      "Give accurate details and a working email address; we verify it by sending you a link. Keep your password and agent token secret and tell us if you think either leaked. You are responsible for activity under your account, including any red-team accounts you create.",
    ],
  },
  {
    id: "use",
    title: "3. Acceptable use",
    list: [
      "Deploy agents and decoys only on networks and systems you own or are explicitly authorised to monitor.",
      "Do not use SNAPTRAP to attack, entrap, harass or deanonymise anyone, or to attempt to reach other organisations' data.",
      "Do not send data you have no right to share, and do not deliberately send personal data about your own staff or customers.",
      "Red-team features are for authorised testing of your own environment only.",
      "Do not overload, probe or reverse-engineer the service beyond normal use.",
    ],
  },
  {
    id: "training",
    title: "4. Telemetry and model training",
    body: [
      "“Telemetry” means the attack records your agents send us: the source IP address, timestamp, targeted service and port, the payload exactly as the remote party sent it (which can include usernames, passwords or commands they tried), threat score and the classification we attach.",
      "By accepting these Terms you give SNAPTRAP a non-exclusive, worldwide, royalty-free licence to use your Telemetry to train, evaluate and improve the attack-identification models, and to produce aggregate or de-identified results, including statistics and academic publications.",
    ],
    list: [
      "Pooled models: Telemetry from participating organisations is combined to train one shared model. Your Telemetry is not shown to other organisations.",
      "Not used for training: your account details, password hashes, agent tokens and verification data.",
      "Publication: any dataset or example we publish will be de-identified first (IP addresses truncated or hashed, credential values and organisation names removed). We will not publish raw payloads with identifying data.",
      "We do not sell Telemetry.",
      "Operator access: the maintainer can see all organisations' Telemetry, including cross-organisation IP correlation, to run, secure and improve the platform.",
      "Opt-out: you can switch off the use of your Telemetry for training at any time in Account → Data & consent. It then stops being used from the next scheduled retraining. Results already published, and aggregate statistics, are not reversed.",
    ],
  },
  {
    id: "advisory",
    title: "5. Classifications and blocklists are advisory",
    body: [
      "Models make mistakes. A “high risk” label or blocklist entry is a heuristic, not proof of malicious intent: shared networks, security researchers, scanners and mistaken visitors can all be flagged. Review before acting, and do not copy a blocklist into a production firewall without checking it.",
    ],
  },
  {
    id: "warranty",
    title: "6. No warranty; limit of liability",
    body: [
      "To the extent the law allows, SNAPTRAP is provided “as is” without warranties of any kind, and the maintainer is not liable for indirect or consequential loss, lost data, or security incidents on your systems. Nothing here limits liability that cannot lawfully be limited.",
    ],
  },
  {
    id: "end",
    title: "7. Suspension, termination and deletion",
    body: [
      "We may suspend accounts that break these Terms or put the service or other users at risk. You can request deletion of your account in Account → Danger zone; the maintainer will review and carry it out, and your organisation's Telemetry is deleted with it, except what has already been irreversibly aggregated or de-identified.",
    ],
  },
  {
    id: "changes",
    title: "8. Changes to these Terms",
    body: [
      "When these Terms change in a way that matters, the version date changes and you will be asked to accept the new version the next time you sign in. Continuing to use SNAPTRAP requires accepting it.",
    ],
  },
  {
    id: "law",
    title: "9. Governing law and contact",
    body: [
      `These Terms are governed by the laws of India. Questions, complaints or deletion requests: contact ${CONTACT}.`,
    ],
  },
];

export const PRIVACY = [
  {
    id: "collect",
    title: "1. What we collect",
    list: [
      "Account data: organisation name, email address, a salted Argon2id hash of your password (never the password), your agent token, whether your email is verified, and which version of the Terms you accepted and when.",
      "Telemetry: the attack records described in the Terms, §4 — source IP, time, service, port, payload, score, classification.",
      "Agent metadata: agent identifiers, versions, status and heartbeat times.",
      "Browser storage: your login token, theme preference and dashboard XP are kept in your browser's local storage. We set no advertising or tracking cookies.",
      "Fonts are loaded from Google Fonts, so Google receives your IP address when a page loads.",
    ],
  },
  {
    id: "why",
    title: "2. Why we use it",
    list: [
      "To run the service: sign-in, verification emails, dashboards, agent ingestion.",
      "To keep it secure: rate limiting, abuse prevention, cross-organisation correlation of attacking IPs.",
      "To improve detection: training and evaluating the classifier, and research publications (Terms §4). You can opt out of this purpose.",
    ],
  },
  {
    id: "third",
    title: "3. Data about third parties",
    body: [
      "Telemetry is data about whoever connected to your decoy: usually automated scanners, sometimes real people. IP addresses can be personal data. Payloads can contain credentials that someone typed, including credentials stolen from elsewhere. We use this only for security analysis and model training, and de-identify it before anything is published.",
    ],
  },
  {
    id: "share",
    title: "4. Who sees it",
    list: [
      "You, and the maintainer (including all organisations' Telemetry for operations and research).",
      "Service providers that run the platform: web hosting, the database provider and the transactional-email provider, as configured by the maintainer. They process data on our behalf.",
      "No sale of data, and no sharing with advertisers.",
    ],
  },
  {
    id: "retain",
    title: "5. How long we keep it",
    body: [
      "Account data and Telemetry are kept until you ask for deletion or the project is shut down. Unverified accounts may be removed after a reasonable period. Aggregate and de-identified results may be kept indefinitely.",
    ],
  },
  {
    id: "rights",
    title: "6. Your choices and rights",
    list: [
      "Opt out of model training any time in Account → Data & consent.",
      "Ask for access, correction or deletion of your data, or withdraw consent, by requesting it in the app or contacting us. We aim to respond within 30 days.",
      "Where India's Digital Personal Data Protection Act, 2023 (or, for people in the EU/UK, the GDPR) applies to you, you have the rights those laws give you; you may also complain to the competent authority.",
    ],
  },
  {
    id: "security",
    title: "7. Security",
    body: [
      "Passwords are hashed with Argon2id; verification tokens are stored only as hashes and expire after 24 hours; traffic is sent over HTTPS. No system is perfectly secure, so please use a unique password.",
    ],
  },
];

// Shown next to the signup checkbox and in the re-acceptance gate.
export const DATA_USE_SUMMARY = [
  "Your agents' attack records (attacker IP, time, service, payload) are used to train a shared detection model.",
  "Your account details, passwords and tokens are never used for training.",
  "Published results are de-identified. You can opt out of training any time in Account → Data & consent.",
];
