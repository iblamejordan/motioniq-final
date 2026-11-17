/*
 * MOTIONIQ – project data that must come from the real experiment.
 * ---------------------------------------------------------------
 * Nothing on the website is invented. Every value below is either
 * null (shown as a labelled placeholder) or clearly flagged.
 *
 * TO PUBLISH VERIFIED RESULTS:
 *   1. Re-run / open your saved Random Forest experiment.
 *   2. Copy the real numbers in here.
 *   3. Set verified: true.
 * Only then will the page show animated counters, the real confusion
 * matrix and the real classification report.
 */
window.MOTIONIQ_RESULTS = {
  verified: false,

  // Earlier preliminary experiment, reported as approximate and NOT yet checked
  // against the saved experiment. Shown only as a "preliminary" note.
  preliminary: { model: "Random Forest", accuracyPercent: 92.5, note: "approximate, unverified" },

  // Fill these once verified (accuracy as a percentage, e.g. 92.5).
  accuracy: null,

  // Row/column order must match `labels`. 6x6 array of counts, rows = true class.
  labels: ["Walking", "Walking Upstairs", "Walking Downstairs", "Sitting", "Standing", "Laying"],
  confusionMatrix: null,

  // One entry per label: { precision: 0-1, recall: 0-1, f1: 0-1, support: integer }
  classReport: null
};

/*
 * Technology status. Edit to match what you have actually done.
 *   "used"    – used in your preliminary experiment / code
 *   "planned" – intended but not yet implemented
 * Statuses here are a best guess from the project description; please confirm.
 */
window.MOTIONIQ_TECH = {
  "Python": "used",
  "NumPy": "planned",
  "Pandas": "planned",
  "Scikit-learn": "used",
  "Matplotlib": "planned",
  "Plotly": "planned",
  "Streamlit": "planned",
  "Joblib": "planned",
  "Visual Studio Code": "planned",
  "GitHub": "planned"
};
