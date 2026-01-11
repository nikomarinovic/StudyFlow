
// User stats elements

const studyScore = document.getElementById("study-score");
const currentStreak = document.getElementById("current-streak");
const studiedToday = document.getElementById("studied-today");
const weaklyGoalProgress = document.getElementById("weekly-goal-progress");
const numberOfExams = document.getElementById("number-of-exams");


// Start Study Button

function StartStudyBtn() {
    window.location.href = "stopwatch.html";
}


// Greeting

const greetingMsg = document.getElementById("greeting-msg");
function updateGreeting() {
    const hours = new Date().getHours();
    greetingMsg.textContent = hours < 12 ? "Good Morning!" : hours < 18 ? "Good Afternoon!" : "Good Evening!";
}
updateGreeting();


// Exam modal

const modal = document.getElementById("add-exam-form");
const overlay = document.getElementById("modal-overlay");
const form = document.getElementById("exam-form");
const hiddenInput = document.getElementById("exam-difficulty-value");

// Open / Close modal
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

overlay.addEventListener("click", closeExamModal);


// Difficulty selection

const dots = document.querySelectorAll(".difficulty-selector .dot");
const defaultColor = "lightgray";
const colors = ["#4CAF50", "#8BC34A", "#FFEB3B", "#FF9800", "#F44336"];

function colorDots(value) {
    const color = colors[value - 1] || defaultColor;
    dots.forEach((dot, i) => dot.style.backgroundColor = i < value ? color : defaultColor);
}

dots.forEach(dot => {
    const value = parseInt(dot.dataset.value);
    dot.addEventListener("click", () => { colorDots(value); hiddenInput.value = value; updateDifficultyStatus(); });
    dot.addEventListener("mouseover", () => colorDots(value));
    dot.addEventListener("mouseout", () => colorDots(parseInt(hiddenInput.value)));
});


// Real-time input validation

const inputs = form.querySelectorAll("input:not([type=hidden])");
inputs.forEach(input => {
    const statusIcon = input.nextElementSibling;
    input.addEventListener("input", () => {
        if(input.value.trim() === "") {
            statusIcon.textContent = "!";
            statusIcon.style.backgroundColor = "red";
        } else {
            statusIcon.textContent = "✔";
            statusIcon.style.backgroundColor = "green";
        }
    });
});


// Difficulty status

const difficultyStatus = document.querySelector("#exam-difficulty").parentElement.querySelector(".input-status");
function updateDifficultyStatus() {
    if(parseInt(hiddenInput.value) > 0) {
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
        updateUpcomingExams();

        alert("Exam added successfully!");
    } catch (error) {
        console.error("Error adding exam:", error);
        alert("Failed to add exam.");
    }
});

//upcoming exams list on index (home page)

const upcomingExamsList = document.getElementById("upcoming-exams-list");

function formatDateEU(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

async function updateUpcomingExams() {
    try {
        const exams = await window.db.exams.toArray();

        // Sort by date ascending
        exams.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Update count
        numberOfExams.textContent = exams.length;

        // Clear list
        upcomingExamsList.innerHTML = "";

        // Show up to 3 exams
        const upcoming = exams.slice(0, 3);

        upcoming.forEach(exam => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            // Left: name and subject
            const left = document.createElement("span");
            left.textContent = `${exam.name} (${exam.subject})`;

            // Right: date + delete button
            const right = document.createElement("span");
            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.gap = "0.5rem";

            const dateSpan = document.createElement("span");
            dateSpan.textContent = formatDateEU(exam.date);

            const delBtn = document.createElement("button");
            delBtn.textContent = "✖";
            delBtn.style.color = "red";
            delBtn.style.border = "none";
            delBtn.style.background = "transparent";
            delBtn.style.cursor = "pointer";
            delBtn.addEventListener("click", async () => {
                await window.db.exams.delete(exam.id);
                updateUpcomingExams();
            });

            right.appendChild(dateSpan);
            right.appendChild(delBtn);

            li.appendChild(left);
            li.appendChild(right);

            upcomingExamsList.appendChild(li);
        });

        if (exams.length > 3) {
            const moreLi = document.createElement("li");
            moreLi.textContent = `+${exams.length - 3} more`;
            moreLi.style.fontStyle = "italic";
            moreLi.style.color = "#555";
            upcomingExamsList.appendChild(moreLi);
        }

    } catch (error) {
        console.error("Error fetching exams:", error);
    }
}

updateUpcomingExams();