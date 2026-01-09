// Global variables
let allData = [];
let filteredData = [];
let charts = {};

// Chart color schemes
const colorSchemes = {
    primary: [
        'rgba(239, 68, 68, 0.8)',     // Red - lowest
        'rgba(245, 158, 11, 0.8)',    // Orange
        'rgba(250, 204, 21, 0.8)',    // Yellow
        'rgba(59, 130, 246, 0.8)',    // Blue
        'rgba(139, 92, 246, 0.8)'     // Purple - highest
    ],
    attendance: [
        'rgba(239, 68, 68, 0.8)',     // Red - lowest
        'rgba(245, 158, 11, 0.8)',    // Orange
        'rgba(250, 204, 21, 0.8)',    // Yellow
        'rgba(59, 130, 246, 0.8)',    // Blue
        'rgba(139, 92, 246, 0.8)'     // Purple - highest
    ],
    major: [
        'rgba(239, 68, 68, 0.8)',     // Red
        'rgba(245, 158, 11, 0.8)',    // Orange
        'rgba(250, 204, 21, 0.8)',    // Yellow
        'rgba(59, 130, 246, 0.8)',    // Blue
        'rgba(139, 92, 246, 0.8)'     // Purple
    ]
};

// Helper function to shorten long labels
function shortenLabel(label, maxLength = 30) {
    if (!label) return '';
    const str = String(label);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Helper function to wrap long labels into multiple lines
function wrapLabel(label, maxCharsPerLine = 25) {
    if (!label) return [''];
    const str = String(label);
    if (str.length <= maxCharsPerLine) return [str];
    
    const words = str.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
            currentLine = (currentLine + ' ' + word).trim();
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    });
    if (currentLine) lines.push(currentLine);
    
    return lines;
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');
    try {
        await loadData();
        console.log('Data loaded successfully');
        initializeFilters();
        console.log('Filters initialized');
        await createCharts();
        console.log('Charts created');
        generateInsights();
        console.log('Insights generated');
        hideLoading();
        console.log('Dashboard ready!');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        document.getElementById('loading-overlay').innerHTML = `
            <div style="text-align: center;">
                <h2 style="color: #ef4444;">⚠️ Error Loading Dashboard</h2>
                <p style="color: #94a3b8;">${error.message}</p>
                <p style="color: #94a3b8;">Please check the browser console for details.</p>
            </div>
        `;
    }
});

// Load data from API
async function loadData() {
    try {
        console.log('Fetching data from /api/data...');
        const response = await fetch('/api/data');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data received:', data.length, 'records');
        
        if (!data || data.length === 0) {
            throw new Error('No data received from server');
        }
        
        allData = data;
        filteredData = [...allData];
        console.log(`Successfully loaded ${allData.length} student records`);
        updateSummaryCards();
    } catch (error) {
        console.error('Error loading data:', error);
        throw new Error(`Failed to load data: ${error.message}`);
    }
}

// Update summary cards
function updateSummaryCards() {
    const totalStudents = filteredData.length;
    const majors = [...new Set(filteredData.map(d => d.Major))].length;
    
    // Calculate high attendance percentage
    const highAttendance = filteredData.filter(d => 
        d['Class attendance behavior'].includes('all') || 
        d['Class attendance behavior'].includes('most')
    ).length;
    const highAttendancePercent = Math.round((highAttendance / totalStudents) * 100);
    
    // Calculate high GPA percentage
    const highGPA = filteredData.filter(d => {
        const gpa = d['GPA range'] || d[' GPA range'] || '';
        return gpa.includes('70') || gpa.includes('80') || gpa.includes('90');
    }).length;
    const highGPAPercent = Math.round((highGPA / totalStudents) * 100);
    
    document.getElementById('total-students').textContent = totalStudents;
    document.getElementById('total-majors').textContent = majors;
    document.getElementById('avg-attendance').textContent = highAttendancePercent + '%';
    document.getElementById('high-performers').textContent = highGPAPercent + '%';
}

