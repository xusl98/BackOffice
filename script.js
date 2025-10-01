document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL VARIABLES AND INITIALIZATION ---
    let currentCourseData = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    let usersCurrentPage = 1;
    let usersTotalPages = 1;
    const usersPageSize = 10;
    
    // --- ELEMENT REFERENCES ---
    // Tab switching elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Prices tab elements
    const loadingMessage = document.getElementById('loading-message');
    const courseListEl = document.getElementById('course-list');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const createNewBtn = document.getElementById('create-new-btn');

    // Users tab elements
    const usersTableBody = document.getElementById('usersTable').querySelector('tbody');
    const usersSearchInput = document.getElementById('usersSearchInput');
    const usersPrevBtn = document.getElementById('usersPrevBtn');
    const usersNextBtn = document.getElementById('usersNextBtn');
    const usersPageInfo = document.getElementById('usersPageInfo');
    
    // API Key
    const apiKey = localStorage.getItem('apiKey');
    const API_URL_BASE = 'https://golfclappapi.azurewebsites.net/BackOffice';

    // --- UTILITY FUNCTION FOR REFRESHING DATA ---
    // This is the new function to refresh all course data after an update
    const refreshCourseData = async () => {
        if (currentCourseData) {
            await fetchCourseList(apiKey, currentCourseData.course.id);
        } else {
            // Fallback: If no course is selected, just reload the list as before
            await fetchCourseList(apiKey);
        }
    }

    // --- TAB SWITCHING LOGIC ---
    const switchTab = (tabId) => {
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        tabContents.forEach(content => {
            if (content.id === `${tabId}-content`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        if (tabId === 'usuarios') {
            fetchUsers();
        }
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
        });
    });

    // --- USERS TAB FUNCTIONS AND LISTENERS ---
    const fetchUsers = async () => {
        try {
            const searchTerm = usersSearchInput.value;
            const url = `${API_URL_BASE}/Users?pageNumber=${usersCurrentPage}&pageSize=${usersPageSize}&searchTerm=${searchTerm}`;
            
            const response = await fetch(url, {
                headers: {
                    'Api-Key': apiKey,
                },
            });
            
            if (!response.ok) {
                throw new Error('Network response for users was not ok');
            }
            const data = await response.json();

            renderUsers(data.items);
            usersTotalPages = data.totalPages;
            updateUsersPaginationUI();

        } catch (error) {
            console.error('Error fetching users:', error);
            usersTableBody.innerHTML = '<tr><td colspan="5">Error al cargar los usuarios. Por favor, intente de nuevo.</td></tr>';
            updateUsersPaginationUI();
        }
    };

    const renderUsers = (users) => {
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5">No se encontraron usuarios.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.surname}</td>
                <td>${user.userName}</td>
                <td>${user.email}</td>
                <td>${user.phoneNumber || ''}</td>
            `;
            usersTableBody.appendChild(row);
        });
    };

    const updateUsersPaginationUI = () => {
        usersPageInfo.textContent = `Página ${usersCurrentPage} de ${usersTotalPages}`;
        usersPrevBtn.disabled = usersCurrentPage <= 1;
        usersNextBtn.disabled = usersCurrentPage >= usersTotalPages;
    };

    usersPrevBtn.addEventListener('click', () => {
        if (usersCurrentPage > 1) {
            usersCurrentPage--;
            fetchUsers();
        }
    });

    usersNextBtn.addEventListener('click', () => {
        if (usersCurrentPage < usersTotalPages) {
            usersCurrentPage++;
            fetchUsers();
        }
    });

    usersSearchInput.addEventListener('input', () => {
        usersCurrentPage = 1;
        fetchUsers();
    });

    // --- PRICES TAB FUNCTIONS AND LISTENERS ---
    // Added optional parameter to select a specific course after re-fetch
    const fetchCourseList = async (userApiKey, courseIdToSelect = null) => {
        const url = `${API_URL_BASE}/GetPriceRanges`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': userApiKey,
                },
            });
            if (response.ok) {
                const data = await response.json();
                loadingMessage.style.display = 'none';
                
                // Clear existing course list
                courseListEl.innerHTML = '';
                
                if (data.length > 0) {
                    let courseToDisplay = courseIdToSelect 
                        ? data.find(c => c.course.id === courseIdToSelect) 
                        : data[0]; // Select requested course or first one
                    
                    if (!courseToDisplay) {
                        courseToDisplay = data[0]; // Fallback if requested course isn't found
                    }

                    currentCourseData = courseToDisplay;
                    document.getElementById('selected-course-name').textContent = `Price Ranges for: ${currentCourseData.course.name}`;
                    renderCalendar();
                } else {
                    currentCourseData = null; // No courses to display
                    document.getElementById('selected-course-name').textContent = 'No Courses Available';
                    renderCalendar(); // Render empty calendar
                }

                data.forEach(courseData => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('course-list-item');
                    // Add 'active' class to the currently selected course
                    if (currentCourseData && courseData.course.id === currentCourseData.course.id) {
                         listItem.classList.add('active');
                    }
                    listItem.textContent = courseData.course.name;
                    listItem.dataset.courseId = courseData.course.id;
                    listItem.addEventListener('click', () => {
                        selectCourseAndRenderCalendar(courseData);
                        // Also update the active class on click
                        courseListEl.querySelectorAll('.course-list-item').forEach(item => item.classList.remove('active'));
                        listItem.classList.add('active');
                    });
                    courseListEl.appendChild(listItem);
                });
            } else {
                console.error('Failed to get course list:', response.status);
                loadingMessage.textContent = 'Failed to load courses.';
            }
        } catch (error) {
            console.error('Network or other error:', error);
            loadingMessage.textContent = 'An error occurred. Please try again.';
        }
    }

    function selectCourseAndRenderCalendar(courseData) {
        currentCourseData = courseData;
        document.getElementById('selected-course-name').textContent = `Price Ranges for: ${courseData.course.name}`;
        // Reset month and year to current month/year when selecting a new course
        currentMonth = new Date().getMonth(); 
        currentYear = new Date().getFullYear();
        renderCalendar();
        
        const calendarWrapper = document.getElementById('calendar-wrapper');
        calendarWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function stringToHslColor(str, s, l) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    }

    function renderCalendar() {
        if (!currentCourseData) return;

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const numDays = lastDay.getDate();

        const displayEl = document.querySelector('.calendar-container .calendar-header span');
        const gridEl = document.getElementById('calendar-grid');

        displayEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Clear only the days, leave the day names (first 7 children)
        while (gridEl.children.length > 7) { 
            gridEl.removeChild(gridEl.lastChild);
        }

        // Adjust for Sunday=0 to match the 7-column grid starting Monday or whatever
        const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        for (let i = 0; i < firstDayOfWeek; i++) {
            const blankDay = document.createElement('div');
            blankDay.classList.add('day');
            gridEl.appendChild(blankDay);
        }

        for (let day = 1; day <= numDays; day++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day');
            dayEl.innerHTML = `<span class="day-number">${day}</span>`;
            
            dayEl.addEventListener('click', () => {
                openDayInfoModal(day);
            });

            const currentDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            currentCourseData.priceRanges.forEach(priceRange => {
                const startDate = priceRange.startDate.split('T')[0];
                const endDate = priceRange.endDate.split('T')[0];
                
                if (currentDateString >= startDate && currentDateString <= endDate) {
                    const eventEl = document.createElement('div');
                    eventEl.classList.add('event');
                    eventEl.textContent = `€${(priceRange.price / 100).toFixed(2)}`;
                    
                    const priceKey = priceRange.price.toString();
                    eventEl.style.backgroundColor = stringToHslColor(priceKey, 70, 50);

                    eventEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEditModal(priceRange);
                    });

                    dayEl.appendChild(eventEl);
                }
            });

            gridEl.appendChild(dayEl);
        }
        renderPriceSummary();
    }

    function renderPriceSummary() {
        const summaryListEl = document.getElementById('price-summary-list');
        summaryListEl.innerHTML = '';

        if (!currentCourseData || !currentCourseData.priceRanges) {
            summaryListEl.innerHTML = '<li>No price ranges available for this course.</li>';
            return;
        }

        const pricesForMonth = currentCourseData.priceRanges.filter(range => {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

            return (start <= currentMonthEnd && end >= currentMonthStart);
        });
        
        pricesForMonth.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (pricesForMonth.length > 0) {
            pricesForMonth.forEach(range => {
                const listItem = document.createElement('li');
                listItem.classList.add('price-summary-item');
                
                listItem.priceRangeData = range;

                const priceKey = range.price.toString();
                const color = stringToHslColor(priceKey, 70, 50);

                // Reformatting to be more user-friendly
                const startDate = new Date(range.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}) + ' ' + new Date(range.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endDate = new Date(range.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}) + ' ' + new Date(range.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                listItem.innerHTML = `
                    <span class="color-dot" style="background-color: ${color};"></span>
                    <strong>€${(range.price / 100).toFixed(2)}</strong>: ${startDate} - ${endDate}
                `;
                
                listItem.addEventListener('click', () => {
                    openEditModal(range);
                });

                summaryListEl.appendChild(listItem);
            });
        } else {
            summaryListEl.innerHTML = '<li>No price ranges for this month.</li>';
        }
    }

    function openEditModal(priceRange) {
        const modal = document.getElementById('editModal');
        const form = document.getElementById('editForm');
        const deleteBtn = document.getElementById('delete-btn');
        
        const isNew = priceRange === null;
        document.getElementById('editPriceRangeId').value = isNew ? '' : priceRange.id;
        document.getElementById('editCourseName').textContent = currentCourseData.course.name;
        document.getElementById('currentPriceDisplay').textContent = isNew ? 'N/A' : `€${(priceRange.price / 100).toFixed(2)}`;
        
        document.getElementById('newPrice').value = isNew ? '0.00' : (priceRange.price / 100).toFixed(2);
        
        deleteBtn.style.display = isNew ? 'none' : 'block';

        if (isNew) {
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            document.getElementById('startDate').value = today.toISOString().split('T')[0];
            document.getElementById('startTime').value = '00:00';
            document.getElementById('endDate').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('endTime').value = '23:59';
        } else {
            // Note: If the backend returns ISO 8601 strings without 'Z' at the end for UTC, 
            // the Date object might interpret them as local time.
            // Assuming they are UTC/Zoned for consistency with T00:00:00.000Z format used in payload
            const startDateObj = new Date(priceRange.startDate);
            const endDateObj = new Date(priceRange.endDate);
            
            document.getElementById('startDate').value = startDateObj.toISOString().split('T')[0];
            document.getElementById('startTime').value = startDateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            document.getElementById('endDate').value = endDateObj.toISOString().split('T')[0];
            document.getElementById('endTime').value = endDateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        }

        modal.style.display = 'block';

        deleteBtn.onclick = async () => {
            if (confirm('Are you sure you want to delete this price range?')) {
                await deletePriceRange(priceRange.id);
            }
        };
        
        form.onsubmit = async (event) => {
            event.preventDefault();
            
            const updatedPrice = parseFloat(document.getElementById('newPrice').value) * 100;
            const newDateStart = document.getElementById('startDate').value;
            const newTimeStart = document.getElementById('startTime').value;
            const newDateEnd = document.getElementById('endDate').value;
            const newTimeEnd = document.getElementById('endTime').value;
            let priceRangeId = document.getElementById('editPriceRangeId').value;
            
            // Format to ISO 8601 with Z for UTC assumption
            const updatedStartDate = `${newDateStart}T${newTimeStart}:00.000Z`;
            const updatedEndDate = `${newDateEnd}T${newTimeEnd}:00.000Z`;
            
            if (isNew) {
                // Generate a new ID for creation
                priceRangeId = crypto.randomUUID(); 
            }

            const updateData = {
                id: priceRangeId,
                price: updatedPrice,
                startDate: updatedStartDate,
                endDate: updatedEndDate,
                courseId: currentCourseData.course.id
            };
            
            const url = `${API_URL_BASE}/UpdatePriceRange`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': apiKey,
                    },
                    body: JSON.stringify(updateData),
                });
                
                if (response.ok) {
                    alert('Price range saved successfully!');
                    closeModal();
                    
                    // --- REFRESH DATA AFTER SUCCESSFUL UPDATE ---
                    await refreshCourseData(); 
                    // ------------------------------------------

                } else {
                    const error = await response.text();
                    alert('Failed to save price range: ' + error);
                }
            } catch (error) {
                alert('An error occurred while saving the price range.');
                console.error(error);
            }
        };
    }

    async function deletePriceRange(priceRangeId) {
        const url = `${API_URL_BASE}/DeletePriceRange?id=${priceRangeId}`;
        
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Api-Key': apiKey,
                },
            });

            if (response.ok) {
                alert('Price range deleted successfully!');
                closeModal();
                
                // --- REFRESH DATA AFTER SUCCESSFUL DELETION ---
                await refreshCourseData();
                // ----------------------------------------------

            } else {
                const error = await response.text();
                alert('Failed to delete price range: ' + error);
            }
        } catch (error) {
            alert('An error occurred while deleting the price range.');
            console.error(error);
        }
    }
    
    function openDayInfoModal(day) {
        const modal = document.getElementById('dayInfoModal');
        const dateEl = document.getElementById('dayInfoDate');
        const listEl = document.getElementById('dayInfoList');
        
        const selectedDate = new Date(currentYear, currentMonth, day);
        dateEl.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        listEl.innerHTML = '';
        const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const pricesForDay = currentCourseData.priceRanges.filter(range => {
            const startDate = range.startDate.split('T')[0];
            const endDate = range.endDate.split('T')[0];
            return dayString >= startDate && dayString <= endDate;
        });

        if (pricesForDay.length > 0) {
            pricesForDay.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            pricesForDay.forEach(range => {
                const listItem = document.createElement('li');
                listItem.classList.add('price-summary-item');
                
                const priceKey = range.price.toString();
                const color = stringToHslColor(priceKey, 70, 50);
                
                const startTime = new Date(range.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(range.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                listItem.innerHTML = `
                    <span class="color-dot" style="background-color: ${color};"></span>
                    <strong>€${(range.price / 100).toFixed(2)}</strong>: ${startTime} - ${endTime}
                `;
                
                listItem.addEventListener('click', () => {
                    closeDayInfoModal();
                    openEditModal(range);
                });
                
                listEl.appendChild(listItem);
            });
        } else {
            listEl.innerHTML = '<li>No price ranges for this day.</li>';
        }
        
        modal.style.display = 'block';
    }

    // Initial page load logic
    if (!apiKey) {
        alert('You must be logged in to view this page.');
        window.location.href = 'login.html';
        return;
    }
    fetchCourseList(apiKey);
    
    prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    createNewBtn.addEventListener('click', () => {
        if (currentCourseData) {
            openEditModal(null);
        } else {
            alert('Please select a course first.');
        }
    });

});

// --- GLOBAL FUNCTIONS ---
// Moved outside of the DOMContentLoaded listener
function closeModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
}

function closeDayInfoModal() {
    const modal = document.getElementById('dayInfoModal');
    modal.style.display = 'none';
}