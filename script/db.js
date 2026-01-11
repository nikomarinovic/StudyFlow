// db.js
window.db = new Dexie("studyPlannerDB");
window.db.version(1).stores({
    exams: "++id, date, name, subject, difficulty"
});