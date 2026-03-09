// Toggle input visibility based on selected algorithm
function toggleInputs() {
    const algo = document.getElementById('algo').value;

    document.getElementById('q-input-box').style.display =
        (algo === 'RR') ? 'block' : 'none';

    document.getElementById('p-input-box').style.display =
        (algo.includes('Priority')) ? 'block' : 'none';

    document.getElementById('p-logic-box').style.display =
        (algo.includes('Priority')) ? 'block' : 'none';
}

window.onload = toggleInputs;


// Main Calculate Function
function calculate() {

    const arrivalArr = document.getElementById('arrival').value
        .split(/\s+/).filter(x => x !== "").map(Number);

    const burstArr = document.getElementById('burst').value
        .split(/\s+/).filter(x => x !== "").map(Number);

    const priorityArr = document.getElementById('priority').value
        .split(/\s+/).filter(x => x !== "").map(Number);

    const pLogic = document.getElementById('priority-logic').value;
    const quantum = parseInt(document.getElementById('quantum').value) || 2;
    const algo = document.getElementById('algo').value;

    if (arrivalArr.length !== burstArr.length) {
        alert("Arrival Time and Burst Time must have same length!");
        return;
    }

    let processes = arrivalArr.map((at, i) => ({
        id: `P${i + 1}`,
        at: at,
        bt: burstArr[i],
        remainingBt: burstArr[i],
        priority: priorityArr[i] || 0,
        color: `hsl(${(i * 137.5) % 360}, 70%, 55%)`
    }));

    let currentTime = 0,
        completed = 0,
        n = processes.length;

    let schedule = [],
        results = [],
        totalIdleTime = 0;


    // ================= FCFS =================
    if (algo === "FCFS") {

        processes.sort((a, b) => a.at - b.at);

        processes.forEach(p => {
            if (currentTime < p.at) {
                totalIdleTime += (p.at - currentTime);
                currentTime = p.at;
            }

            schedule.push({
                id: p.id,
                start: currentTime,
                end: currentTime + p.bt,
                color: p.color
            });

            p.ft = currentTime + p.bt;
            p.tat = p.ft - p.at;
            p.wt = p.tat - p.bt;

            currentTime = p.ft;
            results.push(p);
        });
    }


    // ================= SJF & Priority (Non-Preemptive) =================
    else if (algo === "SJF" || algo === "Priority") {

        let isDone = new Array(n).fill(false);

        while (completed < n) {

            let idx = -1;
            let bestVal = (algo === "SJF" || pLogic === "low")
                ? Infinity : -Infinity;

            for (let i = 0; i < n; i++) {

                if (processes[i].at <= currentTime && !isDone[i]) {

                    let currentVal = (algo === "SJF")
                        ? processes[i].bt
                        : processes[i].priority;

                    if (algo === "SJF" || pLogic === "low") {
                        if (currentVal < bestVal) {
                            bestVal = currentVal;
                            idx = i;
                        }
                    } else {
                        if (currentVal > bestVal) {
                            bestVal = currentVal;
                            idx = i;
                        }
                    }
                }
            }

            if (idx !== -1) {

                let p = processes[idx];

                schedule.push({
                    id: p.id,
                    start: currentTime,
                    end: currentTime + p.bt,
                    color: p.color
                });

                p.ft = currentTime + p.bt;
                p.tat = p.ft - p.at;
                p.wt = p.tat - p.bt;

                currentTime = p.ft;
                isDone[idx] = true;
                completed++;
                results.push(p);

            } else {
                totalIdleTime++;
                currentTime++;
            }
        }
    }


    // ================= Round Robin =================
    else if (algo === "RR") {

        let time = 0;
        let queue = [...processes.map((_, i) => i)];
        let remaining = processes.map(p => p.bt);

        while (queue.length > 0) {

            let idx = queue.shift();
            let p = processes[idx];

            if (remaining[idx] > quantum) {

                schedule.push({
                    id: p.id,
                    start: time,
                    end: time + quantum,
                    color: p.color
                });

                time += quantum;
                remaining[idx] -= quantum;
                queue.push(idx);

            } else {

                schedule.push({
                    id: p.id,
                    start: time,
                    end: time + remaining[idx],
                    color: p.color
                });

                time += remaining[idx];

                p.ft = time;
                p.tat = time - p.at;
                p.wt = p.tat - p.bt;

                remaining[idx] = 0;
                completed++;
                results.push(p);
            }
        }

        currentTime = time;
    }


    // ================= SRTF (Preemptive SJF) =================
    else if (algo === "SRTF") {

        let isDone = new Array(n).fill(false);

        while (completed < n) {

            let idx = -1;
            let minRemaining = Infinity;

            for (let i = 0; i < n; i++) {
                if (processes[i].at <= currentTime &&
                    !isDone[i] &&
                    processes[i].remainingBt < minRemaining) {

                    minRemaining = processes[i].remainingBt;
                    idx = i;
                }
            }

            if (idx !== -1) {

                let p = processes[idx];

                if (schedule.length > 0 &&
                    schedule[schedule.length - 1].id === p.id) {

                    schedule[schedule.length - 1].end++;

                } else {

                    schedule.push({
                        id: p.id,
                        start: currentTime,
                        end: currentTime + 1,
                        color: p.color
                    });
                }

                p.remainingBt--;
                currentTime++;

                if (p.remainingBt === 0) {
                    p.ft = currentTime;
                    p.tat = p.ft - p.at;
                    p.wt = p.tat - p.bt;
                    isDone[idx] = true;
                    completed++;
                    results.push(p);
                }

            } else {
                totalIdleTime++;
                currentTime++;
            }
        }
    }


    // ================= Priority (Preemptive) =================
    else if (algo === "Priority-Preemptive") {

        let isDone = new Array(n).fill(false);
        let last = null;

        while (completed < n) {

            let idx = -1;
            let bestPriority = (pLogic === "low")
                ? Infinity : -Infinity;

            for (let i = 0; i < n; i++) {

                if (processes[i].at <= currentTime && !isDone[i]) {

                    let val = processes[i].priority;

                    if ((pLogic === "low" && val < bestPriority) ||
                        (pLogic === "high" && val > bestPriority)) {

                        bestPriority = val;
                        idx = i;
                    }
                }
            }

            if (idx === -1) {
                totalIdleTime++;
                currentTime++;
                continue;
            }

            if (last !== processes[idx].id) {
                schedule.push({
                    id: processes[idx].id,
                    start: currentTime,
                    end: currentTime + 1,
                    color: processes[idx].color
                });
            } else {
                schedule[schedule.length - 1].end++;
            }

            processes[idx].remainingBt--;
            currentTime++;
            last = processes[idx].id;

            if (processes[idx].remainingBt === 0) {
                processes[idx].ft = currentTime;
                processes[idx].tat = currentTime - processes[idx].at;
                processes[idx].wt = processes[idx].tat - processes[idx].bt;

                isDone[idx] = true;
                completed++;
                results.push(processes[idx]);
            }
        }
    }

    render(results, schedule, currentTime, totalIdleTime);
}


