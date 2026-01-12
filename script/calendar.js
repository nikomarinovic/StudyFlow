const db = window.db;

// Calendar elements
const weekGrid = document.getElementById("week-grid");
const title = document.getElementById("calendar-title");
let currentDate = new Date();

// Create popup
const examPopup = document.createElement("div");
examPopup.id = "exam-popup";
document.body.appendChild(examPopup);

// Format date as dd/mm/yyyy
function formatDateEU(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2,'0');
    const month = String(date.getMonth()+1).padStart(2,'0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Get Monday of week
function getWeekStart(date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0,0,0,0);
    return monday;
}

// Format date as YYYY-MM-DD for Dexie
function formatDateUTC(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
}

// Render week
async function renderWeek() {
    weekGrid.innerHTML = "";
    const weekStart = getWeekStart(currentDate);
    const today = new Date();
    title.textContent = `${weekStart.toLocaleString("default",{month:"long"})} ${weekStart.getFullYear()}`;

    for(let i = 0; i < 7; i++){
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);

        const dayBox = document.createElement("div");
        dayBox.className = "day-box";
        if(day.toDateString() === today.toDateString()) dayBox.classList.add("today");

        dayBox.innerHTML = `
            <div class="day-name">${day.toLocaleString("default",{weekday:"short"})}</div>
            <div class="day-number">${day.getDate()}</div>
        `;

        const formatted = formatDateUTC(day);
        const events = await db.exams.where("date").equals(formatted).toArray();

        if(events.length > 0){
            const badge = document.createElement("div");
            badge.className = "event-count";
            badge.textContent = events.length;
            dayBox.appendChild(badge);
        }

        // Click to show popup
        dayBox.addEventListener("click", (e) => {
            examPopup.innerHTML = `<strong>${day.toDateString()}</strong><hr>`;

            if(events.length === 0){
                examPopup.innerHTML += "<p>No events</p>";
            } else {
                events.forEach(exam => {
                    const examDiv = document.createElement("div");
                    examDiv.style.display = "flex";
                    examDiv.style.justifyContent = "space-between";
                    examDiv.style.alignItems = "center";
                    examDiv.style.marginBottom = "0.5rem";

                    const left = document.createElement("span");
                    left.textContent = `${exam.name} (${exam.subject})`;

                    const right = document.createElement("span");
                    right.style.display = "flex";
                    right.style.gap = "0.5rem";

                    const dateSpan = document.createElement("span");
                    dateSpan.textContent = formatDateEU(exam.date);

                    const delBtn = document.createElement("button");
                    delBtn.textContent = "✖";
                    delBtn.addEventListener("click", async () => {
                        await db.exams.delete(exam.id);
                        renderWeek();
                        examPopup.style.display = "none";
                    });

                    right.appendChild(dateSpan);
                    right.appendChild(delBtn);

                    examDiv.appendChild(left);
                    examDiv.appendChild(right);
                    examPopup.appendChild(examDiv);
                });
            }

            const rect = dayBox.getBoundingClientRect();
            examPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
            examPopup.style.left = `${rect.left + window.scrollX}px`;
            examPopup.style.display = "block";
        });

        weekGrid.appendChild(dayBox);
    }
}

// Hide popup when clicking outside
document.addEventListener("click", (e) => {
    if(!e.target.closest(".day-box") && !e.target.closest("#exam-popup")){
        examPopup.style.display = "none";
    }
});

// Navigation
document.getElementById("prev-week").onclick = () => { currentDate.setDate(currentDate.getDate() - 7); renderWeek(); };
document.getElementById("next-week").onclick = () => { currentDate.setDate(currentDate.getDate() + 7); renderWeek(); };

// Initial render
window.addEventListener("DOMContentLoaded", () => renderWeek());

const upcomingExamsContainer = document.querySelector(".upcoming-exams-view");
const upcomingExamsList = document.createElement("ul");
upcomingExamsList.id = "upcoming-exams-list";
upcomingExamsList.className = "upcoming-exams-list";
upcomingExamsContainer.appendChild(upcomingExamsList);

const numberOfExams = document.getElementById("number-of-exams");