// Initialize filters
function initializeFilters() {
    const majors = [...new Set(allData.map(d => d.Major))].sort();
    
    // Define custom order for years
    const yearOrder = ['First Year', 'Second Year', 'Third Year', 'Master 1 (M1)'];
    const years = yearOrder.filter(year => allData.some(d => d['Current year of study'] === year));
    
    // Define custom order for GPA ranges
    const gpaOrder = ['Below 60', '60 - 69', '70 - 79', '80 - 89', '90 - 100'];
    const gpas = gpaOrder.filter(gpa => allData.some(d => (d['GPA range'] || d[' GPA range']) === gpa));
    
    populateSelect('major-filter', majors);
    populateSelect('year-filter', years);
    populateSelect('gpa-filter', gpas);
    
    // Add event listeners
    document.getElementById('major-filter').addEventListener('change', applyFilters);
    document.getElementById('year-filter').addEventListener('change', applyFilters);
    document.getElementById('gpa-filter').addEventListener('change', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

function applyFilters() {
    const majorFilter = document.getElementById('major-filter').value;
    const yearFilter = document.getElementById('year-filter').value;
    const gpaFilter = document.getElementById('gpa-filter').value;
    
    filteredData = allData.filter(d => {
        const gpaRange = d['GPA range'] || d[' GPA range'] || '';
        return (majorFilter === 'all' || d.Major === majorFilter) &&
               (yearFilter === 'all' || d['Current year of study'] === yearFilter) &&
               (gpaFilter === 'all' || gpaRange === gpaFilter);
    });
    
    updateSummaryCards();
    updateCharts();
    generateInsights();
}

function resetFilters() {
    document.getElementById('major-filter').value = 'all';
    document.getElementById('year-filter').value = 'all';
    document.getElementById('gpa-filter').value = 'all';
    filteredData = [...allData];
    updateSummaryCards();
    updateCharts();
    generateInsights();
}

// Create all charts
async function createCharts() {
    try {
        console.log('Creating attendance chart...');
        await createAttendanceChart();
        console.log('Creating GPA chart...');
        await createGPAChart();
        console.log('Creating major chart...');
        await createMajorChart();
        console.log('Creating gender chart...');
        await createGenderChart();
        console.log('Creating attendance-GPA chart...');
        await createAttendanceGPAChart();
        console.log('Creating reasons charts...');
        await createReasonsCharts();
        console.log('Creating learning methods chart...');
        await createLearningMethodsChart();
        console.log('Creating year-wise chart...');
        await createYearWiseChart();
        console.log('Creating attitude chart...');
        await createAttitudeChart();
        console.log('Creating effectiveness chart...');
        await createEffectivenessChart();
        console.log('Creating optional frequency chart...');
        await createOptionalFrequencyChart();
        console.log('Creating factors chart...');
        await createFactorsChart();
        console.log('Creating compensation chart...');
        await createCompensationChart();
        console.log('All charts created successfully!');
    } catch (error) {
        console.error('Error creating charts:', error);
        throw error;
    }
}

// Update all charts
function updateCharts() {
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
    createCharts();
}

// Create Attendance Behavior Chart
async function createAttendanceChart() {
    try {
        const attendanceCounts = {};
        filteredData.forEach(d => {
            const behavior = d['Class attendance behavior'];
            if (behavior) {
                attendanceCounts[behavior] = (attendanceCounts[behavior] || 0) + 1;
            }
        });
        
        // Sort by frequency in descending order
        const sortedEntries = Object.entries(attendanceCounts).sort((a, b) => b[1] - a[1]);
        const sortedLabels = sortedEntries.map(entry => entry[0]);
        const sortedValues = sortedEntries.map(entry => entry[1]);
        
        // Map colors based on attendance level (semantic coloring)
        const colorMap = {
            'I rarely or never attend classes': 'rgba(239, 68, 68, 0.8)',      // Red - lowest
            'I attend few classes': 'rgba(245, 158, 11, 0.8)',                 // Orange
            'I attend about half of my classes': 'rgba(250, 204, 21, 0.8)',   // Yellow
            'I attend most classes': 'rgba(59, 130, 246, 0.8)',                // Blue
            'I attend all or almost all classes': 'rgba(139, 92, 246, 0.8)'   // Purple - highest
        };
        const sortedColors = sortedLabels.map(label => colorMap[label] || 'rgba(100, 100, 100, 0.8)');
        
        const ctx = document.getElementById('attendanceChart');
        if (!ctx) {
            console.error('Canvas element attendanceChart not found');
            return;
        }
        
        charts.attendance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Number of Students',
                data: sortedValues,
                backgroundColor: sortedColors,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }, scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
    } catch (error) {
        console.error('Error creating attendance chart:', error);
    }
}

// Create GPA Distribution Chart
async function createGPAChart() {
    const gpaCounts = {};
    filteredData.forEach(d => {
        const gpa = d['GPA range'] || d[' GPA range'];
        if (gpa) {
            gpaCounts[gpa] = (gpaCounts[gpa] || 0) + 1;
        }
    });
    
    // Define custom order for GPA ranges
    const gpaOrder = ['Below 60', '60 - 69', '70 - 79', '80 - 89', '90 - 100'];
    const sortedGPAs = gpaOrder.filter(gpa => gpaCounts[gpa]);
    
    const ctx = document.getElementById('gpaChart').getContext('2d');
    charts.gpa = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedGPAs,
            datasets: [{
                label: 'Number of Students',
                data: sortedGPAs.map(gpa => gpaCounts[gpa]),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',    // Red - Below 60
                    'rgba(245, 158, 11, 0.8)',   // Orange - 60-69
                    'rgba(250, 204, 21, 0.8)',   // Yellow - 70-79
                    'rgba(59, 130, 246, 0.8)',   // Blue - 80-89
                    'rgba(139, 92, 246, 0.8)'    // Purple - 90-100
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
           scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}

        }
    });
}

