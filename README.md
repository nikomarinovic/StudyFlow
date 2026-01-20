# StudyFlow

A **privacy-first weekly study planner** for students. Organize your study schedule, add exams and project reminders, view a dynamic weekly calendar with event counts, and track your progress — all data is stored locally in your browser using **Dexie.js**.

---

## 🚧 Under Construction

**Note:** StudyFlow is still in early development.

- We have a **fully functional local version** with Firebase authentication and database, but it is **not yet publicly available**.  
- The current public version includes the redesigned UI for authentication, dashboard, calendar, and stopwatch pages.  
- All main features—adding events, generating study plans, tracking study sessions, and notifications—are **already implemented in the local version** and will be available in future public releases.

---

## 📸 Screenshots

### Landing Page
![Landing Page](Screenshots/landing_page_beta.png)

### Dashboard
![Dashboard](Screenshots/dashboard_beta.png)

### Login
![Authentication](Screenshots/authentication_beta.png)

### Calendar
![Calendar](Screenshots/calendar_beta.png)

### Pomodoro Timer 
![Timer](Screenshots/timer_beta.png)

> [!IMPORTANT]
> Screenshots show the current UI; functionality will be added in future versions.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Weekly calendar view** – Displays one week at a time with easy navigation between weeks.  
- **Add and manage exams and project reminders** – Create, edit, and delete events.  
- **Dynamic event badges** – Each day shows the number of scheduled events.  
- **Click to view event details** – See full list of events for any day.  
- **Study plan generation** – Automatically create daily study schedules leading up to exams or project deadlines.  
- **Study tracking and scoring** – Track completed study sessions and get a study score.  
- **Privacy-focused** – All data is stored locally using Dexie.js; no personal data is uploaded.  
- **Responsive design** – Works on both desktop and mobile browsers.  
- **Optional notifications** – Remind users of upcoming exams or study sessions.

---

## Installation

> [!IMPORTANT]
> To run StudyFlow locally, you need **Node.js** and **npm** installed.

1. **Install Node.js and npm**  

Download and install from [https://nodejs.org/](https://nodejs.org/)  

Verify installation in terminal:

```bash
node -v
npm -v
```
2.	Clone the repository

```bash
git clone https://github.com/Nmarino8/StudyFlow.git
cd StudyFlow
```

3.	Install dependencies

```bash
npm install
```

---

## Getting Started

1. **Open the project in your code editor**

> [!TIP]
> We recommend using **Visual Studio Code** for the best experience.

2. **Run a local development server**

You can use **Vite**, **Live Server**, or any local development server.  

If using Vite, run:

```bash
npm install
npm run dev
```

The terminal will show the local address (usually http://localhost:3000). Open this in your browser.

3.	**Explore the app**

-	index.html – Access authentication and dashboard pages.
-	calendar.html – View and interact with the weekly calendar.
-	stopwatch.html – Access the study timer/pomodoro page.

---

## Usage
-	Navigate weeks using Next / Previous buttons.
-	Click any day to see scheduled events.
-	Event badges update automatically based on the local Dexie.js database.

---

## Contributing

We welcome contributions! To contribute:

1.	Fork the repository

2.	Create a feature branch:
```bash
git checkout -b feature/my-feature
```
3.	Commit your changes:
```bash
git commit -m "Add new feature"
```
4.	Push to the branch:
```bash
git push origin feature/my-feature
```
5.	Open a pull request.

---

> [!NOTE]
>	All data is stored locally in the browser; no cloud storage is used.
>	Dexie.js simplifies IndexedDB interactions to make local storage reliable.
>	Test events can be removed at any time by clearing the database via browser dev tools.

---

## License

**StudyFlow** is licensed for **personal, educational, and contribution purposes only**.  
You may **use, modify, and contribute** to the project locally, but **commercial use, resale, or distribution for profit is prohibited**.

### License Text

Copyright (c) 2026 [Niko Marinović](https://github.com/Nmarino8)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to:

- Use the Software **locally for personal or educational purposes**  
- Modify, merge, and contribute to the Software  

**Restrictions:**  

- You may **not sell, distribute, or use the Software for commercial purposes**  
- You may **not copy the design or UI** for commercial projects  

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

> [!WARNING]
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.

---

> [!IMPORTANT]
> Stay tuned for updates — full functionality and features are coming soon!

---
