// Initialize Dexie database
const db = new Dexie("studyPlannerDB");
db.version(1).stores({
    exams: "++id, date, name" // id, date (YYYY-MM-DD), name
});

const weekGrid = document.getElementById("week-grid");
const title = document.getElementById("calendar-title");
let currentDate = new Date();

// Get Monday of the week
function getWeekStart(date) {
    const day = date.getDay(); // 0 = Sunday
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split("T")[0];
}

// Render the week
function renderWeek() {
    weekGrid.innerHTML = "";
    const weekStart = getWeekStart(currentDate);
    const today = new Date();

    // Month + Year display
    title.textContent = `${weekStart.toLocaleString("default", { month: "long" })} ${weekStart.getFullYear()}`;

    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);

        const dayBox = document.createElement("div");
        dayBox.className = "day-box";

        if (day.toDateString() === today.toDateString()) dayBox.classList.add("today");

        dayBox.innerHTML = `
            <div class="day-name">${day.toLocaleString("default", { weekday: "short" })}</div>
            <div class="day-number">${day.getDate()}</div>
        `;

        // Load events from Dexie
        const formatted = formatDate(day);
        db.exams.where("date").equals(formatted).toArray().then(events => {
            if (events.length > 0) {
                const badge = document.createElement("div");
                badge.className = "event-count";
                badge.textContent = events.length;
                dayBox.appendChild(badge);
            }

            // Click to show events
            dayBox.addEventListener("click", () => {
                if (events.length === 0) alert(`${formatted}\nNo events`);
                else alert(`${formatted}\n${events.map(e => e.name).join("\n")}`);
            });
        });

        weekGrid.appendChild(dayBox);
    }
}

// Navigation
document.getElementById("prev-week").onclick = () => {
    currentDate.setDate(currentDate.getDate() - 7);
    renderWeek();
};
document.getElementById("next-week").onclick = () => {
    currentDate.setDate(currentDate.getDate() + 7);
    renderWeek();
};

// Initial render
renderWeek();

//test events

//db.exams.add({ name: "Math Exam", date: formatDate(new Date()) });
//db.exams.add({ name: "Project Reminder", date: formatDate(new Date(new Date().setDate(new Date().getDate() + 2))) });