// Create Major Distribution Chart
async function createMajorChart() {
    const majorCounts = {};
    filteredData.forEach(d => {
        const major = d.Major;
        majorCounts[major] = (majorCounts[major] || 0) + 1;
    });
    
    const ctx = document.getElementById('majorChart').getContext('2d');
    charts.major = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(majorCounts),
            datasets: [{
                data: Object.values(majorCounts),
                backgroundColor: colorSchemes.major,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#000000', padding: 15 }
                }
            }
        }
    });
}

// Create Gender Distribution Chart
async function createGenderChart() {
    const genderCounts = {};
    filteredData.forEach(d => {
        const gender = d.Gender;
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });
    
    // Create arrays with proper color mapping
    const labels = Object.keys(genderCounts);
    const data = Object.values(genderCounts);
    const colors = labels.map(label => {
        if (label.toLowerCase() === 'male') {
            return 'rgba(59, 130, 246, 0.8)';  // Blue for Male
        } else {
            return 'rgba(239, 68, 68, 0.8)';    // Red for Female
        }
    });
    
    const ctx = document.getElementById('genderChart').getContext('2d');
    charts.gender = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#000000', padding: 15 }
                }
            }
        }
    });
}

// Create Attendance vs GPA Relationship Chart
async function createAttendanceGPAChart() {
    // Label mapping for shorter, clearer display
    const labelMap = {
        'When I attend classes less frequently, my academic performance tends to be higher': 'Less attend -> higher GPA',
        'When I attend classes more frequently, my academic performance tends to be higher': 'More attend -> higher GPA',
        'My level of class attendance does not appear to affect my academic performance': 'Attendance does not affect GPA',
        'I am unable to determine a clear relationship based on my experience': 'Cannot determine from experience',
        'The relationship varies depending on the course': 'Effect depends on course'
    };
    
    const relationshipCounts = {};
    filteredData.forEach(d => {
        const relationship = d['Relationship between class attendance and GPA'] || d['Relationship between class attendance and GPA '];
        if (relationship) {
            relationshipCounts[relationship] = (relationshipCounts[relationship] || 0) + 1;
        }
    });
    
    // Define desired order
    const desiredOrder = [
        'When I attend classes more frequently, my academic performance tends to be higher',
        'My level of class attendance does not appear to affect my academic performance',
        'When I attend classes less frequently, my academic performance tends to be higher',
        'The relationship varies depending on the course',
        'I am unable to determine a clear relationship based on my experience'
    ];
    
    const orderedLabels = desiredOrder.filter(key => relationshipCounts[key]).map(label => labelMap[label]);
    const orderedData = desiredOrder.filter(key => relationshipCounts[key]).map(key => relationshipCounts[key]);
    
    const ctx = document.getElementById('attendanceGpaChart').getContext('2d');
    charts.attendanceGpa = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: orderedLabels,
            datasets: [{
                label: 'Number of Students',
                data: orderedData,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Reasons Charts
async function createReasonsCharts() {
    const response = await fetch('/api/reasons_analysis');
    const data = await response.json();
    
    // Label mapping for attending reasons
    const attendingLabelMap = {
        'Access to explanations not available in course materials': 'Extra explanations',
        'Attendance is mandatory according to faculty regulations': 'Mandatory attendance',
        'Class participation contributes to academic evaluation': 'Participation counts',
        'Opportunities for discussion and peer interaction': 'Discussion & peer interaction',
        'To improve understanding of course content': 'Improve understanding',
        'The instructor\’s teaching approach enhances learning': 'Effective teaching'
    };
    
    // Attending Reasons - Sort by frequency in descending order
    const attendingSorted = Object.entries(data.attending)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const attendingLabels = attendingSorted.map(entry => entry[0]);
    const attendingValues = attendingSorted.map(entry => entry[1]);
    
    const ctx1 = document.getElementById('attendingReasonsChart').getContext('2d');
    charts.attending = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: attendingLabels.map(label => attendingLabelMap[label] || label),
            datasets: [{
                label: 'Frequency',
                data: attendingValues,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
    
    // Skipping Reasons with label mapping and descending sort
    const skippingLabelMap = {
        'Course materials are sufficiently available online': 'Online materials sufficient',
        'Internship, training, or practical obligations': 'Internship/training',
        'Long commuting distance or transportation challenges': 'Commuting issues',
        'Low motivation or engagement with the course': 'Low motivation',
        'Perceived limitations in teaching quality or delivery': 'Teaching limitations',
        'Work-related commitments': 'Work commitments'
    };
    
    // Filter out "Attend them all" and sort by frequency in descending order
    const skippingSorted = Object.entries(data.skipping)
        .filter(([key]) => !key.toLowerCase().includes('attend them all') && !key.toLowerCase().includes('attend all'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const skippingLabels = skippingSorted.map(entry => skippingLabelMap[entry[0]] || entry[0]);
    const skippingValues = skippingSorted.map(entry => entry[1]);
    
    const ctx2 = document.getElementById('skippingReasonsChart').getContext('2d');
    charts.skipping = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: skippingLabels.map(label => shortenLabel(label, 35)),
            datasets: [{
                label: 'Frequency',
                data: skippingValues,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Learning Methods Chart
async function createLearningMethodsChart() {
    // Label mapping for shorter, clearer display
    const labelMap = {
        'A combination of in-person classes and other learning methods': 'In-person + other methods',
        'Online learning resources (videos, platforms, AI tools, etc.)': 'Online resources',
        'A combination of online learning and independent self-study': 'Online + self-study',
        'Independent self-study': 'Self-study',
        'In-person classroom instruction': 'In-person classes'
    };
    
    const methodCounts = {};
    filteredData.forEach(d => {
        const method = d['Effective learning methods for academic performance'];
        methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    
    // Define desired order
    const desiredOrder = [
        'In-person classroom instruction',
        'Online learning resources (videos, platforms, AI tools, etc.)',
        'Independent self-study',
        'A combination of online learning and independent self-study',
        'A combination of in-person classes and other learning methods'
    ];
    
    const orderedLabels = desiredOrder.filter(key => methodCounts[key]).map(label => labelMap[label]);
    const orderedData = desiredOrder.filter(key => methodCounts[key]).map(key => methodCounts[key]);
    
    const ctx = document.getElementById('learningMethodsChart').getContext('2d');
    charts.learning = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: orderedLabels,
            datasets: [{
                label: 'Number of Students',
                data: orderedData,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Year-wise Analysis Chart
async function createYearWiseChart() {
    const response = await fetch('/api/year_wise_analysis');
    const data = await response.json();
    
    // Define desired order for years
    const yearOrder = ['First Year', 'Second Year', 'Third Year', 'Master 1 (M1)'];
    const years = yearOrder.filter(year => data.some(d => d['Current year of study'] === year));
    
    // Define desired order for attendance behaviors
    const behaviorOrder = [
        'I attend all or almost all classes',
        'I attend most classes',
        'I attend about half of my classes',
        'I attend few classes',
        'I rarely or never attend classes'
    ];
    const behaviors = behaviorOrder.filter(behavior => data.some(d => d['Class attendance behavior'] === behavior));
    
    // Semantic color mapping for attendance behaviors
    const behaviorColorMap = {
        'I rarely or never attend classes': 'rgba(239, 68, 68, 0.8)',      // Red - lowest
        'I attend few classes': 'rgba(245, 158, 11, 0.8)',                 // Orange
        'I attend about half of my classes': 'rgba(250, 204, 21, 0.8)',   // Yellow
        'I attend most classes': 'rgba(59, 130, 246, 0.8)',                // Blue
        'I attend all or almost all classes': 'rgba(139, 92, 246, 0.8)'   // Purple - highest
    };
    
    const datasets = behaviors.map((behavior) => {
        return {
            label: behavior,
            data: years.map(year => {
                const item = data.find(d => d['Current year of study'] === year && d['Class attendance behavior'] === behavior);
                return item ? item.count : 0;
            }),
            backgroundColor: behaviorColorMap[behavior] || 'rgba(100, 100, 100, 0.8)',
            borderWidth: 0
        };
    });
    
    const ctx = document.getElementById('yearWiseChart').getContext('2d');
    charts.yearwise = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#000000', padding: 15, font: { size: 11 } }
                }
            },
            scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Attitude Toward Attending Classes Chart
async function createAttitudeChart() {
    const response = await fetch('/api/attitude');
    const data = await response.json();
    
    // Label mapping for attitude levels
    const attitudeLabels = {
        '1': 'Very negative',
        '2': 'Negative',
        '3': 'Neutral',
        '4': 'Positive',
        '5': 'Very positive'
    };
    
    // Sort by attitude level in ascending order (1, 2, 3, 4, 5)
    const sortedEntries = Object.entries(data).sort((a, b) => {
        const numA = parseInt(a[0]) || 0;
        const numB = parseInt(b[0]) || 0;
        return numA - numB;
    });
    const labels = sortedEntries.map(entry => attitudeLabels[entry[0]] || entry[0]);
    const values = sortedEntries.map(entry => entry[1]);
    
    const ctx = document.getElementById('attitudeChart').getContext('2d');
    charts.attitude = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: values,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointborderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Effectiveness Chart
async function createEffectivenessChart() {
    const response = await fetch('/api/effectiveness');
    const data = await response.json();
    
    // Custom ordering: More effective -> Equally effective -> Less effective
    const order = ['More effective', 'Equally effective', 'Less effective'];
    const labels = order.filter(label => data[label] !== undefined);
    const values = labels.map(label => data[label]);
    
    const ctx = document.getElementById('effectivenessChart').getContext('2d');
    charts.effectiveness = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: values,
                backgroundColor: [
                    'rgba(139, 92, 246, 0.8)',   // Purple - More effective
                    'rgba(250, 204, 21, 0.8)',   // Yellow - Equally effective
                    'rgba(239, 68, 68, 0.8)'     // Red - Less effective
                ],
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Optional Frequency Chart
async function createOptionalFrequencyChart() {
    const response = await fetch('/api/optional_frequency');
    const data = await response.json();
    
    // Label mapping for frequency levels
    const levelLabels = {
        '1': 'Never',
        '2': 'Rarely',
        '3': 'Sometimes',
        '4': 'Often',
        '5': 'Very frequently'
    };
    
    // Sort by frequency level (1-5)
    const sortedEntries = Object.entries(data).sort((a, b) => {
        const numA = parseInt(a[0]) || 0;
        const numB = parseInt(b[0]) || 0;
        return numA - numB;
    });
    const labels = sortedEntries.map(entry => levelLabels[entry[0]] || entry[0]);
    const values = sortedEntries.map(entry => entry[1]);
    
    const ctx = document.getElementById('optionalFrequencyChart').getContext('2d');
    charts.optionalFrequency = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: values,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointborderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Factors Influencing Attendance Chart
async function createFactorsChart() {
    const response = await fetch('/api/factors_influencing');
    const data = await response.json();
    
    // Sort by frequency in descending order and take top 8
    const sortedEntries = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const labels = sortedEntries.map(entry => shortenLabel(entry[0], 40));
    const values = sortedEntries.map(entry => entry[1]);
    
    const ctx = document.getElementById('factorsChart').getContext('2d');
    charts.factors = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequency',
                data: values,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Create Compensation Methods Chart
async function createCompensationChart() {
    const response = await fetch('/api/compensation_methods');
    const data = await response.json();
    
    // Sort by frequency in descending order and take top 8
    const sortedEntries = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const labels = sortedEntries.map(entry => shortenLabel(entry[0], 35));
    const values = sortedEntries.map(entry => entry[1]);
    
    const ctx = document.getElementById('compensationChart').getContext('2d');
    charts.compensation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequency',
                data: values,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
  x: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  },
  y: {
    grid: {
      color: 'rgba(226, 232, 240, 0.3)',
      lineWidth: 0.5
    }
  }
}
        }
    });
}

// Generate insights
function generateInsights() {
    const insights = [];
    
    // Most common major
    const majorCounts = {};
    filteredData.forEach(d => majorCounts[d.Major] = (majorCounts[d.Major] || 0) + 1);
    const topMajor = Object.entries(majorCounts).sort((a, b) => b[1] - a[1])[0];
    insights.push({
        title: 'Most Popular Major',
        text: `${topMajor[0]} has the highest enrollment with ${topMajor[1]} students.`
    });
    
    // Attendance-GPA correlation
    const positiveCorrelation = filteredData.filter(d => {
        const relationship = d['Relationship between class attendance and GPA'] || d['Relationship between class attendance and GPA '] || '';
        return relationship.toLowerCase().includes('more frequently') && relationship.toLowerCase().includes('higher');
    }).length;
    const correlationPercent = Math.round((positiveCorrelation / filteredData.length) * 100);
    insights.push({
        title: 'Attendance Impact',
        text: `${correlationPercent}% of students report that attending classes more frequently leads to higher academic performance.`
    });
    
    // Attitude toward attending classes
    const attitudeCounts = {};
    filteredData.forEach(d => {
        const attitude = d['Attitude toward attending classes'];
        if (attitude) {
            attitudeCounts[attitude] = (attitudeCounts[attitude] || 0) + 1;
        }
    });
    const avgAttitude = Object.entries(attitudeCounts).reduce((sum, [level, count]) => sum + (parseInt(level) * count), 0) / filteredData.length;
    insights.push({
        title: 'Student Attitude',
        text: `Average attitude score is ${avgAttitude.toFixed(1)} out of 5, indicating ${avgAttitude >= 4 ? 'very positive' : avgAttitude >= 3 ? 'positive' : 'neutral'} feelings toward attending classes.`
    });
    
    // Compensation methods
    const compensationCounts = {};
    filteredData.forEach(d => {
        const methods = d['Ways of compensation for the missed content?'];
        if (methods && methods !== 'I usually do not compensate for missed classes') {
            const methodList = methods.includes(';') ? methods.split(';') : [methods];
            methodList.forEach(method => {
                const trimmed = method.trim();
                if (trimmed) compensationCounts[trimmed] = (compensationCounts[trimmed] || 0) + 1;
            });
        }
    });
    const topCompensation = Object.entries(compensationCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCompensation) {
        insights.push({
            title: 'Preferred Compensation Method',
            text: `Most students compensate for missed classes by reviewing lecture materials (${topCompensation[1]} students).`
        });
    }
    
    // Effectiveness of alternatives
    const effectivenessCounts = {};
    filteredData.forEach(d => {
        const eff = d['Effectiveness of alternative methods compared to attending classes'];
        if (eff) effectivenessCounts[eff] = (effectivenessCounts[eff] || 0) + 1;
    });
    const moreEffective = effectivenessCounts['More effective'] || 0;
    const lessEffective = effectivenessCounts['Less effective'] || 0;
    insights.push({
        title: 'Alternative Methods Perception',
        text: `${lessEffective} students find alternatives less effective than attending classes, while ${moreEffective} find them more effective.`
    });
    
    // Most common learning method
    const methodCounts = {};
    filteredData.forEach(d => {
        const method = d['Effective learning methods for academic performance'];
        if (method) {
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        }
    });
    const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0];
    if (topMethod) {
        insights.push({
            title: 'Preferred Learning Method',
            text: `${topMethod[1]} students find "${topMethod[0]}" to be the most effective learning approach.`
        });
    }
    
    // Frequency of optional attendance
    const frequencyCounts = {};
    filteredData.forEach(d => {
        const freq = d['Frequency of optional attendance'];
        if (freq) frequencyCounts[freq] = (frequencyCounts[freq] || 0) + 1;
    });
    const highFrequency = (frequencyCounts['4'] || 0) + (frequencyCounts['5'] || 0);
    const lowFrequency = (frequencyCounts['1'] || 0) + (frequencyCounts['2'] || 0);
    insights.push({
        title: 'Optional Class Attendance',
        text: `${highFrequency} students frequently attend optional classes, while ${lowFrequency} rarely attend them.`
    });
    
    // High attendance rate
    const highAttendees = filteredData.filter(d => 
        d['Class attendance behavior'].includes('all') || 
        d['Class attendance behavior'].includes('most')
    ).length;
    const attendanceRate = Math.round((highAttendees / filteredData.length) * 100);
    insights.push({
        title: 'Attendance Rate',
        text: `${attendanceRate}% of students attend most or all of their classes regularly.`
    });
    
    // Gender distribution
    const genderCounts = {};
    filteredData.forEach(d => genderCounts[d.Gender] = (genderCounts[d.Gender] || 0) + 1);
    const genderEntries = Object.entries(genderCounts);
    insights.push({
        title: 'Gender Distribution',
        text: `${genderEntries.map(([gender, count]) => `${gender}: ${count}`).join(', ')} students in the dataset.`
    });
    
    // GPA distribution
    const highGPA = filteredData.filter(d => {
        const gpa = d['GPA range'] || d[' GPA range'] || '';
        return gpa.includes('70') || gpa.includes('80') || gpa.includes('90');
    }).length;
    const gpaPercent = Math.round((highGPA / filteredData.length) * 100);
    insights.push({
        title: 'Academic Performance',
        text: `${gpaPercent}% of students maintain a GPA of 70 or above, indicating strong overall academic performance.`
    });
    
    // Render insights
    const insightsContainer = document.getElementById('insights-content');
    insightsContainer.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <h3>${insight.title}</h3>
            <p>${insight.text}</p>
        </div>
    `).join('');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
}

// Smooth scroll for navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});
