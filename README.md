# StudyFlow

A **privacy-first weekly study planner** for students. Add exams and project reminders, view a dynamic week calendar with event counts, and organize your study schedule — all data is stored locally in your browser using Dexie.js.

---

## 🚧 Under Construction

**Note:** This is an early version of StudyFlow. 

- Current version includes only the UI: index.html, calendar.html, and stopwatch page.  
- Functionality like adding events, generating study plans, tracking study sessions, and notifications is **not implemented yet**.  
- Future versions will add full Dexie.js integration and all planned features.

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Versions](#versions)
- [License](#license)
- [Notes](#notes)

---

## Features

- **Weekly calendar view** – `Displays one week at a time with easy navigation between weeks.`  
- **Add and manage exams and project reminders** – `Create, edit, and delete events.`  
- **Dynamic event badges** – `Each day shows the number of scheduled events.`  
- **Click to view event details** – `See full list of events for any day.`  
- **Study plan generation** – `Automatically create daily study schedules leading up to exams or project deadlines.`  
- **Study tracking and scoring** – `Track completed study sessions and get a study score.`  
- **Privacy-focused** – `All data is stored locally using Dexie.js; no personal data is uploaded.`  
- **Responsive design** – `Fully functional on desktop and mobile browsers.`  
- **Optional notifications** – `Remind users of upcoming exams or study sessions.`  

---

## Getting Started

#### 1. Clone the repository

```bash
git clone https://github.com/Nmarino8/StudyFlow.git
```

#### 2. Open the project

- Open the folder in your preferred code editor (e.g., VS Code).

#### 3. Open in browser

-	Simply open index.html (or calendar.html) in a modern browser.
-	The weekly calendar will display, and you can add events programmatically or through future UI additions.

#### 4. Adding events

- Events are stored locally using Dexie.js.
- For testing, some sample events are already included in calendar.js:

```js
db.exams.add({ name: "Math Exam", date: "2026-01-05" });
db.exams.add({ name: "Project Reminder", date: "2026-01-07" });
```

> You can add more events manually or later through the UI.

---

## Usage

-	Navigate weeks using Next / Previous buttons.
-	Click any day to see the events scheduled for that date.
-	Event badges automatically update based on the local Dexie database.

---

## Versions

#### [v1.0.0] – 5.1.2026.  
> Initial release: basic UI for StudyFlow including weekly calendar layout, calendar.html, index.html, and stopwatch page. Functionality is limited; mainly interface and structure.

#### [v1.1.0] – 11.1.2026.  
> Added Add Exam modal UI with difficulty selector, validation visuals, and modal layout (UI only, no functionality yet).


---

## License

This project is **open-source** for personal and educational use. You are free to:

-	Use it for yourself
-	Modify it
-	Contribute improvements
-	Share it with others

**You may not use this project or its code for commercial purposes or sell it.** 

---

## Notes

```text
-	All data is stored locally in the browser. No cloud storage is used for privacy.
-	Dexie.js is used to simplify IndexedDB interactions and make local storage reliable.
-	Test events can be removed anytime by clearing the database in calendar.js or browser dev tools.
```

---
