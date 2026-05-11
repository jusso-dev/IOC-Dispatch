export interface CustomWebFormConfig {
  providerName: string;
  loginUrl?: string;
  submissionUrl: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitLoginSelector?: string;
  indicatorFieldSelector: string;
  commentFieldSelector?: string;
  submitReportSelector: string;
  successSelector?: string;
  failureSelector?: string;
  /** Selectors that, if seen, must abort with manual_required. */
  captchaSelectors?: string[];
  /** Optional pre-submission action like opening a "new report" tab. */
  preSubmissionSelector?: string;
}
