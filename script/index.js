// User data elements
var studyScore = document.getElementById("study-score");
var currentStreak = document.getElementById("current-streak");
var studiedToday = document.getElementById("studied-today");
var weaklyGoalProgress = document.getElementById("weekly-goal-progress");
// Upcoming users exams element
var numberOfExams = document.getElementById("number-of-exams");

// Button elements
function StartStudyBtn() {
    window.location.href = "stopwatch.html";
}

// Greeting message update
var greetingMsg = document.getElementById("greeting-msg");
function updateGreeting() {
    var now = new Date();
    var hours = now.getHours();
    if (hours < 12) {
        greetingMsg.textContent = "Good Morning!";
    } else if (hours < 18) {
        greetingMsg.textContent = "Good Afternoon!";
    } else {
        greetingMsg.textContent = "Good Evening!";
    }
}
updateGreeting();   

// Exam modal functionality and form
const modal = document.getElementById("add-exam-form");
const overlay = document.getElementById("modal-overlay");

function openExamModal() {
    modal.classList.add("active");
    overlay.classList.add("active");
}

function closeExamModal() {
    modal.classList.remove("active");
    overlay.classList.remove("active");

    const form = document.getElementById("exam-form");
    form.reset(); 

    const value = 0;
    hiddenInput.value = value;
    colorDots(value); 

    const inputStatuses = form.querySelectorAll(".input-status");
    inputStatuses.forEach(status => {
        status.textContent = "!";
        status.style.backgroundColor = "red";
    });
}

// Close modal when clicking outside
overlay.addEventListener("click", closeExamModal);

//exam difficulty selection
const dots = document.querySelectorAll(".difficulty-selector .dot");
const hiddenInput = document.getElementById("exam-difficulty-value");
const defaultColor = "lightgray";
const colors = ["#4CAF50", "#8BC34A", "#FFEB3B", "#FF9800", "#F44336"];

function colorDots(value) {
    const color = colors[value - 1]; 
    dots.forEach((dot, i) => {
        dot.style.backgroundColor = i < value ? color : defaultColor;
    });
}

dots.forEach(dot => {
    const value = parseInt(dot.dataset.value);

    dot.addEventListener("click", () => {
        colorDots(value);
        hiddenInput.value = value;
    });

    dot.addEventListener("mouseover", () => {
        colorDots(value);
    });

    dot.addEventListener("mouseout", () => {
        const savedValue = parseInt(hiddenInput.value);
        colorDots(savedValue);
    });
});

// real-time input validation
const form = document.getElementById("exam-form");
const inputs = form.querySelectorAll("input:not([type=hidden])");

inputs.forEach(input => {
    const statusIcon = input.nextElementSibling; 

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

const difficultyInput = document.getElementById("exam-difficulty-value");
const difficultyStatus = document.querySelector("#exam-difficulty").parentElement.querySelector(".input-status");

document.querySelectorAll("#exam-difficulty .dot").forEach(dot => {
    dot.addEventListener("click", () => {
        if (parseInt(difficultyInput.value) > 0) {
            difficultyStatus.textContent = "✔";
            difficultyStatus.style.backgroundColor = "green";
        } else {
            difficultyStatus.textContent = "!";
            difficultyStatus.style.backgroundColor = "red";
        }
    });
});