// ================= Render Function =================
function render(results, schedule, totalTime, idleTime) {

    const gantt = document.getElementById('gantt-container');
    const table = document.getElementById('table-body');

    gantt.innerHTML = '';
    table.innerHTML = '';

    schedule.forEach(item => {

        let width = (item.end - item.start) * 35;

        gantt.innerHTML += `
            <div class="gantt-bar"
                style="width:${Math.max(width, 40)}px;
                background-color:${item.color}">
                <strong>${item.id}</strong><br>
                ${item.start}-${item.end}
            </div>`;
    });

    let totalWT = 0,
        totalTAT = 0;

    results.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true })
    ).forEach(p => {

        totalWT += p.wt;
        totalTAT += p.tat;

        table.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>${p.at}</td>
                <td>${p.bt}</td>
                <td>${p.ft}</td>
                <td>${p.tat}</td>
                <td>${p.wt}</td>
            </tr>`;
    });

    document.getElementById('avg-wait').innerText =
        (totalWT / results.length).toFixed(2);

    document.getElementById('avg-tat').innerText =
        (totalTAT / results.length).toFixed(2);

    document.getElementById('cpu-util').innerText =
        totalTime === 0
            ? "0%"
            : (((totalTime - idleTime) / totalTime) * 100).toFixed(1) + "%";
}