// Format date as dd/mm/yyyy
function formatDateEU(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2,'0');
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Render upcoming exams
async function renderUpcomingExams() {
    try {
        const exams = await db.exams.toArray();

        exams.sort((a,b) => new Date(a.date) - new Date(b.date));
        numberOfExams.textContent = exams.length;
        upcomingExamsList.innerHTML = "";

        const upcoming = exams.slice(0, 5); // max 5

        upcoming.forEach(exam => {
            const li = document.createElement("li");

            const left = document.createElement("span");
            left.textContent = `${exam.name} (${exam.subject})`;

            const right = document.createElement("span");
            right.className = "right";

            const dateSpan = document.createElement("span");
            dateSpan.textContent = formatDateEU(exam.date);

            const delBtn = document.createElement("button");
            delBtn.textContent = "✖";
            delBtn.addEventListener("click", async () => {
                await db.exams.delete(exam.id);
                renderUpcomingExams();
                if(typeof renderWeek === "function") renderWeek(); // update calendar if present
            });

            right.appendChild(dateSpan);
            right.appendChild(delBtn);

            li.appendChild(left);
            li.appendChild(right);

            upcomingExamsList.appendChild(li);
        });

        if(exams.length > 5){
            const moreLi = document.createElement("li");
            moreLi.textContent = `+${exams.length - 5} more`;
            moreLi.style.fontStyle = "italic";
            moreLi.style.color = "#555";
            upcomingExamsList.appendChild(moreLi);
        }

    } catch (error) {
        console.error("Error fetching exams:", error);
    }
}

// settings
renderUpcomingExams();

const settingsBtn = document.getElementById("settings-btn");
const settingsMenu = document.querySelector(".settings-menu");

settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (!e.target.closest(".settings-menu") && !e.target.closest("#settings-btn")) {
        settingsMenu.classList.remove("active");
    }
});

//add exam button
const addEventBtn = document.getElementById("add-event");
const modal = document.getElementById("add-exam-form");
const overlay = document.createElement("div"); 
overlay.id = "modal-overlay";
document.body.appendChild(overlay);

const form = document.getElementById("exam-form");
const hiddenInput = document.getElementById("exam-difficulty-value");


function openExamModal() {
    modal.classList.add("active");
    overlay.classList.add("active");
}

function closeExamModal() {
    modal.classList.remove("active");
    overlay.classList.remove("active");
    form.reset();
    hiddenInput.value = 0;
    colorDots(0);


    form.querySelectorAll(".input-status").forEach(status => {
        status.textContent = "!";
        status.style.backgroundColor = "red";
    });
}

addEventBtn.addEventListener("click", openExamModal);
overlay.addEventListener("click", closeExamModal);

// Difficulty selection
const dots = document.querySelectorAll(".difficulty-selector .dot");
const defaultColor = "lightgray";
const colors = ["#4CAF50", "#8BC34A", "#FFEB3B", "#FF9800", "#F44336"];

function colorDots(value) {
    const color = colors[value - 1] || defaultColor;
    dots.forEach((dot, i) => dot.style.backgroundColor = i < value ? color : defaultColor);
    updateDifficultyStatus();
}

dots.forEach(dot => {
    const value = parseInt(dot.dataset.value);
    dot.addEventListener("click", () => {
        colorDots(value);
        hiddenInput.value = value;
    });
    dot.addEventListener("mouseover", () => colorDots(value));
    dot.addEventListener("mouseout", () => colorDots(parseInt(hiddenInput.value)));
});

// Real-time input validation
const inputs = form.querySelectorAll("input:not([type=hidden])");
inputs.forEach(input => {
    const statusIcon = document.createElement("span");
    statusIcon.classList.add("input-status");
    statusIcon.textContent = "!";
    statusIcon.style.backgroundColor = "red";
    input.parentElement.appendChild(statusIcon);

    input.addEventListener("input", () => {
        if (input.value.trim() === "") {
            statusIcon.textContent = "!";
            statusIcon.style.backgroundColor = "red";
        } else {
            statusIcon.textContent = "✔";
            statusIcon.style.backgroundColor = "green";
        }
    });
});

// Difficulty status
const difficultyStatus = document.createElement("span");
difficultyStatus.classList.add("input-status");
difficultyStatus.textContent = "!";
difficultyStatus.style.backgroundColor = "red";
document.querySelector("#exam-difficulty").parentElement.appendChild(difficultyStatus);

function updateDifficultyStatus() {
    if (parseInt(hiddenInput.value) > 0) {
        difficultyStatus.textContent = "✔";
        difficultyStatus.style.backgroundColor = "green";
    } else {
        difficultyStatus.textContent = "!";
        difficultyStatus.style.backgroundColor = "red";
    }
}

// Update upcoming exams count
async function updateUpcomingExams() {
    try {
        const exams = await window.db.exams.toArray();
        numberOfExams.textContent = exams.length;
    } catch (error) {
        console.error("Error fetching exams:", error);
    }
}
updateUpcomingExams();

// Add new exam
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("exam-name").value.trim();
    const date = document.getElementById("exam-date").value;
    const subject = document.getElementById("exam-subject").value.trim();
    const difficulty = parseInt(hiddenInput.value) || 0;

    if (!name || !date || !subject || difficulty === 0) {
        alert("Please fill in all fields and select a difficulty.");
        return;
    }

    try {
        await window.db.exams.add({ name, date, subject, difficulty });
        closeExamModal();
        alert("Exam added successfully!");
        // Refresh the page to show new exam in calendar and list
        location.reload();
    } catch (error) {
        console.error("Error adding exam:", error);
        alert("Failed to add exam.");
    }
});